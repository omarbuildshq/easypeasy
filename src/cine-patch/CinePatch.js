/**
 * CinePatch — Selective Cinemeta addon patcher
 * Allows removing Search, Catalogs, and/or Metadata from Cinemeta.
 * Stremio only.
 */

import StremioAPI from '../lib/apis/StremioAPI.js';
import Network from '../lib/utils/Network.js';
import Modal from '../lib/utils/Modal.js';
import Logger from '../lib/utils/Logger.js';

const CINEMETA_MANIFEST_URL = 'https://v3-cinemeta.strem.io/manifest.json';

export default class CinePatch {
    constructor() {
        this.state = { addons: [] };
        this.ui = {
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            applyBtn: document.getElementById('applyBtn'),
            patchSearch: document.getElementById('patchSearch'),
            patchCatalogs: document.getElementById('patchCatalogs'),
            patchMeta: document.getElementById('patchMeta'),
        };
    }

    init() {
        this.ui.applyBtn.addEventListener('click', (e) => this.handleApply(e));
    }

    async handleApply(e) {
        e.preventDefault();
        const email = this.ui.email.value.trim();
        const password = this.ui.password.value.trim();

        if (!email || !password) {
            Modal.error('Please enter your Stremio email and password.');
            return;
        }

        this.setLoading(true);

        try {
            // Login
            await StremioAPI.login(email, password);
            if (!StremioAPI.isAuthenticated()) {
                throw new Error('Login failed: No session created.');
            }

            // Fetch current addons
            this.state.addons = await StremioAPI.getAddons();

            // Fetch fresh Cinemeta manifest
            const freshManifest = await Network.request(CINEMETA_MANIFEST_URL);
            if (!freshManifest || !freshManifest.catalogs) {
                throw new Error('Failed to fetch Cinemeta manifest.');
            }

            // Read patch selections
            const doSearch = this.ui.patchSearch.checked;
            const doCatalogs = this.ui.patchCatalogs.checked;
            const doMeta = this.ui.patchMeta.checked;

            const applied = [];

            // Apply patches in order: Search -> Catalogs -> Metadata
            if (doSearch) {
                this.applySearchPatch(freshManifest);
                applied.push('Search');
            }

            if (doCatalogs) {
                // If search is NOT being removed, we need to preserve search capability
                this.applyCatalogsPatch(freshManifest, !doSearch);
                applied.push('Home Catalogs');
            }

            if (doMeta) {
                this.applyMetaPatch(freshManifest);
                applied.push('Metadata');
            }

            // Find existing Cinemeta or add new
            let cinemetaIndex = this.state.addons.findIndex(
                a => a.manifest?.name === 'Cinemeta' || a.manifest?.id === 'cinemeta'
            );

            if (cinemetaIndex !== -1) {
                this.state.addons[cinemetaIndex].manifest = freshManifest;
            } else {
                this.state.addons.push({
                    transportUrl: CINEMETA_MANIFEST_URL,
                    transportName: 'http',
                    manifest: freshManifest,
                    flags: { protected: true },
                });
            }

            // Save
            await StremioAPI.setAddons(this.state.addons);

            // Show result
            if (applied.length > 0) {
                Modal.success(`Patches applied: ${applied.join(', ')}. Restart your Stremio app to see the changes.`);
            } else {
                Modal.success('Cinemeta has been reset to its default configuration.');
            }

        } catch (err) {
            Logger.error('CinePatch', 'Patch failed:', err);
            Modal.error(err.message || 'Failed to apply patches.');
        } finally {
            this.setLoading(false);
        }
    }

    // Remove search catalogs and search extras from Popular catalogs
    applySearchPatch(manifest) {
        // Remove cinemeta.search catalogs
        manifest.catalogs = manifest.catalogs.filter(cat => {
            if (cat.id === 'cinemeta.search' && (cat.type === 'movie' || cat.type === 'series')) {
                return false;
            }
            return true;
        });

        // Remove search extra from "top" (Popular) catalogs
        manifest.catalogs.forEach(cat => {
            if (cat.id === 'top' && (cat.type === 'movie' || cat.type === 'series') && cat.extra) {
                cat.extra = cat.extra.filter(ex => ex.name !== 'search');
            }
        });
    }

    // Remove home catalogs. If preserveSearch is true, keep search capability hidden.
    applyCatalogsPatch(manifest, preserveSearch) {
        if (preserveSearch) {
            // Keep "top" catalogs but hide from home screen by marking search as required
            manifest.catalogs = manifest.catalogs.filter(cat => {
                // Keep search catalogs
                if (cat.id === 'cinemeta.search') return true;
                // Keep top catalogs (we'll hide them)
                if (cat.id === 'top' && (cat.type === 'movie' || cat.type === 'series')) {
                    // Make search extra required so they don't show on home screen
                    if (cat.extra) {
                        cat.extra.forEach(ex => {
                            if (ex.name === 'search') {
                                ex.isRequired = true;
                            }
                        });
                    }
                    return true;
                }
                // Remove year (New) and imdbRating (Featured) catalogs
                if ((cat.type === 'movie' || cat.type === 'series') &&
                    (cat.id === 'year' || cat.id === 'imdbRating')) {
                    return false;
                }
                return true;
            });
        } else {
            // Remove all catalogs except cinemeta.search (search patch will handle those)
            manifest.catalogs = manifest.catalogs.filter(cat => cat.id === 'cinemeta.search');
        }
    }

    // Remove meta resource
    applyMetaPatch(manifest) {
        manifest.resources = manifest.resources.filter(r => {
            const name = typeof r === 'string' ? r : r.name;
            return name !== 'meta';
        });
    }

    setLoading(isLoading) {
        this.ui.applyBtn.disabled = isLoading;
        this.ui.email.disabled = isLoading;
        this.ui.password.disabled = isLoading;
        this.ui.patchSearch.disabled = isLoading;
        this.ui.patchCatalogs.disabled = isLoading;
        this.ui.patchMeta.disabled = isLoading;
        this.ui.applyBtn.innerHTML = isLoading
            ? '<span class="loading-spinner"></span> Applying...'
            : 'Apply Patches';
    }
}
