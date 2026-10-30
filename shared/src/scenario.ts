// TypeScript shape of a scenario file. Mirrors scenarios/scenario.schema.json.
// See docs/scenario-format.md for what each part means.

export type Harm = "leak" | "change" | "stop";
export type Actor = "online" | "visitor" | "employee" | "supplier" | "accident";
export type Stride =
  | "spoofing"
  | "tampering"
  | "repudiation"
  | "information-disclosure"
  | "denial-of-service"
  | "elevation-of-privilege";

export interface Room {
  id: string;
  name: string;
  /** x, y, width, height in map units. */
  rect: [number, number, number, number];
  zone: string;
  start?: boolean;
}

/** A piece of hallway or other floor that is not a room. */
export interface Floor {
  id: string;
  rect: [number, number, number, number];
}

/** A gap in a wall. It overlaps the floor on both sides, so walking through it joins them. */
export interface Door {
  a: string;
  b: string;
  rect: [number, number, number, number];
}

export interface Zone {
  id: string;
  name: string;
  inside: boolean;
}

export interface Topic {
  ask: string;
  answer: string;
  reveals?: string[];
}

export interface PersonInScenario {
  id: string;
  name: string;
  role: string;
  room: string;
  hello: string;
  topics: Topic[];
}

export interface Thing {
  id: string;
  name: string;
  room: string;
  text: string;
  closer?: string;
}

export interface Asset {
  id: string;
  name: string;
  lives_in: string[];
}

export interface Flow {
  from: string;
  to: string;
  via?: string;
  carries: string[];
}

export interface Threat {
  id: string;
  target: string;
  text: string;
  harm: Harm[];
  actor: Actor[];
  likelihood: 1 | 2 | 3 | 4;
  stride?: Stride[];
}

export interface DayEvent {
  at: string;
  from: string;
  text: string;
}

export interface Clue {
  room: string;
  text: string;
  points_to: string;
}

export interface Scenario {
  id: string;
  format: 1;
  title: string;
  lengths?: Array<45 | 90>;
  company: { id: string; name: string; place: string; fictional: boolean; summary: string };
  learning_goals?: string[];
  goal: string;
  story: Array<{ speaker: string; text: string }>;
  map: { width: number; height: number; rooms: Room[]; zones: Zone[]; floors?: Floor[]; doors?: Door[] };
  people: PersonInScenario[];
  things: Thing[];
  assets: Asset[];
  flows?: Flow[];
  threats: Threat[];
  day: {
    name: string;
    starts: string;
    ends: string;
    minutes_per_game_minute?: number;
    alert: string;
    problems: string[];
    events: DayEvent[];
    clues: Clue[];
    final_choice: {
      question: string;
      options: Array<{ text: string; result: string; score: number; best?: boolean }>;
    };
  };
  debrief: { prompts: string[]; next_class?: string };
}

/** The room that contains a point, or null in a corridor. */
export function roomAt(scenario: Scenario, x: number, y: number): Room | null {
  for (const room of scenario.map.rooms) {
    const [rx, ry, rw, rh] = room.rect;
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return room;
  }
  return null;
}

/** The room where players start, or the first room. */
export function startRoom(scenario: Scenario): Room {
  const room = scenario.map.rooms.find((r) => r.start) ?? scenario.map.rooms[0];
  if (!room) throw new Error(`Scenario ${scenario.id} has no rooms`);
  return room;
}

/** A person or thing a player can walk up to. */
export interface Spot {
  kind: "person" | "thing";
  id: string;
  name: string;
  room: string;
  /** Centre of the spot, in map units. */
  x: number;
  y: number;
}

/** Players can open a close-up when their avatar is this close to a spot (map units). */
export const INTERACT_RANGE = 80;

/**
 * Where every person and thing stands. People stand along the bottom edge of their room,
 * starting at the right; things sit in a row above them, spread across the room's width.
 * The scenario file does not store positions, so this layout is the same for everyone.
 */
export function spots(scenario: Scenario): Spot[] {
  const result: Spot[] = [];
  const rooms = new Map(scenario.map.rooms.map((r) => [r.id, r]));
  scenario.people.forEach((person, i) => {
    const room = rooms.get(person.room);
    if (!room) return;
    const [rx, ry, rw, rh] = room.rect;
    const before = scenario.people.slice(0, i).filter((p) => p.room === person.room).length;
    const narrow = rw < 120; // a cupboard: stand in the middle, near the bottom
    result.push(narrow
      ? { kind: "person", id: person.id, name: person.name, room: room.id, x: rx + Math.round(rw / 2), y: ry + rh - 16 - before * 56 }
      : { kind: "person", id: person.id, name: person.name, room: room.id, x: rx + rw - 40 - before * 56, y: ry + rh - 44 });
  });
  for (const room of scenario.map.rooms) {
    const [rx, ry, rw, rh] = room.rect;
    const here = scenario.things.filter((t) => t.room === room.id);
    here.forEach((thing, i) => {
      result.push({ kind: "thing", id: thing.id, name: thing.name, room: room.id, x: Math.round(rx + (rw * (i + 1)) / (here.length + 1)), y: rw < 120 ? ry + 50 : ry + rh - Math.min(112, Math.round(rh * 0.55)) });
    });
  }
  return result;
}

/** The spots within reach of a point, nearest first. */
export function spotsNear(scenario: Scenario, x: number, y: number, range = INTERACT_RANGE): Spot[] {
  return spots(scenario)
    .map((spot) => ({ spot, distance: Math.hypot(spot.x - x, spot.y - y) }))
    .filter((s) => s.distance <= range)
    .sort((a, b) => a.distance - b.distance)
    .map((s) => s.spot);
}
