// The rules of a live session, as pure functions.
// The room server holds one Game and changes it only through these functions,
// so every rule can be tested without a network.

import { INTERACT_RANGE, roomAt, startRoom, spots, type Scenario } from "../scenario";
import { cleanName } from "../protocol";
import { findClues, findCluesInPlace, timerFor } from "./day";
import { isFace } from "./faces";
import { addTime, isPaused, pauseTimer, resumeTimer, type Timer } from "./timer";
import { TEAM_MAX, TEAMS, type TeamId } from "./teams";

/**
 * Lobby: people join and pick teams. Story: the CEO's story plays. Walk: everyone explores.
 * Day: the incident unfolds. Vote: each team decides what the CEO should do. Debrief: the result and the answer key.
 */
export type Phase = "lobby" | "story" | "walk" | "day" | "vote" | "debrief";
export const PHASES: readonly Phase[] = ["lobby", "story", "walk", "day", "vote", "debrief"];

export type Minutes = 45 | 90;

export interface Player {
  id: string;
  name: string;
  face: number;
  team: TeamId | null;
  x: number;
  y: number;
  /** Room the player stands in, or null in a corridor. */
  room: string | null;
  /** Rooms this player has entered, in order. */
  visited: string[];
  online: boolean;
  joinedAt: number;
}

export interface Game {
  code: string;
  scenario: string;
  minutes: Minutes;
  phase: Phase;
  createdAt: number;
  /** In the order they joined. */
  players: Player[];
  /** Asset ids each team has found out about by asking questions (issue #19). */
  revealed: Partial<Record<TeamId, string[]>>;
  /** Countdown for the walk and for the day; null in the other phases. Pausing it pauses the class. */
  timer: Timer | null;
  /** Indexes into `scenario.day.clues` that each team has found (issue #26). */
  clues: Partial<Record<TeamId, number[]>>;
  /** The option each player voted for in the final choice, by player id (issue #27). */
  votes: Record<string, number>;
  /** How each team's notes covered each threat, in scenario order. Filled in when the debrief starts (issue #29). */
  results: Partial<Record<TeamId, Array<"hit" | "close" | "miss">>>;
  /** Which debrief question the teacher is showing on the projector (issue #30). */
  prompt: number;
  /** How many sticky notes each team has written, so the teacher can see who is working (issue #33). */
  noteCounts: Partial<Record<TeamId, number>>;
  /** The latest hint the teacher sent to each team (issue #33). */
  hints: Partial<Record<TeamId, { text: string; at: number }>>;
  /** Teams that say they are done with this step, and who pressed the button. Cleared whenever the class moves on. */
  ready: Partial<Record<TeamId, { by: string; at: number }>>;
}

export type GameError =
  | "game-full"
  | "team-full"
  | "not-joined"
  | "no-team"
  | "not-walking"
  | "bad-phase"
  | "bad-face"
  | "too-far"
  | "unknown-question"
  | "not-voting"
  | "not-debrief"
  | "bad-hint"
  | "too-late"
  | "unknown-option"
  | "paused"
  | "bad-note"
  | "too-many-notes"
  | "unknown-note"
  | "not-allowed";

/** Plain-language text for each error, shown to the player. */
export const ERROR_TEXT: Record<GameError, string> = {
  "game-full": "This session is full. Ask your teacher for help.",
  "team-full": "That table is full. Pick another team.",
  "not-joined": "Join the session first.",
  "no-team": "Pick a team first.",
  "not-walking": "Wait until your teacher starts the walk.",
  "bad-phase": "The session cannot go to that step now.",
  "bad-face": "Pick a face.",
  "too-far": "Walk closer to talk to them.",
  "unknown-question": "That question is not in this scenario.",
  "bad-hint": "A hint needs a few words and a team that is playing.",
  "too-late": "Players can only change tables before the walk starts.",
  "not-debrief": "The debrief has not started yet.",
  "not-voting": "The vote has not started yet.",
  "unknown-option": "That choice is not on the list.",
  "paused": "The teacher paused the game. Wait a moment.",
  "bad-note": "A note needs a few words, at least one harm and at least one who.",
  "too-many-notes": "You have a lot of notes already. Delete one first.",
  "unknown-note": "That note is gone.",
  "not-allowed": "Only the teacher can do that.",
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: GameError };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: GameError): Result<T> => ({ ok: false, error });

/** Five full tables plus a few people who have not picked one yet. */
export const MAX_PLAYERS = TEAMS.length * TEAM_MAX + 5;

/** Players are drawn as circles with this radius in map units; they stay this far from the edge. */
export const AVATAR_RADIUS = 14;

/** Spacing between players when they appear in the start room. */
const SPAWN_GAP = 36;

export function newGame(code: string, scenario: string, minutes: Minutes, now: number): Game {
  return { code, scenario, minutes, phase: "lobby", createdAt: now, players: [], revealed: {}, timer: null, clues: {}, votes: {}, results: {}, prompt: 0, noteCounts: {}, hints: {}, ready: {} };
}

export function findPlayer(game: Game, id: string): Player | undefined {
  return game.players.find((p) => p.id === id);
}

/** Keep a point inside the map, leaving room for the avatar. */
export function clampToMap(scenario: Scenario, x: number, y: number): { x: number; y: number } {
  const r = AVATAR_RADIUS;
  return {
    x: Math.round(Math.min(scenario.map.width - r, Math.max(r, x))),
    y: Math.round(Math.min(scenario.map.height - r, Math.max(r, y))),
  };
}

/**
 * Where player number `index` appears: a grid around the middle of the start room,
 * so people who join together do not stand on top of each other.
 */
export function spawnPoint(scenario: Scenario, index: number): { x: number; y: number } {
  const [rx, ry, rw, rh] = startRoom(scenario).rect;
  const cols = Math.max(1, Math.floor((rw - 2 * AVATAR_RADIUS) / SPAWN_GAP));
  const rows = Math.max(1, Math.floor((rh - 2 * AVATAR_RADIUS) / SPAWN_GAP));
  const slot = index % (cols * rows);
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  const x = rx + (rw - (cols - 1) * SPAWN_GAP) / 2 + col * SPAWN_GAP;
  const y = ry + (rh - (rows - 1) * SPAWN_GAP) / 2 + row * SPAWN_GAP;
  return clampToMap(scenario, x, y);
}

/**
 * Join the game, or come back after a reconnect.
 * A returning player keeps their team and place, and may change name and face.
 */
export function join(game: Game, scenario: Scenario, id: string, name: string, face: number, now: number): Result<Game> {
  if (!isFace(face)) return fail("bad-face");
  const clean = cleanName(name);
  const existing = findPlayer(game, id);
  if (existing) {
    return ok(replacePlayer(game, { ...existing, name: clean, face, online: true }));
  }
  if (game.players.length >= MAX_PLAYERS) return fail("game-full");
  const { x, y } = spawnPoint(scenario, game.players.length);
  const room = roomAt(scenario, x, y)?.id ?? null;
  const player: Player = { id, name: clean, face, team: null, x, y, room, visited: room ? [room] : [], online: true, joinedAt: now };
  return ok({ ...game, players: [...game.players, player] });
}

/** How many players sit at each table. */
export function teamCounts(game: Game): Record<TeamId, number> {
  const counts = Object.fromEntries(TEAMS.map((t) => [t.id, 0])) as Record<TeamId, number>;
  for (const p of game.players) if (p.team) counts[p.team]++;
  return counts;
}

export function chooseTeam(game: Game, id: string, team: TeamId): Result<Game> {
  const player = findPlayer(game, id);
  if (!player) return fail("not-joined");
  if (player.team === team) return ok(game);
  if (teamCounts(game)[team] >= TEAM_MAX) return fail("team-full");
  return ok(replacePlayer(game, { ...player, team }));
}

export function setOnline(game: Game, id: string, online: boolean): Game {
  const player = findPlayer(game, id);
  if (!player || player.online === online) return game;
  return replacePlayer(game, { ...player, online });
}

/** The phase after this one, or null at the end. */
export function nextPhase(phase: Phase): Phase | null {
  return PHASES[PHASES.indexOf(phase) + 1] ?? null;
}

/** Phases in which students walk, talk and write notes. */
export function isPlaying(game: Game): boolean {
  return game.phase === "walk" || game.phase === "day";
}

/** Why a player cannot act right now, or null if they can. */
export function playBlock(game: Game): GameError | null {
  if (!isPlaying(game)) return "not-walking";
  if (game.timer && isPaused(game.timer)) return "paused";
  return null;
}

/**
 * The teacher moves the class on. Only one step forward at a time.
 * With `ctx` the walk and the day get their countdowns, and teams standing in a clue room find the clue.
 */
/** The next step is always allowed. From the walk onwards the teacher may also skip ahead, for example when the class is done early. */
export function canGoTo(from: Phase, to: Phase): boolean {
  if (nextPhase(from) === to) return true;
  const i = PHASES.indexOf(from);
  return i >= PHASES.indexOf("walk") && PHASES.indexOf(to) > i;
}

export function setPhase(game: Game, phase: Phase, ctx?: { scenario: Scenario; now: number }): Result<Game> {
  if (phase === game.phase) return ok(game);
  if (!canGoTo(game.phase, phase)) return fail("bad-phase");
  let next: Game = { ...game, phase, ready: {}, timer: ctx ? timerFor(phase, ctx.scenario, game.minutes, ctx.now) : null };
  if (ctx && phase === "day") next = findCluesInPlace(next, ctx.scenario);
  return ok(next);
}

export type TimerAction = "pause" | "resume" | "add";
export const ADD_TIME_MS = 5 * 60_000;

/** The teacher pauses or resumes the class, or adds five minutes to the walk. */
export function adjustTimer(game: Game, action: TimerAction, now: number): Result<Game> {
  if (!game.timer) return fail("bad-phase");
  if (action === "pause") return ok({ ...game, timer: pauseTimer(game.timer, now) });
  if (action === "resume") return ok({ ...game, timer: resumeTimer(game.timer, now) });
  if (game.phase !== "walk") return fail("bad-phase");
  return ok({ ...game, timer: addTime(game.timer, ADD_TIME_MS) });
}

export interface Moved {
  game: Game;
  player: Player;
  /** True when the player entered a room for the first time. */
  firstVisit: boolean;
  /** True when the team found a new clue by walking in. */
  newClue: boolean;
}

/** Move a player to a point on the map. The point is clamped to the map. */
export function move(game: Game, scenario: Scenario, id: string, x: number, y: number): Result<Moved> {
  const player = findPlayer(game, id);
  if (!player) return fail("not-joined");
  const block = playBlock(game);
  if (block) return fail(block);
  if (!player.team) return fail("no-team");
  const point = clampToMap(scenario, x, y);
  const room = roomAt(scenario, point.x, point.y)?.id ?? null;
  const firstVisit = room !== null && !player.visited.includes(room);
  const moved: Player = { ...player, ...point, room, visited: firstVisit && room ? [...player.visited, room] : player.visited };
  const updated = replacePlayer(game, moved);
  const withClues = findClues(updated, scenario, player.team, room);
  return ok({ game: withClues, player: moved, firstVisit, newClue: withClues !== updated });
}

/** Rooms that at least one member of the team has entered. */
export function teamVisited(game: Game, team: TeamId): Set<string> {
  const rooms = new Set<string>();
  for (const p of game.players) if (p.team === team) for (const r of p.visited) rooms.add(r);
  return rooms;
}

function replacePlayer(game: Game, player: Player): Game {
  return { ...game, players: game.players.map((p) => (p.id === player.id ? player : p)) };
}

/**
 * A player asks a person a question. The team learns which assets the answer points to.
 * The player must stand near the person; the answer itself is shown from the scenario file.
 */
export function ask(game: Game, scenario: Scenario, id: string, personId: string, topic: number): Result<Game> {
  const player = findPlayer(game, id);
  if (!player) return fail("not-joined");
  const block = playBlock(game);
  if (block) return fail(block);
  if (!player.team) return fail("no-team");
  const question = scenario.people.find((p) => p.id === personId)?.topics[topic];
  const spot = spots(scenario).find((s) => s.kind === "person" && s.id === personId);
  if (!question || !spot) return fail("unknown-question");
  // A little slack over the prompt range, because the server position can lag behind the screen.
  if (Math.hypot(spot.x - player.x, spot.y - player.y) > INTERACT_RANGE * 1.5) return fail("too-far");
  const known = game.revealed?.[player.team] ?? [];
  const fresh = (question.reveals ?? []).filter((a) => !known.includes(a));
  if (fresh.length === 0) return ok(game);
  return ok({ ...game, revealed: { ...game.revealed, [player.team]: [...known, ...fresh] } });
}

/** Asset ids the team has found so far. */
export function teamRevealed(game: Game, team: TeamId): readonly string[] {
  return game.revealed?.[team] ?? [];
}

/** The prompt number that means "the questions are done, show the class summary": one past the last question. */
export const summaryPrompt = (scenario: Scenario): number => scenario.debrief.prompts.length;

/** The teacher moves to another debrief question, or one past the last to show the class summary. */
export function setPrompt(game: Game, scenario: Scenario, index: number): Result<Game> {
  if (game.phase !== "debrief") return fail("not-debrief");
  return ok({ ...game, prompt: Math.max(0, Math.min(summaryPrompt(scenario), Math.trunc(index))) });
}

/** The teacher moves a student to another table, before the walk starts (issue #10). */
export function assignTeam(game: Game, id: string, team: TeamId): Result<Game> {
  if (game.phase !== "lobby" && game.phase !== "story") return fail("too-late");
  return chooseTeam(game, id, team);
}

/** A student tells the teacher their whole table is done with this step (or takes it back). Anyone at the table can press it. */
export function setReady(game: Game, id: string, ready: boolean, now: number): Result<Game> {
  const player = findPlayer(game, id);
  if (!player) return fail("not-joined");
  if (!isPlaying(game)) return fail("not-walking");
  if (!player.team) return fail("no-team");
  const mine = game.ready?.[player.team];
  if (ready === !!mine) return ok(game);
  const { [player.team]: _gone, ...others } = game.ready ?? {};
  return ok({ ...game, ready: ready ? { ...others, [player.team]: { by: player.name, at: now } } : others });
}

export const HINT_MAX_CHARS = 120;

/** The teacher sends a short hint to one team. It shows on their phones until they close it. */
export function sendHint(game: Game, team: TeamId, text: string, now: number): Result<Game> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, HINT_MAX_CHARS);
  if (clean.length < 3 || !isPlaying(game) || !game.players.some((p) => p.team === team)) return fail("bad-hint");
  return ok({ ...game, hints: { ...game.hints, [team]: { text: clean, at: now } } });
}
