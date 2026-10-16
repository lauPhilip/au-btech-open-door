# 0003 · Draw the office with SVG, not PixiJS

**Status:** accepted · **Date:** 2026-10-17 · **Changes:** the drawing part of [decision 0001](0001-tech-stack.md)

## Context

Decision 0001 chose PixiJS, a WebGL drawing library, for the walkable top-down office. When the walk view was built in milestone M2, the office turned out to be much simpler than a typical game scene: nine rooms drawn as rectangles from the scenario file, six people, and up to thirty players moving at ten updates a second. The rest of the screen — room names, the checklist, the goal, later the close-ups and sticky notes — is ordinary interface that Svelte already draws well.

## Decision

The office map is drawn as **SVG inside Svelte** (`app/src/lib/OfficeMap.svelte`). The scenario's map units become the SVG `viewBox`, so the map scales to any screen, from a phone to the projector, without extra code. Players are SVG groups moved with a short CSS transition, which smooths the ten-a-second updates. A tap or click is turned into map units with the SVG's own coordinate transform. PixiJS is not added to the project.

## Why

SVG keeps everything in one technology, so room names, ticks and avatars are real text and elements that screen readers, browser zoom, `Ctrl+F` and Playwright tests can see. It needs no WebGL, which some older university laptops and power-saving modes switch off, and it adds nothing to the download (PixiJS would add several hundred kilobytes). At this size the browser draws the SVG easily: a simulated class of thirty walking at once stays smooth.

## What follows

If later scenarios need much richer scenes — animated machines, lighting, hundreds of moving objects — this decision is revisited, and the map component can be swapped for a canvas without changing the rest of the app. The first likely limit is not drawing speed but the lack of walls: players can currently walk straight through rooms, so doors and walls should be added to the scenario format before the map grows.
