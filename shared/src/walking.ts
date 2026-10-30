// Walls and doors. Rooms and hallway pieces are the floor; everything between them is wall, except
// where a door gap joins two of them. Every piece is a plain rectangle, so a straight line inside one
// piece is always free, and getting from one piece to another means going through a door.
// A scenario without doors has no walls and everyone walks freely (the old behaviour).

import type { Scenario } from "./scenario";

export interface Pt {
  x: number;
  y: number;
}

type Rect = [number, number, number, number];
interface Region {
  id: string;
  rect: Rect;
}

const inside = (r: Rect, x: number, y: number) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const clampTo = (r: Rect, p: Pt): Pt => ({ x: Math.min(r[0] + r[2], Math.max(r[0], p.x)), y: Math.min(r[1] + r[3], Math.max(r[1], p.y)) });

function regionsOf(s: Scenario): Region[] {
  return [...s.map.rooms.map((r) => ({ id: r.id, rect: r.rect })), ...(s.map.floors ?? [])];
}

export function hasWalls(s: Scenario): boolean {
  return (s.map.doors?.length ?? 0) > 0;
}

/** Can a person stand here? Always true when the scenario has no walls. */
export function walkable(s: Scenario, x: number, y: number): boolean {
  if (!hasWalls(s)) return true;
  return regionsOf(s).some((r) => inside(r.rect, x, y)) || (s.map.doors ?? []).some((d) => inside(d.rect, x, y));
}

/** The closest place a person can stand: where a tap on a wall or the lawn ends up. */
export function nearestWalkable(s: Scenario, p: Pt): Pt {
  if (walkable(s, p.x, p.y)) return p;
  let best = p;
  let bestGap = Infinity;
  for (const r of regionsOf(s)) {
    const c = clampTo(r.rect, p);
    const gap = dist(c, p);
    if (gap < bestGap) {
      best = c;
      bestGap = gap;
    }
  }
  return best;
}

function regionAt(s: Scenario, p: Pt): string | null {
  const hit = regionsOf(s).find((r) => inside(r.rect, p.x, p.y));
  if (hit) return hit.id;
  const door = (s.map.doors ?? []).find((d) => inside(d.rect, p.x, p.y));
  return door ? door.a : null;
}

/** Moves a little at a time and slides along walls instead of stopping dead or jumping through them. */
export function slide(s: Scenario, from: Pt, to: Pt): Pt {
  if (!hasWalls(s) || !walkable(s, from.x, from.y)) return to;
  const pieces = Math.max(1, Math.ceil(dist(from, to) / 4));
  const dx = (to.x - from.x) / pieces;
  const dy = (to.y - from.y) / pieces;
  let at = from;
  for (let i = 0; i < pieces; i++) {
    if (walkable(s, at.x + dx, at.y + dy)) at = { x: at.x + dx, y: at.y + dy };
    else if (dx !== 0 && walkable(s, at.x + dx, at.y)) at = { x: at.x + dx, y: at.y };
    else if (dy !== 0 && walkable(s, at.x, at.y + dy)) at = { x: at.x, y: at.y + dy };
    else break;
  }
  return at;
}

/** The points to walk through, in order, to get from one place to another by way of the doors. */
export function route(s: Scenario, from: Pt, to: Pt): Pt[] {
  if (!hasWalls(s)) return [to];
  const goal = nearestWalkable(s, to);
  const start = regionAt(s, nearestWalkable(s, from));
  const end = regionAt(s, goal);
  if (!start || !end || start === end) return [goal];

  const byId = new Map(regionsOf(s).map((r) => [r.id, r]));
  const doors = s.map.doors ?? [];
  const side = (i: number, region: string): Pt => {
    const d = doors[i]!;
    const r = byId.get(region)!;
    return clampTo(r.rect, { x: d.rect[0] + d.rect[2] / 2, y: d.rect[1] + d.rect[3] / 2 });
  };

  // Dijkstra over "I just came through door i and now stand in region r".
  type State = { door: number; region: string; at: Pt; cost: number; prev: State | null };
  const settled = new Set<string>();
  const open: State[] = [];
  const push = (door: number, region: string, at: Pt, cost: number, prev: State | null) => open.push({ door, region, at, cost, prev });
  const expand = (region: string, at: Pt, cost: number, prev: State | null) => {
    doors.forEach((d, i) => {
      if (d.a !== region && d.b !== region) return;
      const other = d.a === region ? d.b : d.a;
      const exit = side(i, region);
      const enter = side(i, other);
      push(i, other, enter, cost + dist(at, exit) + dist(exit, enter), prev);
    });
  };
  expand(start, from, 0, null);
  let found: State | null = null;
  let foundCost = Infinity;
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const cur = open.shift()!;
    const key = `${cur.door}:${cur.region}`;
    if (settled.has(key)) continue;
    settled.add(key);
    if (cur.region === end) {
      const total = cur.cost + dist(cur.at, goal);
      if (total < foundCost) {
        found = cur;
        foundCost = total;
      }
      break;
    }
    expand(cur.region, cur.at, cur.cost, cur);
  }
  if (!found) return [goal];
  const points: Pt[] = [goal];
  for (let st: State | null = found; st; st = st.prev) {
    const d = doors[st.door]!;
    const left = d.a === st.region ? d.b : d.a;
    points.unshift(side(st.door, left), st.at);
  }
  return points;
}

/** Can a person get from the start room to every room? Used to check scenarios. */
export function unreachableRooms(s: Scenario): string[] {
  if (!hasWalls(s)) return [];
  const start = s.map.rooms.find((r) => r.start) ?? s.map.rooms[0];
  if (!start) return [];
  const seen = new Set([start.id]);
  const queue = [start.id];
  while (queue.length) {
    const here = queue.pop()!;
    for (const d of s.map.doors ?? []) {
      const other = d.a === here ? d.b : d.b === here ? d.a : null;
      if (other && !seen.has(other)) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return s.map.rooms.filter((r) => !seen.has(r.id)).map((r) => r.id);
}
