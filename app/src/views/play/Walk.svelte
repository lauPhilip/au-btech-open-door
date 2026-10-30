<script lang="ts">
  import { onDestroy } from "svelte";
  import { clampToMap, dayMinute, eventsBy, formatLeft, isPaused, leftMs, roomAt, route, slide, spots, spotsNear, teamById, teamClues, teamRevealed, teamVisited, type Game, type Player, type Scenario, type Spot } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import { heldDirection, keyDirection, step, type Point } from "../../lib/movement";
  import CloseUp from "../../lib/CloseUp.svelte";
  import RoomScene from "../../lib/RoomScene.svelte";
  import NoteForm from "../../lib/NoteForm.svelte";
  import OfficeMap from "../../lib/OfficeMap.svelte";
  import WalkControls from "./WalkControls.svelte";
  import WalkHeader from "./WalkHeader.svelte";
  import WalkSide from "./WalkSide.svelte";
  import { Ticker } from "../../lib/ticker.svelte";

  let { connection, game, scenario, me }: { connection: GameConnection; game: Game; scenario: Scenario; me: Player } = $props();

  /** Moves are sent at most this often while walking. */
  const SEND_EVERY_MS = 100;

  // Your own position is simulated here so walking feels instant; the room gets updates.
  // svelte-ignore state_referenced_locally
  let position = $state<Point>({ x: me.x, y: me.y });
  let target: Point | null = null;
  /** The rest of the way: through doors, never through walls. */
  let rest: Point[] = [];
  const held = new Set<string>();
  let lastSent = 0;
  // svelte-ignore state_referenced_locally
  let sentPosition: Point = $state.snapshot(position);
  let frame = 0;
  let lastFrame = 0;

  // The room's clock, so the countdown and the game clock match on every device.
  // svelte-ignore state_referenced_locally
  const ticker = new Ticker(() => connection.now());
  onDestroy(() => ticker.stop());

  const isDay = $derived(game.phase === "day");
  const paused = $derived(game.timer ? isPaused(game.timer) : false);
  const left = $derived(game.timer ? leftMs(game.timer, ticker.now) : 0);
  const minute = $derived(dayMinute(scenario, game, ticker.now));
  const messages = $derived(isDay ? eventsBy(scenario, minute) : []);
  const cluesFound = $derived(teamClues(game, me.team!));
  /** Rooms where this team has found a clue, drawn with a magnifier on the map. */
  const clueRooms = $derived(cluesFound.map((i) => scenario.day.clues[i]?.room).filter((r): r is string => !!r));

  const team = $derived(teamById(me.team!));
  const visited = $derived(teamVisited(game, me.team!));
  const here = $derived(roomAt(scenario, position.x, position.y));
  const teammates = $derived(game.players.filter((p) => p.team === me.team && p.id !== me.id));
  const nearby = $derived(spotsNear(scenario, position.x, position.y));
  const found = $derived(teamRevealed(game, me.team!));
  /** The person or thing whose close-up is open, or null while walking. */
  let open = $state<Spot | null>(null);
  /** Top-down map, or the inside of the room you stand in. Both show the same people and things. */
  let view = $state<"map" | "room">(typeof matchMedia !== "undefined" && matchMedia("(max-width: 700px)").matches ? "room" : "map");
  /** A person or thing the player tapped in the room view; the close-up opens when the avatar gets there. */
  let pendingOpen: Spot | null = null;
  const teammatesHere = $derived(game.players.filter((p) => p.team === me.team && p.id !== me.id && p.room === here?.id));
  /** The note form is open; `about` is who or what it is about. */
  let noting = $state<{ about: Spot | null } | null>(null);

  function tick(now: number) {
    frame = 0;
    const seconds = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    const keys = heldDirection(held);
    const { at: free, arrived: reached } = step(position, target, keys, seconds);
    // Keys cannot push through walls; a route already goes through the doors.
    const at = keys.dx !== 0 || keys.dy !== 0 ? slide(scenario, position, free) : free;
    const next = clampToMap(scenario, at.x, at.y);
    let arrived = reached;
    if (reached && rest.length) {
      target = rest.shift()!;
      arrived = false;
    }
    if (arrived) {
      target = null;
      if (pendingOpen) {
        const spot = pendingOpen;
        pendingOpen = null;
        openCloseUp(spot);
      }
    }
    if (next.x !== position.x || next.y !== position.y) position = next;
    const changed = position.x !== sentPosition.x || position.y !== sentPosition.y;
    const moving = target !== null || held.size > 0;
    // Send while walking, and once more when you stop, so everyone sees where you ended.
    if (changed && (now - lastSent >= SEND_EVERY_MS || !moving)) {
      connection.move(position.x, position.y);
      sentPosition = { ...position };
      lastSent = now;
    }
    if (moving || changed) frame = requestAnimationFrame(tick);
    else lastFrame = 0;
  }

  function wake() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  /** Where each room's people and things are, for the room list. */
  const spotsByRoom = $derived.by(() => {
    const byRoom = new Map<string, Spot[]>();
    for (const spot of spots(scenario)) byRoom.set(spot.room, [...(byRoom.get(spot.room) ?? []), spot]);
    return byRoom;
  });

  /** The keyboard and screen-reader route: walk to the middle of a room. */
  function walkToRoom(roomId: string) {
    const room = scenario.map.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const [x, y, w, h] = room.rect;
    walkTo(x + w / 2, y + h / 2);
  }

  /** Walk to just below a person or thing, close enough to talk or look. */
  function walkToSpot(spot: Spot) {
    walkTo(spot.x, spot.y + 40);
  }

  /** Tapped in the room view: open at once if close enough, else walk there first. */
  function goToSpot(spot: Spot) {
    if (nearby.some((n) => n.kind === spot.kind && n.id === spot.id)) {
      openCloseUp(spot);
      return;
    }
    walkToSpot(spot);
    pendingOpen = spot;
  }

  function walkTo(x: number, y: number) {
    pendingOpen = null;
    const goal = clampToMap(scenario, x, y);
    const path = route(scenario, position, goal);
    target = path[0] ?? goal;
    rest = path.slice(1);
    wake();
  }

  function openCloseUp(spot: Spot) {
    // Stop walking while the window is open, so the avatar does not drift away.
    held.clear();
    target = null;
    rest = [];
    open = spot;
  }

  function closeCloseUp() {
    open = null;
  }

  function startNote(about: Spot | null) {
    held.clear();
    target = null;
    rest = [];
    open = null;
    noting = { about };
  }

  function keydown(event: KeyboardEvent) {
    if (open || noting) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey && !event.altKey && nearby[0]) {
      event.preventDefault();
      openCloseUp(nearby[0]);
      return;
    }
    if (!keyDirection(event.key) || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    held.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    target = null;
    rest = [];
    wake();
  }

  function keyup(event: KeyboardEvent) {
    held.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function blur() {
    held.clear();
  }

  onDestroy(() => cancelAnimationFrame(frame));
</script>

<svelte:window onkeydown={keydown} onkeyup={keyup} onblur={blur} />

<main class="walk">
  <WalkHeader {connection} {game} {scenario} {me} {here} {left} {paused} {minute} {messages} {cluesFound} />

  <section class="map">
    <div class="views" role="group" aria-label="View">
      <button aria-pressed={view === "map"} onclick={() => (view = "map")}>Map</button>
      <button aria-pressed={view === "room"} onclick={() => (view = "room")}>Room view</button>
    </div>
    <div class="stage">
    {#if view === "map"}
      <OfficeMap {scenario} players={game.players} you={me.id} myTeam={me.team} yourPosition={position} {visited} {clueRooms} notes={connection.notes} near={nearby.map((n) => n.id)} onpoint={walkTo} />
    {:else}
      <RoomScene {scenario} roomId={here?.id ?? null} others={teammatesHere} you={{ face: me.face, color: teamById(me.team!).color, name: me.name }} {position} onspot={goToSpot} onroom={walkToRoom} onwalk={walkTo} />
    {/if}
    </div>
    <WalkControls {view} {nearby} onopen={openCloseUp} onnote={startNote} />
  </section>

  <WalkSide {connection} {game} {scenario} {me} {here} {visited} {found} {teammates} {spotsByRoom} {messages} {cluesFound} onroom={walkToRoom} onspot={walkToSpot} />
</main>

{#if paused}
  <div class="paused" role="alertdialog" aria-modal="true" aria-label="Paused">
    <div><p class="big">Paused</p><p>Your teacher paused the game. Take a breath. It starts again soon.</p></div>
  </div>
{/if}

{#if open}
  <CloseUp {scenario} spot={open} onask={(person, topic) => connection.ask(person, topic)} onnote={startNote} onclose={closeCloseUp} />
{/if}
{#if noting}
  <NoteForm about={noting.about?.id ?? null} aboutName={noting.about?.name ?? null} onsubmit={(input) => connection.addNote(input)} onclose={() => (noting = null)} />
{/if}

<style>
  .walk {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    grid-template-rows: auto 1fr;
    max-width: var(--page);
    margin: 0 auto;
    gap: 12px 20px;
    padding: 12px 16px 24px;
  }
  .paused {
    position: fixed;
    inset: 0;
    z-index: var(--z-overlay);
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
    background: var(--scrim);
    color: #fff;
  }
  .paused .big {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 700;
    margin: 0;
  }
  .map {
    min-width: 0;
  }
  @media (min-width: 1500px) {
    .walk {
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 16px 28px;
    }
  }
  @media (max-width: 860px) {
    .walk {
      grid-template-columns: 1fr;
    }
  }
  /* Laptops and big screens: the whole game fits the window. The picture takes whatever height is left
     (it never grows past it), the side panel scrolls by itself, and the page itself does not scroll. */
  @media (min-width: 861px) and (min-height: 600px) {
    .walk {
      height: 100dvh;
      overflow: hidden;
      grid-template-rows: auto minmax(0, 1fr);
      padding-bottom: var(--space-3);
    }
    .map {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr) auto auto;
      gap: var(--space-2) var(--space-3);
      min-height: 0;
    }
    .stage {
      grid-column: 1 / -1;
      grid-row: 1;
      min-height: 0;
      container-type: size;
      overflow: auto;
      display: grid;
      place-items: center;
      /* The widest the picture may be so that it still fits the height: map 1206 by 770, room 800 by 450 plus its door list. */
      --fit-map: calc(100cqh * 1.566);
      --fit-room: calc((100cqh - 56px) * 1.7778);
    }
    .stage > :global(*) {
      width: 100%;
    }
    .views {
      grid-column: 1;
      grid-row: 2;
      margin: 0;
    }
  }
  .views {
    display: inline-flex;
    gap: 0;
    margin-bottom: 8px;
    border: 2px solid var(--line);
    border-radius: 999px;
    overflow: hidden;
    background: var(--paper);
  }
  .views button {
    min-height: 44px;
    padding: 0 18px;
    border: none;
    background: transparent;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    color: var(--ink);
  }
  .views button[aria-pressed="true"] {
    background: var(--blue);
    color: #fff;
  }
</style>
