// Walking on the map: pure helpers used by the walk view, kept apart so they can be tested.

/** Walking speed in map units per second (the Nordknit office is about 1200 units wide). */
export const WALK_SPEED = 260;

export type Direction = { dx: number; dy: number };

const KEYS: Record<string, Direction> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

/** The direction for a key, or null if the key does not move. WASD works with Caps Lock too. */
export function keyDirection(key: string): Direction | null {
  return KEYS[key] ?? KEYS[key.toLowerCase()] ?? null;
}

/** Combined direction of all keys held down, scaled to length 1 (or 0 when they cancel out). */
export function heldDirection(keys: Iterable<string>): Direction {
  let dx = 0;
  let dy = 0;
  for (const k of keys) {
    const d = keyDirection(k);
    if (d) {
      dx += d.dx;
      dy += d.dy;
    }
  }
  const length = Math.hypot(dx, dy);
  return length === 0 ? { dx: 0, dy: 0 } : { dx: dx / length, dy: dy / length };
}

export interface Point {
  x: number;
  y: number;
}

/**
 * One step of walking.
 * With keys held, walk in that direction; otherwise walk towards the target and stop on it.
 * Returns the new position and whether the target was reached.
 */
export function step(from: Point, target: Point | null, keys: Direction, seconds: number, speed = WALK_SPEED): { at: Point; arrived: boolean } {
  const distance = speed * Math.min(seconds, 0.1); // a long frame (tab in background) never jumps far
  if (keys.dx !== 0 || keys.dy !== 0) {
    return { at: { x: from.x + keys.dx * distance, y: from.y + keys.dy * distance }, arrived: false };
  }
  if (!target) return { at: from, arrived: true };
  const gap = Math.hypot(target.x - from.x, target.y - from.y);
  if (gap <= distance) return { at: { ...target }, arrived: true };
  return { at: { x: from.x + ((target.x - from.x) / gap) * distance, y: from.y + ((target.y - from.y) / gap) * distance }, arrived: false };
}
