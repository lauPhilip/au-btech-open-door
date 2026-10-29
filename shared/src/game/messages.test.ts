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
