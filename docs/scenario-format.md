# Writing a scenario

A scenario is one company and one bad day, written as a plain text file in YAML. The game reads the file and builds everything from it: the rooms you walk through, the people you talk to, the things you can inspect, the day that goes wrong and the questions for the debrief. A teacher can add a new company or a new bad day without writing any code.

Scenarios live in `scenarios/<company>/<day>.yaml`. The first one is [`scenarios/nordknit/black-friday.yaml`](../scenarios/nordknit/black-friday.yaml), and it is the best place to start: copy it, rename it, and change the content. Every file is checked automatically against [`scenarios/scenario.schema.json`](../scenarios/scenario.schema.json), so mistakes are caught before they reach a classroom.

## The parts of a scenario

A scenario follows the same order as a class: first the company and the story, then the building students explore, then the answer key, then the day itself and the debrief.

| Part | What it holds | Where students meet it |
|---|---|---|
| `company`, `goal`, `story` | Who the company is, the mission, and four to six short lines from the CEO | The story at the start; the goal stays on screen all game |
| `map` | Rooms with their position and size, and the zones they belong to | The walkable top-down office |
| `people` | Each person’s room, a greeting, and up to three questions with answers | Close-ups when a student walks up and talks |
| `things` | Objects in rooms, with a short description and an optional technical “look closer” text | Close-ups when a student inspects something |
| `assets` | The data that matters, and where it lives | Hidden; used to check sticky notes and to fill the worksheet |
| `flows` | Which data moves from where to where | Hidden; a flow between two zones crosses a trust boundary |
| `threats` | The teacher’s answer key: what could go wrong, how bad, who, and how likely | Never during play; revealed in the debrief |
| `day` | The clock, chat messages, clues in rooms, and the final team decision | The day happens |
| `debrief` | Questions for the class and a bridge to the next lesson | The projector after the day |

## Walls and doors

The picture of the building is only a picture; what stops a student walking through a wall is the map in the scenario file. Each room's `rect` is its floor. The hallway is not a room, so its pieces are listed under `floors`, each as a plain rectangle with an id. Everything between two floors is wall. A `door` joins two floors (`a` and `b`, room ids or floor ids) with a small `rect` that overlaps the floor on both sides, so walking through it moves you from one to the other. Tapping a far room makes the avatar walk through the doors on the shortest way. The scenario check fails if any room cannot be reached from the start room. A scenario with no `doors` has no walls and everyone walks freely.

## Zones are trust boundaries

Every room belongs to one zone, and places outside the building, such as the webshop provider or a factory abroad, are zones too. A zone marked `inside: false` is outside the company’s control. When a flow goes from one zone to another, it crosses a trust boundary — exactly the places CyPro asks students to look at first. Students never see the word “zone”; they experience it as walking from the office into the warehouse, or as a cable that leaves the building.

## The words used in the answer key

The answer key uses the same plain words as the sticky notes, so a student’s note can be compared directly with the teacher’s list.

| Field | Allowed values | CyPro meaning |
|---|---|---|
| `harm` | `leak`, `change`, `stop` | Confidentiality, integrity, availability |
| `actor` | `online`, `visitor`, `employee`, `supplier`, `accident` | Threat actor |
| `likelihood` | `1` in theory, `2` heard of it elsewhere, `3` seen at companies like ours, `4` happened here | CyPro’s four likelihood levels |
| `stride` | `spoofing`, `tampering`, `repudiation`, `information-disclosure`, `denial-of-service`, `elevation-of-privilege` | STRIDE, shown only in “look closer” and the debrief |

## Writing rules

Many players read English as a second language, so every text in a scenario is short and plain. Keep each sentence under twenty words and use everyday words instead of jargon. The automatic check aims for a Flesch Reading Ease score of 60 or more; the Black Friday scenario scores around 83.

Keep the day small enough to finish. A day has one to three problems, at most five clues, and a final choice with two or three options. At least one clue should be in a room students would not visit by instinct, so that walking the whole building pays off.

All companies and people are fictional. If a scenario is inspired by a real business, give it an invented name and invented weak spots, and never describe a real company’s security. Scenarios are shared under CC BY-SA 4.0, so start each file with the licence header used in the Black Friday file.

## One YAML trap

In YAML, a few short words such as `on`, `off`, `yes` and `no` are read as true or false when they are used as keys or unquoted values. That is why the answer key uses `target:` and not `on:`. If a text value starts with a quote mark or contains a colon followed by a space, put the whole text in double quotes.
