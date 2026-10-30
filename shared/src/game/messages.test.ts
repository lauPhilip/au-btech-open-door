import { describe, expect, it } from "vitest";
import { mayRoleSend, parseGameMessage } from "./messages";

describe("closing the session", () => {
  it("is understood and only the teacher may do it", () => {
    expect(parseGameMessage('{"t":"close"}')).toEqual({ t: "close" });
    expect(mayRoleSend("teacher", { t: "close" })).toBe(true);
    expect(mayRoleSend("player", { t: "close" })).toBe(false);
    expect(mayRoleSend("screen", { t: "close" })).toBe(false);
  });
});

describe("saying the table is done", () => {
  it("is understood, and only a student may say it", () => {
    expect(parseGameMessage('{"t":"ready","ready":true}')).toEqual({ t: "ready", ready: true });
    expect(parseGameMessage('{"t":"ready","ready":"yes"}')).toBeNull();
    expect(mayRoleSend("player", { t: "ready", ready: true })).toBe(true);
    expect(mayRoleSend("teacher", { t: "ready", ready: true })).toBe(false);
    expect(mayRoleSend("screen", { t: "ready", ready: true })).toBe(false);
  });
});

describe("removing and renaming students", () => {
  it("parses both messages and keeps them for the teacher only", () => {
    expect(parseGameMessage('{"t":"remove","player":"abcdefgh12345"}')).toEqual({ t: "remove", player: "abcdefgh12345" });
    expect(parseGameMessage('{"t":"rename","player":"abcdefgh12345","name":"Ada"}')).toEqual({ t: "rename", player: "abcdefgh12345", name: "Ada" });
    expect(parseGameMessage('{"t":"remove","player":"x"}')).toBeNull();
    expect(parseGameMessage('{"t":"rename","player":"abcdefgh12345","name":5}')).toBeNull();
    for (const m of [{ t: "remove", player: "abcdefgh12345" }, { t: "rename", player: "abcdefgh12345", name: "A" }] as const) {
      expect(mayRoleSend("teacher", m)).toBe(true);
      expect(mayRoleSend("player", m)).toBe(false);
      expect(mayRoleSend("screen", m)).toBe(false);
    }
  });
});
