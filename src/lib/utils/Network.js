/**
 * Network Class
 * Helper to fetch data via a proxy to bypass CORS.
 */

import Logger from './Logger.js';

// Vercel serverless CORS proxy
const PROXY_URL = "https://easypeasy-tan.vercel.app/api/proxy";

class Network {
    // Check if a URL is cross-origin relative to the current window.
    static isCrossOrigin(url) {
        try {
            // If it's a relative path, it's not cross-origin
            if (!url.startsWith('http')) {
                return false;
            }

            // Compare with current origin
            const targetOrigin = new URL(url).origin;
            return targetOrigin !== window.location.origin;
        } catch (e) {
            return false;
        }
    }

    // Helper to fetch with timeout
    static async fetchWithTimeout(fetchUrl, fetchOptions, timeout = 30000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(fetchUrl, {
                ...fetchOptions,
                signal: controller.signal
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeout}ms: ${fetchUrl}`);
            }
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                // This is a generic fetch error (Network down, CORS failure, or blocked by extension)
                const enhancedError = new Error(`Failed to fetch: ${fetchUrl}. This usually indicates a network connection issue, a CORS block, or an adblocker preventing the request.`);
                enhancedError.originalError = error;
                throw enhancedError;
            }
            throw error;
        }
    }

    // Fetch data from a URL, falling back to proxy if direct fetch fails.
    static async request(url, options = {}) {
        // Smart Default: Retry GET requests once by default if not specified
        if (options.retries === undefined) {
            const method = options.method || 'GET';
            if (method.toUpperCase() === 'GET') {
                options.retries = 1;
            }
        }

        // Always try a direct fetch first. Many cross-origin APIs (e.g. TorBox) support CORS
        // natively, and proxying them strips auth headers causing failures. Only skip direct
        // fetch if the caller explicitly opts out via forceDirect: false.
        const skipDirect = options.forceDirect === false;

        if (!skipDirect) {
            try {
                const resp = await this.fetchWithTimeout(url, options, options.timeout);
                if (resp.ok) {
                    if (resp.status === 204) return {};
                    try {
                        return await resp.json();
                    } catch (err) {
                        const text = await resp.text().catch(() => "Unable to read response text");
                        if (!text || text.trim() === "") return {};
                        throw new Error(`Failed to parse direct response as JSON. Status: ${resp.status}. Body preview: ${text.substring(0, 100)}...`);
                    }
                }
                Logger.warn('Network', `Direct fetch failed for ${url}: ${resp.status}`);
            } catch (e) {
                Logger.warn('Network', `Direct fetch error for ${url}, falling back to proxy...`, {
                    error: e.message,
                    type: e.name
                });
                // Fallthrough to proxy below
            }
        }

        // List of proxies to try in order.
        // 1. Vercel serverless proxy (preferred)
        // 2. CorsProxy.io (fallback)
        const PROXIES = [
            PROXY_URL + "?url=",
            "https://corsproxy.io/?url=",
            "https://api.allorigins.win/raw?url="
        ];

        let lastError = null;

        for (const proxyBase of PROXIES) {
            // Resolve relative URLs to absolute before sending to proxy
            const absoluteUrl = new URL(url, window.location.href).href;
            const proxyUrl = proxyBase + encodeURIComponent(absoluteUrl);

            try {
                // Cloudflare worker proxy
                const resp = await this.fetchWithTimeout(proxyUrl, options, options.timeout);

                if (!resp.ok) {
                    // Attempt to parse error message from JSON, fallback to status text
                    const errorBody = await resp.json().catch(() => ({}));
                    const errorMessage = errorBody.error?.message || errorBody.message || `Proxy Error: ${resp.status} ${resp.statusText}`;

                    // If we get a response, is it from the proxy?
                    // We only want to STOP ROTATION for definitive client errors where retrying won't help.
                    // 400: Bad Request (Invalid input)
                    // 401: Unauthorized (Auth failure, handled by StremioAPI)
                    // 404: Not Found (Wrong endpoint)
                    // 422: Unprocessable Entity (Validation error)
                    //
                    // We CONTINUE ROTATION for:
                    // 403: Forbidden (Often WAF/Proxy blocking)
                    // 429: Too Many Requests (Rate limiting)
                    // 5xx: Server Errors (Proxy failure)
                    const apiError = new Error(errorMessage);
                    const stopRotationCodes = [400, 401, 404, 422];

                    if (stopRotationCodes.includes(resp.status)) {
                        apiError.stopRotation = true;
                    }
                    throw apiError;
                }

                if (resp.status === 204) return {};
                try {
                    return await resp.json();
                } catch (err) {
                    const text = await resp.text().catch(() => "Unable to read response text");
                    if (!text || text.trim() === "") return {};
                    throw new Error(`Failed to parse proxy response as JSON. Status: ${resp.status}. Body preview: ${text.substring(0, 100)}...`);
                }
            } catch (e) {
                // If it's a functional error from the API (stopRotation), rethrow immediately
                if (e.stopRotation) {
                    throw e;
                }

                Logger.warn('Network', `Proxy attempt failed for ${proxyBase}:`, { error: e.message });
                lastError = e;
            }
        }

        // Retry logic
        if (options.retries && options.retries > 0) {
            Logger.warn('Network', `Request failed, retrying... (${options.retries} attempts left)`);
            return await this.request(url, { ...options, retries: options.retries - 1 });
        }

        // If we exhausted all proxies
        throw lastError;
    }
}

export default Network;
