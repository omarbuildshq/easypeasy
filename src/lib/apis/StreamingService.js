// Base class for all Streaming Services.
// Defines the mandatory interface for service-agnostic operations.

import { ServiceSessionInstance } from '../ServiceSession.js';

class StreamingService {
    // Constructor
    constructor(serviceName) {
        this.serviceName = serviceName;
    }

    // Log in to the service.
    async login(email, password) {
        throw new Error("Method 'login()' must be implemented.");
    }

    // Log out from the service.
    async logout() {
        throw new Error("Method 'logout()' must be implemented.");
    }

    // Register a new account.
    async register(email, password) {
        throw new Error("Method 'register()' must be implemented.");
    }

    // Ensure account exists by trying register then login.
    async ensureAccount(email, password) {
        let isNewAccount = false;
        try {
            await this.register(email, password);
            isNewAccount = true;
        } catch (e) {
            // Check if error is "already exists" - service specific implementations
            // might need to override this check if error messages differ significantly.
            if (!this.isAccountExistsError(e)) {
                throw e;
            }
        }
        await this.login(email, password);
        return isNewAccount;
    }

    // Check if an error indicates the account already exists.
    isAccountExistsError(error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("already exists") ||
            msg.includes("existinguser") ||
            msg.includes("already registered")
        );
    }

    // Get list of installed addons.
    async getAddons(profileId = null) {
        throw new Error("Method 'getAddons()' must be implemented.");
    }

    // Set the entire list of addons (full replace).
    async setAddons(addons, profileId = null) {
        throw new Error("Method 'setAddons()' must be implemented.");
    }

    // Install a single addon via manifest URL.
    async installAddon(manifestUrl) {
        throw new Error("Method 'installAddon()' must be implemented.");
    }

    // Get profiles for the current service.
    async getProfiles() {
        return [{ id: 'default' }];
    }

    // Get current session data.
    getSession() {
        return ServiceSessionInstance.getSession(this.serviceName);
    }

    // Check authentication status.
    isAuthenticated() {
        return ServiceSessionInstance.isAuthenticated(this.serviceName);
    }
}

export default StreamingService;
