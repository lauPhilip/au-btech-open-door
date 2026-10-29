import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { teamProgress, STUCK_MS } from "./overview";
import { assignTeam, chooseTeam, join, newGame, sendHint, type Game } from "./rules";

const scenario = Object.values(scenarios)[0]!;

function game(phase: Game["phase"] = "walk"): Game {
  let g = newGame("ABCD", scenario.id, 45, 0);
  for (const [id, team] of [["a", "blue"], ["b", "green"]] as const) {
    g = (join(g, scenario, id, id, 0, 0) as { ok: true; value: Game }).value;
    g = (chooseTeam(g, id, team) as { ok: true; value: Game }).value;
  }
  return { ...g, phase };
}

describe("the team overview", () => {
  it("flags a team that has not moved for three minutes, and only that team", () => {
    const g = game();
    const rows = teamProgress(g, scenario, { b: 4 * 60_000 }, 0, 4 * 60_000);
    expect(rows.find((r) => r.team === "blue")?.stuck).toBe(true);
    expect(rows.find((r) => r.team === "green")?.stuck).toBe(false);
  });

  it("does not count time since the class resumed, or time outside the game", () => {
    expect(teamProgress(game(), scenario, {}, 4 * 60_000, 4 * 60_000 + STUCK_MS - 1)[0]?.stuck).toBe(false);
    expect(teamProgress(game("lobby"), scenario, {}, 0, 99 * 60_000)[0]?.stuck).toBe(false);
  });

  it("lists rooms a team has not entered", () => {
    const row = teamProgress(game(), scenario, {}, 0, 0)[0]!;
    expect(row.unvisited.length).toBe(row.roomsTotal - row.rooms);
  });
});

describe("moving players and sending hints", () => {
  it("lets the teacher move a student before the walk, not during it", () => {
    const moved = assignTeam(game("lobby"), "a", "yellow");
    expect(moved.ok && moved.value.players.find((p) => p.id === "a")?.team).toBe("yellow");
    expect(assignTeam(game("walk"), "a", "yellow")).toEqual({ ok: false, error: "too-late" });
  });

  it("sends a hint only to a team that is playing", () => {
    const sent = sendHint(game("walk"), "blue", "  Try the  Reception. ", 5);
    expect(sent.ok && sent.value.hints.blue).toEqual({ text: "Try the Reception.", at: 5 });
    expect(sendHint(game("lobby"), "blue", "Try the Reception.", 5).ok).toBe(false);
    expect(sendHint(game("walk"), "red" as never, "Try the Reception.", 5).ok).toBe(false);
    expect(sendHint(game("walk"), "blue", "hi", 5).ok).toBe(false);
  });
});
