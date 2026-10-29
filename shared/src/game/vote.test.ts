import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { gradeAll, gradeThreat, matchNotes } from "./match";
import type { Note } from "./notes";
import { chooseTeam, join, newGame, setPhase, type Game } from "./rules";
import { allVotes, castVote, everyoneVoted, teamVote } from "./vote";

const scenario = Object.values(scenarios)[0]!;

function room(names: string[], phase: Game["phase"] = "vote"): Game {
  let g = newGame("ABCD", scenario.id, 90, 0);
  names.forEach((n, i) => {
    g = (join(g, scenario, n, n, 0, i) as { ok: true; value: Game }).value;
    g = (chooseTeam(g, n, "blue") as { ok: true; value: Game }).value;
  });
  return { ...g, phase };
}
const vote = (g: Game, id: string, o: number) => {
  const r = castVote(g, scenario, id, o);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe("the final vote", () => {
  it("is only open in the vote phase and for options on the list", () => {
    expect(castVote(room(["a"], "day"), scenario, "a", 0)).toEqual({ ok: false, error: "not-voting" });
    expect(castVote(room(["a"]), scenario, "a", 9)).toEqual({ ok: false, error: "unknown-option" });
    expect(castVote(room(["a"]), scenario, "nobody", 0)).toEqual({ ok: false, error: "not-joined" });
  });

  it("lets the majority at a table decide and a player change their mind", () => {
    let g = room(["a", "b", "c"]);
    g = vote(g, "a", 1);
    g = vote(g, "b", 1);
    g = vote(g, "c", 2);
    expect(teamVote(g, scenario, "blue")).toMatchObject({ voted: 3, winner: 1, counts: [0, 2, 1] });
    g = vote(g, "b", 2);
    expect(teamVote(g, scenario, "blue").winner).toBe(2);
    expect(allVotes(g, scenario)).toHaveLength(1);
  });

  it("calls a tie no decision and knows when everyone has voted", () => {
    let g = room(["a", "b"]);
    g = vote(g, "a", 0);
    expect(everyoneVoted(g)).toBe(false);
    g = vote(g, "b", 1);
    expect(everyoneVoted(g)).toBe(true);
    expect(teamVote(g, scenario, "blue").winner).toBeNull();
  });

  it("goes from the day to the vote to the debrief, one step at a time", () => {
    const g = room(["a"], "day");
    expect(setPhase(room(["a"], "story"), "debrief").ok).toBe(false);
    const v = setPhase(g, "vote");
    expect(v.ok && v.value.phase).toBe("vote");
  });
});

describe("matching notes with the answer key", () => {
  const note = (over: Partial<Note>): Note => ({
    id: "n1", author: "a", team: "blue", text: "x", harm: ["change"], actor: ["visitor"], likelihood: 3,
    x: 0, y: 0, room: null, about: null, createdAt: 0, shared: true, mergedWith: [], ...over,
  });

  it("matches on the thing and a shared harm", () => {
    const m = matchNotes(scenario, [note({ about: "label-printer" })], "blue");
    expect(m.find((x) => x.threat.id === "printer-guest-wifi")?.note?.id).toBe("n1");
    expect(m.find((x) => x.threat.id === "fake-visitor")?.note).toBeNull();
  });

  it("does not match a different harm, a private note or another team's note", () => {
    expect(matchNotes(scenario, [note({ about: "label-printer", harm: ["leak"] })], "blue")[0]?.note).toBeNull();
    expect(matchNotes(scenario, [note({ about: "label-printer", shared: false })], "blue")[0]?.note).toBeNull();
    expect(matchNotes(scenario, [note({ about: "label-printer", team: "green" })], "blue")[0]?.note).toBeNull();
  });

  it("grades a hit, a close note and a miss", () => {
    const printer = scenario.threats.find((t) => t.id === "printer-guest-wifi")!;
    expect(gradeThreat(scenario, [note({ about: "label-printer" })], "blue", printer)).toBe("hit");
    // Right thing, wrong harm: close.
    expect(gradeThreat(scenario, [note({ about: "label-printer", harm: ["leak"] })], "blue", printer)).toBe("close");
    expect(gradeThreat(scenario, [], "blue", printer)).toBe("miss");
    expect(gradeAll(scenario, [], "blue")).toHaveLength(scenario.threats.length);
  });

  it("falls back to the room when the note is not about a thing", () => {
    const printerRoom = scenario.things.find((t) => t.id === "label-printer")!.room;
    const m = matchNotes(scenario, [note({ room: printerRoom })], "blue");
    expect(m.find((x) => x.threat.id === "printer-guest-wifi")?.note).not.toBeNull();
  });
});
