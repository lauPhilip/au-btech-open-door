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
  { id: "leak", label: "Leak", hint: "Someone sees data they should not see" },
  { id: "change", label: "Change", hint: "Someone changes data or settings" },
  { id: "stop", label: "Stop", hint: "Something stops working" },
];

export const ACTOR_CHOICES: ReadonlyArray<{ id: Actor; label: string; hint: string }> = [
  { id: "online", label: "Someone online", hint: "An attacker on the internet" },
  { id: "visitor", label: "A visitor", hint: "Someone who walks in" },
  { id: "employee", label: "An employee", hint: "On purpose or by mistake" },
  { id: "supplier", label: "A supplier", hint: "A partner or service provider" },
  { id: "accident", label: "An accident", hint: "Nobody did it on purpose" },
];

export const LIKELIHOOD_CHOICES: ReadonlyArray<{ id: Likelihood; label: string }> = [
  { id: 1, label: "In theory" },
  { id: 2, label: "Heard of it elsewhere" },
  { id: 3, label: "Seen at companies like ours" },
  { id: 4, label: "Has happened here" },
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
  };
  return { ok: true, value: [...notes, note] };
}

/** Remove one of your own notes. */
export function removeNote(notes: readonly Note[], playerId: string, id: string): { ok: true; value: Note[] } | Fail {
  if (!notes.some((n) => n.id === id && n.author === playerId)) return fail("unknown-note");
  return { ok: true, value: notes.filter((n) => n.id !== id) };
}

/** The notes one player has written. */
export function notesBy(notes: readonly Note[], playerId: string): Note[] {
  return notes.filter((n) => n.author === playerId);
}
