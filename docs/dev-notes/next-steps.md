# Next steps (handoff note)

A short note on where development stands, so a new work session can pick up straight away.

## Done

- **M1 – network test.** The hello room works locally and on a home network (tested 17 October 2026: connected, 3 ms, 0 reconnects). It now lives at `/network-test`. The eduroam classroom test is **deferred** until it can be run in Herning; see [the test plan](../testing/m1-eduroam-test.md).
- **M2 slice 1, step 1 – scenario build step** (#36, #37). `npm run scenarios` checks every `scenarios/**/*.yaml` against the schema, checks all references and the readability rules, and writes `shared/src/scenarios.generated.ts`. The generated file is not kept in git; `dev`, `build`, `check`, `test` and `test:e2e` all write it first.
- **M2 slice 1 – join, story and walk** (#5, #6, #7, #9–#16, #31). Built 17 October 2026:
  - **Game rules** in `shared/src/game/` as pure functions with 24 Vitest tests: phases `lobby → story → walk` (forward only), five door-colour teams of up to five, players with name, face, team, position, room and visited rooms, spawning in a grid in the start room, clamping to the map, session codes without look-alike characters, and validated messages (`join / team / move / phase` in, `you / state / moves / error` out).
  - **`GameRoom` Durable Object** (`room/src/game-room.ts`, migration `v2`): one per four-character code; moves are batched every 100 ms; the game is saved on join, team and phase changes (positions at most every 5 s); the teacher is recognised by a key, the projector is read-only, and players keep a stable id per code so a reload or network drop brings them back with their team and place. An alarm deletes everything six hours after the session was created.
  - **API** (`room/src/api.ts`): `POST /api/sessions` returns `{ code, teacherKey }`; `GET /api/sessions/CODE` lets the join screen check a code. Bad codes and bad player ids are refused in the Worker before a WebSocket opens.
  - **Screens:** `/teacher` (choose scenario and length, then a control view with the code, a button to open the big screen, the session steps and a team overview), `/screen/CODE` (lobby with QR, code and live team tables; the story on a timer; then the live map with each team's room count), and the student flow at `/` or `/j/CODE` (code → name and face → team table → lobby → story → walk).
  - **Walk view:** the office drawn as SVG from the scenario map; tap or click to walk, or arrow keys and WASD; your own movement is simulated locally and sent ten times a second; teammates shown with names, other teams faded; a sidebar with the goal, "you are here", the team's room checklist and where teammates are. See [decision 0003](../decisions/0003-svg-office-map.md) for SVG instead of PixiJS.
  - **Tests:** `e2e/session.spec.ts` plays a full session with Playwright (teacher, projector, two laptop students and one phone, story, tap and keyboard walking, reload and come back, going offline). `node scripts/simulate-class.mjs --mode game` runs a class over the network; locally, 30 students (25 seated) walking for 30 s gave a median move echo of 16 ms, a 95th percentile of 110 ms and no errors.

- **M2 slice 2 – look closer and write notes (part 1)** (#18, #19, #22). Built 29 October 2026:
  - **Spots** (`spots()` in `shared/src/scenario.ts`): people and things get map positions from a fixed layout, so the scenario format did not change. People stand along the bottom of their room; things sit in a row above them. Players are "near" a spot within `INTERACT_RANGE` (80 map units).
  - **Walk-up prompt and close-up window:** a button row under the map shows "Talk to Mei" or "Look at Label printer" (key **E** opens the nearest), and the close-up opens as a panel (full screen on phones, Esc closes). Walking is paused while it is open.
  - **Conversations:** `hello`, then the `topics` as question buttons. The `ask` message records which assets the answer `reveals` per team in `game.revealed`; the room checks that the player really stands near the person. The sidebar lists what the team has found.
  - **Sticky notes (#22):** form with text (80 characters), harm, who and how likely, in the plain words of the answer key (`shared/src/game/notes.ts`). Notes are stored in the room apart from the game state and sent **only to their author** until #23 adds sharing.
  - **Developer simulator at `/dev`:** one window with the teacher, the projector and students in frames. Each frame keeps its own identity through `?as=NAME` (storage keys get a prefix), and `?team=blue` sits a simulated student down at a table.
  - **Tests:** 62 unit tests; the e2e run now covers talking, asset reveals, notes and the simulator.

- **M2 slice 2 – look closer and write notes (part 2)** (#20, #23, #24). Built 29 October 2026, following concept-book boards 04, 06, 07 and 11:
  - **Private first, then shared (#23):** a note starts private. "Share with team" (and "Take back") is the author's choice. The room sends each player their own notes plus their team's shared notes (`visibleNotes`), never other teams'. Any teammate can tick two shared notes and merge them: the first note stays, harms and who are combined, the higher likelihood wins, and the note shows "Laura + 1".
  - **Pins on the map (#24):** each visible note is a small tilted sticky with the author's initial, drawn where the author stood. Private notes have a dashed outline. The tooltip carries the text.
  - **Look closer (#20):** things with a `closer` text show a "Look closer (technical)" link in their close-up; the text stays hidden until asked for. Answer-key data (threats, STRIDE) is never sent.
  - **Wording** now follows the concept book: "Stop the work", "A visitor or driver", numbered likelihood levels, "Back to the map", "My notes · private until shared" and "Team notes · on the map".
  - **Not done yet from the board:** the projector's "notes per team" counts (belongs with #29), and "Stick it on" has no sticky-drop animation.

- **Accessibility pass** (#17, #40). Built 29 October 2026:
  - **Room list as a second way to walk (#17):** every room in the sidebar is a button ("Walk to Server cupboard, not visited yet") that walks the avatar to the middle of the room, and the people and things in each room are buttons too. The "Talk to …" prompt then appears as usual, so the whole game up to the close-ups works without the map.
  - **Reduced motion and colour-safe states (#40):** the global `prefers-reduced-motion` rule already stops animations and avatar gliding, and an e2e test now proves it (and fails without the setting). No state is shown by colour alone: rooms have ticks and text, notes have dashes for private, teammates have initials, likelihood has numbers. `contrast.test.ts` checks the 13 text and background pairs against 4.5:1.
  - **Not covered yet:** the axe checks in CI (#39), and a screen-reader test with a real reader.

- **The day engine** (#25, #26, #32). Built 29 October 2026:
  - **Timers:** `shared/src/game/timer.ts` and `day.ts` hold a pausable timer with added time. The walk has a countdown, and the day runs on a game clock (07:55 to 10:00). A 45-minute class plays the day at half length. The server sends its own clock so phones agree.
  - **The day:** the teacher starts it from the controls. Chat messages and the red alert are derived from the clock, so every screen shows the same moment. Notes are shared with the team when the day starts.
  - **Clues:** each team finds the four clues by being in the right room during the day. Found clues show on the map with a magnifier, in a clue list, and on the projector as a count per team.
  - **Teacher controls:** pause all, resume all, and plus five minutes during the walk. Everything that moves players is blocked while paused.
  - **Checked at:** phone 390 wide, laptop 1366 and large 1920, plus the projector, with the white-on-alert-red pair added to `contrast.test.ts`.

- **The vote and the answer key** (#27, #28). Built 29 October 2026:
  - **Phases:** the teacher can now go from the day to "Start the vote" and then "Show the result". Notes are shared with the team again when the vote starts.
  - **Vote:** each student picks one of the three options, can change their mind, and sees how many at their table have voted. Rules are in `shared/src/game/vote.ts`: the majority at a table decides and a tie is "no decision".
  - **Result and "you saw it coming":** `match.ts` counts a note as a hit when it is about the threat's thing (or stands in its room) and shares a harm. The finish screen shows the table's decision, the scenario result and every problem in the answer key, with the matching note.
  - **Known limit:** the browser bundle contains the whole scenario, answer key included, so a curious student could read it in dev tools. Fine for a classroom game; worth knowing.

- **The debrief** (#29, #30). Built 29 October 2026:
  - **Class table:** when the teacher shows the result, the server grades every team's shared notes against the answer key once (`gradeAll` in `match.ts`) and keeps the grades in the game. The projector shows teams against problems with ✓ on a note, ½ close and – missed, using symbols, words for screen readers and colour together. At 1920×1080 and 1280×720 the table, the question and the names all fit without scrolling.
  - **CyPro names and questions:** a panel maps game words to CyPro terms (system model, assets, trust boundaries, threats, C·I·A, threat actors, likelihood), and the prompts come from `debrief.prompts` in the scenario file. The teacher steps through the questions with Previous and Next, and the projector follows.

- **The teacher's overview** (#33, #10). Built 29 October 2026:
  - **Overview:** during the walk and the day the teacher sees each team's rooms, notes and clues. A team that nobody at the table has moved for three minutes gets a "May need help" flag with a warning symbol and words, not colour alone. Time spent paused never counts. The idle time is measured on the teacher's device from the moves it receives (`shared/src/game/overview.ts`).
  - **Hints:** one tap sends a hint from three choices (the two next rooms the team has not entered, or "talk to everyone in the room"). It shows as a yellow banner on that team's phones until they close it.
  - **Moving players:** before the walk the teacher can move a student to another table from a menu next to their name. Full tables are disabled in the menu.

- **Checks that guard quality** (#36, #37, #39, #6, #2). Built 29 October 2026:
  - **Readability (#37):** `readability.test.ts` fails when a scenario sentence has 20 or more words, when the whole scenario reads below Flesch 60, or when a longer text reads below 45. The Nordknit scenario passes as written.
  - **Accessibility (#39):** `e2e/a11y.spec.ts` runs axe over the join page, team table, story, walk, day, vote, finish, teacher and projector screens, and fails on serious or critical problems.
  - **Reconnect (#6):** an end-to-end test cuts a student's connection, sees "Reconnecting…" then "Connected", and checks that name, team, place and notes survive both the drop and a reload.
  - **CI (#2):** the workflow now also runs the browser tests. Scenario schema and reference checks (#36) already run as part of `npm run check`.

- **Illustrations and the room view** (#21). Built 29 October 2026:
  - **Busts:** `Bust.svelte` draws a warm round portrait for each person from a few choices (skin, hair, shirt, glasses and so on), so Karin, Mei, Ahmed, Jana, Elena and Tomas look different and a new scenario can add people without new artwork. Close-ups now use them.
  - **Room view:** next to the map there is a "Room view" toggle. It draws the inside of the room you stand in, with its people and things as buttons, and a row of doors that walk you to any other room. The map and the room view share the same position, so teammates, clues and notes stay in step. Tapping a person or thing walks there and opens the same close-up.
  - **About Spline:** Spline is now connected to the project. The room scenes are plain SVG, so they work offline and in the axe checks. A 3D version of the factory for the projector could be built in Spline later; it would need a published link or exported asset.

- **Export** (#34, #35). Built 29 October 2026:
  - **Team table:** on the finish screen a team can download its shared notes as a CSV or print them to PDF as a CyPro threat table (threat, target, where, harm as C·I·A, threat actor, likelihood 1–4, impact, noted by). Impact is left empty on purpose for the class to fill in. The rules are in `shared/src/game/export.ts`.
  - **Class summary:** from the vote on, the teacher can download every team's notes (CSV), the debrief table (CSV) and a printable summary. The page reminds the teacher that sessions are deleted six hours after they start.
  - **Safety:** cells that start with `=`, `+`, `-` or `@` get a leading quote so a student cannot plant a spreadsheet formula. This is tested.

- **Walking, close-ups and layout checks.** Built 29 October 2026:
  - **Second scenario** (#38): `scenarios/nordknit/new-bank-details.yaml`, a fake e-mail changes the factory's bank details. The teacher picker lists both scenarios.
  - **Room view as a walk:** `RoomScene.svelte` now shows your own character (your face with a ring in your team colour) at the place that matches your map position, and your teammates. Doors to the nearest room in each direction sit at the edges and the view slides into the next room as you cross (`prefers-reduced-motion` turns the slide off). Tapping the floor walks you there. The full room list is under "Go to any room". Phones start in the room view, larger screens in the map.
  - **Close-ups:** `Prop.svelte` has a large illustration for each thing (visitor book, label printer, order screen, inbox, router, invoice tray, with a plain fallback). `CloseUp.svelte` shows it beside the text, or a big portrait for a person.
  - **Map zones:** rooms are tinted by network zone and labelled, so the trust boundaries are visible.
  - **Layout check:** `e2e/responsive.spec.ts` walks a class through every phase at 320, 390, 768, 1280, 1440 and 1920 pixels wide and fails on sideways scrolling, parts sticking out of the screen, clipped text and phone buttons under 44 px. Screenshots land in `test-results/responsive/`.
  - **Teacher flow:** copyable join link, a sticky next-step button on phones, "End now and show summary" during the walk, day and vote, and a close button that deletes the session's data.
  - **Teaching material:** `docs/teaching/` has the facilitator guide, the pilot plan with consent text and SUS form, and `npm run paper-kit` builds printable kits into `docs/teaching/paper-kit/`. The debrief deck exists as a Slides artifact.

## Known limits of slice 1

- **No walls yet.** Players walk in straight lines through rooms, and every room they pass through is ticked as visited. Doors and walls need a small addition to the scenario format (for example a list of door gaps per room) and a collision check in `move()`.
- **Full state on first visits.** When anyone enters a room for the first time, everyone receives the whole game state (about 39 KB/s per screen at the start of a walk with 30 players). Fine for a classroom, but a small `visited` message would cut it.
- **Playwright is not in CI yet.** Run `npm run build && npm run test:e2e` locally. Once it has passed on a GitHub runner, add a job to `.github/workflows/ci.yml` (`npx playwright install --with-deps chromium`, then build and test). Set `CHROMIUM_PATH` to use an already-installed Chromium.
- **The teacher cannot move players** between tables or go back a step yet; both are in the concept book's teacher view.

## Next: M2 slice 3 and the leftovers of slice 2

Goal: the day happens, and the team's notes meet the answer key.

1. **Axe checks in CI** (#39) and a real screen-reader pass over the walk view and close-ups.
2. **Walls and doors** (see known limits below) before the day starts, so clues in rooms mean something.
3. **First illustrated close-ups** (#21): replace the initial and the box in `CloseUp.svelte` with illustrations.
5. Then **M2 slice 3 – the day happens** (#25–#28): clock, chat messages and the alert, clues in rooms, the final team vote, and matching notes with the answer key.
