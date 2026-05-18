/**
 * Clipboard Class
 * Handles copy-to-clipboard functionality for the application.
 */

import Logger from './Logger.js';
import Modal from './Modal.js';

class Clipboard {
    // Sets up copy buttons globally.
    static setup() {
        document.addEventListener("click", (e) => {
            const btn = e.target.closest('[data-copy]');
            if (!btn) return;

            const targetId = btn.dataset.copy;
            const target = document.getElementById(targetId);

            if (target) {
                const textToCopy = (target.textContent || target.innerText).trim();

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        this._showFeedback(btn);
                    }).catch(err => {
                        Logger.error('Clipboard', "Failed to copy text:", err);
                        this._showError();
                    });
                } else {
                    // Fallback for non-secure contexts
                    try {
                        const textArea = document.createElement("textarea");
                        textArea.value = textToCopy;

                        // Place off-screen to avoid scrolling
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        textArea.style.top = "0";

                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();

                        const successful = document.execCommand('copy');
                        document.body.removeChild(textArea);

                        if (successful) {
                            this._showFeedback(btn);
                        } else {
                            throw new Error("Fallback copy failed.");
                        }
                    } catch (err) {
                        Logger.error('Clipboard', "Fallback copy failed:", err);
                        this._showError();
                    }
                }
            }
        });
    }

    static _showError() {
        try {
            Modal.alert("Failed to copy text.");
        } catch (e) {
            alert("Failed to copy text.");
        }
    }

    static _showFeedback(btn) {
        // If it's an icon button (has class 'copy-icon-btn'):
        if (btn.classList.contains("copy-icon-btn")) {
            const originalHtml = btn.innerHTML;
            // Replace the button content with a Checkmark SVG icon
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            btn.classList.add("copied");

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove("copied");
            }, 1200);
        } else {
            // Fallback for standard text buttons
            const original = btn.textContent;
            btn.textContent = "Copied!";
            setTimeout(() => (btn.textContent = original), 1200);
        }
    }
}

export default Clipboard;
