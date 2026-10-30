# Improvement roadmap

After the first complete version, an audit of the teacher and student experience produced fifteen improvements, tracked as GitHub issues #88 to #102. This page puts them in order. The order follows one idea: protect the public deployment and the class first, then help the teacher, then help the student, and only then widen the reach.

## Iterations

| Iteration | Goal | Issues | Done when |
|---|---|---|---|
| R1 · Safe and recoverable | A bot cannot burn the free quota, and a lost laptop does not end a class | #92 threat model, #89 rate limits, #91 hardening, #88 teacher resume, #90 remove or rename a student | The public Worker has limits and headers, and a teacher can continue from a second device |
| R2 · Guided teacher | A first-time teacher always knows the next step and cannot cut students off by accident | #93 "what to do now" strip, #94 confirm before moving on, #95 class record download | A teacher who has never used the game runs a class without asking for help |
| R3 · Welcoming student | A student who has never seen the game knows what to do in the first minute and trusts that their work is saved | #102 split the walk screen first, then #96 how-to overlay, #97 connection state, #98 lasting errors, #99 late joiners, #100 result recap | A hallway test with five new students needs no spoken instructions |
| R4 · Wider reach | Danish interface text | #101 | Join, table pick, walk, teacher strip and finish screens work in both languages |

The walk-screen split (#102) is listed under R4 on GitHub but is scheduled at the start of R3, because three of the student features would otherwise make a 740-line file larger.

## Why this order

The threat model comes first because it decides which limits are worth building. Rate limits and hardening come before any new feature, since the game is already public at its live address. Teacher resume closes the worst failure a teacher can meet during a lesson. The guidance features follow, because a teacher who is lost affects thirty students at once, while a lost student affects one.

## Working rules

Each issue is one small pull request with tests, merged into main by Claude, with the branch deleted afterwards. Commits touch at most three files and start with a tag such as `(feature):` or `(fix):`. The unit tests, the browser tests and the layout check at six screen sizes must stay green. Parked items stay parked: student faces in map dots, the cover picture, walking along room edges and a class size above 30.

## Still needs people

A real class with a teacher (the pilot), the hallway test with five students, and the Pages setting on GitHub remain human tasks. They are tracked in the older issues and are not part of this roadmap.
