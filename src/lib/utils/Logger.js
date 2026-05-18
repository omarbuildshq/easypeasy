/**
 * Secure Logging Utility
 * - Suppresses logs in production
 * - Filters sensitive data (passwords, tokens, keys)
 * - Uses ErrorHandler for error reporting to Honeybadger
 */
class Logger {
    // Debug logging
    static debug(component, message, data = {}) {
        console.log(`[${component}] ${message}`, this.#sanitize(data));
    }

    // Warning logging
    static warn(component, message, data = {}) {
        console.warn(`[${component}] ${message}`, this.#sanitize(data));
    }

    // Error logging - always reports to Honeybadger (but not sensitive data)
    static async error(component, message, error = null, data = {}) {
        console.error(`[${component}] ${message}`, error, this.#sanitize(data));

        // Report to Honeybadger if available
        if (typeof window !== 'undefined' && window.Honeybadger) {
            try {
                await Honeybadger.notify(error || new Error(message), {
                    component,
                    context: this.#sanitize(data)
                });
            } catch (e) {
                // Silently fail if Honeybadger is not available
                console.warn('[Logger] Failed to report to Honeybadger:', e);
            }
        }
    }

    // Remove sensitive data from logs
    static #sanitize(data) {
        if (!data || typeof data !== 'object') return data;

        const sanitized = { ...data };
        const sensitiveKeys = [
            'password', 'authKey', 'apiKey', 'token', 'refreshToken',
            'secret', 'privateKey', 'creditCard', 'ssn', 'sessionPassword', 'torboxKey'
        ];

        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '***REDACTED***';
            }
        });

        return sanitized;
    }
}

export default Logger;
