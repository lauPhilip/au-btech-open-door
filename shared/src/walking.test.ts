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

  it("keeps every wall closed: two floors that touch must be joined by a door", () => {
    const all = [...scenario.map.rooms.map((r) => ({ id: r.id, rect: r.rect })), ...(scenario.map.floors ?? [])];
    const doors = scenario.map.doors ?? [];
    const touch = (p: number[], q: number[]) => p[0]! <= q[0]! + q[2]! && q[0]! <= p[0]! + p[2]! && p[1]! <= q[1]! + q[3]! && q[1]! <= p[1]! + p[3]!;
    for (const [i, a] of all.entries()) {
      for (const b of all.slice(i + 1)) {
        if (!touch(a.rect, b.rect)) continue;
        const joined = doors.some((d) => (d.a === a.id && d.b === b.id) || (d.a === b.id && d.b === a.id));
        expect(joined, `${a.id} and ${b.id} touch with no wall and no door`).toBe(true);
      }
    }
  });

  it("makes each door overlap the floor on both sides", () => {
    const all = new Map([...scenario.map.rooms.map((r) => [r.id, r.rect] as const), ...(scenario.map.floors ?? []).map((f) => [f.id, f.rect] as const)]);
    for (const d of scenario.map.doors ?? []) {
      for (const side of [d.a, d.b]) {
        const r = all.get(side)!;
        const overlaps = d.rect[0] < r[0] + r[2] && r[0] < d.rect[0] + d.rect[2] && d.rect[1] < r[1] + r[3] && r[1] < d.rect[1] + d.rect[3];
        expect(overlaps, `door ${d.a}/${d.b} does not reach ${side}`).toBe(true);
      }
    }
  });

  it("sends a tap on a wall to the nearest floor", () => {
    const p = nearestWalkable(scenario, { x: 10, y: 10 });
    expect(walkable(scenario, p.x, p.y)).toBe(true);
  });
});
