/**
 * ErrorHandler Class
 */

import Logger from './Logger.js';
import Modal from './Modal.js';

class ErrorHandler {
    constructor() {
        this.apiKey = "hbp_f6R9jIfXi40Li5ddpEf3AwislT57Ni3zLqtH";
        this.errorQueue = [];
        this.isBlocked = false;

        // Initialize immediately
        this.init();
    }

    init() {
        this.setupGlobalListeners();
        this.injectScript();

        ErrorHandler.instance = this;
    }

    setupGlobalListeners() {
        window.addEventListener('error', (event) => {
            if (event.error) {
                this.report(event.error, { component: 'Global', source: 'window.onerror' });
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason || new Error("Unhandled Promise Rejection");
            this.report(error, { component: 'Global', source: 'unhandledrejection' });
        });
    }

    injectScript() {
        const script = document.createElement('script');
        script.src = "https://js.honeybadger.io/v6.12/honeybadger.min.js";
        script.type = "text/javascript";
        script.async = true;

        script.onload = () => this.configure();
        script.onerror = () => {
            Logger.warn('ErrorHandler', "Honeybadger script failed to load. Likely blocked by an ad blocker.");
            this.isBlocked = true;
        };

        document.head.appendChild(script);
    }

    configure() {
        if (window.Honeybadger) {
            Honeybadger.configure({
                apiKey: this.apiKey,
                environment: "production",
                enableUncaught: false, // Prevent duplicate reporting (we handle this manually)
                enableUnhandledRejection: false // Prevent duplicate reporting (we handle this manually)
            });

            if (this.errorQueue.length > 0) {
                Logger.debug('ErrorHandler', `Flushing ${this.errorQueue.length} queued errors to Honeybadger`);
                this.errorQueue.forEach((item) => {
                    Honeybadger.notify(item.err, item.options);
                });
                this.errorQueue = [];
            }
        }
    }

    /**
     * Report an error to the backend (Honeybadger)
     */
    report(err, options = {}) {
        const isError = err instanceof Error || (err && err.stack && err.message);
        const errorObj = isError ? err : new Error(String(err));

        if (ErrorHandler.isUserError(errorObj)) {
            Logger.warn('ErrorHandler', "Skipping Honeybadger report for user error:", { message: errorObj.message });
            return;
        }

        if (window.Honeybadger) {
            Logger.error('ErrorHandler', "Reporting error to Honeybadger:", errorObj);
            try {
                Honeybadger.notify(errorObj, options);
            } catch (notifyErr) {
                Logger.warn('ErrorHandler', "Failed to report error to Honeybadger:", notifyErr);
            }
        } else {
            Logger.warn('ErrorHandler', "Honeybadger not loaded yet, queuing error:", { message: errorObj.message, stack: errorObj.stack });
            this.errorQueue.push({ err: errorObj, options });
        }
    }

    // Static Accessors for Ease of Use

    /**
     * Handle an error by showing a modal and reporting it.
     */
    static handle(err, context = {}, customTitle = "Error") {
        // Recursion Guard
        if (ErrorHandler.isHandlingError) {
            Logger.error('ErrorHandler', "Recursive error detected in ErrorHandler. Suppressing UI to prevent stack overflow.", err);
            return;
        }

        ErrorHandler.isHandlingError = true;

        try {
            const errorObj = (err instanceof Error) ? err : new Error(String(err));

            // 1. Show UI Feedback
            try {
                Modal.error(errorObj.message, customTitle);
            } catch (modalErr) {
                Logger.error('ErrorHandler', "Failed to show error modal:", modalErr);
                // Fallback to native alert if Modal fails
                alert(`${customTitle}: ${errorObj.message}`);
            }

            // 2. Report to Backend
            this.report(errorObj, context);
        } finally {
            ErrorHandler.isHandlingError = false;
        }
    }

    /**
     * Report an error to the backend without showing a modal.
     */
    static report(err, context = {}) {
        if (ErrorHandler.instance) {
            ErrorHandler.instance.report(err, context);
        }
    }

    /**
     * Determines if an error is a safe "User Error" that shouldn't be reported.
     */
    static isUserError(err) {
        if (!err) return false;

        const msg = (err.message || "").toLowerCase();
        const stack = (err.stack || "").toLowerCase();
        const errorContent = msg + stack;

        const IGNORED_PHRASES = [
            // Auth / StremioAPI
            "invalid email",
            "user not found",
            "wrong passphrase",
            "incorrect password",
            "session does not exist",
            "user already exists",

            // Validation
            "please enter",
            "required",
            "new password is too short",
            "invalid uuid or password",

            // Addon / Network specific
            "failed to fetch",
            "network error",
            "abort error",
            "all aiostreams hosts failed",
            "network connection lost",
            "too many requests from this ip",
            "trap returned falsish for property 'tronlinkparams'",

            // External / Extensions (Noise reduction)
            "webkit-masked-url", // Safari extensions
            "moz-extension",     // Firefox extensions
            "chrome-extension",  // Chrome extensions
            "<shell-plugins-site-config>",
            "walletRouter"
        ];

        return IGNORED_PHRASES.some(phrase => errorContent.includes(phrase));
    }

    /**
     * Checks if Honeybadger (error tracking) was blocked/failed to load.
     */
    static isBlocked() {
        return ErrorHandler.instance ? ErrorHandler.instance.isBlocked : false;
    }
}

// Initialize
new ErrorHandler();

export default ErrorHandler;
