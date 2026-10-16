# Next steps (handoff note)

A short note on where development stands, so a new work session can pick up straight away.

## Done

- **M1 – network test.** The hello room works locally and on a home network (tested 17 October 2026: connected, 3 ms, 0 reconnects). The eduroam classroom test is **deferred** until it can be run in Herning; see [the test plan](../testing/m1-eduroam-test.md).
- **M2 slice 1, step 1 – scenario build step** (issues #36, #37). `npm run scenarios` checks every `scenarios/**/*.yaml` against the schema, checks all references and the readability rules, and writes `shared/src/scenarios.generated.ts`. `npm run check` fails if the generated file is out of date.

## Next: rest of M2 slice 1

Goal: the teacher creates a session; students join with a code, name, face and team; the projector shows a lobby; the CEO's story plays; everyone walks around the office together.

1. **Game rules in `shared/src/game/`** (pure functions with Vitest tests): phases `lobby → story → walk`; five teams (Blue, Green, Yellow, Lilac, Red door, max 5 each); `Player { id, name, face, team, x, y, room, online }`; messages `join / team / move / phase` and `state / moves / you / error`; spawn in the start room; clamp to the map.
2. **`GameRoom` Durable Object** (party `game-room`, room name = 4-character code without look-alike letters): moves batched about every 100 ms; state saved on join, team and phase changes; teacher key for the teacher role; projector is read-only; stable player id per code for reconnects; an alarm deletes everything about 6 hours after creation (#7). Needs migration tag `v2` with `new_sqlite_classes: ["GameRoom"]`.
3. **`POST /api/sessions`** in the Worker returns `{ code, teacherKey }`; add `/api/*` to `run_worker_first`.
4. **Screens:** `/teacher` (setup, then Start story / Start walking and a team overview), `/screen/CODE` (projector lobby with QR, story, map), `/network-test` (the hello room, moved), and the student flow at `/` or `/j/CODE` (code → name and face → team → lobby → story → walk).
5. **Walk view:** SVG map scaled from the scenario map; tap or click to walk, arrow keys or WASD; teammates shown with names; sidebar with the goal and a room checklist. Record DOM/SVG instead of PixiJS in `docs/decisions/0003`.
6. **Test** a full session with a teacher, a projector and several students (Playwright plus an extended `simulate-class.mjs`).
