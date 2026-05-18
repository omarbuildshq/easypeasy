/**
 * Step 4 — Preferences
 * AIOStreams host, formatter, and advanced options
 */

import AIOStreamsAPI from '../../lib/apis/AIOStreamsAPI.js';
import Network from '../../lib/utils/Network.js';
import Logger from '../../lib/utils/Logger.js';

export default class PreferencesStep {
    constructor(state) {
        this.state = state;
        this.title = 'Preferences';
        this.formatters = {};
        this.defaultFormatterId = null;
    }

    render() {
        // Build host options
        const hosts = AIOStreamsAPI.HOSTS;
        let hostOptions = '<option value="auto" selected>Auto (Recommended)</option>';
        for (const [name, url] of Object.entries(hosts)) {
            const sel = this.state.selectedHost === url ? 'selected' : '';
            hostOptions += `<option value="${url}" ${sel}>${name}</option>`;
        }
        hostOptions += `<option value="custom" ${this.state.selectedHost === 'custom' ? 'selected' : ''}>Custom (Private)</option>`;

        const showCustomHost = this.state.selectedHost === 'custom' ? '' : 'style="display:none"';

        return `
            <div class="step-content">
                <h2 class="step-heading">Preferences</h2>
                <p class="step-description">Customize your setup. Defaults work great — feel free to just click Next.</p>

                <div class="form-group">
                    <label class="form-label" for="hostSelect">AIOStreams Host</label>
                    <select id="hostSelect" class="form-input">${hostOptions}</select>
                    <div id="customHostWrap" ${showCustomHost}>
                        <input type="url" id="customHostURL" class="form-input" placeholder="https://your-host.com" value="${this.state.customHostURL || ''}" style="margin-top: 0.5rem;">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="formatSelect">Formatter</label>
                    <select id="formatSelect" class="form-input">
                        <option value="">Loading...</option>
                    </select>
                    <div id="formatPreviewWrap" class="format-preview" style="display:none; margin-top:0.75rem;">
                        <img id="formatPreviewImage" src="" alt="" style="max-width:100%; border-radius:0.5rem; border:1px solid var(--border);">
                    </div>
                    <div id="customFormatterWrap" style="display:none; margin-top:0.5rem;">
                        <label class="form-label" for="customFormatterFile">Upload Formatter JSON</label>
                        <input type="file" id="customFormatterFile" accept=".json" class="form-input">
                        <div id="formatterFileName" class="form-hint" style="display:none;"></div>
                    </div>
                </div>

                <details class="collapsible-section">
                    <summary class="collapsible-header">Advanced Options</summary>
                    <div class="collapsible-body">
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="exclude4k" ${this.state.exclude4k ? 'checked' : ''}>
                                <span>Exclude 4K / UHD</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="excludeDolby" ${this.state.excludeDolby ? 'checked' : ''}>
                                <span>Exclude Dolby Vision</span>
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="prioritizeQuality" ${this.state.prioritizeQuality !== false ? 'checked' : ''}>
                                <span>Prioritize quality over resolution</span>
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Max File Size</label>
                            <div class="preset-group" id="sizePresets">
                                <button type="button" class="preset-btn ${this.state.maxSize === 'unlimited' || !this.state.maxSize ? 'active' : ''}" data-value="unlimited">No Limit</button>
                                <button type="button" class="preset-btn ${this.state.maxSize === '5' ? 'active' : ''}" data-value="5">5 GB</button>
                                <button type="button" class="preset-btn ${this.state.maxSize === '10' ? 'active' : ''}" data-value="10">10 GB</button>
                                <button type="button" class="preset-btn ${this.state.maxSize === '15' ? 'active' : ''}" data-value="15">15 GB</button>
                                <button type="button" class="preset-btn ${this.state.maxSize === '25' ? 'active' : ''}" data-value="25">25 GB</button>
                                <button type="button" class="preset-btn ${this.state.maxSize === '50' ? 'active' : ''}" data-value="50">50 GB</button>
                            </div>
                        </div>

                        <div class="form-group" ${this.state.mode === 'account' ? '' : 'style="display:none"'}>
                            <label class="checkbox-label">
                                <input type="checkbox" id="cleanupOld" ${this.state.cleanupOldInstalls !== false ? 'checked' : ''}>
                                <span>Clean up old AIOStreams installs</span>
                            </label>
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    async afterRender() {
        // Host selection
        const hostSelect = document.getElementById('hostSelect');
        const customHostWrap = document.getElementById('customHostWrap');
        const customHostURL = document.getElementById('customHostURL');

        hostSelect?.addEventListener('change', () => {
            const val = hostSelect.value;
            this.state.selectedHost = val;
            customHostWrap.style.display = val === 'custom' ? '' : 'none';
        });
        customHostURL?.addEventListener('input', () => {
            this.state.customHostURL = customHostURL.value.trim();
        });

        // Checkboxes
        document.getElementById('exclude4k')?.addEventListener('change', (e) => {
            this.state.exclude4k = e.target.checked;
        });
        document.getElementById('excludeDolby')?.addEventListener('change', (e) => {
            this.state.excludeDolby = e.target.checked;
        });
        document.getElementById('prioritizeQuality')?.addEventListener('change', (e) => {
            this.state.prioritizeQuality = e.target.checked;
        });
        document.getElementById('cleanupOld')?.addEventListener('change', (e) => {
            this.state.cleanupOldInstalls = e.target.checked;
        });

        // Size presets
        document.getElementById('sizePresets')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-btn');
            if (!btn) return;
            document.querySelectorAll('#sizePresets .preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.state.maxSize = btn.dataset.value;
        });

        // Load formatters
        await this.loadFormatters();

        // Formatter selection
        const formatSelect = document.getElementById('formatSelect');
        formatSelect?.addEventListener('change', () => {
            this.handleFormatterSelection(formatSelect.value);
        });

        // Custom formatter upload
        document.getElementById('customFormatterFile')?.addEventListener('change', (e) => {
            this.handleCustomFormatterUpload(e);
        });
    }

    async loadFormatters() {
        const formatSelect = document.getElementById('formatSelect');
        if (!formatSelect) return;

        try {
            const index = await Network.request('/quickstart/config/formatters/index.json', { cache: 'no-store' });

            // Parse folder names: "1.Duck" → { order: 1, name: "Duck", id: "duck" }
            const parsed = index.map(folder => {
                const dotIdx = folder.indexOf('.');
                return {
                    folder,
                    order: parseInt(folder.substring(0, dotIdx)),
                    name: folder.substring(dotIdx + 1),
                    id: folder.substring(dotIdx + 1).toLowerCase(),
                };
            }).sort((a, b) => a.order - b.order);

            // Load each formatter definition
            for (const f of parsed) {
                const def = await Network.request(`/quickstart/config/formatters/${f.folder}/formatter.json`, { cache: 'no-store' });
                const previewUrl = `/quickstart/config/formatters/${f.folder}/preview.png`;
                this.formatters[f.id] = { id: f.id, name: f.name, definition: def, image: previewUrl };
            }

            // Populate dropdown
            formatSelect.innerHTML = '';
            for (const f of parsed) {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name;
                formatSelect.appendChild(opt);
            }

            // Add custom option
            const customOpt = document.createElement('option');
            customOpt.value = 'custom';
            customOpt.textContent = 'Custom (Upload)';
            formatSelect.appendChild(customOpt);

            // Set default
            this.defaultFormatterId = parsed[0]?.id;
            if (this.state.selectedFormatterId && (this.formatters[this.state.selectedFormatterId] || this.state.selectedFormatterId === 'custom')) {
                formatSelect.value = this.state.selectedFormatterId;
            } else {
                formatSelect.value = this.defaultFormatterId;
                this.state.selectedFormatterId = this.defaultFormatterId;
            }

            this.handleFormatterSelection(formatSelect.value);
        } catch (err) {
            Logger.error('PreferencesStep', 'Failed to load formatters:', err);
            formatSelect.innerHTML = '<option value="">Failed to load</option>';
        }
    }

    handleFormatterSelection(formatterId) {
        this.state.selectedFormatterId = formatterId;
        const previewWrap = document.getElementById('formatPreviewWrap');
        const previewImg = document.getElementById('formatPreviewImage');
        const customWrap = document.getElementById('customFormatterWrap');

        if (formatterId === 'custom') {
            previewWrap.style.display = 'none';
            customWrap.style.display = '';
            return;
        }

        customWrap.style.display = 'none';
        const formatter = this.formatters[formatterId];
        if (formatter?.image) {
            previewImg.src = formatter.image;
            previewImg.alt = `${formatter.name} Preview`;
            previewImg.onload = () => { previewWrap.style.display = ''; };
            previewImg.onerror = () => { previewWrap.style.display = 'none'; };
        } else {
            previewWrap.style.display = 'none';
        }
    }

    handleCustomFormatterUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const def = JSON.parse(evt.target.result);
                if (def && typeof def === 'object' && def.name && def.description) {
                    this.state.customFormatterDefinition = def;
                    this.state.formatterFilename = file.name;
                    const nameEl = document.getElementById('formatterFileName');
                    if (nameEl) {
                        nameEl.textContent = `Loaded: ${file.name}`;
                        nameEl.style.display = '';
                    }
                } else {
                    Logger.warn('PreferencesStep', 'Invalid formatter JSON');
                }
            } catch (err) {
                Logger.error('PreferencesStep', 'Error parsing formatter:', err);
            }
        };
        reader.readAsText(file);
    }

    validate() {
        return true;
    }

    getData() {
        // Resolve the actual formatter definition to use
        const fid = this.state.selectedFormatterId;
        if (fid === 'custom') {
            this.state.formatterDefinition = this.state.customFormatterDefinition || this.formatters[this.defaultFormatterId]?.definition;
        } else {
            this.state.formatterDefinition = this.formatters[fid]?.definition;
        }
    }
}
