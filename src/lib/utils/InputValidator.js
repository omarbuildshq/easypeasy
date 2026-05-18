/**
 * Input Validation Utilities
 * Validates and sanitizes user input to prevent injection attacks
 */
class InputValidator {
    // Validate email format
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate API key format (non-empty string, reasonable length)
    static isValidApiKey(apiKey) {
        return typeof apiKey === 'string' &&
            apiKey.length > 0 &&
            apiKey.length < 50 &&
            !/[\r\n\t]/.test(apiKey); // No control characters
    }

    // Escape HTML entities (for safe text display)
    static escapeHtml(text) {
        if (typeof text !== 'string') return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export default InputValidator;
