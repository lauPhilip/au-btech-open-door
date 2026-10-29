// WCAG 2.2 AA asks for 4.5:1 on normal text (concept book, "Accessible by default").
// These are the text and background pairs the game uses, from the tokens in app.css.
import { describe, expect, it } from "vitest";

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
  ["reconnecting status", alertDark, "#fdeae6"],
];

describe("text contrast", () => {
  it.each(pairs)("%s is at least 4.5:1", (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches a known reference value", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
