// Plain English for students (concept book: Flesch Reading Ease 60 or more, sentences under 20 words; issue #37).
import { describe, expect, it } from "vitest";
import { scenarios } from "./scenarios.generated";
import type { Scenario } from "./scenario";

/** Every sentence a student reads in a scenario, with where it comes from. */
export function scenarioTexts(s: Scenario): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [{ where: "goal", text: s.goal }, { where: "company summary", text: s.company.summary }];
  s.story.forEach((l, i) => out.push({ where: `story ${i + 1}`, text: l.text }));
  s.people.forEach((p) => p.topics.forEach((t, i) => out.push({ where: `${p.id} question ${i + 1}`, text: `${t.ask} ${t.answer}` })));
  s.things.forEach((t) => out.push({ where: `thing ${t.id}`, text: t.text ?? "" }));
  s.day.events.forEach((e, i) => out.push({ where: `event ${i + 1}`, text: e.text }));
  s.day.clues.forEach((c, i) => out.push({ where: `clue ${i + 1}`, text: c.text }));
  out.push({ where: "final question", text: s.day.final_choice.question });
  s.day.final_choice.options.forEach((o, i) => out.push({ where: `option ${i + 1}`, text: `${o.text} ${o.result}` }));
  s.threats.forEach((t) => out.push({ where: `threat ${t.id}`, text: t.text }));
  s.debrief.prompts.forEach((p, i) => out.push({ where: `debrief ${i + 1}`, text: p }));
  return out.filter((t) => t.text.trim().length > 0);
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const words = (text: string) => text.match(/[A-Za-z0-9’'-]+/g) ?? [];

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function fleschReadingEase(text: string): number {
  const ws = words(text);
  const ss = sentences(text);
  if (ws.length === 0 || ss.length === 0) return 100;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 206.835 - 1.015 * (ws.length / ss.length) - 84.6 * (syl / ws.length);
}

describe("readability of scenario texts", () => {
  for (const scenario of Object.values(scenarios)) {
    describe(scenario.title, () => {
      it("looks at all the texts students read", () => {
        expect(scenarioTexts(scenario).length).toBeGreaterThan(30);
      });

      it("keeps every sentence under 20 words", () => {
        const long = scenarioTexts(scenario).flatMap(({ where, text }) => sentences(text).filter((x) => words(x).length >= 20).map((x) => `${where}: "${x}"`));
        expect(long).toEqual([]);
      });

      it("reads at Flesch Reading Ease 60 or more overall", () => {
        const all = scenarioTexts(scenario).map((t) => t.text).join(" ");
        expect(fleschReadingEase(all)).toBeGreaterThanOrEqual(60);
      });

      it("keeps each text easy to read, with a little room for short technical ones", () => {
        const hard = scenarioTexts(scenario).filter(({ text }) => words(text).length >= 12 && fleschReadingEase(text) < 45).map(({ where, text }) => `${where} (${Math.round(fleschReadingEase(text))}): "${text}"`);
        expect(hard).toEqual([]);
      });
    });
  }
});
