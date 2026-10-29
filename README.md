# Open Door

**Walk the office, spot the risks: an open-source classroom game for interactive learning of threat modelling.**

Open Door is a browser game for teams of three to five students. Each team walks through a top-down office of a fictional company, talks to the people who work there, and leaves sticky notes wherever something could go wrong. Then a scenario plays out — the webshop goes down on Black Friday, malware arrives on a USB stick, a fake invoice lands in accounting — and the class compares which team saw it coming.

Behind the play sits the CyPro method from the [Digital Business Development toolbox](https://dbd.au.dk/p/toolbox) at Aarhus University: context establishment, system modelling, assets, threat identification and threat analysis. Students practise the method first and learn its names in the debrief. The game is being designed for the MSc in Engineering, Technology-Based Business Development, at Aarhus University in Herning, and runs in any browser on the university network (eduroam) without accounts or logins.

> **Status:** version 0.x, playable from start to finish. A class joins, hears the story, walks the company as a character (on a top-down map or inside the rooms), talks to people, looks closer at things and writes sticky notes. Then the day of the incident plays out with a clock, messages and clues, each team votes on what the CEO should do, and the debrief compares every team's notes with the answer key. The teacher can see which teams are stuck, send hints, end early and close the session, and every team can download its notes as a CyPro threat table. Two scenarios exist, *Black Friday* and *New bank details*. Still open: a classroom test on eduroam, a pilot class, and a hallway test with real users. See [next steps](docs/dev-notes/next-steps.md).

## What is in this repository

| Path | What it is |
|---|---|
| [`docs/concept-book/`](docs/concept-book/index.html) | The concept book: target group, journey, core loop, UX rules, design system, assets, mockups, teacher kit and architecture — 15 boards in one HTML page |
| [`docs/roadmap.md`](docs/roadmap.md) | The development roadmap, from repository setup to version 1 |
| [`docs/backlog.md`](docs/backlog.md) | 45 work items in four milestones; [`scripts/`](scripts/) turns them into GitHub issues |
| [`scenarios/`](scenarios/) | Game content as text files: *Nordknit · Black Friday* and *Nordknit · New bank details*, and the file format’s schema |
| [`docs/teaching/`](docs/teaching/) | For teachers: the [facilitator guide](docs/teaching/facilitator-guide.md) for 45 and 90 minute classes, the [pilot plan](docs/teaching/pilot-plan.md) with consent text and a usability survey, and [printable paper kits](docs/teaching/paper-kit/) for when the network fails |
| [`docs/scenario-format.md`](docs/scenario-format.md) | How to write a new scenario, with no coding needed |
| [`docs/testing/`](docs/testing/) | Test plans, starting with the M1 classroom test on eduroam |
| `app/`, `room/`, `shared/` | The code: browser app, Cloudflare Worker with live rooms, and shared message format |
| [`docs/decisions/`](docs/decisions/) | Short records of the main decisions and why they were made |
| [`docs/README.md`](docs/README.md) | An index of all documentation |

To read the concept book, open `docs/concept-book/index.html` in a browser, or visit the published site at `https://lauphilip.github.io/au-btech-open-door/`, which also links the teaching material.

## Run it

Open Door is written in TypeScript. The app is built with Svelte and Vite, and the live session rooms run on Cloudflare Workers with Durable Objects through PartyServer. You need [Node.js 22](https://nodejs.org) or newer.

```
npm install
npm run dev
```

This builds the app and starts two local servers: the rooms on port 8787 and the app on port 5173. Other devices on the same network can join through your computer’s address on port 5173.

| Address | Who uses it |
|---|---|
| `/teacher` | The teacher: choose a scenario and length, create a session, then move the class through the story, walk, day, vote and debrief; copy the join link, watch which teams are stuck, send hints, download the class summary and close the session |
| `/screen/CODE` | The projector: QR code and teams, then the story, the live office map, the day with its clock, the vote and the debrief table |
| `/` or `/j/CODE` | Students: type the code (or scan the QR code), pick a name, a face and a team. Phones start in the room view, larger screens on the map |
| `/dev` | For developers: creates a session and opens the teacher view, the projector and three students side by side in one window, so you can play every role yourself. Add students by name and team; each frame keeps its own identity |
| `/network-test` | The hello room from milestone M1; add `?view=projector` for its projector view |

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app and the rooms locally |
| `npm run scenarios` | Checks the scenario files and turns them into code for the game |
| `npm run check` | Type-checks all three parts |
| `npm test` | Runs the unit tests |
| `npm run test:e2e` | Plays whole sessions in real browser pages with Playwright, checks accessibility with axe, and checks every screen at six sizes from 320 to 1920 pixels for overflow, clipped text and small buttons (run `npm run build` and `npx playwright install chromium` first) |
| `npm run paper-kit` | Builds a printable paper version of every scenario into `docs/teaching/paper-kit/` |
| `npm run build` | Builds the app into `app/dist` |
| `npm run deploy` | Builds and deploys everything to Cloudflare (run `npx wrangler login` once first) |
| `node scripts/simulate-class.mjs` | Simulates a class of 40 players joining the network-test room |
| `node scripts/simulate-class.mjs --mode game` | Simulates a whole game session: a teacher, a projector and 25 students who join, sit down and walk |

The code is split into three parts: `shared/` holds the message format and game rules used everywhere, `room/` is the Cloudflare Worker that serves the app and hosts the rooms, and `app/` is what students and teachers see in the browser.

## How a class plays

| Step | 45 min | 90 min | What happens |
|---|---|---|---|
| Join | 5 | 5 | Students scan a QR code, choose a nickname and a face, and join a team |
| The story | 3 | 5 | A short story from the company’s CEO sets the goal |
| Walk and spot | 12 | 25 | Teams walk the company, open close-ups of people and things, and write sticky notes |
| The day happens | 15 | 30 | The incident unfolds with a clock, messages and clues; teams merge notes and follow clues room to room |
| The vote | 3 | 5 | Each team decides what the CEO should do right now |
| Talk it through | 7 | 20 | The projector compares all teams and reveals the CyPro terms |
| Take it home | | | Each team downloads its notes as a filled-in CyPro threat table; the teacher closes the session and everything is deleted |

## Licence

Open Door is open source under two licences. The **code** is released under the [MIT licence](LICENSE). The **content** — scenarios, texts, illustrations and the concept book — is released under [Creative Commons Attribution-ShareAlike 4.0](LICENSE-CONTENT.md), because it builds on CyPro material published under the same licence. See [decision 0002](docs/decisions/0002-licensing.md) for the reasoning.

## Credits

The learning content builds on the CyPro project, “Cybersecure manufacturing in Denmark”, by Aarhus University, the Alexandra Institute, DAMRC, UGLA Insights and FORCE Technology, funded by the Danish Industry Foundation. All companies, people and incidents in the game scenarios are fictional. The sample company Nordknit is inspired by family-owned textile businesses in the Herning area and does not describe any real company’s security.

## Contributing

Ideas, scenarios and feedback from teachers and students are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
