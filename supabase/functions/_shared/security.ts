const defaultAllowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function allowedOrigins() {
  return (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .concat(defaultAllowedOrigins);
}

export function securityHeaders(req: Request, extra: Record<string, string> = {}) {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cache-Control": "no-store",
    ...extra,
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...securityHeaders(req), "Content-Type": "application/json" },
  });
}

export function preflight(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return new Response(null, { status: 403, headers: securityHeaders(req) });
  }
  return new Response(null, { headers: securityHeaders(req) });
}

export function enforceOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return json(req, { error: "Origin not allowed" }, 403);
  }
  return null;
}

export function enforcePayloadLimit(req: Request, maxBytes = Number(Deno.env.get("MAX_REQUEST_BYTES") || 120_000)) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > maxBytes) {
    return json(req, { error: `Payload too large. Max ${maxBytes} bytes.` }, 413);
  }
  return null;
}

export function enforceInternalApiKey(req: Request) {
  const expected = Deno.env.get("INTERNAL_API_KEY");
  if (!expected) return null;
  const provided = req.headers.get("x-internal-api-key");
  if (provided !== expected) {
    return json(req, { error: "Invalid internal API key" }, 401);
  }
  return null;
}

export function enforceAuthenticatedJwt(req: Request) {
  if (Deno.env.get("REQUIRE_AUTHENTICATED_USER") !== "true") return null;
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const payload = decodeJwtPayload(token);
  if (payload?.role !== "authenticated" && payload?.aud !== "authenticated") {
    return json(req, { error: "Authenticated user required" }, 401);
  }
  return null;
}

export function enforceRateLimit(req: Request, scope: string, limit = Number(Deno.env.get("RATE_LIMIT_REQUESTS") || 30), windowMs = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") || 60_000)) {
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return json(req, { error: "Rate limit exceeded", retryAfter }, 429);
  }

  bucket.count += 1;
  return null;
}

export function enforceRequestSecurity(req: Request, scope: string, options: { maxBytes?: number; limit?: number } = {}) {
  return (
    enforceOrigin(req) ||
    enforceInternalApiKey(req) ||
    enforceAuthenticatedJwt(req) ||
    enforcePayloadLimit(req, options.maxBytes) ||
    enforceRateLimit(req, scope, options.limit)
  );
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
