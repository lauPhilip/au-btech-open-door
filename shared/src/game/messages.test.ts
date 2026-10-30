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
