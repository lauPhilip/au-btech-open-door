# Documentation

This folder holds everything written about Open Door so far. The concept book is the main reference; the other documents explain the plan and the decisions behind it.

| Document | What it covers |
|---|---|
| [Concept book](concept-book/index.html) | Fifteen boards: the idea on one page, target group, journey, core loop and method, screen map, UX rules, design system, design assets, five mockups, the teacher kit, and the roadmap with architecture |
| [Roadmap](roadmap.md) | Phases, milestones and quality gates for the first twelve weeks |
| [Backlog](backlog.md) | All 45 work items as user stories, grouped by part of the game and milestone |
| [Writing a scenario](scenario-format.md) | The scenario file format, the plain words used in the answer key, and writing rules |
| [Facilitator guide](teaching/facilitator-guide.md) | Minute-by-minute guide for the teacher, for 45 and 90 minute classes |
| [Pilot plan](teaching/pilot-plan.md) | How to run and measure the first class: consent text, observer checklist, System Usability Scale |
| [Paper kit](teaching/paper-kit/) | Printable floor plan, cards, note sheets and answer key for each scenario, built with `npm run paper-kit` |
| [Decision 0001 · Tech stack](decisions/0001-tech-stack.md) | Why TypeScript, Svelte and a small live “session room” (the drawing part is changed by 0003) |
| [Decision 0002 · Licensing](decisions/0002-licensing.md) | Why the code is MIT and the content is CC BY-SA 4.0 |
| [Decision 0003 · SVG office map](decisions/0003-svg-office-map.md) | Why the walkable office is drawn with SVG in Svelte instead of PixiJS |

The concept book is a single HTML file. Open it directly in a browser, or read the published version on GitHub Pages once it is turned on. It was designed at 1920 × 1080 per board and scales to any screen width.

New decisions are added as numbered files in `decisions/`, each one short: the context, the decision, and what follows from it.
