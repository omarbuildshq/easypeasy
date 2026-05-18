/**
 * Step 5 — Review & Launch
 * Summary card with all selections, then launch setup
 */

export default class ReviewStep {
    constructor(state) {
        this.state = state;
        this.title = 'Review';
    }

    render() {
        const serviceName = this.state.service === 'nuvio' ? 'Nuvio' : 'Stremio';
        const modeName = this.state.mode === 'account' ? 'Full Setup' : 'Manifest Only';
        const hostLabel = this.getHostLabel();
        const formatterLabel = this.getFormatterLabel();
        const sizeLabel = !this.state.maxSize || this.state.maxSize === 'unlimited' ? 'No Limit' : `${this.state.maxSize} GB`;

        const accountSection = this.state.mode === 'account' ? `
            <div class="review-item">
                <span class="review-label">Email</span>
                <span class="review-value">${this.escapeHtml(this.state.email || '')}</span>
            </div>
        ` : '';

        const advancedItems = [];
        if (this.state.exclude4k) advancedItems.push('Exclude 4K');
        if (this.state.excludeDolby) advancedItems.push('Exclude DV');
        if (this.state.prioritizeQuality !== false) advancedItems.push('Quality priority');
        const advancedLabel = advancedItems.length > 0 ? advancedItems.join(', ') : 'Defaults';

        return `
            <div class="step-content">
                <h2 class="step-heading">Review Your Setup</h2>
                <p class="step-description">Everything look good? Hit Launch Setup to begin.</p>

                <div class="review-card">
                    <div class="review-item">
                        <span class="review-label">Service</span>
                        <span class="review-value">${serviceName}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Mode</span>
                        <span class="review-value">${modeName}</span>
                    </div>
                    ${accountSection}
                    <div class="review-item">
                        <span class="review-label">TorBox</span>
                        <span class="review-value">${this.state.torboxKey ? this.maskKey(this.state.torboxKey) : 'Not set'}</span>
                    </div>
                    ${this.state.debridioKey ? `
                    <div class="review-item">
                        <span class="review-label">Debridio</span>
                        <span class="review-value">${this.maskKey(this.state.debridioKey)}</span>
                    </div>` : ''}
                    <div class="review-item">
                        <span class="review-label">Host</span>
                        <span class="review-value">${hostLabel}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Formatter</span>
                        <span class="review-value">${formatterLabel}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Max Size</span>
                        <span class="review-value">${sizeLabel}</span>
                    </div>
                    <div class="review-item">
                        <span class="review-label">Advanced</span>
                        <span class="review-value">${advancedLabel}</span>
                    </div>
                </div>
            </div>
        `;
    }

    afterRender() {
        // No interactive elements beyond the Next/Launch button
    }

    validate() {
        return true;
    }

    getHostLabel() {
        const host = this.state.selectedHost;
        if (!host || host === 'auto') return 'Auto (Recommended)';
        if (host === 'custom') return this.state.customHostURL || 'Custom';
        // Find display name from HOSTS
        const hosts = Object.entries(
            // Import is not available here; we'll match by URL
            { Yeb: "https://aiostreams.fortheweak.cloud", ATBP: "https://aio.atbphosting.com", Omni: "https://aiostreams.12312023.xyz", Midnight: "https://aiostreamsfortheweebsstable.midnightignite.me", Kuu: "https://aiostreams.stremio.ru", ElfHosted: "https://aiostreams.elfhosted.com" }
        );
        const match = hosts.find(([, url]) => url === host);
        return match ? match[0] : host;
    }

    getFormatterLabel() {
        const fid = this.state.selectedFormatterId;
        if (fid === 'custom') return this.state.formatterFilename || 'Custom';
        // Capitalize first letter
        return fid ? fid.charAt(0).toUpperCase() + fid.slice(1) : 'Default';
    }

    maskKey(key) {
        if (!key || key.length < 8) return '****';
        return key.substring(0, 4) + '...' + key.substring(key.length - 4);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}
