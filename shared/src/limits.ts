// Small fixed-window rate limiter used by the Worker and the live rooms.
// It lives in `shared` so it can be tested without a Cloudflare runtime.

export interface LimitResult {
  ok: boolean;
  /** Seconds until the caller may try again; 0 when allowed. */
  retryAfter: number;
}

/**
 * Allows `limit` hits per `windowMs` for each key (for example a client address).
 * Memory is bounded: expired windows are dropped when the table grows past `maxKeys`.
 */
export class RateLimiter {
  private windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5000,
  ) {}

  hit(key: string, now: number): LimitResult {
    const current = this.windows.get(key);
    if (!current || now - current.start >= this.windowMs) {
      if (this.windows.size >= this.maxKeys) this.prune(now);
      this.windows.set(key, { start: now, count: 1 });
      return { ok: true, retryAfter: 0 };
    }
    if (current.count >= this.limit) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((current.start + this.windowMs - now) / 1000)) };
    }
    current.count++;
    return { ok: true, retryAfter: 0 };
  }

  /** True when the key has used up its hits in the current window (without counting a new hit). */
  blocked(key: string, now: number): boolean {
    const current = this.windows.get(key);
    return !!current && now - current.start < this.windowMs && current.count >= this.limit;
  }

  forget(key: string): void {
    this.windows.delete(key);
  }

  private prune(now: number): void {
    for (const [key, w] of this.windows) if (now - w.start >= this.windowMs) this.windows.delete(key);
    // Still full of live windows: start over rather than grow without bound.
    if (this.windows.size >= this.maxKeys) this.windows.clear();
  }
}

/**
 * Limits for the public Worker. One school network can sit behind a single address,
 * so the connection limits are generous; creating sessions and guessing codes are not.
 */
export const LIMITS = {
  /** A teacher creates a session a few times a day at most. */
  createPerMinute: 5,
  createPerHour: 30,
  /** Looking up a code. A whole class behind one address looks up at once, so this is generous. */
  lookupPerMinute: 300,
  /** Codes that do not exist. A student mistyping a few times is fine; scanning for sessions is not. */
  missesPerMinute: 20,
  /** WebSocket connects from one address: a class of 60 plus reconnects on a bad network. */
  connectPerMinute: 400,
  /** Messages one connection may send per second (walking sends about ten). */
  messagesPerSecond: 40,
  /** A connection that keeps flooding past this many dropped messages is closed. */
  floodDropsBeforeClose: 200,
} as const;

/** Plain-English text for a refused request. */
export const TOO_MANY_TEXT = "Too many tries. Wait a minute and try again.";
