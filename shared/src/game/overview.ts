// The teacher's live overview (issue #33): how each team is doing, and which team seems stuck.

import type { Scenario } from "../scenario";
import { teamVisited, isPlaying, type Game } from "./rules";
import { isPaused } from "./timer";
import { TEAMS, type TeamId } from "./teams";

/** A team that has not moved for this long is flagged. */
export const STUCK_MS = 3 * 60_000;

export interface TeamProgress {
  team: TeamId;
  members: number;
  rooms: number;
  roomsTotal: number;
  notes: number;
  clues: number;
  /** How long nobody at the table has moved, in ms (0 outside the walk and the day). */
  idleMs: number;
  stuck: boolean;
  /** The table says it is done with this step; `readyBy` is the student who pressed the button. */
  ready: boolean;
  readyBy: string | null;
  /** Names of rooms the team has not entered yet, in map order. */
  unvisited: string[];
}

/**
 * `lastMove` maps player id to the time they last moved; `since` is the later of when playing started
 * and when the class last resumed, so time spent paused never counts as being stuck.
 */
export function teamProgress(game: Game, scenario: Scenario, lastMove: Record<string, number>, since: number, now: number): TeamProgress[] {
  const playing = isPlaying(game) && !(game.timer && isPaused(game.timer));
  return TEAMS.map((t) => {
    const members = game.players.filter((p) => p.team === t.id);
    const visited = teamVisited(game, t.id);
    const last = Math.max(since, ...members.map((p) => lastMove[p.id] ?? 0));
    const idleMs = playing ? Math.max(0, now - last) : 0;
    return {
      team: t.id,
      members: members.length,
      rooms: visited.size,
      roomsTotal: scenario.map.rooms.length,
      notes: game.noteCounts?.[t.id] ?? 0,
      clues: game.clues?.[t.id]?.length ?? 0,
      idleMs,
      stuck: playing && members.length > 0 && idleMs >= STUCK_MS && !game.ready?.[t.id],
      ready: !!game.ready?.[t.id],
      readyBy: game.ready?.[t.id]?.by ?? null,
      unvisited: scenario.map.rooms.filter((r) => !visited.has(r.id)).map((r) => r.name),
    };
  }).filter((t) => t.members > 0);
}
