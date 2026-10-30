# Developing Open Door

## Run it locally

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


## Publishing

The documentation site (the landing page, the concept book, the teaching material and the demo GIF) is published by GitHub Pages straight from the `docs` folder of the `main` branch. There is no workflow to run: merge to `main` and the site updates by itself. Set it up once under Settings, Pages, Build and deployment, with the source set to "Deploy from a branch", the branch `main` and the folder `/docs`.

GitHub Pages can only serve static files, so it cannot run the game. The live game (the app and the session rooms) is one Cloudflare Worker: `npm run deploy` builds and publishes it after a one-time `npx wrangler login`. The live game is at <https://open-door.aubtech.workers.dev/>; the "Play the game" button on the landing page (`docs/index.html`) links to it, so change that link if the address ever changes.

The demo GIF in `docs/media/` is a recording of a real session. To make a new one, play a session in a browser at 1280 by 720, capture it, and convert it with ffmpeg to a GIF of about 6 seconds and 960 pixels wide.

Security: the public Worker limits how fast one address can create sessions, look up codes and connect, refuses connections from other sites, drops message floods and sends security headers (the limits are in `shared/src/limits.ts`, the checks in `room/src/guard.ts`, the page headers in `app/public/_headers`). The shared session limit is a Cloudflare rate-limit binding in `room/wrangler.jsonc`. What is stored and why is in [security.md](security.md).

The walk screen is split into parts so each file stays small: `Walk.svelte` holds the movement, keyboard and the picture, `WalkHeader.svelte` the strip above it (team, place, countdown, "our table is done", day bar, hints), `WalkControls.svelte` what you can do under the picture, and `WalkSide.svelte` the side panel (goal, rooms, notes, found assets, teammates, chat and clues).
