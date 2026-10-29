// Sticky notes: what a student thinks could go wrong (issue #22).
// A note uses the same plain words as the teacher's answer key, so the two can be compared later.

import type { Actor, Harm } from "../scenario";
import { roomAt, spots, type Scenario } from "../scenario";
import { findPlayer, type Game, type GameError } from "./rules";
import type { TeamId } from "./teams";

/** Longest note text, in characters. A note is a sticky note, not an essay. */
export const NOTE_MAX_CHARS = 80;
/** Most notes one player can keep, so a room cannot be filled with them. */
export const NOTES_PER_PLAYER = 40;

export type Likelihood = 1 | 2 | 3 | 4;

export interface Note {
  id: string;
  /** The player who wrote it. Notes are private to the author until shared (issue #23). */
  author: string;
  team: TeamId;
  text: string;
  harm: Harm[];
  actor: Actor[];
  likelihood: Likelihood;
  /** Where the author stood when writing, in map units. */
  x: number;
  y: number;
  room: string | null;
  /** The person or thing the note is about, if the player wrote it from a close-up. */
  about: string | null;
  createdAt: number;
  /** False: only the author sees it. True: the whole team sees it (issue #23). */
  shared: boolean;
  /** Ids of the players whose notes were merged into this one, besides the author. */
  mergedWith: string[];
}

/** What the note form sends. */
export interface NoteInput {
  text: string;
  harm: Harm[];
  actor: Actor[];
  likelihood: Likelihood;
  about?: string | null;
}

/** Plain-language choices for the form. The order is the order on screen. */
export const HARM_CHOICES: ReadonlyArray<{ id: Harm; label: string; hint: string }> = [
  { id: "leak", label: "Leak information", hint: "Someone sees data they should not see" },
  { id: "change", label: "Change something", hint: "Someone changes data or settings" },
  { id: "stop", label: "Stop the work", hint: "Something stops working" },
];

export const ACTOR_CHOICES: ReadonlyArray<{ id: Actor; label: string; hint: string }> = [
  { id: "online", label: "Someone online", hint: "An attacker on the internet" },
  { id: "visitor", label: "A visitor or driver", hint: "Someone who walks in" },
  { id: "employee", label: "An employee", hint: "On purpose or by mistake" },
  { id: "supplier", label: "A supplier", hint: "A partner or service provider" },
  { id: "accident", label: "An accident", hint: "Nobody did it on purpose" },
];

export const LIKELIHOOD_CHOICES: ReadonlyArray<{ id: Likelihood; label: string }> = [
  { id: 1, label: "1 · In theory only" },
  { id: 2, label: "2 · Heard of it elsewhere" },
  { id: 3, label: "3 · Seen at firms like us" },
  { id: 4, label: "4 · Happened here" },
];

export const HARM_IDS: readonly Harm[] = HARM_CHOICES.map((c) => c.id);
export const ACTOR_IDS: readonly Actor[] = ACTOR_CHOICES.map((c) => c.id);

export const isLikelihood = (v: unknown): v is Likelihood => v === 1 || v === 2 || v === 3 || v === 4;

/** Squash white space and cut to the limit; returns an empty string if nothing is left. */
export function cleanNoteText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX_CHARS);
}

/** Keep only known values, once each, in the order of the choices. */
function pick<T extends string>(values: readonly unknown[], allowed: readonly T[]): T[] {
  return allowed.filter((a) => values.includes(a));
}

type Fail = { ok: false; error: GameError };
const fail = (error: GameError): Fail => ({ ok: false, error });

/** Write a note. The position comes from the room's record of the player, not from the message. */
export function addNote(
  notes: readonly Note[],
  game: Game,
  scenario: Scenario,
  playerId: string,
  input: NoteInput,
  id: string,
  now: number,
): { ok: true; value: Note[] } | Fail {
  const player = findPlayer(game, playerId);
  if (!player) return fail("not-joined");
  if (game.phase !== "walk") return fail("not-walking");
  if (!player.team) return fail("no-team");
  const text = cleanNoteText(input.text);
  const harm = pick(input.harm, HARM_IDS);
  const actor = pick(input.actor, ACTOR_IDS);
  if (!text || harm.length === 0 || actor.length === 0 || !isLikelihood(input.likelihood)) return fail("bad-note");
  if (notes.filter((n) => n.author === playerId).length >= NOTES_PER_PLAYER) return fail("too-many-notes");
  const about = input.about && spots(scenario).some((s) => s.id === input.about) ? input.about : null;
  const note: Note = {
    id,
    author: playerId,
    team: player.team,
    text,
    harm,
    actor,
    likelihood: input.likelihood,
    x: player.x,
    y: player.y,
    room: roomAt(scenario, player.x, player.y)?.id ?? null,
    about,
    createdAt: now,
    shared: false,
    mergedWith: [],
  };
  return { ok: true, value: [...notes, note] };
}

/** Remove one of your own notes. */
export function removeNote(notes: readonly Note[], playerId: string, id: string): { ok: true; value: Note[] } | Fail {
  if (!notes.some((n) => n.id === id && n.author === playerId)) return fail("unknown-note");
  return { ok: true, value: notes.filter((n) => n.id !== id) };
}

/** Show your own note to your team, or take it back. Only the author can do this. */
export function setShared(notes: readonly Note[], playerId: string, id: string, shared: boolean): { ok: true; value: Note[] } | Fail {
  const note = notes.find((n) => n.id === id && n.author === playerId);
  if (!note) return fail("unknown-note");
  if (note.shared === shared) return { ok: true, value: [...notes] };
  return { ok: true, value: notes.map((n) => (n === note ? { ...n, shared } : n)) };
}

/**
 * Merge two shared notes of the player's team into one. The first note stays, with its text;
 * harms and who are combined and the higher likelihood wins. Anyone on the team may merge.
 */
export function mergeNotes(notes: readonly Note[], game: Game, playerId: string, keepId: string, dropId: string): { ok: true; value: Note[] } | Fail {
  const player = findPlayer(game, playerId);
  if (!player?.team) return fail("no-team");
  const keep = notes.find((n) => n.id === keepId);
  const drop = notes.find((n) => n.id === dropId);
  if (!keep || !drop || keep === drop || !keep.shared || !drop.shared || keep.team !== player.team || drop.team !== player.team) {
    return fail("unknown-note");
  }
  const merged: Note = {
    ...keep,
    harm: HARM_IDS.filter((h) => keep.harm.includes(h) || drop.harm.includes(h)),
    actor: ACTOR_IDS.filter((a) => keep.actor.includes(a) || drop.actor.includes(a)),
    likelihood: Math.max(keep.likelihood, drop.likelihood) as Likelihood,
    mergedWith: [...new Set([...keep.mergedWith, drop.author, ...drop.mergedWith])].filter((a) => a !== keep.author),
  };
  return { ok: true, value: notes.filter((n) => n !== drop).map((n) => (n === keep ? merged : n)) };
}

/** What one player may see: their own notes, plus everything their team has shared. */
export function visibleNotes(notes: readonly Note[], game: Game, playerId: string): Note[] {
  const team = findPlayer(game, playerId)?.team ?? null;
  return notes.filter((n) => n.author === playerId || (n.shared && team !== null && n.team === team));
}

/** The notes one player has written. */
export function notesBy(notes: readonly Note[], playerId: string): Note[] {
  return notes.filter((n) => n.author === playerId);
}
