// The final team vote (issue #27): each player picks what the CEO should do, and the majority at a table decides.

import type { Scenario } from "../scenario";
import { findPlayer, type Game, type Result } from "./rules";
import { TEAMS, type TeamId } from "./teams";

export type Option = Scenario["day"]["final_choice"]["options"][number];

/** A player votes, or changes their vote while the vote is open. */
export function castVote(game: Game, scenario: Scenario, id: string, option: number): Result<Game> {
  const player = findPlayer(game, id);
  if (!player) return { ok: false, error: "not-joined" };
  if (!player.team) return { ok: false, error: "no-team" };
  if (game.phase !== "vote") return { ok: false, error: "not-voting" };
  const options = scenario.day.final_choice.options;
  if (!Number.isInteger(option) || option < 0 || option >= options.length) return { ok: false, error: "unknown-option" };
  return { ok: true, value: { ...game, votes: { ...game.votes, [id]: option } } };
}

export interface TeamVote {
  team: TeamId;
  /** Players at the table, and how many of them have voted. */
  members: number;
  voted: number;
  /** Votes for each option, in the order of the scenario. */
  counts: number[];
  /** The option with most votes, or null on a tie or with no votes. */
  winner: number | null;
}

export function teamVote(game: Game, scenario: Scenario, team: TeamId): TeamVote {
  const counts = scenario.day.final_choice.options.map(() => 0);
  const members = game.players.filter((p) => p.team === team);
  let voted = 0;
  for (const p of members) {
    const v = game.votes?.[p.id];
    if (v !== undefined && counts[v] !== undefined) {
      counts[v]++;
      voted++;
    }
  }
  const top = Math.max(0, ...counts);
  const leaders = counts.flatMap((c, i) => (c === top && top > 0 ? [i] : []));
  return { team, members: members.length, voted, counts, winner: leaders.length === 1 ? (leaders[0] ?? null) : null };
}

/** The result for every table that has at least one player. */
export function allVotes(game: Game, scenario: Scenario): TeamVote[] {
  return TEAMS.map((t) => teamVote(game, scenario, t.id)).filter((v) => v.members > 0);
}

/** True when every player who sits at a table has voted. */
export function everyoneVoted(game: Game): boolean {
  const seated = game.players.filter((p) => p.team);
  return seated.length > 0 && seated.every((p) => game.votes?.[p.id] !== undefined);
}
