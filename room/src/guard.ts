// Protection for the public Worker: rate limits, origin check and security headers.
// The counting logic lives in @open-door/shared (RateLimiter) so it is unit tested.

import { LIMITS, RateLimiter, TOO_MANY_TEXT } from "@open-door/shared";

/** Optional Cloudflare rate-limit binding (see wrangler.jsonc). Shared by all Worker copies, unlike memory. */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface GuardEnv {
  CREATE_LIMIT?: RateLimitBinding;
}

// In-memory limits protect one Worker copy; the binding adds a limit shared across copies.
const createMinute = new RateLimiter(LIMITS.createPerMinute, 60_000);
const createHour = new RateLimiter(LIMITS.createPerHour, 3_600_000);
const lookups = new RateLimiter(LIMITS.lookupPerMinute, 60_000);
const misses = new RateLimiter(LIMITS.missesPerMinute, 60_000);
const connects = new RateLimiter(LIMITS.connectPerMinute, 60_000);

/** The caller's network address, as Cloudflare reports it. */
export function clientKey(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}

export function tooManyResponse(retryAfter: number): Response {
  return withSecurityHeaders(
    new Response(JSON.stringify({ error: TOO_MANY_TEXT }), {
      status: 429,
      headers: { "content-type": "application/json; charset=utf-8", "retry-after": String(retryAfter), "cache-control": "no-store" },
    }),
  );
}

/** Called when a code lookup finds no session. Returns a 429 once the caller has missed too often. */
export function recordMiss(request: Request, now = Date.now()): Response | null {
  const result = misses.hit(clientKey(request), now);
  return result.ok ? null : tooManyResponse(result.retryAfter);
}

export type Kind = "create" | "lookup" | "connect";

/** A response to send instead of doing the work, or null when the caller is within the limits. */
export async function limitRequest(request: Request, kind: Kind, env: GuardEnv, now = Date.now()): Promise<Response | null> {
  const key = clientKey(request);
  const checks =
    kind === "create" ? [createMinute.hit(key, now), createHour.hit(key, now)] : kind === "lookup" ? [lookups.hit(key, now)] : [connects.hit(key, now)];
  if (kind === "lookup" && misses.blocked(key, now)) return tooManyResponse(60);
  const refused = checks.find((c) => !c.ok);
  if (refused) return tooManyResponse(refused.retryAfter);
  if (kind === "create" && env.CREATE_LIMIT) {
    const { success } = await env.CREATE_LIMIT.limit({ key });
    if (!success) return tooManyResponse(60);
  }
  return null;
}

/**
 * Browsers always send an Origin on WebSocket connections. If it names another site, refuse.
 * Only the host name is compared, so the Vite dev proxy (another port) still works.
 * Clients that send no Origin (scripts, the load test) are not browsers and are let through.
 */
export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).hostname === new URL(request.url).hostname;
  } catch {
    return false;
  }
}

/** Headers for responses the Worker makes itself. Static files get the same set from app/public/_headers. */
export const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "x-frame-options": "SAMEORIGIN",
};

export function withSecurityHeaders(response: Response): Response {
  // WebSocket upgrade responses cannot be rebuilt; they are returned as they are.
  if (response.status === 101) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
