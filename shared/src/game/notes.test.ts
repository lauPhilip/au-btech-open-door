import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { mayRoleSend, parseGameMessage } from "./messages";
import { addNote, cleanNoteText, mergeNotes, NOTE_MAX_CHARS, NOTES_PER_PLAYER, notesBy, removeNote, setShared, visibleNotes, type Note, type NoteInput } from "./notes";
import { chooseTeam, join, move, newGame, setPhase, type Game } from "./rules";

const scenario = scenarios["nordknit-black-friday"]!;

function ok<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(`Expected ok, got ${r.error}`);
  return r.value;
}

function walkingGame(): Game {
  let game = newGame("HXQ4", scenario.id, 45, 0);
  game = ok(join(game, scenario, "p0", "Ida", 0, 0));
  game = ok(chooseTeam(game, "p0", "blue"));
  game = ok(setPhase(ok(setPhase(game, "story")), "walk"));
  return ok(move(game, scenario, "p0", 200, 150)).game;
}

const input: NoteInput = { text: "Shared admin password on a note", harm: ["leak"], actor: ["visitor", "online"], likelihood: 3 };

describe("sticky notes", () => {
  it("records text, choices, author, team and place", () => {
    const [note] = ok(addNote([], walkingGame(), scenario, "p0", { ...input, about: "mei" }, "n1", 7));
    expect(note).toMatchObject({ id: "n1", author: "p0", team: "blue", room: "webshop", x: 200, y: 150, about: "mei", likelihood: 3, createdAt: 7 });
    expect(note!.actor).toEqual(["online", "visitor"]); // order of the choices
  });

  it("cleans the text and ignores unknown choices and unknown targets", () => {
    const messy = { text: "  Too   many\n spaces ", harm: ["leak", "nonsense"], actor: ["accident"], likelihood: 1, about: "nobody" } as unknown as NoteInput;
    const [note] = ok(addNote([], walkingGame(), scenario, "p0", messy, "n1", 0));
    expect(note).toMatchObject({ text: "Too many spaces", harm: ["leak"], about: null });
    expect(cleanNoteText("x".repeat(200))).toHaveLength(NOTE_MAX_CHARS);
  });

  it("refuses empty notes and notes without harm, who or a valid likelihood", () => {
    const game = walkingGame();
    for (const bad of [{ ...input, text: "   " }, { ...input, harm: [] }, { ...input, actor: [] }, { ...input, likelihood: 9 as never }]) {
      expect(addNote([], game, scenario, "p0", bad, "n1", 0)).toEqual({ ok: false, error: "bad-note" });
    }
  });

  it("refuses before the walk, for strangers, and past the limit", () => {
    expect(addNote([], newGame("HXQ4", scenario.id, 45, 0), scenario, "p0", input, "n", 0)).toEqual({ ok: false, error: "not-joined" });
    const lobby = ok(chooseTeam(ok(join(newGame("HXQ4", scenario.id, 45, 0), scenario, "p0", "Ida", 0, 0)), "p0", "blue"));
    expect(addNote([], lobby, scenario, "p0", input, "n", 0)).toEqual({ ok: false, error: "not-walking" });
    let notes: Note[] = [];
    const game = walkingGame();
    for (let i = 0; i < NOTES_PER_PLAYER; i++) notes = ok(addNote(notes, game, scenario, "p0", input, `n${i}`, 0));
    expect(addNote(notes, game, scenario, "p0", input, "x", 0)).toEqual({ ok: false, error: "too-many-notes" });
  });

  it("lets you remove only your own notes", () => {
    const notes = ok(addNote([], walkingGame(), scenario, "p0", input, "n1", 0));
    expect(removeNote(notes, "p1", "n1")).toEqual({ ok: false, error: "unknown-note" });
    expect(ok(removeNote(notes, "p0", "n1"))).toEqual([]);
    expect(notesBy(notes, "p1")).toEqual([]);
    expect(notesBy(notes, "p0")).toHaveLength(1);
  });

  it("parses note messages and only players may send them", () => {
    const raw = JSON.stringify({ t: "note", ...input, about: "mei" });
    expect(parseGameMessage(raw)).toEqual({ t: "note", ...input, actor: ["online", "visitor"], about: "mei" });
    expect(parseGameMessage(JSON.stringify({ t: "note", ...input, likelihood: 7 }))).toBeNull();
    expect(parseGameMessage(JSON.stringify({ t: "note", ...input, harm: "leak" }))).toBeNull();
    expect(parseGameMessage('{"t":"unnote","id":"abc12345"}')).toEqual({ t: "unnote", id: "abc12345" });
    expect(parseGameMessage('{"t":"unnote","id":"../x"}')).toBeNull();
    const msg = parseGameMessage(raw)!;
    expect(mayRoleSend("player", msg)).toBe(true);
    expect(mayRoleSend("teacher", msg)).toBe(false);
    expect(mayRoleSend("screen", msg)).toBe(false);
  });
});

describe("sharing and merging notes (#23)", () => {
  /** Ida and Jo on the blue team, Kim on green, all walking. */
  function classroom(): Game {
    let game = newGame("HXQ4", scenario.id, 45, 0);
    for (const [id, team] of [["p0", "blue"], ["p1", "blue"], ["p2", "green"]] as const) {
      game = ok(join(game, scenario, id, id, 0, 0));
      game = ok(chooseTeam(game, id, team));
    }
    game = ok(setPhase(ok(setPhase(game, "story")), "walk"));
    return game;
  }
  const write = (notes: Note[], game: Game, who: string, over: Partial<NoteInput>, id: string) =>
    ok(addNote(notes, game, scenario, who, { ...input, ...over }, id, 0));

  it("starts private and is visible to the author only", () => {
    const game = classroom();
    const notes = write([], game, "p0", {}, "n1");
    expect(notes[0]).toMatchObject({ shared: false, mergedWith: [] });
    expect(visibleNotes(notes, game, "p0")).toHaveLength(1);
    expect(visibleNotes(notes, game, "p1")).toHaveLength(0);
  });

  it("shows a shared note to the team but not to other teams, and can take it back", () => {
    const game = classroom();
    let notes = ok(setShared(write([], game, "p0", {}, "n1"), "p0", "n1", true));
    expect(visibleNotes(notes, game, "p1")).toHaveLength(1);
    expect(visibleNotes(notes, game, "p2")).toHaveLength(0);
    notes = ok(setShared(notes, "p0", "n1", false));
    expect(visibleNotes(notes, game, "p1")).toHaveLength(0);
  });

  it("lets only the author share or unshare", () => {
    const game = classroom();
    const notes = write([], game, "p0", {}, "n1");
    expect(setShared(notes, "p1", "n1", true)).toEqual({ ok: false, error: "unknown-note" });
  });

  it("merges two shared notes: union of choices, higher likelihood, kept text", () => {
    const game = classroom();
    let notes = write([], game, "p0", { text: "Password under keyboard", harm: ["leak"], actor: ["visitor"], likelihood: 2 }, "n1");
    notes = write(notes, game, "p1", { text: "Shared admin login", harm: ["change"], actor: ["employee"], likelihood: 4 }, "n2");
    notes = ok(setShared(ok(setShared(notes, "p0", "n1", true)), "p1", "n2", true));
    const merged = ok(mergeNotes(notes, game, "p1", "n1", "n2"));
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "n1", text: "Password under keyboard", harm: ["leak", "change"], actor: ["visitor", "employee"], likelihood: 4, mergedWith: ["p1"] });
  });

  it("refuses to merge private notes, other teams' notes, or a note with itself", () => {
    const game = classroom();
    let notes = write([], game, "p0", {}, "n1");
    notes = write(notes, game, "p1", {}, "n2");
    notes = write(notes, game, "p2", {}, "n3");
    expect(mergeNotes(notes, game, "p0", "n1", "n2")).toEqual({ ok: false, error: "unknown-note" }); // still private
    notes = ok(setShared(ok(setShared(ok(setShared(notes, "p0", "n1", true)), "p1", "n2", true)), "p2", "n3", true));
    expect(mergeNotes(notes, game, "p0", "n1", "n3")).toEqual({ ok: false, error: "unknown-note" }); // other team
    expect(mergeNotes(notes, game, "p0", "n1", "n1")).toEqual({ ok: false, error: "unknown-note" });
    expect(mergeNotes(notes, game, "p2", "n1", "n2")).toEqual({ ok: false, error: "unknown-note" }); // not on that team
  });

  it("parses share and merge messages", () => {
    expect(parseGameMessage('{"t":"share","id":"abc12345","shared":true}')).toEqual({ t: "share", id: "abc12345", shared: true });
    expect(parseGameMessage('{"t":"share","id":"abc12345","shared":"yes"}')).toBeNull();
    expect(parseGameMessage('{"t":"merge","keep":"abc12345","drop":"def67890"}')).toEqual({ t: "merge", keep: "abc12345", drop: "def67890" });
    expect(parseGameMessage('{"t":"merge","keep":"abc12345"}')).toBeNull();
    expect(mayRoleSend("player", { t: "merge", keep: "a", drop: "b" })).toBe(true);
    expect(mayRoleSend("screen", { t: "share", id: "a", shared: true })).toBe(false);
  });
});
