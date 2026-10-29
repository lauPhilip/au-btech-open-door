// Export for the report (issues #34 and #35): a team's notes as a CyPro threat table, and the whole class as one file.

import type { Scenario } from "../scenario";
import { ACTOR_CHOICES, HARM_CHOICES, LIKELIHOOD_CHOICES, type Note } from "./notes";
import type { Game } from "./rules";
import { teamById, TEAMS, type TeamId } from "./teams";

/** The columns of the CyPro threat table: the threat, what it hits, who, how likely and how bad. */
export const THREAT_COLUMNS = ["Threat", "Target (asset or component)", "Where", "Harm (C · I · A)", "Threat actor", "Likelihood (1–4)", "Impact", "Noted by"] as const;

const HARM_LETTER = { leak: "C · Confidentiality (leak)", change: "I · Integrity (change)", stop: "A · Availability (stop)" } as const;

const LIKELIHOOD = new Map(LIKELIHOOD_CHOICES.map((l) => [l.id, l.label]));
const ACTOR = new Map(ACTOR_CHOICES.map((a) => [a.id, a.label]));

function nameOf(scenario: Scenario, id: string | null): string {
  if (!id) return "";
  return scenario.things.find((t) => t.id === id)?.name ?? scenario.people.find((p) => p.id === id)?.name ?? id;
}

/** One row per note. Impact is left empty on purpose: the class fills it in with the CyPro method. */
export function noteRow(scenario: Scenario, game: Game, note: Note): string[] {
  const room = scenario.map.rooms.find((r) => r.id === note.room)?.name ?? "";
  const writers = [note.author, ...note.mergedWith].map((id) => game.players.find((p) => p.id === id)?.name ?? "").filter(Boolean);
  return [
    note.text,
    nameOf(scenario, note.about) || room,
    room,
    note.harm.map((h) => HARM_LETTER[h] ?? HARM_CHOICES.find((c) => c.id === h)?.label ?? h).join("; "),
    note.actor.map((a) => ACTOR.get(a) ?? a).join("; "),
    LIKELIHOOD.get(note.likelihood) ?? String(note.likelihood),
    "",
    [...new Set(writers)].join(", "),
  ];
}

/** A team's shared notes as table rows, most likely first. */
export function teamTable(scenario: Scenario, game: Game, notes: readonly Note[], team: TeamId): string[][] {
  return notes
    .filter((n) => n.team === team && n.shared)
    .sort((a, b) => b.likelihood - a.likelihood || a.createdAt - b.createdAt)
    .map((n) => noteRow(scenario, game, n));
}

/** Everything the class wrote, with the team in the first column. */
export function classTable(scenario: Scenario, game: Game, notes: readonly Note[]): string[][] {
  return TEAMS.flatMap((t) => teamTable(scenario, game, notes, t.id).map((row) => [t.name, ...row]));
}

/** Teams against problems, with words instead of symbols so a spreadsheet reads clearly. */
export function debriefTable(scenario: Scenario, game: Game): string[][] {
  const teams = TEAMS.filter((t) => game.results?.[t.id]);
  const word = { hit: "On a note", close: "Close, wrong place or person", miss: "Missed" } as const;
  return [
    ["Problem on the day", ...teams.map((t) => teamById(t.id).name)],
    ...scenario.threats.map((threat, i) => [threat.text, ...teams.map((t) => word[game.results[t.id]?.[i] ?? "miss"])]),
  ];
}

/** A cell that starts with = + - or @ would run as a formula in a spreadsheet, so it gets a leading quote. */
function safe(cell: string): string {
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
}

/** Comma-separated values with a byte-order mark so Excel reads the accents and dashes right. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]) => cells.map((c) => `"${safe(c).replace(/"/g, '""')}"`).join(",");
  return "﻿" + rows.map(line).join("\r\n") + "\r\n";
}

/** A safe file name from a team or session name. */
export function fileName(...parts: string[]): string {
  return parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "open-door";
}
