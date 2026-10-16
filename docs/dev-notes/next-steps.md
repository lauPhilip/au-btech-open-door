# Next steps (handoff note)

A short note on where development stands, so a new work session can pick up straight away.

## Done

- **M1 – network test.** The hello room works locally and on a home network (tested 17 October 2026: connected, 3 ms, 0 reconnects). It now lives at `/network-test`. The eduroam classroom test is **deferred** until it can be run in Herning; see [the test plan](../testing/m1-eduroam-test.md).
- **M2 slice 1, step 1 – scenario build step** (#36, #37). `npm run scenarios` checks every `scenarios/**/*.yaml` against the schema, checks all references and the readability rules, and writes `shared/src/scenarios.generated.ts`. `npm run check` fails if the generated file is out of date.
- **M2 slice 1 – join, story and walk** (#5, #6, #7, #9–#16, #31). Built 17 October 2026:
  - **Game rules** in `shared/src/game/` as pure functions with 24 Vitest tests: phases `lobby → story → walk` (forward only), five door-colour teams of up to five, players with name, face, team, position, room and visited rooms, spawning in a grid in the start room, clamping to the map, session codes without look-alike characters, and validated messages (`join / team / move / phase` in, `you / state / moves / error` out).
  - **`GameRoom` Durable Object** (`room/src/game-room.ts`, migration `v2`): one per four-character code; moves are batched every 100 ms; the game is saved on join, team and phase changes (positions at most every 5 s); the teacher is recognised by a key, the projector is read-only, and players keep a stable id per code so a reload or network drop brings them back with their team and place. An alarm deletes everything six hours after the session was created.
  - **API** (`room/src/api.ts`): `POST /api/sessions` returns `{ code, teacherKey }`; `GET /api/sessions/CODE` lets the join screen check a code. Bad codes and bad player ids are refused in the Worker before a WebSocket opens.
  - **Screens:** `/teacher` (choose scenario and length, then a control view with the code, a button to open the big screen, the session steps and a team overview), `/screen/CODE` (lobby with QR, code and live team tables; the story on a timer; then the live map with each team's room count), and the student flow at `/` or `/j/CODE` (code → name and face → team table → lobby → story → walk).
  - **Walk view:** the office drawn as SVG from the scenario map; tap or click to walk, or arrow keys and WASD; your own movement is simulated locally and sent ten times a second; teammates shown with names, other teams faded; a sidebar with the goal, "you are here", the team's room checklist and where teammates are. See [decision 0003](../decisions/0003-svg-office-map.md) for SVG instead of PixiJS.
  - **Tests:** `e2e/session.spec.ts` plays a full session with Playwright (teacher, projector, two laptop students and one phone, story, tap and keyboard walking, reload and come back, going offline). `node scripts/simulate-class.mjs --mode game` runs a class over the network; locally, 30 students (25 seated) walking for 30 s gave a median move echo of 16 ms, a 95th percentile of 110 ms and no errors.

## Known limits of slice 1

- **No walls yet.** Players walk in straight lines through rooms, and every room they pass through is ticked as visited. Doors and walls need a small addition to the scenario format (for example a list of door gaps per room) and a collision check in `move()`.
- **Full state on first visits.** When anyone enters a room for the first time, everyone receives the whole game state (about 39 KB/s per screen at the start of a walk with 30 players). Fine for a classroom, but a small `visited` message would cut it.
- **Playwright is not in CI yet.** Run `npm run build && npm run test:e2e` locally. Once it has passed on a GitHub runner, add a job to `.github/workflows/ci.yml` (`npx playwright install --with-deps chromium`, then build and test). Set `CHROMIUM_PATH` to use an already-installed Chromium.
- **The teacher cannot move players** between tables or go back a step yet; both are in the concept book's teacher view.

## Next: M2 slice 2 – look closer and write notes

Goal: a team walks up to a person or a thing, opens an illustrated close-up, talks or inspects, and writes a sticky note about what could go wrong.

1. **Walk-up prompt and close-up window** (#18): when a player stands near a scenario person or thing, show "Talk to Mei" / "Look at the label printer"; the close-up opens as a panel over the map (full screen on phones). Things need a position on the map — add one to the scenario format, or place them like people.
2. **Conversations from the scenario file** (#19): show `hello`, then the `topics` as question buttons; record which assets a team has revealed (`reveals`) in the game state.
3. **Sticky note form** (#22): what could go wrong (max 80 characters), harm (leak / change / stop), who (the five actors) and how likely (the four CyPro steps), using the plain words from `docs/scenario-format.md`.
4. **Private notes, then share and merge** (#23) and **notes as pins on the map** (#24).
5. Then **M2 slice 3 – the day happens** (#25–#28): clock, chat messages and the alert, clues in rooms, the final team vote, and matching notes with the answer key.
