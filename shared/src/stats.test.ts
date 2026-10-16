import { describe, expect, it } from "vitest";
import { median, percentile, RttWindow, summarise } from "./stats";

describe("percentile", () => {
  it("handles empty lists", () => {
    expect(percentile([], 50)).toBeNull();
  });
  it("finds the median and the 95th percentile", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(median(values)).toBe(50);
    expect(percentile(values, 95)).toBe(95);
  });
});

describe("RttWindow", () => {
  it("keeps only the latest samples", () => {
    const w = new RttWindow(3);
    [500, 10, 20, 30].forEach((v) => w.add(v));
    expect(w.count).toBe(3);
    expect(w.median).toBe(20);
  });
});

describe("summarise", () => {
  it("summarises a room", () => {
    expect(summarise([40, 80, null, 600], [0, 1, 2, 0])).toEqual({
      people: 4,
      medianRtt: 80,
      p95Rtt: 600,
      maxRtt: 600,
      under400: 2,
      reconnects: 3,
    });
  });
});
