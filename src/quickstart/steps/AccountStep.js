/**
 * Step 2 — Account
 * Account mode: Email + Password with Generate Random
 * Manifest mode: AIOStreams password + compatibility mode
 */

import CredentialGenerator from '../../lib/utils/CredentialGenerator.js';
import Modal from '../../lib/utils/Modal.js';

export default class AccountStep {
    constructor(state) {
        this.state = state;
        this.title = 'Account';
    }

    render() {
        const serviceName = this.state.service === 'nuvio' ? 'Nuvio' : 'Stremio';

        if (this.state.mode === 'manifest') {
            return `
                <div class="step-content">
                    <h2 class="step-heading">AIOStreams Password</h2>
                    <p class="step-description">Enter the password for your AIOStreams configuration.</p>

                    <div class="form-group">
                        <label class="form-label" for="aioPassword">AIOStreams Password</label>
                        <input type="password" id="aioPassword" class="form-input" placeholder="Enter your AIOStreams password" value="${this.state.aiostreamsPassword || ''}">
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="compatMode">Platform</label>
                        <select id="compatMode" class="form-input">
                            <option value="stremio" ${this.state.compatibilityMode === 'stremio' ? 'selected' : ''}>Stremio</option>
                            <option value="chilllink" ${this.state.compatibilityMode === 'chilllink' ? 'selected' : ''}>ChillLink</option>
                        </select>
                    </div>
                </div>
            `;
        }

        return `
            <div class="step-content">
                <h2 class="step-heading">${serviceName} Account</h2>
                <p class="step-description">Enter your ${serviceName} credentials, or generate random ones for a new account.</p>

                <div class="form-group">
                    <label class="form-label" for="email">${serviceName} Email</label>
                    <input type="email" id="email" class="form-input" placeholder="your@email.com" value="${this.state.email || ''}">
                </div>

                <div class="form-group">
                    <label class="form-label" for="password">${serviceName} Password</label>
                    <input type="password" id="password" class="form-input" placeholder="Enter password" value="${this.state.password || ''}">
                </div>

                <button type="button" id="generateCreds" class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="vertical-align: middle; margin-right: 0.25rem;">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generate Random
                </button>
            </div>
        `;
    }

    afterRender() {
        if (this.state.mode === 'manifest') {
            const aioInput = document.getElementById('aioPassword');
            const compatSelect = document.getElementById('compatMode');
            aioInput?.addEventListener('input', () => {
                this.state.aiostreamsPassword = aioInput.value.trim();
            });
            compatSelect?.addEventListener('change', () => {
                this.state.compatibilityMode = compatSelect.value;
            });
        } else {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const generateBtn = document.getElementById('generateCreds');

            emailInput?.addEventListener('input', () => {
                this.state.email = emailInput.value.trim();
            });
            passwordInput?.addEventListener('input', () => {
                this.state.password = passwordInput.value;
            });
            generateBtn?.addEventListener('click', () => {
                const creds = CredentialGenerator.generate();
                emailInput.value = creds.email;
                passwordInput.value = creds.password;
                passwordInput.type = 'text';
                this.state.email = creds.email;
                this.state.password = creds.password;
            });
        }
    }

    validate() {
        if (this.state.mode === 'manifest') {
            if (!this.state.aiostreamsPassword) {
                Modal.error('Please enter an AIOStreams password.');
                return false;
            }
            return true;
        }

        if (!this.state.email || !this.state.password) {
            const serviceName = this.state.service === 'nuvio' ? 'Nuvio' : 'Stremio';
            Modal.error(`Please enter your ${serviceName} email and password.`);
            return false;
        }
        return true;
    }

    getData() {
        // State is already updated via event listeners
    }
}
