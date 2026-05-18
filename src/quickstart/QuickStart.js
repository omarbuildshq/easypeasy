/**
 * QuickStart — Core setup engine
 * Handles account creation, AIOStreams config assembly, manifest generation,
 * addon installation, and Nuvio AIOMetadata collection setup.
 */

import StremioAPI from '../lib/apis/StremioAPI.js';
import NuvioAPI from '../lib/apis/NuvioAPI.js';
import AIOStreamsAPI from '../lib/apis/AIOStreamsAPI.js';
import AIOMetadataAPI from '../lib/apis/AIOMetadataAPI.js';
import Network from '../lib/utils/Network.js';
import Logger from '../lib/utils/Logger.js';
import Modal from '../lib/utils/Modal.js';
import Clipboard from '../lib/utils/Clipboard.js';

// Addon names we recognize as our own (for cleanup)
const RECOGNIZED_ADDON_NAMES = ['aiostreams', 'duck streams', 'easypeasy'];

// Default addons to keep on new accounts
const ALLOWED_ADDONS = ['Cinemeta'];

export default class QuickStart {
    constructor(wizard, state) {
        this.wizard = wizard;
        this.state = state;
        this.api = null; // Set based on service choice
        this.selectedProfileIds = null;
        this.tmdbTokens = [];
    }

    getApi() {
        return this.state.service === 'nuvio' ? NuvioAPI : StremioAPI;
    }

    // Main entry point — called when user clicks "Launch Setup"
    async run() {
        this.api = this.getApi();
        const state = this.state;

        try {
            // Show working state
            this.showProgress('Preparing setup...');

            let isNewAccount = false;
            let existingAddon = null;

            if (state.mode === 'account') {
                // Step 1: Ensure account
                this.updateProgress('Setting up account...');
                isNewAccount = await this.api.ensureAccount(state.email, state.password);

                // Handle Nuvio multi-profile
                if (state.service === 'nuvio') {
                    const profiles = await this.api.getProfiles();
                    if (profiles.length > 1) {
                        const selectedIds = await this.promptNuvioProfiles(profiles);
                        if (!selectedIds) return; // Cancelled
                        this.selectedProfileIds = selectedIds;
                    } else {
                        this.selectedProfileIds = profiles.map(p => p.id.toString());
                    }
                }

                // Step 2: Setup account (cleanup old addons)
                this.updateProgress('Configuring account...');
                existingAddon = await this.setupServiceAccount(isNewAccount, state.cleanupOldInstalls !== false, this.selectedProfileIds);
            }

            // Step 3: Build AIOStreams config and get manifest URL
            this.updateProgress('Building AIOStreams configuration...');
            const password = state.mode === 'account' ? state.password : state.aiostreamsPassword;
            const manifestUrl = await this.createAIOStreamsManifest(password, existingAddon);

            if (state.mode === 'account') {
                // Step 4: Install manifest
                const shouldInstall = existingAddon?.transportUrl !== manifestUrl;
                if (shouldInstall) {
                    this.updateProgress('Installing addon...');
                    await this.api.installAddon(manifestUrl, this.selectedProfileIds);
                }

                // Step 5: AIOMetadata for Nuvio
                if (state.service === 'nuvio') {
                    await this.installAIOMetadata();
                }

                // Success!
                this.showSuccess(isNewAccount, state.email, password);
            } else {
                // Manifest-only result
                this.showManifestResult(manifestUrl, password);
            }

        } catch (err) {
            Logger.error('QuickStart', 'Setup failed:', err);
            this.showError(err.message || 'Setup failed. Please try again.');
        } finally {
            this.selectedProfileIds = null;
        }
    }

    // --- Account Setup ---

    async setupServiceAccount(isNewAccount, cleanupOldInstalls, targetProfileIds) {
        let existingAddon = null;

        if (isNewAccount) {
            // Strip default addons, keep only Cinemeta
            const profiles = await this.api.getProfiles();
            for (const profile of profiles) {
                const addons = await this.api.getAddons(profile.id);
                const toRemove = addons.filter(a => !ALLOWED_ADDONS.includes(a.manifest?.name));
                for (const addon of toRemove) {
                    await this.api.removeAddon(addon.transportUrl, profile.id);
                }
            }
        } else if (cleanupOldInstalls) {
            // Find reusable addon and clean up old ones
            const profiles = await this.api.getProfiles();
            const filtered = targetProfileIds
                ? profiles.filter(p => targetProfileIds.includes(p.id.toString()))
                : profiles;

            for (const profile of filtered) {
                const addons = await this.api.getAddons(profile.id);
                for (const addon of addons) {
                    if (this.isRecognizedAddon(addon)) {
                        if (!existingAddon) {
                            existingAddon = this.parseAddonUrl(addon.transportUrl);
                        }
                    }
                }
            }

            // Clean up old installs (keep the one we're reusing)
            await this.cleanUpOldInstalls(existingAddon?.uuid, targetProfileIds);
        }

        return existingAddon;
    }

    isRecognizedAddon(addon) {
        const name = (addon.manifest?.name || '').toLowerCase();
        return RECOGNIZED_ADDON_NAMES.some(n => name.includes(n));
    }

    parseAddonUrl(url) {
        try {
            const parsed = new URL(url);
            const parts = parsed.pathname.split('/').filter(Boolean);

            // Format: /stremio/{uuid}/{encryptedPassword}/manifest.json
            // or:     /chilllink/{uuid}/{encryptedPassword}
            if (parts.length >= 3) {
                const modeIdx = parts[0] === 'stremio' || parts[0] === 'chilllink' ? 0 : -1;
                if (modeIdx >= 0) {
                    return {
                        host: parsed.origin,
                        uuid: parts[modeIdx + 1],
                        encryptedPassword: parts[modeIdx + 2],
                        transportUrl: url,
                    };
                }
            }
        } catch (e) {
            Logger.warn('QuickStart', 'Failed to parse addon URL:', url);
        }
        return null;
    }

    async cleanUpOldInstalls(preserveUuid, targetProfileIds) {
        const profiles = await this.api.getProfiles();
        const filtered = targetProfileIds
            ? profiles.filter(p => targetProfileIds.includes(p.id.toString()))
            : profiles;

        for (const profile of filtered) {
            const addons = await this.api.getAddons(profile.id);
            for (const addon of addons) {
                if (this.isRecognizedAddon(addon)) {
                    const parsed = this.parseAddonUrl(addon.transportUrl);
                    if (!parsed || parsed.uuid !== preserveUuid) {
                        await this.api.removeAddon(addon.transportUrl, profile.id);
                    }
                }
            }
        }
    }

    // --- AIOStreams Manifest Creation ---

    async createAIOStreamsManifest(password, existingAddon) {
        const state = this.state;

        // Build providers map
        const providersMap = { torbox: state.torboxKey };

        // Get random TMDB token
        const tmdbToken = await this.getRandomTmdbToken();

        // Build the config
        const config = await AIOStreamsAPI.populateJSON(
            providersMap,
            state.debridioKey || '',
            tmdbToken,
            state.formatterDefinition,
            state.exclude4k || false,
            state.excludeDolby || false,
            state.maxSize || 'unlimited',
            state.prioritizeQuality !== false
        );

        // Determine host
        let selectedHost = state.selectedHost;
        if (selectedHost === 'custom') {
            selectedHost = state.customHostURL;
        }

        const compatibilityMode = state.compatibilityMode || 'stremio';

        // Try to reuse existing addon
        if (existingAddon) {
            // If user picked a different host, can't reuse
            if (selectedHost && selectedHost !== 'auto' && existingAddon.host !== selectedHost) {
                existingAddon = null;
            }
        }

        if (existingAddon) {
            try {
                return await AIOStreamsAPI.updateConfigWithSmartRetry(
                    existingAddon.host,
                    config,
                    password,
                    existingAddon.uuid,
                    existingAddon.encryptedPassword,
                    compatibilityMode
                );
            } catch (err) {
                Logger.warn('QuickStart', 'Update failed, creating new:', err.message);
                // Fall through to create new
            }
        }

        // Create new manifest
        if (selectedHost && selectedHost !== 'auto') {
            return await AIOStreamsAPI.installConfigWithSmartRetry(selectedHost, config, password, compatibilityMode);
        }

        // Auto mode: try all hosts
        const hosts = AIOStreamsAPI.HOSTS;
        let lastError = null;

        for (const [name, hostUrl] of Object.entries(hosts)) {
            try {
                this.updateProgress(`Trying ${name}...`);
                const configCopy = structuredClone(config);
                return await AIOStreamsAPI.installConfigWithSmartRetry(hostUrl, configCopy, password, compatibilityMode);
            } catch (err) {
                Logger.warn('QuickStart', `Host ${name} failed:`, err.message);
                lastError = err;
            }
        }

        throw lastError || new Error('All AIOStreams hosts failed to generate a manifest URL.');
    }

    async getRandomTmdbToken() {
        if (this.tmdbTokens.length === 0) {
            try {
                this.tmdbTokens = await Network.request('/quickstart/locales.json', { cache: 'no-store' });
            } catch (err) {
                Logger.error('QuickStart', 'Failed to load TMDB tokens:', err);
                throw new Error('Failed to load configuration. Please refresh and try again.');
            }
        }

        const idx = Math.floor(Math.random() * this.tmdbTokens.length);
        return this.tmdbTokens[idx].v4ReadAccessToken;
    }

    // --- AIOMetadata (Nuvio only) ---

    async installAIOMetadata() {
        try {
            this.updateProgress('Setting up Nuvio catalogs...');

            // Load the AIOMetadata config
            let metaConfig;
            try {
                metaConfig = await Network.request('/quickstart/config/aiometadata-config.json', { cache: 'no-store' });
            } catch {
                Logger.warn('QuickStart', 'AIOMetadata config not found — skipping catalog setup.');
                return;
            }

            // Create manifest
            const result = await AIOMetadataAPI.installConfig(metaConfig);
            if (result?.manifestUrl) {
                await this.api.installAddon(result.manifestUrl, this.selectedProfileIds);
                Logger.debug('QuickStart', 'AIOMetadata collection installed successfully.');
            }
        } catch (err) {
            Logger.warn('QuickStart', 'AIOMetadata setup failed (non-critical):', err.message);
            // Non-critical — don't throw, just log
        }
    }

    // --- Nuvio Profile Picker ---

    async promptNuvioProfiles(profiles) {
        return new Promise((resolve) => {
            let html = '<div class="profile-picker"><div class="card-grid card-grid-3">';

            profiles.forEach(profile => {
                html += `
                    <label class="card card-selectable selected profile-card">
                        <input type="checkbox" class="profile-checkbox" value="${profile.id}" checked hidden>
                        <div class="card-title">${this.escapeHtml(profile.name)}</div>
                        <div class="card-check">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="20" height="20">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                    </label>
                `;
            });

            html += '</div></div>';

            Modal.custom(html, 'Select Profiles', [
                { text: 'Cancel', value: null, style: 'secondary' },
                { text: 'Confirm', value: 'confirm', style: 'primary' },
            ]).then(result => {
                if (result === null) {
                    resolve(null);
                    return;
                }

                // Set up toggle listeners after modal renders
                const checkboxes = document.querySelectorAll('.profile-checkbox:checked');
                const ids = Array.from(checkboxes).map(cb => cb.value);
                resolve(ids.length > 0 ? ids : null);
            });

            // After modal renders, add toggle behavior
            setTimeout(() => {
                document.querySelectorAll('.profile-card').forEach(card => {
                    card.addEventListener('click', () => {
                        const cb = card.querySelector('.profile-checkbox');
                        cb.checked = !cb.checked;
                        card.classList.toggle('selected', cb.checked);
                    });
                });
            }, 100);
        });
    }

    // --- Progress UI ---

    showProgress(message) {
        this.wizard.showWorking(`
            <div class="setup-progress">
                <div class="loading-spinner" style="width:48px; height:48px; margin: 0 auto 1.5rem;"></div>
                <h2 class="step-heading" id="progressMessage">${message}</h2>
                <div class="progress-log" id="progressLog"></div>
            </div>
        `);
    }

    updateProgress(message) {
        const el = document.getElementById('progressMessage');
        if (el) el.textContent = message;

        const log = document.getElementById('progressLog');
        if (log) {
            const entry = document.createElement('div');
            entry.className = 'progress-entry fade-in';
            entry.textContent = message;
            log.appendChild(entry);
        }
    }

    showSuccess(isNewAccount, email, password) {
        const serviceName = this.state.service === 'nuvio' ? 'Nuvio' : 'Stremio';

        let credentialsHtml = '';
        if (isNewAccount) {
            credentialsHtml = `
                <div class="credentials-card">
                    <h3 class="credentials-title">Your Credentials</h3>
                    <div class="credential-row">
                        <span class="credential-label">Email</span>
                        <span class="credential-value" id="cred-email">${this.escapeHtml(email)}</span>
                        <button class="btn btn-ghost btn-sm copy-btn" data-copy-target="cred-email">Copy</button>
                    </div>
                    <div class="credential-row">
                        <span class="credential-label">Password</span>
                        <span class="credential-value" id="cred-password">${this.escapeHtml(password)}</span>
                        <button class="btn btn-ghost btn-sm copy-btn" data-copy-target="cred-password">Copy</button>
                    </div>
                    <p class="credentials-note">Save these credentials — you'll need them to log in!</p>
                </div>
            `;
        }

        this.wizard.showResult(`
            <div class="success-screen">
                <div class="success-icon animate-scale-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" width="64" height="64">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01" class="animate-draw-check"/>
                    </svg>
                </div>
                <h2 class="step-heading">You're all set!</h2>
                <p class="step-description">Log into ${serviceName} and start streaming.</p>
                ${credentialsHtml}
                <div style="margin-top: 2rem;">
                    <a href="/" class="btn btn-primary">Back to EasyPeasy</a>
                </div>
            </div>
        `);

        // Set up copy buttons
        setTimeout(() => {
            Clipboard.setup();
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.copyTarget;
                    const el = document.getElementById(targetId);
                    if (el) {
                        navigator.clipboard.writeText(el.textContent).then(() => {
                            btn.textContent = 'Copied!';
                            setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                        });
                    }
                });
            });
        }, 100);
    }

    showManifestResult(manifestUrl, password) {
        this.wizard.showResult(`
            <div class="success-screen">
                <div class="success-icon animate-scale-in">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" width="64" height="64">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01" class="animate-draw-check"/>
                    </svg>
                </div>
                <h2 class="step-heading">Manifest Generated!</h2>
                <p class="step-description">Use the URL below to install the addon in your streaming client.</p>

                <div class="credentials-card">
                    <div class="credential-row">
                        <span class="credential-label">Manifest URL</span>
                        <span class="credential-value credential-url" id="manifest-url" title="${this.escapeHtml(manifestUrl)}">${this.escapeHtml(manifestUrl)}</span>
                        <button class="btn btn-ghost btn-sm copy-btn" data-copy-target="manifest-url">Copy</button>
                    </div>
                    <div class="credential-row">
                        <span class="credential-label">Password</span>
                        <span class="credential-value" id="manifest-password">${this.escapeHtml(password)}</span>
                        <button class="btn btn-ghost btn-sm copy-btn" data-copy-target="manifest-password">Copy</button>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <a href="/" class="btn btn-primary">Back to EasyPeasy</a>
                </div>
            </div>
        `);

        // Set up copy buttons
        setTimeout(() => {
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.dataset.copyTarget;
                    const el = document.getElementById(targetId);
                    if (el) {
                        navigator.clipboard.writeText(el.textContent).then(() => {
                            btn.textContent = 'Copied!';
                            setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
                        });
                    }
                });
            });
        }, 100);
    }

    showError(message) {
        this.wizard.showWorking(`
            <div class="error-screen">
                <div class="error-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2" width="64" height="64">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                </div>
                <h2 class="step-heading">Setup Failed</h2>
                <p class="step-description error-message">${this.escapeHtml(message)}</p>
                <button class="btn btn-primary" id="retryBtn">Try Again</button>
            </div>
        `);

        document.getElementById('retryBtn')?.addEventListener('click', () => {
            this.wizard.restoreNav();
        });
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
