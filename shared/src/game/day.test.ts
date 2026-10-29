import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { spots } from "../scenario";
import {
  clockToMinutes,
  cluesInRoom,
  dayDurationMs,
  dayMinute,
  eventsBy,
  minutesToClock,
  msPerGameMinute,
  teamClues,
  WALK_MINUTES,
} from "./day";
import { mayRoleSend, parseGameMessage } from "./messages";
import { addNote } from "./notes";
import { adjustTimer, ask, chooseTeam, join, move, newGame, setPhase, type Game } from "./rules";
import { addTime, elapsedMs, formatLeft, isPaused, leftMs, newTimer, pauseTimer, resumeTimer } from "./timer";

const scenario = scenarios["nordknit-black-friday"]!;
const T0 = 1_000_000;

function ok<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`Expected ok, got ${r.error}`);
  return r.value;
}

/** Two players on blue and one on green, in the lobby. */
function lobby(minutes: 45 | 90 = 90): Game {
  let game = newGame("HXQ4", scenario.id, minutes, 0);
  for (const [id, team] of [["p0", "blue"], ["p1", "blue"], ["p2", "green"]] as const) {
    game = ok(join(game, scenario, id, id, 0, 0));
    game = ok(chooseTeam(game, id, team));
  }
  return game;
}
const ctx = (now: number) => ({ scenario, now });
const toWalk = (game: Game, now = T0) => ok(setPhase(ok(setPhase(game, "story", ctx(now))), "walk", ctx(now)));
const toDay = (game: Game, now = T0) => ok(setPhase(game, "day", ctx(now)));

describe("timer", () => {
  it("counts down and stops at zero", () => {
    const t = newTimer(1000, 60_000);
    expect(leftMs(t, 1000)).toBe(60_000);
    expect(leftMs(t, 31_000)).toBe(30_000);
    expect(leftMs(t, 500_000)).toBe(0);
    expect(leftMs(t, 0)).toBe(60_000); // a device clock slightly behind never shows more than the total
  });

  it("does not count time while paused", () => {
    let t = pauseTimer(newTimer(0, 60_000), 10_000);
    expect(isPaused(t)).toBe(true);
    expect(elapsedMs(t, 50_000)).toBe(10_000);
    t = resumeTimer(t, 40_000);
    expect(isPaused(t)).toBe(false);
    expect(elapsedMs(t, 45_000)).toBe(15_000);
    expect(pauseTimer(pauseTimer(t, 50_000), 60_000).pausedAt).toBe(50_000); // pausing twice changes nothing
    expect(resumeTimer(t, 99_000)).toBe(t);
  });

  it("adds time", () => {
    expect(leftMs(addTime(newTimer(0, 60_000), 30_000), 0)).toBe(90_000);
  });

  it("formats what is left, rounding up", () => {
    expect(formatLeft(725_000)).toBe("12:05");
    expect(formatLeft(59_001)).toBe("1:00");
    expect(formatLeft(0)).toBe("0:00");
  });
});

describe("the day clock", () => {
  it("converts clock times", () => {
    expect(clockToMinutes("07:55")).toBe(475);
    expect(minutesToClock(604.7)).toBe("10:04");
  });

  it("takes its speed from the scenario, and a 45-minute class plays twice as fast", () => {
    expect(msPerGameMinute(scenario, 90)).toBe(15_000);
    expect(msPerGameMinute(scenario, 45)).toBe(7_500);
    expect(dayDurationMs(scenario, 90)).toBe(125 * 15_000);
    expect(dayDurationMs(scenario, 45)).toBe(125 * 7_500);
  });

  it("shows the start before the day, runs during it and stops at the end", () => {
    const walk = toWalk(lobby());
    expect(minutesToClock(dayMinute(scenario, walk, T0))).toBe("07:55");
    const day = toDay(walk, T0);
    expect(minutesToClock(dayMinute(scenario, day, T0))).toBe("07:55");
    expect(minutesToClock(dayMinute(scenario, day, T0 + 9 * 15_000))).toBe("08:04");
    expect(minutesToClock(dayMinute(scenario, day, T0 + 99_999_999))).toBe("10:00");
  });

  it("stands still while paused", () => {
    const day = toDay(toWalk(lobby()));
    const paused = ok(adjustTimer(day, "pause", T0 + 15_000 * 10));
    expect(dayMinute(scenario, paused, T0 + 15_000 * 10)).toBe(dayMinute(scenario, paused, T0 + 15_000 * 60));
  });

  it("delivers chat messages when their time comes", () => {
    expect(eventsBy(scenario, clockToMinutes("08:03"))).toHaveLength(0);
    expect(eventsBy(scenario, clockToMinutes("08:04")).map((e) => e.from)).toEqual(["mei"]);
    expect(eventsBy(scenario, clockToMinutes("10:00"))).toHaveLength(scenario.day.events.length);
  });
});

describe("phases with countdowns", () => {
  it("gives the walk and the day their own countdowns", () => {
    const walk = toWalk(lobby(45));
    expect(walk.timer).toMatchObject({ startedAt: T0, durationMs: WALK_MINUTES[45] * 60_000 });
    const day = toDay(walk, T0 + 5);
    expect(day.timer).toMatchObject({ startedAt: T0 + 5, durationMs: dayDurationMs(scenario, 45) });
  });

  it("has no countdown in the lobby and the story", () => {
    const game = lobby();
    expect(game.timer).toBeNull();
    expect(ok(setPhase(game, "story", ctx(T0))).timer).toBeNull();
  });

  it("only goes forward, one step at a time", () => {
    expect(setPhase(lobby(), "day", ctx(0))).toEqual({ ok: false, error: "bad-phase" });
    expect(setPhase(toDay(toWalk(lobby())), "walk", ctx(0))).toEqual({ ok: false, error: "bad-phase" });
  });

  it("lets the teacher end early: from the walk straight to the debrief, but never out of the lobby", () => {
    expect(ok(setPhase(toWalk(lobby()), "debrief", ctx(T0))).phase).toBe("debrief");
    expect(ok(setPhase(toDay(toWalk(lobby())), "debrief", ctx(T0))).phase).toBe("debrief");
    expect(setPhase(lobby(), "debrief", ctx(T0))).toEqual({ ok: false, error: "bad-phase" });
  });
});

describe("the teacher's timer controls", () => {
  it("pauses and resumes everyone: moves, questions and notes are refused meanwhile", () => {
    const walk = toWalk(lobby());
    const mei = spots(scenario).find((s) => s.id === "mei")!;
    const near = ok(move(walk, scenario, "p0", mei.x, mei.y)).game;
    const paused = ok(adjustTimer(near, "pause", T0 + 1000));
    expect(move(paused, scenario, "p0", 50, 50)).toEqual({ ok: false, error: "paused" });
    expect(ask(paused, scenario, "p0", "mei", 0)).toEqual({ ok: false, error: "paused" });
    expect(addNote([], paused, scenario, "p0", { text: "x", harm: ["leak"], actor: ["visitor"], likelihood: 1 }, "n1", 0)).toEqual({ ok: false, error: "paused" });
    const running = ok(adjustTimer(paused, "resume", T0 + 9000));
    expect(ok(move(running, scenario, "p0", 60, 60)).player.x).toBe(60);
  });

  it("adds five minutes to the walk only", () => {
    const walk = toWalk(lobby());
    expect(leftMs(ok(adjustTimer(walk, "add", T0)).timer!, T0)).toBe(WALK_MINUTES[90] * 60_000 + 300_000);
    expect(adjustTimer(toDay(walk), "add", T0)).toEqual({ ok: false, error: "bad-phase" });
    expect(adjustTimer(lobby(), "pause", T0)).toEqual({ ok: false, error: "bad-phase" });
  });

  it("is a teacher-only message", () => {
    expect(parseGameMessage('{"t":"timer","action":"pause"}')).toEqual({ t: "timer", action: "pause" });
    expect(parseGameMessage('{"t":"timer","action":"stop"}')).toBeNull();
    expect(mayRoleSend("teacher", { t: "timer", action: "add" })).toBe(true);
    expect(mayRoleSend("player", { t: "timer", action: "add" })).toBe(false);
    expect(mayRoleSend("screen", { t: "timer", action: "add" })).toBe(false);
  });
});

describe("clues in rooms", () => {
  const packing = scenario.map.rooms.find((r) => r.id === "packing")!;
  const [px, py, pw, ph] = packing.rect;
  const inPacking = [px + pw / 2, py + ph / 2] as const;

  it("finds the clues of a room by index", () => {
    expect(cluesInRoom(scenario, "packing")).toHaveLength(1);
    expect(cluesInRoom(scenario, "dock")).toEqual([]);
  });

  it("finds nothing before the day, even in the right room", () => {
    const walk = toWalk(lobby());
    expect(teamClues(ok(move(walk, scenario, "p0", ...inPacking)).game, "blue")).toEqual([]);
  });

  it("gives the clue to the whole team when one player walks in during the day", () => {
    const day = toDay(toWalk(lobby()));
    const result = ok(move(day, scenario, "p0", ...inPacking));
    expect(result.newClue).toBe(true);
    expect(teamClues(result.game, "blue")).toHaveLength(1);
    expect(teamClues(result.game, "green")).toEqual([]);
    expect(ok(move(result.game, scenario, "p1", ...inPacking)).newClue).toBe(false); // already found
  });

  it("gives a clue at once to a team already standing in its room when the day starts", () => {
    const walk = ok(move(toWalk(lobby()), scenario, "p2", ...inPacking)).game;
    expect(teamClues(toDay(walk), "green")).toHaveLength(1);
  });
});
