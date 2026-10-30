import { describe, expect, it } from "vitest";
import { keyFromHash, parseTeacherLink, teacherLink } from "./teacherLink";

const KEY = "abcdefghijklmnopqrstuvwx";

describe("teacher link", () => {
  it("builds a link with the key after the hash", () => {
    expect(teacherLink("https://x.test", "ABCD", KEY)).toBe(`https://x.test/teacher?code=ABCD#key=${KEY}`);
  });

  it("reads back what it built", () => {
    expect(parseTeacherLink(teacherLink("https://x.test", "ABCD", KEY))).toEqual({ code: "ABCD", key: KEY });
  });

  it("accepts surrounding spaces and a lower-case code", () => {
    expect(parseTeacherLink(`  https://x.test/teacher?code=abcd#key=${KEY}\n`)).toEqual({ code: "ABCD", key: KEY });
  });

  it("refuses links without a code, without a key, or on another page", () => {
    expect(parseTeacherLink(`https://x.test/teacher#key=${KEY}`)).toBeNull();
    expect(parseTeacherLink("https://x.test/teacher?code=ABCD")).toBeNull();
    expect(parseTeacherLink(`https://x.test/j/ABCD#key=${KEY}`)).toBeNull();
    expect(parseTeacherLink("hello")).toBeNull();
  });

  it("refuses keys of the wrong shape", () => {
    expect(keyFromHash("#key=short")).toBeNull();
    expect(keyFromHash("#key=<script>alert(1)</script>")).toBeNull();
    expect(keyFromHash(`#key=${KEY}`)).toBe(KEY);
    expect(keyFromHash("")).toBeNull();
  });
});
