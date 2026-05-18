/**
 * AddonButler — Drag-and-drop addon reordering tool
 * Supports both Stremio and Nuvio.
 */

import StremioAPI from '../lib/apis/StremioAPI.js';
import NuvioAPI from '../lib/apis/NuvioAPI.js';
import Modal from '../lib/utils/Modal.js';
import Logger from '../lib/utils/Logger.js';

export default class AddonButler {
    constructor() {
        this.state = {
            addons: [],
            savedOrder: [],
            savedAddons: [],
            isLoggedIn: false,
            isSaving: false,
            pendingChanges: false,
        };
        this.drag = { sourceIndex: null, targetIndex: null };
        this.service = 'stremio';
        this.api = StremioAPI;
        this.activeProfileId = null; // Nuvio requires a profile ID

        this.ui = {
            loginSection: document.getElementById('loginSection'),
            addonSection: document.getElementById('addonSection'),
            email: document.getElementById('email'),
            password: document.getElementById('password'),
            loginBtn: document.getElementById('loginBtn'),
            loggedInHeader: document.getElementById('loggedInHeader'),
            addonContainer: document.getElementById('addonContainer'),
            reorderActions: document.getElementById('reorderActions'),
            applyBtn: document.getElementById('applyReorderBtn'),
            cancelBtn: document.getElementById('cancelReorderBtn'),
        };
    }

    init() {
        this.ui.loginBtn.addEventListener('click', (e) => this.handleLogin(e));
        this.ui.applyBtn.addEventListener('click', () => this.applyReorder());
        this.ui.cancelBtn.addEventListener('click', () => this.cancelReorder());

        // Service toggle
        document.querySelectorAll('input[name="service"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.service = e.target.value;
                this.api = this.service === 'nuvio' ? NuvioAPI : StremioAPI;
            });
        });
    }

    switchView(viewName) {
        this.ui.loginSection.classList.toggle('hidden', viewName !== 'login');
        this.ui.addonSection.classList.toggle('hidden', viewName !== 'app');
    }

    setPendingNotice(visible) {
        this.ui.reorderActions.classList.toggle('hidden', !visible);
        this.state.pendingChanges = visible;
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = this.ui.email.value.trim();
        const password = this.ui.password.value.trim();

        if (!email || !password) {
            Modal.error('Please enter your email and password.');
            return;
        }

        this.setLoginLoading(true);

        try {
            await this.api.login(email, password);
            if (!this.api.isAuthenticated()) {
                throw new Error('Login failed: No session created.');
            }

            // For Nuvio, we need a profile ID to fetch addons
            if (this.service === 'nuvio') {
                const profiles = await this.api.getProfiles();
                if (profiles.length > 1) {
                    // Let user pick a profile
                    const profileId = await this.promptProfileSelection(profiles);
                    if (!profileId) return; // User cancelled
                    this.activeProfileId = profileId;
                } else {
                    this.activeProfileId = profiles[0]?.id || 1;
                }
            } else {
                this.activeProfileId = null;
            }

            const addons = await this.api.getAddons(this.activeProfileId);
            this.state.addons = addons;
            this.state.savedOrder = this.getOrderSnapshot(addons);
            this.state.savedAddons = this.deepClone(addons);
            this.state.isLoggedIn = true;

            this.showLoggedInUI(email);
            this.renderAddonList();
            this.switchView('app');
        } catch (err) {
            Logger.error('AddonButler', 'Login failed:', err);
            Modal.error(err.message || 'Login failed. Please check your credentials.');
        } finally {
            this.setLoginLoading(false);
        }
    }

    handleLogout() {
        this.api.logout();
        this.state = { addons: [], savedOrder: [], savedAddons: [], isLoggedIn: false, isSaving: false, pendingChanges: false };
        this.activeProfileId = null;
        this.ui.addonContainer.innerHTML = '';
        this.ui.loggedInHeader.innerHTML = '';
        this.setPendingNotice(false);
        this.switchView('login');
    }

    async promptProfileSelection(profiles) {
        return new Promise((resolve) => {
            let html = '<div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">';
            profiles.forEach(p => {
                html += `<button class="btn btn-secondary profile-pick-btn" data-id="${p.id}" style="width:100%">${this.escapeHtml(p.name || `Profile ${p.id}`)}</button>`;
            });
            html += '</div>';

            Modal.custom(html, 'Select a Profile', [
                { text: 'Cancel', value: null, style: 'secondary' },
            ]).then(result => {
                resolve(result);
            });

            // After modal renders, attach click listeners to profile buttons
            setTimeout(() => {
                document.querySelectorAll('.profile-pick-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        // Close the modal by clicking the overlay
                        const overlay = document.querySelector('.modal-overlay');
                        if (overlay) overlay.remove();
                        resolve(parseInt(id, 10));
                    });
                });
            }, 100);
        });
    }

    showLoggedInUI(email) {
        this.ui.loggedInHeader.innerHTML = `
            <div class="user-pill">
                <span>Logged in as <strong>${this.escapeHtml(email)}</strong></span>
                <button id="logoutLink" class="btn btn-ghost btn-sm">Logout</button>
            </div>
        `;
        document.getElementById('logoutLink')?.addEventListener('click', () => this.handleLogout());
    }

    renderAddonList() {
        this.ui.addonContainer.innerHTML = '';

        if (!this.state.addons.length) {
            this.ui.addonContainer.innerHTML = '<div class="empty-state"><p>No addons found.</p></div>';
            return;
        }

        this.state.addons.forEach((addon, index) => {
            this.ui.addonContainer.appendChild(this.buildAddonItem(addon, index));
        });

        this.attachDragListeners();
        this.attachToggleListeners();
    }

    buildAddonItem(addon, index) {
        const item = document.createElement('div');
        item.className = 'butler-addon-item';
        item.draggable = true;
        item.dataset.index = index;

        const name = addon.manifest?.name || 'Unknown Addon';
        const logo = addon.manifest?.logo || '';
        const isProtected = addon.flags?.protected ?? false;
        const isConfigurable = addon.manifest?.behaviorHints?.configurable ?? false;

        item.innerHTML = `
            <div class="butler-drag-handle">
                <svg width="12" height="20" viewBox="0 0 12 20"><circle cx="3" cy="4" r="1.5" fill="currentColor"/><circle cx="9" cy="4" r="1.5" fill="currentColor"/><circle cx="3" cy="10" r="1.5" fill="currentColor"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="3" cy="16" r="1.5" fill="currentColor"/><circle cx="9" cy="16" r="1.5" fill="currentColor"/></svg>
            </div>
            <div class="butler-addon-icon">
                ${logo ? `<img src="${this.escapeHtml(logo)}" alt="" onerror="this.parentElement.innerHTML='<div class=addon-icon-fallback>&#x1F9E9;</div>'">` : '<div class="addon-icon-fallback">&#x1F9E9;</div>'}
            </div>
            <div class="butler-addon-name" title="${this.escapeHtml(name)}">${this.escapeHtml(name)}</div>
            <div class="addon-controls">
                <div class="addon-control-pair">
                    <div class="control-header">
                        <span class="addon-control-label-text">Uninstall</span>
                        <span class="addon-control-status ${isProtected ? 'blocked' : 'allowed'}">${isProtected ? 'Blocked' : 'Allowed'}</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-index="${index}" data-field="protected" ${!isProtected ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="control-divider"></div>
                <div class="addon-control-pair">
                    <div class="control-header">
                        <span class="addon-control-label-text">Configure</span>
                        <span class="addon-control-status ${isConfigurable ? 'allowed' : 'blocked'}">${isConfigurable ? 'Allowed' : 'Blocked'}</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" data-index="${index}" data-field="configurable" ${isConfigurable ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;

        return item;
    }

    attachToggleListeners() {
        this.ui.addonContainer.querySelectorAll('.toggle-switch input').forEach(cb => {
            cb.addEventListener('change', (e) => this.handleToggleChange(e));
        });
    }

    handleToggleChange(e) {
        const cb = e.target;
        const index = parseInt(cb.dataset.index);
        const field = cb.dataset.field;
        const addon = this.state.addons[index];
        if (!addon) return;

        if (field === 'protected') {
            addon.flags = addon.flags || {};
            addon.flags.protected = !cb.checked;
        } else if (field === 'configurable') {
            addon.manifest.behaviorHints = addon.manifest.behaviorHints || {};
            addon.manifest.behaviorHints.configurable = cb.checked;
        }

        // Update status label
        const pair = cb.closest('.addon-control-pair');
        const status = pair.querySelector('.addon-control-status');
        const isOn = cb.checked;
        status.textContent = isOn ? 'Allowed' : 'Blocked';
        status.className = `addon-control-status ${isOn ? 'allowed' : 'blocked'}`;

        this.setPendingNotice(true);
    }

    attachDragListeners() {
        this.ui.addonContainer.querySelectorAll('.butler-addon-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.onDragStart(e, item));
            item.addEventListener('dragend', (e) => this.onDragEnd(e, item));
            item.addEventListener('dragover', (e) => this.onDragOver(e, item));
            item.addEventListener('dragleave', (e) => this.onDragLeave(e, item));
            item.addEventListener('drop', (e) => this.onDrop(e, item));
        });
    }

    onDragStart(e, item) {
        this.drag.sourceIndex = parseInt(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.index);
    }

    onDragEnd(e, item) {
        item.classList.remove('dragging');
        this.ui.addonContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }

    onDragOver(e, item) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const idx = parseInt(item.dataset.index);
        if (idx !== this.drag.sourceIndex) {
            item.classList.add('drag-over');
        }
    }

    onDragLeave(e, item) {
        item.classList.remove('drag-over');
    }

    onDrop(e, item) {
        e.preventDefault();
        item.classList.remove('drag-over');

        const fromIndex = this.drag.sourceIndex;
        const toIndex = parseInt(item.dataset.index);
        if (fromIndex === toIndex) return;

        const addons = [...this.state.addons];
        const [moved] = addons.splice(fromIndex, 1);
        addons.splice(toIndex, 0, moved);
        this.state.addons = addons;

        this.drag = { sourceIndex: null, targetIndex: null };
        this.renderAddonList();
        this.setPendingNotice(true);
    }

    async applyReorder() {
        if (this.state.isSaving) return;
        this.state.isSaving = true;
        this.ui.applyBtn.disabled = true;
        this.ui.applyBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

        try {
            // Conflict check
            const freshAddons = await this.api.getAddons(this.activeProfileId);
            const freshOrder = this.getOrderSnapshot(freshAddons);

            if (freshOrder.length !== this.state.savedOrder.length ||
                freshOrder.some((id, i) => id !== this.state.savedOrder[i])) {
                Modal.error('Your addons were changed from another device. Please log out and back in to refresh.');
                return;
            }

            await this.api.setAddons(this.state.addons, this.activeProfileId);
            this.state.savedOrder = this.getOrderSnapshot(this.state.addons);
            this.state.savedAddons = this.deepClone(this.state.addons);
            this.setPendingNotice(false);
            Modal.success('Changes saved successfully!');
        } catch (err) {
            Logger.error('AddonButler', 'Save failed:', err);
            Modal.error(err.message || 'Failed to save changes.');
        } finally {
            this.state.isSaving = false;
            this.ui.applyBtn.disabled = false;
            this.ui.applyBtn.textContent = 'Apply Changes';
        }
    }

    cancelReorder() {
        this.state.addons = this.deepClone(this.state.savedAddons);
        this.setPendingNotice(false);
        this.renderAddonList();
    }

    getOrderSnapshot(addons) {
        return addons.map(a => a.transportUrl || a.manifest?.id);
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    setLoginLoading(isLoading) {
        this.ui.loginBtn.disabled = isLoading;
        this.ui.email.disabled = isLoading;
        this.ui.password.disabled = isLoading;
        this.ui.loginBtn.innerHTML = isLoading
            ? '<span class="loading-spinner"></span> Loading...'
            : 'Load Addons';
    }
}
