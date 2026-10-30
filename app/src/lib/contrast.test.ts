// WCAG 2.2 AA asks for 4.5:1 on normal text (concept book, "Accessible by default").
// These are the text and background pairs the game uses, from the tokens in app.css.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/** Every colour token in app.css, so the palette in the file is the palette that is tested. */
const tokens = Object.fromEntries([...readFileSync(new URL("../app.css", import.meta.url), "utf8").matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
const t = (name: string) => tokens[name]!;

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const ink = "#1c2430";
const slate = "#5a6574";
const mist = "#f2f4f7";
const paper = "#ffffff";
const blue = "#2e5bdb";
const blueDark = "#1e40a8";
const blueSoft = "#eef2fc";
const sticky = "#ffe27a";
const stickyPaper = "#fff9d6";
const safeDark = "#1e6b4e";
const alertDark = "#b93a25";

const pairs: Array<[string, string, string]> = [
  ["body text on the page", ink, mist],
  ["body text on cards", ink, paper],
  ["secondary text on the page", slate, mist],
  ["secondary text on cards", slate, paper],
  ["secondary text on a sticky note", slate, stickyPaper],
  ["white text on a primary button", paper, blue],
  ["white text on a pressed button", paper, blueDark],
  ["button text on a chosen chip", blueDark, blueSoft],
  ["links on cards", blue, paper],
  ["text on a sticky button", ink, sticky],
  ["connected status", safeDark, "#e3f4ec"],
  ["problem text on a card", alertDark, paper],
  ["alert banner text", paper, alertDark],
  ["small grey text on a story card", slate, "#fbe9da"],
  ["reconnecting status", alertDark, "#fdeae6"],
  ["a team that says it is done", t("safe-ink"), t("safe-soft")],
  ["a team that may need help", t("warn-ink"), t("warn-soft")],
  ["nearly right in the debrief table", t("close-ink"), t("close-soft")],
  ["missed in the debrief table", t("quiet-ink"), t("quiet-soft")],
  ["white text on a done button", paper, t("safe-dark")],
  ["problem text on a soft red", t("alert-dark"), t("alert-soft")],
  ["text on a sticky button when hovered", t("ink"), t("sticky-hover")],
];

describe("the palette in app.css", () => {
  it("still holds the colours this test checks", () => {
    for (const name of ["ink", "slate", "mist", "paper", "blue", "blue-dark", "blue-soft", "sticky", "sticky-paper", "safe-dark", "alert-dark"]) expect(tokens[name], name).toBeTruthy();
  });
  it.each([["ink", ink], ["slate", slate], ["blue", blue], ["blue-dark", blueDark], ["sticky", sticky], ["safe-dark", safeDark], ["alert-dark", alertDark]])("%s here matches the token", (name, hex) => {
    expect(t(name)).toBe(hex);
  });
});

describe("text contrast", () => {
  it.each(pairs)("%s is at least 4.5:1", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches a known reference value", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
