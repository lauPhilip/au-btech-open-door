import { describe, expect, it } from "vitest";
import { limitRequest, originAllowed, recordMiss, withSecurityHeaders } from "./guard";

const req = (ip: string, url = "https://x.test/api/sessions", headers: Record<string, string> = {}) =>
  new Request(url, { headers: { "cf-connecting-ip": ip, ...headers } });

describe("limitRequest", () => {
  it("refuses a sixth session in a minute from one address, with a wait time", async () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(await limitRequest(req("1.1.1.1"), "create", {}, now)).toBeNull();
    const refused = await limitRequest(req("1.1.1.1"), "create", {}, now + 1000);
    expect(refused?.status).toBe(429);
    expect(Number(refused?.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await limitRequest(req("2.2.2.2"), "create", {}, now)).toBeNull();
  });

  it("does not limit local development, where there is no client address", async () => {
    const local = new Request("http://localhost/api/sessions");
    for (let i = 0; i < 50; i++) expect(await limitRequest(local, "create", {}, 1)).toBeNull();
    const loopback = req("127.0.0.1");
    for (let i = 0; i < 50; i++) expect(await limitRequest(loopback, "create", {}, 1)).toBeNull();
  });

  it("lets a class of 60 connect from one address", async () => {
    for (let i = 0; i < 60; i++) expect(await limitRequest(req("3.3.3.3"), "connect", {}, 5_000_000)).toBeNull();
  });

  it("uses the shared binding when it is there", async () => {
    const env = { CREATE_LIMIT: { limit: async () => ({ success: false }) } };
    expect((await limitRequest(req("4.4.4.4"), "create", env, 9_000_000))?.status).toBe(429);
  });

  it("blocks code scanning: many misses stop even lookups", async () => {
    const now = 20_000_000;
    for (let i = 0; i < 20; i++) expect(recordMiss(req("5.5.5.5"), now)).toBeNull();
    expect(recordMiss(req("5.5.5.5"), now)?.status).toBe(429);
    expect((await limitRequest(req("5.5.5.5"), "lookup", {}, now))?.status).toBe(429);
    expect(await limitRequest(req("6.6.6.6"), "lookup", {}, now)).toBeNull();
  });
});

describe("originAllowed", () => {
  const url = "https://open-door.example/parties/game-room/ABCD";
  it("accepts the same site, a different port, and no origin", () => {
    expect(originAllowed(req("1", url, { origin: "https://open-door.example" }))).toBe(true);
    expect(originAllowed(req("1", "http://localhost:5173/parties/x", { origin: "http://localhost:8787" }))).toBe(true);
    expect(originAllowed(req("1", url))).toBe(true);
  });
  it("refuses another site and nonsense", () => {
    expect(originAllowed(req("1", url, { origin: "https://evil.example" }))).toBe(false);
    expect(originAllowed(req("1", url, { origin: "not a url" }))).toBe(false);
  });
});

describe("withSecurityHeaders", () => {
  it("adds the headers and keeps the body and status", async () => {
    const out = withSecurityHeaders(new Response("hi", { status: 201 }));
    expect(out.status).toBe(201);
    expect(await out.text()).toBe("hi");
    expect(out.headers.get("x-content-type-options")).toBe("nosniff");
    expect(out.headers.get("referrer-policy")).toBe("no-referrer");
    expect(out.headers.get("permissions-policy")).toContain("camera=()");
  });
});
