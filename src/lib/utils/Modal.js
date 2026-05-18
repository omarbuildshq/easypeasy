/**
 * Modal Class
 * A lightweight, promise-based replacement for native alert/confirm/prompt.
 * Styleable via CSS.
 */
class Modal {
    static _createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'simple-modal-overlay';
        overlay.innerHTML = `
            <div class="simple-modal">
                <div class="simple-modal-header">
                    <div id="simpleModalIcon" class="icon-wrapper hidden"></div>
                    <div class="simple-modal-header-content">
                        <h3 id="simpleModalTitle"></h3>
                    </div>
                </div>
                <div class="simple-modal-body">
                    <div id="simpleModalContent"></div>
                    <div id="simpleModalInputContainer" class="simple-modal-input-container hidden" style="margin-top: 1rem;">
                        <input type="text" id="simpleModalInput" class="simple-modal-input">
                    </div>
                </div>
                <div class="simple-modal-footer" id="simpleModalFooter">
                    <!-- Buttons will be injected here -->
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    static _cleanup(overlay) {
        if (overlay && overlay.parentNode) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 200);
        }
    }

    /**
     * Generic show method for all modals
     * @param {Object} options
     * @param {string} options.title
     * @param {string} options.message
     * @param {string} [options.iconSvg]
     * @param {string} [options.iconColor]
     * @param {Array<{text: string, type: string, onClick: Function}>} options.buttons
     * @param {string} [options.inputType] - If present, shows input
     * @param {string} [options.inputValue]
     */
    static show(options) {
        return new Promise((resolve) => {
            const overlay = this._createOverlay();

            // Title
            overlay.querySelector('#simpleModalTitle').textContent = options.title || '';

            // Icon
            const iconWrapper = overlay.querySelector('#simpleModalIcon');
            if (options.iconSvg) {
                iconWrapper.innerHTML = options.iconSvg;
                iconWrapper.classList.remove('hidden');
                if (options.iconColor) {
                    iconWrapper.style.color = options.iconColor;
                }
            }

            // Content
            overlay.querySelector('#simpleModalContent').innerHTML = options.message || '';

            // Buttons
            const footer = overlay.querySelector('#simpleModalFooter');

            // If no buttons provided, add a default OK button
            const buttons = options.buttons || [{ text: 'OK', type: 'primary', onClick: () => true }];

            buttons.forEach(btn => {
                const buttonEl = document.createElement('button');
                buttonEl.className = `simple-modal-btn ${btn.type || 'secondary'}`;
                buttonEl.textContent = btn.text;
                buttonEl.onclick = () => {
                    const shouldClose = btn.onClick ? btn.onClick() : true;
                    if (shouldClose !== false) {
                        this._cleanup(overlay);
                        resolve(shouldClose);
                    }
                };
                footer.appendChild(buttonEl);
            });

            // Focus primary button
            const primaryBtn = footer.querySelector('.primary');
            if (primaryBtn) primaryBtn.focus();

            // Enter key support (triggers primary button if not input)
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !options.inputType) {
                    if (primaryBtn) primaryBtn.click();
                }
                if (e.key === 'Escape') {
                    // Find cancel button (secondary)
                    const cancelBtn = footer.querySelector('.secondary');
                    if (cancelBtn) cancelBtn.click();
                    else if (buttons.length === 1) primaryBtn.click(); // Close if only one button (Alert)
                }
            });

            // Input Handling (for prompt)
            if (options.inputType) {
                const inputContainer = overlay.querySelector('#simpleModalInputContainer');
                const input = overlay.querySelector('#simpleModalInput');
                inputContainer.classList.remove('hidden');
                input.value = options.inputValue || '';
                input.type = options.inputType || 'text';

                // Override Enter for input
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.stopPropagation(); // Prevent overlay listener
                        if (primaryBtn) primaryBtn.click();
                    }
                });

                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 50);

                // Attach the input element to the overlay for easy access
                overlay._inputElement = input;
            }
        });
    }

    static alert(message, title = "Alert", buttonText = "OK") {
        return this.show({
            title,
            message,
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            iconColor: '#3b82f6',
            buttons: [{ text: buttonText, type: 'primary', onClick: () => true }]
        });
    }

    static confirm(message, title = "Confirm") {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
                iconColor: '#3b82f6',
                buttons: [
                    { text: 'Cancel', type: 'secondary', onClick: () => { resolve(false); return true; } },
                    { text: 'Yes', type: 'primary', onClick: () => { resolve(true); return true; } }
                ]
            });
        });
    }

    static prompt(message, defaultValue = "", title = "Prompt") {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
                iconColor: '#3b82f6',
                inputType: 'text',
                inputValue: defaultValue,
                buttons: [
                    { text: 'Cancel', type: 'secondary', onClick: () => { resolve(null); return true; } },
                    {
                        text: 'OK',
                        type: 'primary',
                        onClick: () => {
                            const activeOverlay = document.querySelector('.simple-modal-overlay:last-child');
                            if (activeOverlay) {
                                const val = activeOverlay.querySelector('input').value;
                                resolve(val);
                                return true;
                            }
                            return true;
                        }
                    }
                ]
            });
        });
    }

    static error(message, title = "Error") {
        return this.show({
            title,
            message,
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
            iconColor: '#ef4444',
            buttons: [{ text: 'Close', type: 'primary', onClick: () => true }]
        });
    }

    static success(message, title = "Success") {
        return this.show({
            title,
            message,
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            iconColor: '#10b981',
            buttons: [{ text: 'OK', type: 'primary', onClick: () => true }]
        });
    }
}

export default Modal;
