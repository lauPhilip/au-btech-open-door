import { describe, expect, it } from "vitest";
import { cleanName, deviceFromUserAgent, parseClientMessage, sortPeople, type Person } from "./protocol";

describe("cleanName", () => {
  it("trims and collapses spaces", () => {
    expect(cleanName("  Laura   K  ")).toBe("Laura K");
  });
  it("falls back to Guest when empty", () => {
    expect(cleanName("   ")).toBe("Guest");
  });
  it("shortens long names", () => {
    expect(cleanName("x".repeat(100))).toHaveLength(24);
  });
});

describe("deviceFromUserAgent", () => {
  it("recognises phones, tablets and laptops", () => {
    expect(deviceFromUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile")).toBe("phone");
    expect(deviceFromUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile Safari")).toBe("phone");
    expect(deviceFromUserAgent("Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/140")).toBe("laptop");
  });
});

describe("parseClientMessage", () => {
  it("accepts a valid hello and cleans the name", () => {
    expect(parseClientMessage(JSON.stringify({ t: "hello", name: "  Wei ", device: "phone", reconnects: 2 }))).toEqual({
      t: "hello",
      name: "Wei",
      device: "phone",
      reconnects: 2,
    });
  });
  it("rejects malformed input", () => {
    expect(parseClientMessage("not json")).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: "hello", name: 5, device: "phone" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: "hello", name: "A", device: "toaster" }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: "nope" }))).toBeNull();
    expect(parseClientMessage("x".repeat(2000))).toBeNull();
  });
  it("rejects impossible latency reports", () => {
    expect(parseClientMessage(JSON.stringify({ t: "report", rtt: -1 }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: "report", rtt: 123.6 }))).toEqual({ t: "report", rtt: 124 });
  });
});

describe("sortPeople", () => {
  it("orders by join time, then name", () => {
    const p = (id: string, name: string, joinedAt: number): Person => ({ id, name, device: "laptop", rtt: null, reconnects: 0, joinedAt });
    expect(sortPeople([p("1", "B", 2), p("2", "C", 1), p("3", "A", 2)]).map((x) => x.name)).toEqual(["C", "A", "B"]);
  });
});
