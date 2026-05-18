/**
 * TorBoxAPI Class
 * https://www.postman.com/torbox/torbox/request/rf7iu10/get-user-data
 */

import Network from '../utils/Network.js';

class TorBoxAPI {
    static BASE_URL = "https://api.torbox.app/v1";

    // Generic function to call TorBox API
    static async call(method, endpoint, apiKey, payload = null, queryParams = {}) {
        // Construct URL with query parameters
        let url = this.BASE_URL + endpoint;
        if (Object.keys(queryParams).length > 0) {
            const queryString = new URLSearchParams(queryParams).toString();
            url += `?${queryString}`;
        }

        const options = {
            method: method,
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        // Use the Network module for requests
        const json = await Network.request(url, options);

        // Check for API-level success flag if present, or HTTP errors handled by Network.request
        // TorBox docs say: "success": boolean
        if (json.success === false) {
            throw new Error(json.detail || json.error || "Unknown TorBox API error");
        }

        return json;
    }

    // Retrieve the user's data
    static async getUserData(apiKey, settings = false) {
        const queryParams = { settings: settings };
        const json = await this.call('GET', '/api/user/me', apiKey, null, queryParams);
        return json.data;
    }
}

export default TorBoxAPI;
