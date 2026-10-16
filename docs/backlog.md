# Backlog

This backlog turns the concept book into work items. Each item is written as a short user story with a clear “done when”, and each belongs to one of four milestones from the roadmap. The same list lives as data in [`backlog/issues.json`](../backlog/issues.json), and the script in [`scripts/`](../scripts/) creates it as GitHub issues, labels and milestones in one go, so this page and the issue tracker always start out the same.

Once the issues exist on GitHub, the issue tracker becomes the place to follow progress. This page then stays as a record of the original plan.

## Milestones

| Milestone | Target week | Goal | Items |
|---|---|---|---|
| M1 - Works on eduroam | 2 | A small live room works for 30 devices on eduroam in a real classroom. | 4 |
| M2 - Playable | 7 | One full class can play the Black Friday scenario from join to finish screen. | 23 |
| M3 - Pilot class | 10 | Ready for a pilot with a real class and teacher: debrief, teacher control, export, accessibility. | 13 |
| M4 - Version 1 | 12 | Teacher kit complete and a second scenario, ready for regular teaching. | 5 |

## All items

The items are grouped by the part of the game they belong to. Labels describe the kind of work; the `area:` labels tie each item to a part of the game.

| Part | Item | Milestone | Labels |
|---|---|---|---|
| Foundations | Set up the TypeScript project: app, room server and shared game rules | M1 | infra |
| Foundations | Run lint, type checks and unit tests on every pull request | M1 | infra, test |
| Foundations | Deploy a preview for every pull request | M1 | infra |
| Session room | Hello room: 30 devices in one live room on eduroam | M1 | feature, area: session |
| Session room | Create sessions with a short code and a QR link | M2 | feature, area: session |
| Session room | Reconnect after a network drop without losing your place | M2 | feature, area: session |
| Session room | Close the room and delete all data after the session | M2 | feature, area: session |
| Session room | Load test: a class of 40 simulated players | M3 | test, area: session |
| Join and lobby | Join screen: code, nickname and face | M2 | feature, area: lobby |
| Join and lobby | Pick a team table, up to five players | M2 | feature, area: lobby |
| Join and lobby | Projector lobby with QR, code and live teams | M2 | feature, area: lobby |
| Story | Play the opening story and pin the goal | M2 | feature, area: story |
| Walkable office | Draw the top-down office from the scenario map | M2 | feature, area: map |
| Walkable office | Walk with arrow keys, WASD or a click | M2 | feature, area: map |
| Walkable office | See teammates move live, with names | M2 | feature, area: map |
| Walkable office | Room checklist and 'you are here' | M2 | feature, area: map |
| Walkable office | Room list as a keyboard and screen-reader alternative | M3 | a11y, area: map |
| Close-ups | Walk-up prompt and close-up window | M2 | feature, area: close-up |
| Close-ups | Conversations from the scenario file | M2 | feature, area: close-up |
| Close-ups | 'Look closer' technical layer | M3 | feature, area: close-up |
| Close-ups | First illustrated close-ups: packing, server, reception, webshop | M3 | content, area: close-up |
| Sticky notes | Sticky note form: what, harm, who, how likely | M2 | feature, area: notes |
| Sticky notes | Private notes first, then share and merge | M2 | feature, area: notes |
| Sticky notes | Show team notes as pins on the map | M2 | feature, area: notes |
| The day happens | Day engine: clock, chat messages and alert | M2 | feature, area: day |
| The day happens | Clues in rooms and a clue counter | M2 | feature, area: day |
| The day happens | Final team vote and finish screen | M2 | feature, area: day |
| The day happens | Match notes with the answer key: 'you saw it coming' | M2 | feature, area: day |
| Debrief | Projector debrief: who saw it coming | M3 | feature, area: debrief |
| Debrief | Reveal the CyPro terms and show prompts | M3 | feature, area: debrief |
| Teacher view | Teacher setup: choose scenario and length, then start | M2 | feature, area: teacher |
| Teacher view | Teacher controls: pause, add time, start the day | M3 | feature, area: teacher |
| Teacher view | Live team overview with 'stuck' signal and hints | M3 | feature, area: teacher |
| Export | Export team notes as the CyPro threat table | M3 | feature, area: export |
| Export | Class summary for the teacher | M4 | feature, area: export |
| Scenarios | Load scenario files and check them against the schema | M2 | feature, area: scenario |
| Scenarios | Readability check for scenario texts | M2 | test, area: scenario |
| Scenarios | Second scenario: 'New bank details' at Nordknit | M4 | content, area: scenario |
| Quality and accessibility | Accessibility checks with axe in CI | M3 | a11y, test |
| Quality and accessibility | Reduced motion and colour-safe states | M3 | a11y |
| Quality and accessibility | Hallway test with five students | M3 | research |
| Quality and accessibility | Pilot class plan and feedback form | M3 | research, docs |
| Teaching material | Facilitator guide for 45 and 90 minutes | M4 | docs, content |
| Teaching material | Debrief slide deck | M4 | docs, content |
| Teaching material | Paper backup kit | M4 | docs, content |

## Creating the issues

The script needs the GitHub command-line tool, `gh`, installed and signed in. On Windows, install it with `winget install GitHub.cli` and sign in with `gh auth login`. Then run the script from the repository folder. It creates the labels and milestones first, then one issue per item, and skips any issue whose title already exists, so it is safe to run twice.

```powershell
./scripts/create-issues.ps1
```

On macOS or Linux, use `./scripts/create-issues.sh` instead.
