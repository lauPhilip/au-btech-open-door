# Roadmap

This roadmap takes Open Door from an empty repository to a first version that has been tested in a real class. It follows eight phases — set up the repository, plan the features, design the architecture, build, test, refine, deploy with continuous integration, and document — spread over roughly twelve weeks. The weeks are an estimate for planning, not a deadline; they will be adjusted after the first milestone.

## Phases at a glance

| Phase | Weeks | What we do | Done when |
|---|---|---|---|
| 0 · Set up the repository | 1 | Create the repository locally and on GitHub, add licences, docs and a first workflow that publishes the docs | The concept book is online through GitHub Pages |
| 1 · Plan features | 1–2 | Turn the concept book into a backlog of GitHub issues; define the scenario file format | Every screen in the screen map has issues; one scenario is written as a text file |
| 2 · Design and architecture | 2–3 | Choose and test the stack; build a tiny “hello room” and test it on eduroam in a real classroom | 30 devices on eduroam can join one room at the same time |
| 3 · Build the first version | 3–7 | Join and lobby, the walkable office, close-ups, sticky notes, the incident day, the debrief and the teacher view, with one scenario | A full class can play the Black Friday scenario from start to end |
| 4 · Test | 5–9 | Automated tests on every change; short hallway tests with five students who have never seen the game | The usability targets in the concept book are met |
| 5 · Pilot and refine | 9–11 | Run the game in one real class, collect feedback and fix what hurt the most | The pilot class reaches a usability score of 75 or more |
| 6 · Deploy and CI/CD | 1–12 | From week one, every merge is tested and deployed to a preview; the main branch deploys to production | Deploys need no manual steps |
| 7 · Documentation | 10–12 | README, teacher kit, facilitator guide and a guide for writing new scenarios | A teacher who was not involved can run a class from the docs alone |

## Milestones

| Milestone | Target | Why it matters |
|---|---|---|
| Works on eduroam | Week 2 | The biggest technical risk. If live rooms do not work on the university network, the architecture changes before any real building starts |
| Playable | Week 7 | One complete scenario can be played end to end, which makes real user testing possible |
| Pilot class | Week 10 | The first test with a full class and a teacher in charge |
| Version 1 | Week 12 | Ready for regular teaching, with the teacher kit in place |

## Quality gates

Every change to the main branch passes the same automated checks. Game rules have unit tests. A robot test plays a full class of forty simulated players through a scenario. Pages are checked for accessibility against WCAG 2.2 level AA, and every scenario text is checked for readability, aiming for a Flesch Reading Ease of 60 or more with sentences under twenty words. Page speed is measured so the game stays fast on a crowded university network.

| Check | Tool | Runs |
|---|---|---|
| Game rule tests | Vitest | Every push |
| Full class robot test | Playwright | Every pull request |
| Accessibility | axe | Every pull request |
| Readability of scenario texts | Own script | Every pull request |
| Page speed | Lighthouse | Before each release |

## Where we are

| Phase | Status |
|---|---|
| 0 · Set up the repository | Done. The repository holds the concept book, this roadmap, decision records and licences, and the concept book is published on GitHub Pages |
| 1 · Plan features | In progress. The [backlog](backlog.md) lists 45 work items, the [scenario format](scenario-format.md) is defined with a schema, and the first scenario, *Nordknit · Black Friday*, is written. Next: create the issues on GitHub with `scripts/create-issues.ps1` |
| 2 · Design and architecture | Next. Starts with the “hello room” test on eduroam — milestone M1 |

GitHub Pages publishes the `docs` folder automatically on every push that changes it, so the concept book can always be shared as a link.
