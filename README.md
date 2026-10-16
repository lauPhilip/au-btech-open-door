# Open Door

**Walk the office, spot the risks: an open-source classroom game for interactive learning of threat modelling.**

Open Door is a browser game for teams of three to five students. Each team walks through a top-down office of a fictional company, talks to the people who work there, and leaves sticky notes wherever something could go wrong. Then a scenario plays out — the webshop goes down on Black Friday, malware arrives on a USB stick, a fake invoice lands in accounting — and the class compares which team saw it coming.

Behind the play sits the CyPro method from the [Digital Business Development toolbox](https://dbd.au.dk/p/toolbox) at Aarhus University: context establishment, system modelling, assets, threat identification and threat analysis. Students practise the method first and learn its names in the debrief. The game is being designed for the MSc in Engineering, Technology-Based Business Development, at Aarhus University in Herning, and runs in any browser on the university network (eduroam) without accounts or logins.

> **Status:** concept stage. The design is captured in the concept book; development has not started yet.

## What is in this repository

| Path | What it is |
|---|---|
| [`docs/concept-book/`](docs/concept-book/index.html) | The concept book: target group, journey, core loop, UX rules, design system, assets, mockups, teacher kit and architecture — 15 boards in one HTML page |
| [`docs/roadmap.md`](docs/roadmap.md) | The development roadmap, from repository setup to version 1 |
| [`docs/decisions/`](docs/decisions/) | Short records of the main decisions and why they were made |
| [`docs/README.md`](docs/README.md) | An index of all documentation |

To read the concept book, open `docs/concept-book/index.html` in a browser, or visit the published version once GitHub Pages is turned on: `https://lauphilip.github.io/au-btech-open-door/`.

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
