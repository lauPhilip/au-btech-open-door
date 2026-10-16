import { describe, expect, it } from "vitest";
import { heldDirection, keyDirection, step, WALK_SPEED } from "./movement";

describe("keys", () => {
  it("knows arrows and WASD", () => {
    expect(keyDirection("ArrowUp")).toEqual({ dx: 0, dy: -1 });
    expect(keyDirection("D")).toEqual({ dx: 1, dy: 0 });
    expect(keyDirection("q")).toBeNull();
  });
  it("walks diagonally at normal speed and stops when keys cancel", () => {
    const d = heldDirection(["ArrowUp", "ArrowRight"]);
    expect(Math.hypot(d.dx, d.dy)).toBeCloseTo(1);
    expect(heldDirection(["a", "d"])).toEqual({ dx: 0, dy: 0 });
  });
});

describe("step", () => {
  const none = { dx: 0, dy: 0 };
  it("walks towards the target and stops on it", () => {
    const first = step({ x: 0, y: 0 }, { x: 100, y: 0 }, none, 0.1);
    expect(first.at.x).toBeCloseTo(WALK_SPEED * 0.1);
    expect(first.arrived).toBe(false);
    const last = step({ x: 95, y: 0 }, { x: 100, y: 0 }, none, 0.1);
    expect(last).toEqual({ at: { x: 100, y: 0 }, arrived: true });
  });
  it("lets keys win over a tap target", () => {
    const r = step({ x: 0, y: 0 }, { x: 100, y: 0 }, { dx: 0, dy: 1 }, 0.1);
    expect(r.at.x).toBe(0);
    expect(r.at.y).toBeGreaterThan(0);
  });
  it("never jumps far after a long pause", () => {
    expect(step({ x: 0, y: 0 }, { x: 10_000, y: 0 }, none, 5).at.x).toBeCloseTo(WALK_SPEED * 0.1);
  });
  it("stays put with no target and no keys", () => {
    expect(step({ x: 3, y: 4 }, null, none, 0.1)).toEqual({ at: { x: 3, y: 4 }, arrived: true });
  });
});
