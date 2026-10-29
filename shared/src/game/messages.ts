// Messages between the browser and a game room.

import { isFace } from "./faces";
import { PHASES, type Game, type GameError, type Phase } from "./rules";
import { isTeamId, type TeamId } from "./teams";

/** Who is on the other end of a connection. */
export type Role = "player" | "teacher" | "screen";

export type GameClientMessage =
  | { t: "join"; name: string; face: number }
  | { t: "team"; team: TeamId }
  | { t: "move"; x: number; y: number }
  | { t: "ask"; person: string; topic: number }
  | { t: "phase"; phase: Phase };

/** One player's new position: id, x, y and room (or null in a corridor). */
export type MoveEntry = [id: string, x: number, y: number, room: string | null];

export type GameServerMessage =
  | { t: "you"; id: string; role: Role }
  | { t: "state"; game: Game }
  | { t: "moves"; m: MoveEntry[] }
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
