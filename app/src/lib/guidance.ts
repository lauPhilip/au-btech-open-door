// What the teacher should do right now, and what to check before moving on.
// Pure functions of the game, so they are easy to test and the texts are easy to review.

import { summaryPrompt, TEAMS, type Game, type Scenario } from "@open-door/shared";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
export function advanceWarnings(game: Game, walkTimeLeft: number | null = null): string[] {
  const warnings: string[] = [];
  const unseated = game.players.length - seated(game).length;
  if ((game.phase === "lobby" || game.phase === "story") && unseated > 0) {
    warnings.push(`${plural(unseated, "student has", "students have")} no table yet.`);
  }
  if (game.phase === "walk" || game.phase === "day") {
    const teams = playingTeams(game);
    const waiting = teams.filter((t) => !game.ready?.[t.id]).length;
    const timeIsUp = game.phase === "walk" && walkTimeLeft !== null && walkTimeLeft <= 0;
    if (waiting > 0 && !timeIsUp) warnings.push(`${plural(waiting, "table is", "tables are")} not done yet.`);
  }
  if (game.phase === "vote") {
    const people = seated(game);
    const missing = people.filter((p) => game.votes[p.id] === undefined).length;
    if (missing > 0) warnings.push(`${plural(missing, "student has", "students have")} not voted yet.`);
  }
  return warnings;
}

export interface Guidance {
  /** One or two short sentences in plain language. */
  text: string;
}

/** The "what to do now" line for the current step. */
export function guidance(game: Game, scenario: Scenario): Guidance {
  const people = seated(game);
  const unseated = game.players.length - people.length;
  switch (game.phase) {
    case "lobby":
      if (game.players.length === 0) return { text: "Waiting for students. Show the big screen so they can scan the code and join." };
      if (unseated > 0) return { text: `${plural(game.players.length, "student has", "students have")} joined and ${unseated} still need a table. Start the story when most are seated.` };
      return { text: `${plural(game.players.length, "student is", "students are")} seated. Start the story when you are ready.` };
    case "story":
      return { text: "Students are reading the story on their phones. When they have finished, start the walk." };
    case "walk":
    case "day": {
      const teams = playingTeams(game);
      const done = teams.filter((t) => game.ready?.[t.id]).length;
      const next = game.phase === "walk" ? "start the day" : "start the vote";
      if (teams.length > 0 && done === teams.length) return { text: `All ${teams.length} tables say they are done. You can ${next}.` };
      return { text: `${done} of ${teams.length} tables say they are done. Check the teams below, then ${next} when you are ready.` };
    }
    case "vote": {
      const voted = people.filter((p) => game.votes[p.id] !== undefined).length;
      if (people.length > 0 && voted === people.length) return { text: "Everyone has voted. Show the result." };
      return { text: `${voted} of ${people.length} students have voted. Show the result when you are ready.` };
    }
    case "debrief": {
      const last = summaryPrompt(scenario);
      if (game.prompt >= last) return { text: "The class summary is on the big screen. Download the class record, then end the session." };
      return { text: `Talk through question ${game.prompt + 1} of ${last} with the class. The big screen shows the table.` };
    }
  }
}
