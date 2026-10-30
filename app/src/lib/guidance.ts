// What the teacher should do right now, and what to check before moving on.
// Pure functions of the game, so they are easy to test and the texts are easy to review.

import { summaryPrompt, TEAMS, type Game, type Scenario } from "@open-door/shared";
import type { Key, Vars } from "./i18n";

/** A sentence for the teacher: the key of its text and the values to fill in. The screen turns it into words in the chosen language. */
export interface Say {
  key: Key;
  vars?: Vars;
}

function seated(game: Game) {
  return game.players.filter((p) => p.team);
}
/** Teams that have at least one student. */
function playingTeams(game: Game) {
  return TEAMS.filter((t) => game.players.some((p) => p.team === t.id));
}

/**
 * Things the teacher may want to know before moving on, as short sentences.
 * Empty when nothing is missing. `walkTimeLeft` is the walk clock; when it has run out, no one is cut off.
 */
export function advanceWarnings(game: Game, walkTimeLeft: number | null = null): Say[] {
  const warnings: Say[] = [];
  const unseated = game.players.length - seated(game).length;
  if ((game.phase === "lobby" || game.phase === "story") && unseated > 0) {
    warnings.push({ key: "warn.unseated", vars: { count: unseated } });
  }
  if (game.phase === "walk" || game.phase === "day") {
    const teams = playingTeams(game);
    const waiting = teams.filter((t) => !game.ready?.[t.id]).length;
    const timeIsUp = game.phase === "walk" && walkTimeLeft !== null && walkTimeLeft <= 0;
    if (waiting > 0 && !timeIsUp) warnings.push({ key: "warn.tables", vars: { count: waiting } });
  }
  if (game.phase === "vote") {
    const people = seated(game);
    const missing = people.filter((p) => game.votes[p.id] === undefined).length;
    if (missing > 0) warnings.push({ key: "warn.votes", vars: { count: missing } });
  }
  return warnings;
}

/** The "what to do now" sentence for the current step. */
export function guidance(game: Game, scenario: Scenario): Say {
  const people = seated(game);
  const unseated = game.players.length - people.length;
  switch (game.phase) {
    case "lobby":
      if (game.players.length === 0) return { key: "guide.lobby.empty" };
      if (unseated > 0) return { key: "guide.lobby.unseated", vars: { count: game.players.length, joined: game.players.length, unseated } };
      return { key: "guide.lobby.ready", vars: { count: game.players.length } };
    case "story":
      return { key: "guide.story" };
    case "walk":
    case "day": {
      const teams = playingTeams(game);
      const done = teams.filter((t) => game.ready?.[t.id]).length;
      const step = game.phase === "walk" ? "walk" : "day";
      if (teams.length > 0 && done === teams.length) return { key: `guide.${step}.all`, vars: { count: teams.length } };
      return { key: `guide.${step}.some`, vars: { done, count: teams.length } };
    }
    case "vote": {
      const voted = people.filter((p) => game.votes[p.id] !== undefined).length;
      if (people.length > 0 && voted === people.length) return { key: "guide.vote.all" };
      return { key: "guide.vote.some", vars: { voted, count: people.length } };
    }
    case "debrief": {
      const last = summaryPrompt(scenario);
      if (game.prompt >= last) return { key: "guide.debrief.summary" };
      return { key: "guide.debrief.question", vars: { n: game.prompt + 1, total: last } };
    }
  }
}
