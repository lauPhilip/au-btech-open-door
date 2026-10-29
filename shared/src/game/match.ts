// "You saw it coming" (issue #28): compare a team's notes with the teacher's answer key.
// A note matches a threat when it is about the same thing (or stands in the same room) and shares a harm with it.

import type { Scenario, Threat } from "../scenario";
import type { Note } from "./notes";
import type { TeamId } from "./teams";

export interface ThreatMatch {
  threat: Threat;
  /** The first note that matches, or null if the team missed this one. */
  note: Note | null;
}

function thingRoom(scenario: Scenario, id: string): string | null {
  return scenario.things.find((t) => t.id === id)?.room ?? scenario.people.find((p) => p.id === id)?.room ?? null;
}

export function noteMatches(scenario: Scenario, note: Note, threat: Threat): boolean {
  if (!note.harm.some((h) => threat.harm.includes(h))) return false;
  if (note.about) return note.about === threat.target;
  const room = thingRoom(scenario, threat.target);
  return room !== null && note.room === room;
}

/** Every threat in the answer key, with the team's note that predicted it, if any. */
export function matchNotes(scenario: Scenario, notes: readonly Note[], team: TeamId): ThreatMatch[] {
  const mine = notes.filter((n) => n.team === team && n.shared);
  return scenario.threats.map((threat) => ({ threat, note: mine.find((n) => noteMatches(scenario, n, threat)) ?? null }));
}
