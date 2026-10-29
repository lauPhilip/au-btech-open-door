// The day of the incident: its clock, its chat messages and its clues (issues #25, #26).
// The scenario file sets the speed and the events; the room only stores when the day started.

import type { DayEvent, Scenario } from "../scenario";
import { elapsedMs, newTimer, type Timer } from "./timer";
import type { Game, Minutes } from "./rules";
import type { TeamId } from "./teams";

/** How long teams walk and write notes before the day starts, in real minutes. */
export const WALK_MINUTES: Record<Minutes, number> = { 45: 12, 90: 25 };

/** A 45-minute class plays the day at double speed, so the same scenario fits. */
const SPEED_UP: Record<Minutes, number> = { 45: 0.5, 90: 1 };

export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToClock(minutes: number): string {
  const m = Math.floor(minutes);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Real milliseconds for one minute on the game clock. */
export function msPerGameMinute(scenario: Scenario, minutes: Minutes): number {
  return (scenario.day.minutes_per_game_minute ?? 0.25) * 60_000 * SPEED_UP[minutes];
}

export function dayDurationMs(scenario: Scenario, minutes: Minutes): number {
  const span = clockToMinutes(scenario.day.ends) - clockToMinutes(scenario.day.starts);
  return Math.round(span * msPerGameMinute(scenario, minutes));
}

export function walkDurationMs(minutes: Minutes): number {
  return WALK_MINUTES[minutes] * 60_000;
}

/** A fresh timer for the phase, or null for phases without one. */
export function timerFor(phase: Game["phase"], scenario: Scenario, minutes: Minutes, now: number): Timer | null {
  if (phase === "walk") return newTimer(now, walkDurationMs(minutes));
  if (phase === "day") return newTimer(now, dayDurationMs(scenario, minutes));
  return null;
}

/** The game clock as minutes since midnight. Before the day it shows the start, after it the end. */
export function dayMinute(scenario: Scenario, game: Game, now: number): number {
  const start = clockToMinutes(scenario.day.starts);
  const end = clockToMinutes(scenario.day.ends);
  if (game.phase !== "day" || !game.timer) return game.phase === "lobby" || game.phase === "story" || game.phase === "walk" ? start : end;
  const gone = elapsedMs(game.timer, now) / msPerGameMinute(scenario, game.minutes);
  return Math.min(end, start + gone);
}

/** Chat messages that have arrived by this game minute, oldest first. */
export function eventsBy(scenario: Scenario, minute: number): DayEvent[] {
  return scenario.day.events.filter((e) => clockToMinutes(e.at) <= minute).sort((a, b) => clockToMinutes(a.at) - clockToMinutes(b.at));
}

/** Indexes of the clues hidden in a room. */
export function cluesInRoom(scenario: Scenario, room: string): number[] {
  return scenario.day.clues.flatMap((c, i) => (c.room === room ? [i] : []));
}

/** Indexes of the clues a team has found. */
export function teamClues(game: Game, team: TeamId): readonly number[] {
  return game.clues?.[team] ?? [];
}

/** The team finds every clue in this room. Returns the same game if there is nothing new. */
export function findClues(game: Game, scenario: Scenario, team: TeamId, room: string | null): Game {
  if (!room || game.phase !== "day") return game;
  const known = teamClues(game, team);
  const fresh = cluesInRoom(scenario, room).filter((i) => !known.includes(i));
  if (fresh.length === 0) return game;
  return { ...game, clues: { ...game.clues, [team]: [...known, ...fresh] } };
}

/** When the day starts, teams standing in a clue room find its clue at once. */
export function findCluesInPlace(game: Game, scenario: Scenario): Game {
  return game.players.reduce((g, p) => (p.team ? findClues(g, scenario, p.team, p.room) : g), game);
}
