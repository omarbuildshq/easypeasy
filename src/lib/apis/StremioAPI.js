/**
 * StremioAPI Class
 * Inherits from StreamingService for polymorphic streaming support.
 */

import StreamingService from './StreamingService.js';
import { ServiceSessionInstance } from '../ServiceSession.js';
import Network from '../utils/Network.js';
import Logger from '../utils/Logger.js';
import InputValidator from '../utils/InputValidator.js';

class StremioAPIProvider extends StreamingService {
    constructor() {
        super('stremio');
        this.baseUrl = "https://api.strem.io/api";
    }

    // Generic function to call Stremio API
    async _call(endpoint, body) {
        const payload = {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=UTF-8" },
            body: JSON.stringify(body)
        };

        const executeRequest = async (currentBody) => {
            const json = await Network.request(`${this.baseUrl}/${endpoint}`, {
                ...payload,
                body: JSON.stringify(currentBody)
            });

            if (json.error) {
                throw new Error(json.error.message);
            }
            return json;
        };

        try {
            return await executeRequest(body);
        } catch (err) {
            // Session expired - user must re-login manually
            if (err.message.includes("Session does not exist") && endpoint !== "login") {
                Logger.warn('StremioAPI', 'Session expired - user must re-authenticate', {});
                this.logout();
                // Re-throw with clear message
                throw new Error("Your session has expired. Please log in again.");
            }
            throw err;
        }
    }

    // Login to Stremio.
    async login(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            type: "Login",
            email: email,
            password: password
        };

        try {
            const data = await this._call("login", body);

            // Store ONLY email and authKey - NOT password
            ServiceSessionInstance.setSession(this.serviceName, email, data.result.authKey);

            // Zero out the password parameter for security
            password = null;

            Logger.debug('StremioAPI', 'User logged in successfully', { email });

            // Return session without password
            return this.getSession();
        } catch (error) {
            Logger.error('StremioAPI', 'Login failed', error, { email });
            throw error;
        }
    }

    // Logout - clear session and any stored credentials.
    async logout() {
        const session = this.getSession();
        // Optionally notify the server (best effort)
        if (session?.token) {
            try {
                await this._call("logout", {
                    type: "Logout",
                    // ServiceSession stores Stremio's authKey under the generic 'token' key
                    authKey: session.token
                });
            } catch (e) {
                // Logout may fail if session already expired - still continue
                Logger.warn('StremioAPI', 'Logout request failed (may already be expired)', {});
            }
        }

        // Clear session locally
        ServiceSessionInstance.clearSession(this.serviceName);

        // Clear any stored credentials from previous version
        sessionStorage.clear();
        localStorage.removeItem('lastEmail');
        localStorage.removeItem('lastPassword');

        Logger.debug('StremioAPI', 'User logged out');
    }

    // Register a new Stremio account.
    async register(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            type: "Register",
            email,
            password,
            gdpr_consent: {
                from: "web",
                time: new Date().toISOString()
            }
        };

        await this._call("register", body);
        Logger.debug('StremioAPI', 'Account registered successfully', { email });
    }

    // Get the addons for the account.
    async getAddons(profileId = null) {
        // If no session is found, throw an error.
        const session = this.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        const data = await this._call("addonCollectionGet", {
            type: "AddonCollectionGet",
            // ServiceSession stores Stremio's authKey under the generic 'token' key
            authKey: session.token
        });

        // Return the addons.
        return data.result.addons;
    }

    // Set the addons for the account.
    async setAddons(addons, profileId = null) {
        // If no session is found, throw an error.
        const session = this.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        await this._call("addonCollectionSet", {
            type: "AddonCollectionSet",
            // ServiceSession stores Stremio's authKey under the generic 'token' key
            authKey: session.token,
            addons: addons
        });
    }

    // Take in a manifest URL and install it to the account.
    async installAddon(manifestUrl) {
        // If no session is found, throw an error.
        const session = this.getSession();
        if (!session) {
            throw new Error("No active session found. Please log in first.");
        }

        // Get current addons
        const currentAddons = await this.getAddons();

        // Fetch manifest content
        const manifestJson = await Network.request(manifestUrl, { retries: 1 });

        // Validate manifest
        if (!manifestJson || typeof manifestJson !== 'object') {
            throw new Error("Invalid Manifest: Response is not a valid JSON object");
        }
        if (!manifestJson.id || !manifestJson.version || !manifestJson.name) {
            throw new Error(`Invalid Manifest: Missing required fields (id, version, name). Found: ${JSON.stringify(Object.keys(manifestJson))}`);
        }

        // Construct new addon object
        const newAddon = {
            transportUrl: manifestUrl,
            transportName: "http",
            manifest: manifestJson,
            flags: {
                official: false,
                protected: false
            }
        };

        // Save existing addons to a new list
        let newAddonsList = [...currentAddons];

        // Search for the addon we're installing
        const existingIndex = newAddonsList.findIndex(a => a.transportUrl === manifestUrl);

        if (existingIndex !== -1) {
            // If we found the addon that we're trying to install, update it.
            newAddonsList[existingIndex] = newAddon;
        } else {
            // If we didn't find the addon, add it.
            newAddonsList.push(newAddon);
        }

        // Save
        await this.setAddons(newAddonsList);
        Logger.debug('StremioAPI', 'Addon installed successfully', { manifestUrl: manifestUrl });
        return true;
    }
}

// Create and export singleton instance
const StremioAPI = new StremioAPIProvider();

export { StremioAPIProvider };
export default StremioAPI;
