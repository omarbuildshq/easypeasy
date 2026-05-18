/**
 * Step 3 — TorBox
 * TorBox API key entry + optional Debridio key
 */

import Modal from '../../lib/utils/Modal.js';

export default class TorBoxStep {
    constructor(state) {
        this.state = state;
        this.title = 'TorBox';
    }

    render() {
        return `
            <div class="step-content">
                <h2 class="step-heading">TorBox API Key</h2>
                <p class="step-description">Enter your TorBox API key. This is required for streaming.</p>

                <div class="form-group">
                    <label class="form-label" for="torboxKey">API Key</label>
                    <input type="text" id="torboxKey" class="form-input" placeholder="Paste your TorBox API key" value="${this.state.torboxKey || ''}">
                    <div class="form-hint">
                        <a href="https://torbox.app/settings" target="_blank" rel="noopener">Get your API key</a>
                        &nbsp;&middot;&nbsp;
                        <a href="https://torbox.app/subscription" target="_blank" rel="noopener">Sign up for TorBox</a>
                    </div>
                </div>

                <details class="collapsible-section" ${this.state.debridioKey ? 'open' : ''}>
                    <summary class="collapsible-header">
                        <span>Debridio API Key</span>
                        <span class="collapsible-hint">(Optional)</span>
                    </summary>
                    <div class="collapsible-body">
                        <div class="form-group">
                            <label class="form-label" for="debridioKey">Debridio Key</label>
                            <input type="text" id="debridioKey" class="form-input" placeholder="Optional — enhances stream sources" value="${this.state.debridioKey || ''}">
                            <div class="form-hint">
                                <a href="https://debridio.com" target="_blank" rel="noopener">Learn more about Debridio</a>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        `;
    }

    afterRender() {
        const torboxInput = document.getElementById('torboxKey');
        const debridioInput = document.getElementById('debridioKey');

        torboxInput?.addEventListener('input', () => {
            this.state.torboxKey = torboxInput.value.trim();
        });
        debridioInput?.addEventListener('input', () => {
            this.state.debridioKey = debridioInput.value.trim();
        });
    }

    validate() {
        if (!this.state.torboxKey) {
            Modal.error('Please enter your TorBox API key.');
            return false;
        }
        return true;
    }

    getData() {
        // State already updated via listeners
    }
}
