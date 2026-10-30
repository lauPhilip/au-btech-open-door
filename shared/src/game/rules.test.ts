import { describe, expect, it } from "vitest";
import { scenarios } from "../scenarios.generated";
import { roomAt, spots, startRoom } from "../scenario";
import { CODE_ALPHABET, isCode, makeCode, normaliseCode } from "./code";
import { FACE_COUNT, faceLook, HAIR_STYLES, SKIN_TONES } from "./faces";
import { mayRoleSend, parseGameMessage } from "./messages";
import {
  ask,
  AVATAR_RADIUS,
  chooseTeam,
  clampToMap,
  join,
  MAX_PLAYERS,
  move,
  newGame,
  removePlayer,
  renamePlayer,
  setOnline,
  setPrompt,
  summaryPrompt,
  setPhase,
  spawnPoint,
  teamCounts,
  teamRevealed,
  teamVisited,
  type Game,
  type Result,
} from "./rules";
import { TEAM_MAX } from "./teams";

const scenario = scenarios["nordknit-black-friday"]!;

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error}`);
  return result.value;
}

function withPlayers(n: number): Game {
  let game = newGame("HXQ4", scenario.id, 90, 0);
  for (let i = 0; i < n; i++) game = value(join(game, scenario, `p${i}`, `Player ${i}`, i % FACE_COUNT, i));
  return game;
}

function walking(game: Game): Game {
  return value(setPhase(value(setPhase(game, "story")), "walk"));
}

describe("session codes", () => {
  it("makes four characters from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) expect(isCode(makeCode())).toBe(true);
    expect(CODE_ALPHABET).not.toMatch(/[IL0O1]/);
  });
  it("uses the random source", () => {
    expect(makeCode(() => 0)).toBe("AAAA");
    expect(makeCode(() => 0.9999)).toBe("9999");
  });
  it("normalises what people type", () => {
    expect(normaliseCode(" hx-q4 ")).toBe("HXQ4");
    expect(normaliseCode("HXQ")).toBeNull();
    expect(normaliseCode("HXQO")).toBeNull();
  });
});

describe("faces", () => {
  it("uses every skin tone and every hair style", () => {
    const looks = Array.from({ length: FACE_COUNT }, (_, i) => faceLook(i));
    expect(new Set(looks.map((l) => l.skin)).size).toBe(SKIN_TONES.length);
    expect(new Set(looks.map((l) => l.style)).size).toBe(HAIR_STYLES.length);
  });
  it("has no two identical faces", () => {
    const keys = Array.from({ length: FACE_COUNT }, (_, i) => JSON.stringify(faceLook(i)));
    expect(new Set(keys).size).toBe(FACE_COUNT);
  });
});

describe("joining", () => {
  it("starts in the lobby with nobody", () => {
    const game = newGame("HXQ4", scenario.id, 45, 1000);
    expect(game.phase).toBe("lobby");
    expect(game.players).toEqual([]);
  });

  it("puts new players in the start room without a team", () => {
    const game = withPlayers(1);
    const p = game.players[0]!;
    expect(p.team).toBeNull();
    expect(p.room).toBe(startRoom(scenario).id);
    expect(p.visited).toEqual([startRoom(scenario).id]);
    expect(p.online).toBe(true);
  });

  it("spreads players out so nobody stands on someone else", () => {
    const game = withPlayers(20);
    const spots = new Set(game.players.map((p) => `${p.x},${p.y}`));
    expect(spots.size).toBe(20);
    for (const p of game.players) expect(roomAt(scenario, p.x, p.y)?.id).toBe(startRoom(scenario).id);
  });

  it("cleans the name and checks the face", () => {
    const game = newGame("HXQ4", scenario.id, 45, 0);
    expect(value(join(game, scenario, "a", "  Wei   Chen ", 3, 0)).players[0]!.name).toBe("Wei Chen");
    expect(join(game, scenario, "a", "Wei", FACE_COUNT, 0)).toEqual({ ok: false, error: "bad-face" });
  });

  it("keeps team and place when a player comes back", () => {
    let game = walking(withPlayers(2));
    game = value(chooseTeam(game, "p0", "green"));
    game = value(move(game, scenario, "p0", 100, 100)).game;
    game = setOnline(game, "p0", false);
    game = value(join(game, scenario, "p0", "New name", 7, 99));
    const p = game.players[0]!;
    expect(game.players).toHaveLength(2);
    expect(p).toMatchObject({ name: "New name", face: 7, team: "green", x: 100, y: 100, online: true, joinedAt: 0 });
  });

  it("refuses players when the session is full", () => {
    const game = withPlayers(MAX_PLAYERS);
    expect(join(game, scenario, "late", "Late", 0, 0)).toEqual({ ok: false, error: "game-full" });
  });
});

describe("teams", () => {
  it("lets up to five players sit at a table", () => {
    let game = withPlayers(TEAM_MAX + 1);
    for (let i = 0; i < TEAM_MAX; i++) game = value(chooseTeam(game, `p${i}`, "blue"));
    expect(teamCounts(game).blue).toBe(TEAM_MAX);
    expect(chooseTeam(game, `p${TEAM_MAX}`, "blue")).toEqual({ ok: false, error: "team-full" });
  });

  it("lets a player at a full table stay or switch away", () => {
    let game = withPlayers(TEAM_MAX);
    for (let i = 0; i < TEAM_MAX; i++) game = value(chooseTeam(game, `p${i}`, "red"));
    expect(value(chooseTeam(game, "p0", "red"))).toBe(game);
    game = value(chooseTeam(game, "p0", "yellow"));
    expect(teamCounts(game)).toMatchObject({ red: TEAM_MAX - 1, yellow: 1 });
  });

  it("needs the player to have joined", () => {
    expect(chooseTeam(withPlayers(0), "ghost", "blue")).toEqual({ ok: false, error: "not-joined" });
  });
});

describe("phases", () => {
  it("goes lobby, story, walk, one step at a time", () => {
    const game = withPlayers(0);
    expect(setPhase(game, "walk")).toEqual({ ok: false, error: "bad-phase" });
    const story = value(setPhase(game, "story"));
    expect(story.phase).toBe("story");
    expect(value(setPhase(story, "walk")).phase).toBe("walk");
    expect(setPhase(story, "lobby")).toEqual({ ok: false, error: "bad-phase" });
  });
  it("accepts the current phase again", () => {
    const game = withPlayers(0);
    expect(value(setPhase(game, "lobby"))).toBe(game);
  });
});

describe("moving", () => {
  it("only works during the walk and with a team", () => {
    let game = value(chooseTeam(withPlayers(1), "p0", "blue"));
    expect(move(game, scenario, "p0", 50, 50)).toEqual({ ok: false, error: "not-walking" });
    game = walking(withPlayers(1));
    expect(move(game, scenario, "p0", 50, 50)).toEqual({ ok: false, error: "no-team" });
    expect(move(game, scenario, "ghost", 50, 50)).toEqual({ ok: false, error: "not-joined" });
  });

  it("finds the room and records first visits", () => {
    let game = value(chooseTeam(walking(withPlayers(2)), "p0", "lilac"));
    const moved = value(move(game, scenario, "p0", 100, 100));
    expect(moved.player.room).toBe("webshop");
    expect(moved.firstVisit).toBe(true);
    game = moved.game;
    const again = value(move(game, scenario, "p0", 120, 120));
    expect(again.firstVisit).toBe(false);
    const corridor = value(move(again.game, scenario, "p0", 300, 300));
    expect(corridor.player.room).toBeNull();
    expect(corridor.firstVisit).toBe(false);
    expect([...teamVisited(corridor.game, "lilac")].sort()).toEqual(["meeting", "webshop"]);
  });

  it("keeps players on the map", () => {
    const game = value(chooseTeam(walking(withPlayers(1)), "p0", "blue"));
    const p = value(move(game, scenario, "p0", -500, 99999)).player;
    expect(p.x).toBe(AVATAR_RADIUS);
    expect(p.y).toBe(scenario.map.height - AVATAR_RADIUS);
  });

  it("rounds positions to whole map units", () => {
    expect(clampToMap(scenario, 100.6, 200.2)).toEqual({ x: 101, y: 200 });
  });
});

describe("spawn points", () => {
  it("stays in the start room even for very many players", () => {
    const all = Array.from({ length: 200 }, (_, i) => spawnPoint(scenario, i));
    for (const p of all) expect(roomAt(scenario, p.x, p.y)?.id).toBe(startRoom(scenario).id);
  });
});

describe("messages", () => {
  it("accepts well-formed messages", () => {
    expect(parseGameMessage('{"t":"join","name":"Ida","face":2}')).toEqual({ t: "join", name: "Ida", face: 2 });
    expect(parseGameMessage('{"t":"team","team":"lilac"}')).toEqual({ t: "team", team: "lilac" });
    expect(parseGameMessage('{"t":"move","x":1.5,"y":2}')).toEqual({ t: "move", x: 1.5, y: 2 });
    expect(parseGameMessage('{"t":"phase","phase":"walk"}')).toEqual({ t: "phase", phase: "walk" });
  });

  it("rejects anything else", () => {
    for (const raw of [
      "nope",
      "null",
      '{"t":"join","name":"Ida","face":99}',
      '{"t":"team","team":"purple"}',
      '{"t":"move","x":"1","y":2}',
      '{"t":"phase","phase":"end"}',
      '{"t":"hello"}',
      JSON.stringify({ t: "join", name: "x".repeat(600), face: 1 }),
    ]) {
      expect(parseGameMessage(raw)).toBeNull();
    }
  });

  it("lets the teacher change the phase and keeps the projector read-only", () => {
    const phase = { t: "phase", phase: "story" } as const;
    const moveMsg = { t: "move", x: 1, y: 1 } as const;
    expect(mayRoleSend("teacher", phase)).toBe(true);
    expect(mayRoleSend("player", phase)).toBe(false);
    expect(mayRoleSend("player", moveMsg)).toBe(true);
    expect(mayRoleSend("screen", moveMsg)).toBe(false);
    expect(mayRoleSend("screen", phase)).toBe(false);
  });
});

describe("asking questions", () => {
  const mei = spots(scenario).find((s) => s.id === "mei")!;

  /** One player on the blue team, walking, standing at (x, y). */
  function standingAt(x: number, y: number): Game {
    const game = walking(value(chooseTeam(withPlayers(1), "p0", "blue")));
    return value(move(game, scenario, "p0", x, y)).game;
  }

  it("records the assets the answer points to for the asking team", () => {
    const game = value(ask(standingAt(mei.x, mei.y), scenario, "p0", "mei", 1));
    expect(teamRevealed(game, "blue")).toEqual(["admin-login"]);
    expect(teamRevealed(game, "green")).toEqual([]);
  });

  it("adds each asset once, even if several answers point to it", () => {
    let game = standingAt(mei.x, mei.y);
    game = value(ask(game, scenario, "p0", "mei", 0)); // orders, admin-login
    game = value(ask(game, scenario, "p0", "mei", 1)); // admin-login again
    game = value(ask(game, scenario, "p0", "mei", 2)); // orders again
    expect(teamRevealed(game, "blue")).toEqual(["orders", "admin-login"]);
  });

  it("returns the same game when nothing new was learned", () => {
    const game = value(ask(standingAt(mei.x, mei.y), scenario, "p0", "mei", 1));
    expect(value(ask(game, scenario, "p0", "mei", 1))).toBe(game);
  });

  it("refuses when the player is too far away", () => {
    const far = standingAt(1100, 700);
    expect(ask(far, scenario, "p0", "mei", 0)).toEqual({ ok: false, error: "too-far" });
  });

  it("refuses unknown people and questions", () => {
    const game = standingAt(mei.x, mei.y);
    expect(ask(game, scenario, "p0", "nobody", 0)).toEqual({ ok: false, error: "unknown-question" });
    expect(ask(game, scenario, "p0", "mei", 7)).toEqual({ ok: false, error: "unknown-question" });
  });

  it("refuses before the walk, without a team, and for strangers", () => {
    const lobby = value(chooseTeam(withPlayers(1), "p0", "blue"));
    expect(ask(lobby, scenario, "p0", "mei", 0)).toEqual({ ok: false, error: "not-walking" });
    expect(ask(withPlayers(1), scenario, "p0", "mei", 0)).toEqual({ ok: false, error: "not-walking" });
    expect(ask(standingAt(mei.x, mei.y), scenario, "nobody", "mei", 0)).toEqual({ ok: false, error: "not-joined" });
  });

  it("parses the ask message and lets only players send it", () => {
    expect(parseGameMessage('{"t":"ask","person":"mei","topic":1}')).toEqual({ t: "ask", person: "mei", topic: 1 });
    for (const raw of ['{"t":"ask","person":"Mei!","topic":1}', '{"t":"ask","person":"mei","topic":1.5}', '{"t":"ask","person":"mei","topic":-1}', '{"t":"ask","person":1,"topic":0}']) {
      expect(parseGameMessage(raw)).toBeNull();
    }
    const msg = { t: "ask", person: "mei", topic: 0 } as const;
    expect(mayRoleSend("player", msg)).toBe(true);
    expect(mayRoleSend("teacher", msg)).toBe(false);
    expect(mayRoleSend("screen", msg)).toBe(false);
  });
});

describe("the debrief questions", () => {
  const debrief = { ...withPlayers(1), phase: "debrief" as const };
  it("go on to the class summary after the last question, and no further", () => {
    const last = scenario.debrief.prompts.length - 1;
    expect(value(setPrompt(debrief, scenario, last)).prompt).toBe(last);
    expect(value(setPrompt(debrief, scenario, last + 1)).prompt).toBe(summaryPrompt(scenario));
    expect(value(setPrompt(debrief, scenario, last + 9)).prompt).toBe(summaryPrompt(scenario));
    expect(value(setPrompt(debrief, scenario, -3)).prompt).toBe(0);
  });
  it("only run during the debrief", () => {
    expect(setPrompt(withPlayers(1), scenario, 1)).toEqual({ ok: false, error: "not-debrief" });
  });
});

describe("removing and renaming students", () => {
  const scenario = scenarios["nordknit-black-friday"]!;
  const base = () => {
    let g = newGame("ABCD", scenario.id, 45, 0);
    for (const id of ["player-one", "player-two"]) {
      const joined = join(g, scenario, id, id, 0, 0);
      if (joined.ok) g = joined.value;
    }
    return g;
  };

  it("removes a student with their vote, and keeps them out", () => {
    let g = base();
    g = { ...g, votes: { "player-one": 1, "player-two": 0 } };
    const result = removePlayer(g, "player-one");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players.map((p) => p.id)).toEqual(["player-two"]);
    expect(result.value.votes).toEqual({ "player-two": 0 });
    const again = join(result.value, scenario, "player-one", "Back", 0, 1);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("removed");
  });

  it("refuses to remove someone who is not there", () => {
    const result = removePlayer(base(), "nobody-here");
    expect(result.ok).toBe(false);
  });

  it("renames a student, and refuses an empty name", () => {
    const renamed = renamePlayer(base(), "player-one", "  Ada   Lovelace ");
    expect(renamed.ok && renamed.value.players.find((p) => p.id === "player-one")?.name).toBe("Ada Lovelace");
    const empty = renamePlayer(base(), "player-one", "   ");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("bad-name");
  });
});
