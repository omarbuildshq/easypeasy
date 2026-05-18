// ServiceSession: Manages multi-service authentication tokens independently.

import Logger from './utils/Logger.js';

class ServiceSession {
    #sessions = {};

    // Establish authenticated session for a specific service
    setSession(service, email, token, expiresAt = null) {
        if (!service || !email || !token) {
            throw new Error('Service, email and token required for session');
        }

        this.#sessions[service] = {
            email,
            token,
            createdAt: Date.now(),
            expiresAt: expiresAt || (Date.now() + (24 * 60 * 60 * 1000)) // 24 hours default
        };

        Logger.debug('ServiceSession', `Session established for ${service}`, { email });
    }

    // Get current session for a specific service
    getSession(service) {
        const session = this.#sessions[service];
        if (!session) return null;

        return {
            email: session.email,
            token: session.token,
            isExpired: Date.now() > session.expiresAt
        };
    }

    // Check if user is authenticated for a specific service
    isAuthenticated(service) {
        const session = this.#sessions[service];
        return session !== undefined &&
            session.token !== undefined &&
            Date.now() < session.expiresAt;
    }

    // Invalidate session (logout)
    clearSession(service) {
        if (service) {
            const hadSession = this.#sessions[service] !== undefined;
            delete this.#sessions[service];

            if (hadSession) {
                Logger.debug('ServiceSession', `Session cleared for ${service}`);
            }
        } else {
            // Clear all sessions
            this.#sessions = {};
            Logger.debug('ServiceSession', 'All sessions cleared');
        }
    }

    // Clean up
    cleanup() {
        this.clearSession();
    }
}

// Create and export singleton instance
const ServiceSessionInstance = new ServiceSession();

// Legacy support for StremioSessionInstance if needed
// We'll refactor StremioAPI to use ServiceSessionInstance directly
const StremioSessionInstance = {
    setSession: (email, token) => ServiceSessionInstance.setSession('stremio', email, token),
    getSession: () => ServiceSessionInstance.getSession('stremio'),
    isAuthenticated: () => ServiceSessionInstance.isAuthenticated('stremio'),
    clearSession: () => ServiceSessionInstance.clearSession('stremio'),
    cleanup: () => ServiceSessionInstance.cleanup()
};

export { ServiceSession, ServiceSessionInstance, StremioSessionInstance };
export default ServiceSessionInstance;
