#!/usr/bin/env node
// Builds a printable paper version of each scenario, for the day the network fails.
//   node scripts/build-paper-kit.mjs
// Writes docs/teaching/paper-kit/<scenario id>.html. Open it in a browser and print (A4, portrait).
// Pages: floor plan, people cards, thing cards, note sheets, vote sheet and, last, the teacher's answer key.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenarioDir = join(root, "scenarios");
const outDir = join(root, "docs", "teaching", "paper-kit");
mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TEAMS = ["Blue door", "Green door", "Yellow door", "Lilac door", "Red door"];
const COLUMNS = ["Threat", "Target (asset or component)", "Where", "Harm (C · I · A)", "Threat actor", "Likelihood (1–4)", "Impact", "Noted by"];

/** Break text into lines that fit the width at the given font size. */
function wrap(text, width, size) {
  const per = Math.max(4, Math.floor(width / (size * 0.56)));
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > per) {
      lines.push(line);
      line = word;
    } else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

function plan(s) {
  const { width, height, rooms } = s.map;
  const rects = rooms
    .map((r) => {
      const [x, y, w, h] = r.rect;
      const nameSize = w < 200 ? 22 : 28;
      let cy = y + 8 + nameSize;
      let out = "";
      for (const line of wrap(r.name, w - 24, nameSize)) {
        out += `<text x="${x + 14}" y="${cy}" font-size="${nameSize}" font-weight="700" fill="#4a3b2a">${esc(line)}</text>`;
        cy += nameSize + 2;
      }
      cy += 12;
      const here = [...s.people.filter((p) => p.room === r.id).map((p) => p.name), ...s.things.filter((t) => t.room === r.id).map((t) => t.name)];
      for (const label of here) {
        wrap(label, w - 40, 22).forEach((line, i) => {
          out += `<text x="${x + (i ? 34 : 18)}" y="${cy}" font-size="22" fill="#33404F">${i ? "" : "• "}${esc(line)}</text>`;
          cy += 26;
        });
      }
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#f1e6d8" stroke="#8a6538" stroke-width="3"/>${out}</g>`;
    })
    .join("");
  return `<svg viewBox="-6 -6 ${width + 12} ${height + 12}" role="img" aria-label="Floor plan"><rect width="${width}" height="${height}" rx="18" fill="#f7f3ec" stroke="#cdb89c" stroke-width="3"/>${rects}</svg>`;
}

function build(s) {
  const room = (id) => s.map.rooms.find((r) => r.id === id)?.name ?? id;
  const threatName = (id) => s.threats.find((t) => t.id === id)?.text ?? id;
  const blankRows = Array.from({ length: 8 }, () => `<tr>${COLUMNS.map(() => "<td></td>").join("")}</tr>`).join("");
  const sheet = (team) => `<section class="page"><h2>Note sheet · ${esc(team)}</h2><p class="sub">Write one threat per row. Use the key at the bottom of the page.</p><table class="notes"><thead><tr>${COLUMNS.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${blankRows}</tbody></table><p class="key"><strong>Harm:</strong> C = someone can read it (leak), I = someone can change it, A = it stops working. <strong>Actor:</strong> online attacker, visitor or driver, employee, supplier, accident. <strong>Likelihood:</strong> 1 in theory, 2 happens elsewhere, 3 happens to companies like us, 4 has happened here.</p></section>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(s.company.name)} · ${esc(s.title)} · paper kit</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font: 14px/1.45 system-ui, sans-serif; color: #1c2430; margin: 0; }
  .page { page-break-after: always; padding: 4px; }
  h1 { font-size: 30px; margin: 0 0 6px; } h2 { font-size: 22px; margin: 0 0 8px; }
  .sub { color: #5b6675; margin: 0 0 12px; }
  svg { width: 100%; height: auto; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { border: 2px dashed #8a6538; border-radius: 10px; padding: 10px 12px; break-inside: avoid; }
  .card h3 { margin: 0; font-size: 18px; } .card .role { color: #5b6675; margin: 0 0 6px; }
  .card ol { margin: 6px 0 0 18px; padding: 0; } .card li { margin-bottom: 6px; }
  .answer { display: block; border-top: 1px dotted #8a6538; margin-top: 3px; padding-top: 3px; font-style: italic; color: #33404F; }
  table.notes { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.notes th, table.notes td { border: 1.5px solid #33404F; padding: 4px; font-size: 11px; vertical-align: top; }
  table.notes td { height: 62px; } .key { font-size: 12px; margin-top: 10px; }
  .vote label { display: block; border: 2px solid #33404F; border-radius: 10px; padding: 12px; margin-bottom: 10px; font-size: 16px; }
  .teacher { background: #fff4d6; padding: 10px; border-radius: 10px; }
  @media screen { body { max-width: 900px; margin: 20px auto; } .page { border-bottom: 3px solid #cdb89c; margin-bottom: 20px; } }
</style></head><body>
<section class="page"><h1>${esc(s.company.name)} · ${esc(s.title)}</h1><p class="sub">Paper kit for the class. Fictional company, CC BY-SA 4.0. ${esc(s.company.summary)}</p><h2>Goal</h2><p>${esc(s.goal)}</p>
<h2>How to play on paper</h2><p>Print one copy of the floor plan per team, one set of cards for the teacher and one note sheet per team. Walk around by pointing at rooms on the floor plan. When a team stands in a room and asks a question, the teacher reads the answer from the card. Teams write threats on their note sheet. After the walk, read the story events aloud, hand out the vote sheet, and use the answer key to debrief.</p>
<h2>The story</h2>${s.story.map((x) => `<p><strong>${esc(s.people.find((p) => p.id === x.speaker)?.name ?? x.speaker)}:</strong> ${esc(x.text)}</p>`).join("")}</section>
<section class="page"><h2>Floor plan</h2><p class="sub">${esc(s.company.name)}, ${esc(s.company.place)}. Every team starts in the meeting room.</p>${plan(s)}</section>
<section class="page"><h2>People</h2><p class="sub">The teacher reads the question the team picks and then the italic answer. Cut along the dashed lines.</p><div class="cards">${s.people
    .map((p) => `<div class="card"><h3>${esc(p.name)}</h3><p class="role">${esc(p.role)} · ${esc(room(p.room))}</p><p>“${esc(p.hello)}”</p><ol>${p.topics.map((t) => `<li>${esc(t.ask)}<span class="answer">${esc(t.answer)}</span></li>`).join("")}</ol></div>`)
    .join("")}</div></section>
<section class="page"><h2>Things</h2><p class="sub">The line “look closer” is for teams that ask to look closer.</p><div class="cards">${s.things
    .map((t) => `<div class="card"><h3>${esc(t.name)}</h3><p class="role">${esc(room(t.room))}</p><p>${esc(t.text)}</p>${t.closer ? `<span class="answer">Look closer: ${esc(t.closer)}</span>` : ""}</div>`)
    .join("")}</div></section>
<section class="page"><h2>The day</h2><p class="sub">Alert: ${esc(s.day.alert)} Read these out at the times shown, one every few minutes.</p>${s.day.events.map((e) => `<p><strong>${esc(e.at)} · ${esc(s.people.find((p) => p.id === e.from)?.name ?? e.from)}:</strong> ${esc(e.text)}</p>`).join("")}<h2>Clues</h2><p class="sub">Give a clue to a team that stands in the room for the first time after the day has started.</p>${s.day.clues.map((c) => `<p><strong>${esc(room(c.room))}:</strong> ${esc(c.text)}</p>`).join("")}</section>
${TEAMS.map(sheet).join("")}
<section class="page vote"><h2>Vote sheet</h2><p class="sub">${esc(s.day.final_choice.question)} Tick one. The majority at your table counts.</p>${s.day.final_choice.options.map((o, i) => `<label>☐ ${"ABC"[i] ?? i + 1}. ${esc(o.text)}</label>`).join("")}</section>
<section class="page teacher"><h2>Teacher only · answer key</h2>${s.threats.map((t) => `<p><strong>${esc(t.text)}</strong><br>Where: ${esc(s.things.find((x) => x.id === t.target)?.name ?? t.target)} · Harm: ${t.harm.join(", ")} · Actor: ${t.actor.join(", ")} · Likelihood: ${t.likelihood}</p>`).join("")}<h2>Results of the choices</h2>${s.day.final_choice.options.map((o, i) => `<p><strong>${"ABC"[i] ?? i + 1}${o.best ? " (best)" : ""}:</strong> ${esc(o.result)}</p>`).join("")}<h2>Debrief questions</h2><ol>${s.debrief.prompts.map((p) => `<li>${esc(p)}</li>`).join("")}</ol></section>
</body></html>`;
}

const files = readdirSync(scenarioDir)
  .filter((d) => statSync(join(scenarioDir, d)).isDirectory())
  .flatMap((d) => readdirSync(join(scenarioDir, d)).filter((f) => f.endsWith(".yaml")).map((f) => join(scenarioDir, d, f)));
for (const file of files) {
  const s = parse(readFileSync(file, "utf8"));
  const out = join(outDir, `${s.id}.html`);
  writeFileSync(out, build(s));
  console.log(`✓ ${s.id} → ${out.replace(root + "/", "")}`);
}
