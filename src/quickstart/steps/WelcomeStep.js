/**
 * Step 1 — Welcome
 * Service selection (Stremio / Nuvio) + mode selection (Account / Manifest Only)
 */

export default class WelcomeStep {
    constructor(state) {
        this.state = state;
        this.title = 'Welcome';
    }

    render() {
        return `
            <div class="step-content">
                <h2 class="step-heading">Choose your streaming service</h2>
                <p class="step-description">Select the platform you want to set up.</p>

                <div class="card-grid card-grid-2">
                    <label class="card card-selectable ${this.state.service === 'stremio' ? 'selected' : ''}">
                        <input type="radio" name="service" value="stremio" ${this.state.service === 'stremio' ? 'checked' : ''} hidden>
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
                                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <div class="card-title">Stremio</div>
                        <div class="card-subtitle">Popular streaming client</div>
                    </label>

                    <label class="card card-selectable ${this.state.service === 'nuvio' ? 'selected' : ''}">
                        <input type="radio" name="service" value="nuvio" ${this.state.service === 'nuvio' ? 'checked' : ''} hidden>
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
                                <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                        </div>
                        <div class="card-title">Nuvio</div>
                        <div class="card-subtitle">Premium streaming experience</div>
                    </label>
                </div>

                <h2 class="step-heading" style="margin-top: 2rem;">Setup mode</h2>
                <p class="step-description">Choose how you want to set things up.</p>

                <div class="card-grid card-grid-2">
                    <label class="card card-selectable ${this.state.mode === 'account' ? 'selected' : ''}">
                        <input type="radio" name="mode" value="account" ${this.state.mode === 'account' ? 'checked' : ''} hidden>
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
                                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                        </div>
                        <div class="card-title">Full Setup</div>
                        <div class="card-subtitle">Create account + install addon</div>
                    </label>

                    <label class="card card-selectable ${this.state.mode === 'manifest' ? 'selected' : ''}">
                        <input type="radio" name="mode" value="manifest" ${this.state.mode === 'manifest' ? 'checked' : ''} hidden>
                        <div class="card-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
                                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                            </svg>
                        </div>
                        <div class="card-title">Manifest Only</div>
                        <div class="card-subtitle">Generate addon URL only</div>
                    </label>
                </div>
            </div>
        `;
    }

    afterRender() {
        // Service radio handlers
        document.querySelectorAll('input[name="service"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.service = e.target.value;
                document.querySelectorAll('input[name="service"]').forEach(r => {
                    r.closest('.card-selectable').classList.toggle('selected', r.checked);
                });
            });
        });

        // Mode radio handlers
        document.querySelectorAll('input[name="mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.state.mode = e.target.value;
                document.querySelectorAll('input[name="mode"]').forEach(r => {
                    r.closest('.card-selectable').classList.toggle('selected', r.checked);
                });
            });
        });
    }

    validate() {
        return true;
    }

    getData() {
        // State is already updated via event listeners
    }
}
