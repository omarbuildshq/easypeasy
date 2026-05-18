/**
 * AIOStreamsAPI Class
 */

import Network from '../utils/Network.js';
import Logger from '../utils/Logger.js';
import TorBoxAPI from './TorBoxAPI.js';

class AIOStreamsAPI {
    static get HOSTS() {
        return {
            Yeb: "https://aiostreams.fortheweak.cloud",
            ATBP: "https://aio.atbphosting.com",
            Omni: "https://aiostreams.12312023.xyz",
            Midnight: "https://aiostreamsfortheweebsstable.midnightignite.me",
            Kuu: "https://aiostreams.stremio.ru",
            ElfHosted: "https://aiostreams.elfhosted.com",
        };
    }

    // Generic function to call AIOStreams API
    static async call(baseUrl, method, endpoint, payload = null, queryParams = {}) {
        // Construct URL with query parameters
        let url = baseUrl.replace(/\/$/, "") + endpoint;
        if (Object.keys(queryParams).length > 0) {
            const queryString = new URLSearchParams(queryParams).toString();
            url += `?${queryString}`;
        }

        const options = {
            method: method.toUpperCase(),
            headers: {
                "Accept": "application/json"
            }
        };

        if (payload) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(payload);
        }

        const json = await Network.request(url, options);

        // Check for errors
        if (json.success === false && json.error) {
            throw new Error(json.error.message || "Unknown API error");
        }

        return json;
    }

    // Retrieve the user's configuration from AIOStreams
    static async getConfig(baseUrl, uuid, password) {
        const payload = {
            uuid: uuid,
            password: password
        };
        const json = await this.call(baseUrl, 'POST', '/api/v1/user', payload);
        return json.data.userData;
    }

    // Update the user's configuration on AIOStreams
    static async updateConfig(baseUrl, uuid, password, config) {
        const payload = {
            config: config,
            password: password,
            uuid: uuid
        };
        return await this.call(baseUrl, 'PUT', '/api/v1/user', payload);
    }

    // Create a new user/manifest from a config object (e.g. from restore)
    static async installConfig(baseAIOStreamsUrl, password, config) {
        const payload = {
            config: config,
            password: password
        };

        const json = await this.call(baseAIOStreamsUrl, 'POST', '/api/v1/user', payload);
        const newUuid = json.data && json.data.uuid;
        const encrypted = json.data && json.data.encryptedPassword;

        if (newUuid && encrypted) {
            return { uuid: newUuid, encryptedPassword: encrypted };
        }
        throw new Error("API response did not contain the expected UUID and encrypted password.");
    }

    static constructManifestUrl(hostUrl, uuid, encryptedPassword, compatibilityMode) {
        if (compatibilityMode === 'chilllink') {
            return `${hostUrl.replace(/\/$/, "")}/chilllink/${uuid}/${encryptedPassword}`;
        }
        return `${hostUrl.replace(/\/$/, "")}/stremio/${uuid}/${encryptedPassword}/manifest.json`;
    }

    // Install config with smart retry logic for common upstream errors
    static async installConfigWithSmartRetry(hostUrl, config, password, compatibilityMode = 'stremio') {
        let attempts = 0;
        const maxAttempts = 4;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                // Try initial install
                const { uuid, encryptedPassword } = await this.installConfig(hostUrl, password, config);
                return this.constructManifestUrl(hostUrl, uuid, encryptedPassword, compatibilityMode);
            } catch (err) {
                // If we've run out of attempts, throw the error
                if (attempts >= maxAttempts) throw err;

                await this.handleSmartRetryError(err, config, attempts, maxAttempts);
            }
        }
    }

    // Update config with smart retry logic
    static async updateConfigWithSmartRetry(hostUrl, config, password, uuid, textEncryptedPassword, compatibilityMode = 'stremio') {
        let attempts = 0;
        const maxAttempts = 4;

        while (attempts < maxAttempts) {
            attempts++;
            try {
                // Try update
                await this.updateConfig(hostUrl, uuid, password, config);
                return this.constructManifestUrl(hostUrl, uuid, textEncryptedPassword, compatibilityMode);
            } catch (err) {
                // If we've run out of attempts, throw the error
                if (attempts >= maxAttempts) throw err;

                await this.handleSmartRetryError(err, config, attempts, maxAttempts);
            }
        }
    }

    static async handleSmartRetryError(err, config, attempts, maxAttempts) {
        // Handle specific upstream errors
        const errorMsg = (err.message || err.toString()).toLowerCase();
        const isTorrentioError = errorMsg.includes("torrentio");
        const isMeteorError = errorMsg.includes("meteor");
        const isMediaFusionError = errorMsg.includes("mediafusion");
        const isBitmagnetError = errorMsg.includes("bitmagnet");
        const isSeaDexError = errorMsg.includes("seadex not found");

        let presetType = "";
        if (isTorrentioError) presetType = 'torrentio';
        else if (isMeteorError) presetType = 'meteor';
        else if (isMediaFusionError) presetType = 'mediafusion';
        else if (isBitmagnetError) presetType = 'bitmagnet';
        else if (isSeaDexError) presetType = 'seadex';

        // Log for debugging
        Logger.debug('AIOStreamsAPI', `SmartRetry: Attempt ${attempts}/${maxAttempts}. Error: "${errorMsg}". Detected Type: "${presetType}"`);

        // If not an identifiable/fixable error, throw immediately
        const hasPreset = config.presets && config.presets.some(p => p.type === presetType);
        if (!presetType || !hasPreset) {
            Logger.warn('AIOStreamsAPI', `SmartRetry: Cannot fix error. Type: ${presetType}, HasPreset: ${hasPreset}`);
            throw err;
        }

        // Log and Fix
        Logger.warn('AIOStreamsAPI', `Upstream error (${presetType}). Removing and retrying...`);
        config.presets = config.presets.filter(p => p.type !== presetType);
    }

    // Create a new AIOStreams manifest based on the provided parameters.
    static async populateJSON(providersMap, debridioKey, tmdbAccessToken, formatterDefinition, exclude4k, excludeDolby, maxSize, prioritizeQuality) {
        // Fetch the AIOStreams config file to use as a template.
        let aiostreamsConfig;
        try {
            // Force no-store to bypass browser cache
            // This ensures we get the newest config each time
            aiostreamsConfig = await Network.request("config/aiostreams-config.json", { cache: 'no-store' });

            // Insert TMDB Access Token
            aiostreamsConfig.tmdbAccessToken = tmdbAccessToken;

            if (exclude4k) {
                aiostreamsConfig.preferredResolutions = aiostreamsConfig.preferredResolutions.filter(res => res !== "2160p");
                aiostreamsConfig.excludedResolutions.push("2160p");
            }

            if (excludeDolby) {
                const dvTags = aiostreamsConfig.preferredVisualTags.filter(tag => tag.includes("DV"));
                aiostreamsConfig.preferredVisualTags = aiostreamsConfig.preferredVisualTags.filter(tag => !tag.includes("DV"));
                aiostreamsConfig.excludedVisualTags.push(...dvTags);
            }

            if (maxSize !== "unlimited") {
                const maxBytes = parseInt(maxSize) * 1000 * 1000 * 1000;
                aiostreamsConfig.size.global.movies[1] = maxBytes;
                aiostreamsConfig.size.global.series[1] = maxBytes;
                aiostreamsConfig.size.global.anime[1] = maxBytes;
            }

            // Configure debrid providers
            // Disable all first
            aiostreamsConfig.services.forEach(s => { s.enabled = false; });

            // Enable the user debrid provider(s) and put in the user API keys
            // NOTE: TorBox is the only supported debrid provider
            if (providersMap && typeof providersMap === 'object') {
                Object.entries(providersMap).forEach(([providerId, apiKey]) => {
                    const service = aiostreamsConfig.services.find(s => s.id === providerId);
                    if (service) {
                        service.enabled = true;
                        service.credentials = service.credentials || {};
                        service.credentials.apiKey = apiKey;
                    }
                });
            }

            // Newznab Logic
            // If the user passed in a TorBox API key for their debrid provider, I need to add it to the Newznab addon
            // otherwise I need to delete it. It should only work with TorBox.
            let enableNewznab = false;
            const torboxKey = providersMap && providersMap.torbox;

            if (torboxKey) {
                try {
                    // If the user is a TB Pro subscriber, they get Newznab
                    const torboxUserData = await TorBoxAPI.getUserData(torboxKey);
                    // Plan IDs. 0: Free
                    //           1: Essential
                    //           2: Pro
                    //           3: Standard
                    if (torboxUserData && torboxUserData.plan === 2) {
                        enableNewznab = true;
                    }
                } catch (e) {
                    Logger.error('AIOStreamsAPI', "Failed to check TorBox plan:", e);
                    throw e;
                }
            }

            if (enableNewznab) {
                const newznabPreset = aiostreamsConfig.presets.find(p => p.type === 'newznab');
                if (newznabPreset) {
                    newznabPreset.options.apiKey = torboxKey;
                }
            } else {
                aiostreamsConfig.presets = aiostreamsConfig.presets.filter(p => p.type !== 'newznab');
            }

            // Set the formatter
            aiostreamsConfig.formatter.definition = formatterDefinition;

            // Set the description
            const currentDate = new Date().toLocaleDateString();
            aiostreamsConfig.addonDescription = `Installed on: ${currentDate}. Please remember to periodically reinstall to bring in new updates and bug fixes!`;

            // Set the preferred stream expressions
            try {
                const preferredSelFile = prioritizeQuality ? 'quality.json' : 'resolution.json';
                const preferredSelUrl = `config/preferred_sel/${preferredSelFile}`;
                const preferredSelData = await Network.request(preferredSelUrl, { cache: 'no-store' });

                if (preferredSelData && Array.isArray(preferredSelData)) {
                    aiostreamsConfig.preferredStreamExpressions = preferredSelData;
                } else {
                    Logger.warn('AIOStreamsAPI', `Preferred stream expressions data is missing or malformed at ${preferredSelUrl}`);
                }
            } catch (e) {
                Logger.error('AIOStreamsAPI', "Failed to fetch preferredStreamExpressions:", e);
                throw e;
            }

            // Set the debridio API key
            if (debridioKey) {
                // If a Debridio API key is provided, add it to the Debridio addon
                const preset = aiostreamsConfig.presets.find(p => p.type === 'debridio');
                if (preset) {
                    preset.options.debridioApiKey = debridioKey;
                }
            } else {
                // If no Debridio API key is provided, remove the Debridio addon
                aiostreamsConfig.presets = aiostreamsConfig.presets.filter(p => p.type !== 'debridio');
            }
        } catch (err) {
            throw err;
        }

        return aiostreamsConfig;
    }
}

export default AIOStreamsAPI;
