const HOP_BY_HOP = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const RESPONSE_HOP_BY_HOP = new Set([
  ...HOP_BY_HOP,
  "content-encoding",
]);

function apiOrigin() {
  const value = process.env.CASUALCRAWL_API_ORIGIN;
  if (!value) throw new Error("CASUALCRAWL_API_ORIGIN is not configured");
  const origin = new URL(value);
  if (!['http:', 'https:'].includes(origin.protocol)) {
    throw new Error("CASUALCRAWL_API_ORIGIN must use http or https");
  }
  return origin;
}

function pathParts(req) {
  const value = req.query?.path;
  return (Array.isArray(value) ? value : [value]).filter(Boolean).map(String);
}

function requestBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body == null || req.body === "") return undefined;
  if (Buffer.isBuffer(req.body) || typeof req.body === "string") return req.body;

  const contentType = String(req.headers["content-type"] || "");
  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    return new URLSearchParams(req.body).toString();
  }
  return JSON.stringify(req.body);
}

function forwardedHeaders(req) {
  const headers = {};
  for (const [name, value] of Object.entries(req.headers || {})) {
    const lower = name.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "accept-encoding" || value == null) continue;
    headers[name] = Array.isArray(value) ? value.join(", ") : value;
  }
  return headers;
}

export default async function handler(req, res) {
  try {
    const origin = apiOrigin();
    const target = new URL(`/${pathParts(req).map(encodeURIComponent).join("/")}`, origin);
    const queryIndex = String(req.url || "").indexOf("?");
    if (queryIndex >= 0) target.search = String(req.url).slice(queryIndex);

    const upstream = await fetch(target, {
      method: req.method,
      headers: forwardedHeaders(req),
      body: requestBody(req),
      redirect: "manual",
    });

    res.status(upstream.status);
    for (const [name, value] of upstream.headers) {
      if (!RESPONSE_HOP_BY_HOP.has(name.toLowerCase())) res.setHeader(name, value);
    }
    const setCookies = typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
    if (setCookies.length) res.setHeader("set-cookie", setCookies);

    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("CasualCrawl API proxy failed", error);
    res.status(502).json({ error: "CasualCrawl API unavailable" });
  }
}
