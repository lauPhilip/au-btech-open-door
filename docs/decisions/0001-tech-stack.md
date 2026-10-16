# 0001 · Tech stack

**Status:** proposed · **Date:** 2026-10-16 · **Changed by:** [0003](0003-svg-office-map.md) — the office is drawn with SVG instead of PixiJS

## Context

Open Door runs in a classroom where every student is on their own laptop or phone, connected to eduroam. Eduroam firewall rules are set by each university and are often strict; some block outgoing UDP traffic entirely, which rules out peer-to-peer connections such as WebRTC. The game must stay free or very cheap to run, use open-source tools, keep almost no personal data, and be maintainable by a small team at the department.

## Decision

The whole game is written in **TypeScript**, so the same game rules run in the browser and on the server. Screens are built with **Svelte**, and the walkable top-down office is drawn with **PixiJS**. Both are open source under the MIT licence.

Live play happens in a **session room**: one small server-side object per class that holds player positions, sticky notes and the clock. All traffic uses normal HTTPS and secure WebSockets on port 443, which eduroam networks allow. The first choice for hosting the room is a Cloudflare Durable Object through PartyServer on the free tier. The game rules are kept independent of the hosting, so the same room can later run on an Aarhus University server with Node.js if needed.

Scenarios — companies, rooms, characters, clues — are plain text files in the repository, so a teacher can add or change a scenario without touching code.

## What follows

The first technical milestone is a small test in a real classroom on eduroam: thirty devices joining one room at the same time. If that fails, this decision is revisited before building the rest. Personal data stays limited to nicknames, which are deleted when the session room closes a few hours after class.
