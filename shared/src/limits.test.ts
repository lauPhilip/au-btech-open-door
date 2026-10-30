import { describe, expect, it } from "vitest";
import { RateLimiter } from "./limits";

describe("RateLimiter", () => {
  it("allows up to the limit, then refuses with a wait time", () => {
    const r = new RateLimiter(3, 60_000);
    expect(r.hit("a", 0).ok).toBe(true);
    expect(r.hit("a", 1000).ok).toBe(true);
    expect(r.hit("a", 2000).ok).toBe(true);
    const refused = r.hit("a", 3000);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfter).toBe(57);
  });

  it("starts a new window after the time has passed", () => {
    const r = new RateLimiter(1, 1000);
    expect(r.hit("a", 0).ok).toBe(true);
    expect(r.hit("a", 500).ok).toBe(false);
    expect(r.hit("a", 1000).ok).toBe(true);
  });

  it("counts each key on its own", () => {
    const r = new RateLimiter(1, 1000);
    expect(r.hit("a", 0).ok).toBe(true);
    expect(r.hit("b", 0).ok).toBe(true);
    expect(r.hit("a", 1).ok).toBe(false);
  });

  it("keeps memory bounded", () => {
    const r = new RateLimiter(1, 1000, 10);
    for (let i = 0; i < 100; i++) r.hit(`k${i}`, 0);
    // Table was cleared at the cap, so an old key is allowed again rather than the table growing.
    expect(r.hit("k0", 1).ok).toBe(true);
  });

  it("blocked reports a full window without counting", () => {
    const r = new RateLimiter(1, 1000);
    expect(r.blocked("a", 0)).toBe(false);
    r.hit("a", 0);
    expect(r.blocked("a", 500)).toBe(true);
    expect(r.blocked("a", 1000)).toBe(false);
  });

  it("forget lets a key start again", () => {
    const r = new RateLimiter(1, 1000);
    r.hit("a", 0);
    r.forget("a");
    expect(r.hit("a", 1).ok).toBe(true);
  });
});
