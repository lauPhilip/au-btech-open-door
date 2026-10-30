import { describe, expect, it } from "vitest";
import { nearestWalkable, roomAt, route, scenarios, slide, unreachableRooms, walkable, type Scenario } from "./index";

const nordknit = Object.values(scenarios).filter((s) => s.company.id === "nordknit");

describe.each(nordknit.map((s) => [s.id, s] as const))("walls and doors in %s", (_id, scenario: Scenario) => {
  const room = (id: string) => scenario.map.rooms.find((r) => r.id === id)!;
  const middle = (id: string) => ({ x: room(id).rect[0] + room(id).rect[2] / 2, y: room(id).rect[1] + room(id).rect[3] / 2 });

  it("lets you reach every room from the start room", () => {
    expect(unreachableRooms(scenario)).toEqual([]);
  });

  it("treats the lawn and the walls between rooms as not walkable", () => {
    expect(walkable(scenario, 10, 10)).toBe(false);
    const w = room("webshop").rect;
    const a = room("accounting").rect;
    expect(walkable(scenario, (w[0] + w[2] + a[0]) / 2, 150)).toBe(false);
  });

  it("walks through a door and not through a wall", () => {
    const from = middle("webshop");
    const straight = slide(scenario, from, { x: from.x, y: from.y + 200 }); // straight down into the wall below the room
    expect(roomAt(scenario, straight.x, straight.y)?.id).toBe("webshop");
    expect(straight.y).toBeLessThan(room("webshop").rect[1] + room("webshop").rect[3] + 20);
  });

  it("slides along a wall instead of stopping dead", () => {
    const r = room("webshop").rect;
    const from = { x: r[0] + 100, y: r[1] + r[3] - 2 };
    const moved = slide(scenario, from, { x: from.x + 40, y: from.y + 30 });
    expect(moved.x).toBeGreaterThan(from.x + 30);
  });

  it("routes every pair of rooms through doors, and each leg stays on the floor", () => {
    for (const a of scenario.map.rooms) {
      for (const b of scenario.map.rooms) {
        if (a.id === b.id) continue;
        const path = route(scenario, middle(a.id), middle(b.id));
        expect(path.length).toBeGreaterThan(1);
        let at = middle(a.id);
        for (const p of path) {
          const length = Math.hypot(p.x - at.x, p.y - at.y);
          for (let t = 0; t <= 1; t += 1 / Math.max(1, Math.ceil(length / 3))) {
            const x = at.x + (p.x - at.x) * t;
            const y = at.y + (p.y - at.y) * t;
            expect(walkable(scenario, x, y), `${a.id} to ${b.id} at ${Math.round(x)},${Math.round(y)}`).toBe(true);
          }
          at = p;
        }
        expect(Math.hypot(at.x - middle(b.id).x, at.y - middle(b.id).y)).toBeLessThan(1);
      }
    }
  });

  it("sends a tap on a wall to the nearest floor", () => {
    const p = nearestWalkable(scenario, { x: 10, y: 10 });
    expect(walkable(scenario, p.x, p.y)).toBe(true);
  });
});
