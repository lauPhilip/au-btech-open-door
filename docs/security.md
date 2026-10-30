# Security and privacy

Open Door teaches threat modelling, so it is fair to threat model Open Door itself. This page does that in the same steps as the game: the system, what is worth protecting, what can go wrong, and what was decided. It is short on purpose. A teacher should be able to read it before a class and know what the game stores and what it does not.

## What the game stores

A session stores a nickname and a face number for each student, where each student stands, which table they sit at, their sticky notes and their vote. It also stores one random teacher key. There are no accounts, no email addresses and no tracking. Everything about a session is deleted when the teacher presses *End the session*, and in any case six hours after the session was created. A student's browser also remembers their nickname, face and a random player id for that session code, so a reload brings them back as themselves.

## The system

Students and the teacher use a web page served from one Cloudflare Worker. The page opens a live connection (a WebSocket) to one room per session code. The room is a Durable Object that holds the game and applies the rules. The projector is a page that watches the same room and cannot change it.

## Assets worth protecting

| Asset | Why it matters |
|---|---|
| The teacher key | Whoever holds it controls the class |
| Availability during a lesson | Thirty students waiting for a broken game is the worst outcome |
| The free-plan quota | If a bot uses it up, real classes are blocked |
| Student nicknames and notes | Small amounts of personal data that should not leak or be rewritten |

## Threats and decisions

| Threat | What was decided | Where |
|---|---|---|
| Someone floods session creation to use up the quota | Mitigated: limits per address per minute and per hour, plus a shared Cloudflare limit | #89 |
| Someone guesses session codes to join or watch a class | Mitigated: lookups and failed lookups are limited per address. A code is 4 of 31 characters and a session lives at most six hours. Students can see only what the game shows them, and cannot use teacher actions | #89 |
| One client floods a room with messages | Mitigated: each connection may send 40 messages a second, extra ones are dropped and a connection that keeps flooding is closed. Messages over 512 characters are ignored | #91 |
| A page on another site opens connections to rooms | Mitigated: connections whose browser Origin names another site are refused | #91 |
| A student sends a harmful nickname or note | Mitigated against scripts: all text is shown as text, never as HTML. Names and notes are length limited and cleaned. Offensive words are not filtered, so the teacher can remove or rename a student | #90 |
| A student acts as the teacher | Mitigated: teacher actions are rejected unless the connection carries the teacher key, which is random and 24 characters long | in place |
| The teacher key leaks or is lost with the laptop | Mitigated: the teacher link carries the key in the URL fragment, which is never sent to a server, so the teacher can continue from another device. Anyone who gets that link has teacher control, so it should be treated like a password | #88 |
| Script injection or framing from another site | Mitigated: a content security policy, no framing from other sites, and no sniffing of file types | #91 |
| Data stays after the class | Mitigated: deleted on *End the session* and after six hours | in place |
| Teachers lose the class notes when the session ends | Mitigated: the class record can be downloaded first | #95 |
| A nation-state or targeted attack | Accepted: out of scope for a classroom game with no accounts and no sensitive data | |
| The free Cloudflare plan runs out on a very large day | Accepted: the limits above make this unlikely; a paid plan is the fallback | |

## For teachers

Do not share the teacher link. Share the student link and the code only. If a stranger joins, remove them from the teacher view and end the session if needed. Because sessions are deleted afterwards, download the class record before you end it if you want to keep the notes.

## Reporting a problem

If you find a security problem, please open a private security advisory on the GitHub repository (Security tab, *Report a vulnerability*), or email the maintainer. Please do not post details in a public issue before it is fixed.
