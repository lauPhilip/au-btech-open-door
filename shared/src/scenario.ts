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
  map: { width: number; height: number; rooms: Room[]; zones: Zone[] };
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
