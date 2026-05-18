/**
 * AIOMetadataAPI Class
 */

import Network from '../utils/Network.js';

class AIOMetadataAPI {
    static get HOSTS() {
        return {
            Viren: "https://aiometadata.viren070.me",
            Yeb: "https://aiometadatafortheweak.nhyira.dev",
            Midnight: "https://aiometadatafortheweebs.midnightignite.me",
            ATBP: "https://aiomd.atbphosting.com",
            Omni: "https://aiometadata.12312023.xyz",
            Kuu: "https://aiometadata.stremio.ru",
            ElfHosted: "https://aiometadata.elfhosted.com",
        };
    }

    // Generic function to call AIOMetadata API
    static async call(baseUrl, method, endpoint, payload = null) {
        // Construct URL
        const url = baseUrl.replace(/\/$/, "") + endpoint;

        const options = {
            method: method,
            headers: {}
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        const json = await Network.request(url, options);

        // Check for errors
        if (json.error) {
            throw new Error(json.error.message);
        }

        return json;
    }

    // Retrieve the user's configuration from the AIOMetadata instance.
    static async getConfig(baseUrl, uuid, password) {
        const payload = {
            "addonPassword": "",
            "password": password,
        };
        const json = await this.call(baseUrl, "POST", `/api/config/load/${uuid}`, payload);
        return json.config;
    }

    // Update the user's configuration on the AIOMetadata instance.
    static async setConfig(baseUrl, uuid, password, config) {
        const payload = {
            "addonPassword": "",
            "config": config,
            "password": password,
        };
        return await this.call(baseUrl, "PUT", `/api/config/update/${uuid}`, payload);
    }

    // Create a new AIOMetadata manifest from an existing config.
    static async installConfig(baseUrl, password, config) {
        const payload = {
            addonPassword: "",
            config: config,
            password: password
        };

        const json = await this.call(baseUrl, "POST", "/api/config/save", payload);

        if (json && json.installUrl) {
            return json.installUrl;
        }
        throw new Error("API response did not contain an install URL.");
    }
}

export default AIOMetadataAPI;
