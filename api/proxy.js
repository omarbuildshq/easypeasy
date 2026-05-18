const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  "https://easypeasy-tan.vercel.app",
  "https://easypeasy",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const isAllowed = ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));

  const corsOrigin = isAllowed ? origin : "null";

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"] || "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter." });
  }

  try {
    // Build headers to forward, stripping hop-by-hop headers
    const forwardHeaders = { ...req.headers };
    delete forwardHeaders.host;
    delete forwardHeaders.origin;
    delete forwardHeaders.referer;
    delete forwardHeaders.connection;
    delete forwardHeaders["transfer-encoding"];
    delete forwardHeaders["accept-encoding"];

    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    // Forward body for non-GET/HEAD requests
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      // Ensure content-type is set for JSON bodies
      if (!forwardHeaders["content-type"]) {
        fetchOptions.headers["content-type"] = "application/json";
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");

    // Forward response headers (skip hop-by-hop)
    const skipHeaders = new Set(["transfer-encoding", "connection", "keep-alive", "content-encoding"]);
    response.headers.forEach((value, key) => {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Re-apply CORS (in case target response overwrote it)
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);

    const body = await response.text();
    return res.status(response.status).send(body);
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
    return res.status(500).json({ error: `Proxy Error: ${e.message}` });
  }
}
