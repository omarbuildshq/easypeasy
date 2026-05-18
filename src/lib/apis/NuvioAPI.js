/**
 * NuvioAPI Class
 * Implements StreamingService for Nuvio Cloud API (Supabase).
 */

import StreamingService from './StreamingService.js';
import { ServiceSessionInstance } from '../ServiceSession.js';
import Network from '../utils/Network.js';
import Logger from '../utils/Logger.js';
import InputValidator from '../utils/InputValidator.js';

class NuvioAPIProvider extends StreamingService {
    constructor() {
        super('nuvio');
        this.publishableKey = "sb_publishable_zcNkgqGJjBtj8GoRlMvl9A_zkdmXhf5";
        this.authUrl = "https://dpyhjjcoabcglfmgecug.supabase.co/auth/v1";
        this.restUrl = "https://dpyhjjcoabcglfmgecug.supabase.co/rest/v1";
    }

    // Override to specifically handle Nuvio's (Supabase) error on existing accounts.
    // Supabase returns "User already registered" with HTTP 422 for duplicate signups.
    isAccountExistsError(error) {
        const msg = error.message.toLowerCase();
        return (
            msg.includes("422") ||
            super.isAccountExistsError(error)
        );
    }

    // Generic function to call Nuvio API
    async _call(baseUrl, endpoint, method, body = null) {
        const session = this.getSession();
        const headers = {
            "Content-Type": "application/json",
            "apikey": this.publishableKey
        };

        if (session?.token) {
            headers["Authorization"] = `Bearer ${session.token}`;
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const json = await Network.request(`${baseUrl}${endpoint}`, options);

        // Supabase uses two different error formats depending on the API:
        // - Auth API (/auth/v1/): { "error": "...", "error_description": "..." } or { "msg": "...", "code": 422 }
        // - REST API (/rest/v1/ PostgREST): { "code": "42501", "message": "...", "details": null, "hint": null }
        // Check for the Auth API error envelope first, then the REST API pattern.
        if (json?.error) {
            throw new Error(json.error.message || json.error_description || JSON.stringify(json.error));
        }
        // PostgREST errors have a top-level `code` (string like "42501") + `message`.
        // Valid success responses are always arrays or plain objects without a `code` string.
        if (json?.code && json?.message && typeof json.code === 'string') {
            throw new Error(json.message);
        }
        // Auth API v2 errors use { msg, code } where code is a number
        if (json?.msg && typeof json.code === 'number') {
            throw new Error(json.msg);
        }

        return json;
    }

    // Log in to Nuvio.
    async login(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            email: email,
            password: password
        };

        try {
            const data = await this._call(this.authUrl, "/token?grant_type=password", "POST", body);

            if (!data.access_token) {
                throw new Error("Login failed: No access token received");
            }

            // Store session
            ServiceSessionInstance.setSession(
                this.serviceName,
                email,
                data.access_token,
                Date.now() + (data.expires_in * 1000)
            );

            password = null; // Security
            Logger.debug('NuvioAPI', 'User logged in successfully', { email });

            // Return session
            return this.getSession();
        } catch (error) {
            Logger.error('NuvioAPI', 'Login failed', error, { email });
            throw error;
        }
    }

    // Log out from Nuvio.
    async logout() {
        try {
            await this._call(this.authUrl, "/logout", "POST");
        } catch (e) {
            Logger.warn('NuvioAPI', 'Logout request failed', {});
        }
        ServiceSessionInstance.clearSession(this.serviceName);
        Logger.debug('NuvioAPI', 'User logged out');
    }

    // Register a new Nuvio account.
    async register(email, password) {
        // Validate input
        if (!InputValidator.isValidEmail(email)) {
            throw new Error("Invalid email format");
        }

        const body = {
            email: email,
            password: password
        };

        await this._call(this.authUrl, "/signup", "POST", body);
        Logger.debug('NuvioAPI', 'Account registered successfully', { email });
    }

    // Fetch all profiles for the account.
    async getProfiles() {
        try {
            const data = await this._call(this.restUrl, "/rpc/sync_pull_profiles", "POST");
            const profiles = Array.isArray(data) ? data : [];
            // Map profile_index to id to ensure we use the integer ID expected by the database/API
            const mappedProfiles = profiles.map(p => ({
                ...p,
                id: p.profile_index
            }));

            // Brand new Nuvio accounts don't return profiles from sync_pull_profiles
            // but implicitly have profile_index 1 containing default addons.
            if (mappedProfiles.length === 0) {
                return [{ id: 1, name: 'Default', profile_index: 1 }];
            }
            return mappedProfiles;
        } catch (error) {
            Logger.warn('NuvioAPI', 'Failed to pull profiles', error);
            return [{ id: 1, name: 'Default', profile_index: 1 }];
        }
    }

    // Get list of installed addons for a specific profile.
    async getAddons(profileId) {
        if (!profileId) throw new Error("profileId is required to fetch Nuvio addons");

        const endpoint = `/addons?select=*&profile_id=eq.${profileId}&order=sort_order`;
        const data = await this._call(this.restUrl, endpoint, "GET");

        // Normalize: Standardize 'url' field to 'transportUrl' to match Stremio/QuickStart conventions
        const addonList = Array.isArray(data) ? data : [];
        return addonList.map(item => ({
            ...item,
            transportUrl: item.url, // Map Nuvio's 'url' to 'transportUrl'
            manifest: item.manifest || { name: item.name } // Fallback if manifest is missing
        }));
    }

    // Set the entire list of addons (full replace) for a specific profile.
    async setAddons(addons, profileId) {
        if (!profileId) throw new Error("profileId is required to set Nuvio addons");

        const formattedAddons = Array.isArray(addons) ? addons.map((addon, index) => ({
            url: addon.url || addon.transportUrl,
            name: addon.name || addon.manifest?.name,
            enabled: addon.enabled !== false,
            sort_order: index
        })) : [];

        const body = {
            p_profile_id: parseInt(profileId, 10),
            p_addons: formattedAddons
        };
        await this._call(this.restUrl, "/rpc/sync_push_addons", "POST", body);
    }

    // Install a single addon via manifest URL to specific profiles (or all if none provided).
    async installAddon(manifestUrl, profileIds = null) {
        let targetProfileIds = profileIds;

        if (!targetProfileIds) {
            const profiles = await this.getProfiles();
            if (profiles.length === 0) return;
            targetProfileIds = profiles.map(p => p.id);
        }

        // Fetch manifest to get the name
        const manifestJson = await Network.request(manifestUrl, { retries: 1 });

        // Validate manifest
        if (!manifestJson || !manifestJson.name) {
            throw new Error("Invalid Manifest: Missing name");
        }

        const newAddon = {
            url: manifestUrl,
            transportUrl: manifestUrl,
            name: manifestJson.name,
            manifest: manifestJson,
            enabled: true
        };

        for (const profileId of targetProfileIds) {
            const currentAddons = await this.getAddons(profileId);

            // Standard deduplication
            let newList = currentAddons.filter(a => a.url !== manifestUrl);
            newList.push(newAddon);

            // Save for this profile
            await this.setAddons(newList, profileId);
        }
        Logger.debug('NuvioAPI', 'Addon installed successfully to targeted profiles', { manifestUrl });
        return true;
    }
}

// Create and export singleton instance
const NuvioAPI = new NuvioAPIProvider();

export { NuvioAPIProvider };
export default NuvioAPI;
