# Open Door

**Walk the office, spot the risks: an open-source classroom game for interactive learning of threat modelling.**

Open Door is a browser game for teams of three to five students. Each team walks through a top-down office of a fictional company, talks to the people who work there, and leaves sticky notes wherever something could go wrong. Then a scenario plays out — the webshop goes down on Black Friday, malware arrives on a USB stick, a fake invoice lands in accounting — and the class compares which team saw it coming.

Behind the play sits the CyPro method from the [Digital Business Development toolbox](https://dbd.au.dk/p/toolbox) at Aarhus University: context establishment, system modelling, assets, threat identification and threat analysis. Students practise the method first and learn its names in the debrief. The game is being designed for the MSc in Engineering, Technology-Based Business Development, at Aarhus University in Herning, and runs in any browser on the university network (eduroam) without accounts or logins.

> **Status:** milestone M2 – Playable is in progress. The hello room network test works; the eduroam classroom test is planned for later. See [next steps](docs/dev-notes/next-steps.md).

## What is in this repository

| Path | What it is |
|---|---|
| [`docs/concept-book/`](docs/concept-book/index.html) | The concept book: target group, journey, core loop, UX rules, design system, assets, mockups, teacher kit and architecture — 15 boards in one HTML page |
| [`docs/roadmap.md`](docs/roadmap.md) | The development roadmap, from repository setup to version 1 |
| [`docs/backlog.md`](docs/backlog.md) | 45 work items in four milestones; [`scripts/`](scripts/) turns them into GitHub issues |
| [`scenarios/`](scenarios/) | Game content as text files: the first scenario, *Nordknit · Black Friday*, and the file format’s schema |
| [`docs/scenario-format.md`](docs/scenario-format.md) | How to write a new scenario, with no coding needed |
| [`docs/testing/`](docs/testing/) | Test plans, starting with the M1 classroom test on eduroam |
| `app/`, `room/`, `shared/` | The code: browser app, Cloudflare Worker with live rooms, and shared message format |
| [`docs/decisions/`](docs/decisions/) | Short records of the main decisions and why they were made |
| [`docs/README.md`](docs/README.md) | An index of all documentation |

To read the concept book, open `docs/concept-book/index.html` in a browser, or visit the published version once GitHub Pages is turned on: `https://lauphilip.github.io/au-btech-open-door/`.

## Run it

Open Door is written in TypeScript. The app is built with Svelte and Vite, and the live session rooms run on Cloudflare Workers with Durable Objects through PartyServer. You need [Node.js 22](https://nodejs.org) or newer.

```
npm install
npm run dev
```

This builds the app and starts two local servers: the rooms on port 8787 and the app on port 5173. Open `http://localhost:5173` to join the hello room, and `http://localhost:5173/?view=projector` for the projector view. Other devices on the same network can join through your computer’s address on port 5173.

| Command | What it does |
|---|---|
| `npm run dev` | Runs the app and the rooms locally |
| `npm run scenarios` | Checks the scenario files and turns them into code for the game |
| `npm run check` | Type-checks all three parts |
| `npm test` | Runs the unit tests |
| `npm run build` | Builds the app into `app/dist` |
| `npm run deploy` | Builds and deploys everything to Cloudflare (run `npx wrangler login` once first) |
| `node scripts/simulate-class.mjs` | Simulates a class of 40 players joining a room |

The code is split into three parts: `shared/` holds the message format and game rules used everywhere, `room/` is the Cloudflare Worker that serves the app and hosts the rooms, and `app/` is what students and teachers see in the browser.

## How a class plays

| Step | Time | What happens |
|---|---|---|
| Join | 3 min | Students scan a QR code, choose a nickname and a face, and join a team |
| The story | 3 min | A short illustrated story from the company’s CEO sets the goal |
| Walk and spot | 25 min | Teams explore the office, open close-ups of people and things, and write sticky notes |
| The day happens | 25 min | The scenario unfolds; teams follow clues room to room and make a final call |
| Talk it through | 30 min | The projector compares all teams, and the CyPro terms are revealed |
| Take it home | — | Each team downloads its notes as a filled-in CyPro threat table |

## Licence

Open Door is open source under two licences. The **code** is released under the [MIT licence](LICENSE). The **content** — scenarios, texts, illustrations and the concept book — is released under [Creative Commons Attribution-ShareAlike 4.0](LICENSE-CONTENT.md), because it builds on CyPro material published under the same licence. See [decision 0002](docs/decisions/0002-licensing.md) for the reasoning.

## Credits

The learning content builds on the CyPro project, “Cybersecure manufacturing in Denmark”, by Aarhus University, the Alexandra Institute, DAMRC, UGLA Insights and FORCE Technology, funded by the Danish Industry Foundation. All companies, people and incidents in the game scenarios are fictional. The sample company Nordknit is inspired by family-owned textile businesses in the Herning area and does not describe any real company’s security.

## Contributing

Ideas, scenarios and feedback from teachers and students are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).
