import { describe, expect, it } from "vitest";
import { join, newGame, scenarios, setReady, chooseTeam, summaryPrompt, type Game } from "@open-door/shared";
import { advanceWarnings, guidance } from "./guidance";

const scenario = scenarios["nordknit-black-friday"]!;

function classOf(...teams: Array<"blue" | "red" | null>): Game {
  let g = newGame("ABCD", scenario.id, 45, 0);
  teams.forEach((team, i) => {
    const id = `student-${i}-abcdef`;
    const joined = join(g, scenario, id, `S${i}`, 0, 0);
    if (joined.ok) g = joined.value;
    if (team) {
      const seated = chooseTeam(g, id, team);
      if (seated.ok) g = seated.value;
    }
  });
  return g;
}

describe("advanceWarnings", () => {
  it("warns about students without a table before the story", () => {
    expect(advanceWarnings(classOf("blue", null, null))).toEqual(["2 students have no table yet."]);
    expect(advanceWarnings(classOf("blue"))).toEqual([]);
  });

  it("warns about tables that are not done during the walk, unless the time is up", () => {
    let g: Game = { ...classOf("blue", "red"), phase: "walk" };
    expect(advanceWarnings(g)).toEqual(["2 tables are not done yet."]);
    expect(advanceWarnings(g, 0)).toEqual([]);
    const done = setReady(g, "student-0-abcdef", true, 1);
    if (done.ok) g = done.value;
    expect(advanceWarnings(g)).toEqual(["1 table is not done yet."]);
  });

  it("warns about missing votes", () => {
    const g = { ...classOf("blue", "blue"), phase: "vote" as const, votes: { "student-0-abcdef": 0 } };
    expect(advanceWarnings(g)).toEqual(["1 student has not voted yet."]);
  });
});

describe("guidance", () => {
  it("has a sentence for every step, and every sentence is short", () => {
    const g = classOf("blue", "red");
    const phases = ["lobby", "story", "walk", "day", "vote", "debrief"] as const;
    for (const phase of phases) {
      const { text } = guidance({ ...g, phase }, scenario);
      expect(text.length).toBeGreaterThan(10);
      for (const sentence of text.split(/(?<=\.)\s+/)) expect(sentence.split(/\s+/).length).toBeLessThan(22);
    }
  });

  it("changes with progress", () => {
    expect(guidance(classOf(), scenario).text).toContain("Waiting for students");
    expect(guidance({ ...classOf("blue", "red"), phase: "walk" }, scenario).text).toContain("0 of 2 tables");
    expect(guidance({ ...classOf("blue"), phase: "debrief", prompt: summaryPrompt(scenario) }, scenario).text).toContain("class summary");
  });
});
