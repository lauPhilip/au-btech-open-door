// Messages between the browser and a game room.

import type { Actor, Harm } from "../scenario";
import { isFace } from "./faces";
import { ACTOR_IDS, HARM_IDS, isLikelihood, type Note, type NoteInput } from "./notes";
import { PHASES, type Game, type GameError, type Phase } from "./rules";
import { isTeamId, type TeamId } from "./teams";

/** Who is on the other end of a connection. */
export type Role = "player" | "teacher" | "screen";

export type GameClientMessage =
  | { t: "join"; name: string; face: number }
  | { t: "team"; team: TeamId }
  | { t: "move"; x: number; y: number }
  | { t: "ask"; person: string; topic: number }
  | ({ t: "note" } & NoteInput)
  | { t: "unnote"; id: string }
  | { t: "phase"; phase: Phase };

/** One player's new position: id, x, y and room (or null in a corridor). */
export type MoveEntry = [id: string, x: number, y: number, room: string | null];

export type GameServerMessage =
  | { t: "you"; id: string; role: Role }
  | { t: "state"; game: Game }
  | { t: "moves"; m: MoveEntry[] }
  | { t: "notes"; notes: Note[] }
  | { t: "error"; code: GameError; text: string };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Parse and validate a message from a client. Anything malformed returns null. */
export function parseGameMessage(raw: string): GameClientMessage | null {
  if (raw.length > 512) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case "join":
      if (typeof m.name !== "string" || !isFace(m.face)) return null;
      return { t: "join", name: m.name, face: m.face };
    case "team":
      return isTeamId(m.team) ? { t: "team", team: m.team } : null;
    case "move":
      if (!finite(m.x) || !finite(m.y)) return null;
      return { t: "move", x: m.x, y: m.y };
    case "ask":
      if (typeof m.person !== "string" || !/^[a-z0-9-]{1,40}$/.test(m.person)) return null;
      if (typeof m.topic !== "number" || !Number.isInteger(m.topic) || m.topic < 0 || m.topic > 9) return null;
      return { t: "ask", person: m.person, topic: m.topic };
    case "note": {
      if (typeof m.text !== "string" || m.text.length > 400 || !isLikelihood(m.likelihood)) return null;
      if (!Array.isArray(m.harm) || !Array.isArray(m.actor)) return null;
      const harm = HARM_IDS.filter((h) => (m.harm as unknown[]).includes(h)) as Harm[];
      const actor = ACTOR_IDS.filter((a) => (m.actor as unknown[]).includes(a)) as Actor[];
      const about = typeof m.about === "string" && /^[a-z0-9-]{1,40}$/.test(m.about) ? m.about : null;
      return { t: "note", text: m.text, harm, actor, likelihood: m.likelihood, about };
    }
    case "unnote":
      return typeof m.id === "string" && /^[A-Za-z0-9_-]{4,32}$/.test(m.id) ? { t: "unnote", id: m.id } : null;
    case "phase":
      return PHASES.includes(m.phase as Phase) ? { t: "phase", phase: m.phase as Phase } : null;
    default:
      return null;
  }
}

/** Which messages each role may send. The projector only watches. */
export function mayRoleSend(role: Role, message: GameClientMessage): boolean {
  switch (role) {
    case "player":
      return message.t !== "phase";
    case "teacher":
      return message.t === "phase";
    case "screen":
      return false;
  }
}
