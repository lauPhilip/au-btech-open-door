import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { classTable, debriefTable, fileName, teamTable, THREAT_COLUMNS, toCsv } from "./export";
import type { Note } from "./notes";
import { chooseTeam, join, newGame, type Game } from "./rules";

const scenario = Object.values(scenarios)[0]!;

function game(): Game {
  let g = newGame("ABCD", scenario.id, 45, 0);
  for (const [id, team] of [["a", "blue"], ["b", "blue"], ["c", "green"]] as const) {
    g = (join(g, scenario, id, id.toUpperCase(), 0, 0) as { ok: true; value: Game }).value;
    g = (chooseTeam(g, id, team) as { ok: true; value: Game }).value;
  }
  return { ...g, results: { blue: ["hit", "miss", "close", "miss", "miss", "miss"] } };
}
const note = (over: Partial<Note>): Note => ({
  id: "n1", author: "a", team: "blue", text: "Printer on guest Wi-Fi", harm: ["change", "stop"], actor: ["visitor"], likelihood: 3,
  x: 0, y: 0, room: "packing", about: "label-printer", createdAt: 1, shared: true, mergedWith: ["b"], ...over,
});

describe("the CyPro threat table", () => {
  it("has one row per shared note with the CyPro columns", () => {
    const rows = teamTable(scenario, game(), [note({})], "blue");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(THREAT_COLUMNS.length);
    expect(rows[0]).toEqual([
      "Printer on guest Wi-Fi", "Label printer", "Packing station", "I · Integrity (change); A · Availability (stop)",
      "A visitor or driver", "3 · Seen at firms like us", "", "A, B",
    ]);
  });

  it("leaves out private notes and other teams, and puts the most likely first", () => {
    const rows = teamTable(scenario, game(), [note({ id: "x", likelihood: 1, text: "low" }), note({ id: "y", likelihood: 4, text: "high" }), note({ id: "p", shared: false }), note({ id: "o", team: "green" })], "blue");
    expect(rows.map((r) => r[0])).toEqual(["high", "low"]);
  });

  it("puts the team name in front for the whole class", () => {
    expect(classTable(scenario, game(), [note({})])[0]?.[0]).toBe("Blue door");
  });

  it("writes the debrief with words, one column per team", () => {
    const t = debriefTable(scenario, game());
    expect(t[0]).toEqual(["Problem on the day", "Blue door"]);
    expect(t[1]?.[1]).toBe("On a note");
    expect(t).toHaveLength(scenario.threats.length + 1);
  });
});

describe("csv", () => {
  it("quotes cells and doubles quotes", () => {
    expect(toCsv([["a, b", 'say "hi"']])).toBe('﻿"a, b","say ""hi"""\r\n');
  });

  it("stops spreadsheet formulas in student notes", () => {
    expect(toCsv([["=HYPERLINK(\"http://x\")", "+1", "-2", "@SUM(A1)", "fine"]])).toContain("\"'=HYPERLINK");
    for (const bad of ["+1", "-2", "@SUM(A1)"]) expect(toCsv([[bad]])).toContain(`"'${bad}"`);
    expect(toCsv([["fine"]])).toContain('"fine"');
  });

  it("makes safe file names", () => {
    expect(fileName("Blue door", "ABCD", "Threats")).toBe("blue-door-abcd-threats");
    expect(fileName("../../etc")).toBe("etc");
  });
});
