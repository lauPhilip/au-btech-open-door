<script lang="ts">
  import { onDestroy } from "svelte";
  import { clampToMap, dayMinute, eventsBy, formatLeft, isPaused, leftMs, roomAt, spots, spotsNear, teamById, teamClues, teamRevealed, teamVisited, type Game, type Player, type Scenario, type Spot } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import { heldDirection, keyDirection, step, type Point } from "../../lib/movement";
  import Chat from "../../lib/Chat.svelte";
  import ClueList from "../../lib/ClueList.svelte";
  import CloseUp from "../../lib/CloseUp.svelte";
  import DayBar from "../../lib/DayBar.svelte";
  import RoomScene from "../../lib/RoomScene.svelte";
  import NoteForm from "../../lib/NoteForm.svelte";
  import NotesPanel from "../../lib/NotesPanel.svelte";
  import OfficeMap from "../../lib/OfficeMap.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";
  import { Ticker } from "../../lib/ticker.svelte";

  let { connection, game, scenario, me }: { connection: GameConnection; game: Game; scenario: Scenario; me: Player } = $props();

  /** Moves are sent at most this often while walking. */
  const SEND_EVERY_MS = 100;

  // Your own position is simulated here so walking feels instant; the room gets updates.
  // svelte-ignore state_referenced_locally
  let position = $state<Point>({ x: me.x, y: me.y });
  let target: Point | null = null;
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
  /** The teacher's latest hint for this team, until the student closes it. */
  const hint = $derived(game.hints?.[me.team!]);
  let closedHint = $state(0);
  const visited = $derived(teamVisited(game, me.team!));
  const here = $derived(roomAt(scenario, position.x, position.y));
  const teammates = $derived(game.players.filter((p) => p.team === me.team && p.id !== me.id));
  const nearby = $derived(spotsNear(scenario, position.x, position.y));
  const found = $derived(teamRevealed(game, me.team!));
  /** The person or thing whose close-up is open, or null while walking. */
  let open = $state<Spot | null>(null);
  /** Top-down map, or the inside of the room you stand in. Both show the same people and things. */
  let view = $state<"map" | "room">("map");
  /** A person or thing the player tapped in the room view; the close-up opens when the avatar gets there. */
  let pendingOpen: Spot | null = null;
  const teammatesHere = $derived(game.players.filter((p) => p.team === me.team && p.id !== me.id && p.room === here?.id));
  /** The note form is open; `about` is who or what it is about. */
  let noting = $state<{ about: Spot | null } | null>(null);
  const roomName = (id: string | null) => scenario.map.rooms.find((r) => r.id === id)?.name ?? "Corridor";

  function tick(now: number) {
    frame = 0;
    const seconds = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    const { at, arrived } = step(position, target, heldDirection(held), seconds);
    const next = clampToMap(scenario, at.x, at.y);
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
    target = clampToMap(scenario, x, y);
    wake();
  }

  function openCloseUp(spot: Spot) {
    // Stop walking while the window is open, so the avatar does not drift away.
    held.clear();
    target = null;
    open = spot;
  }

  function closeCloseUp() {
    open = null;
  }

  function startNote(about: Spot | null) {
    held.clear();
    target = null;
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
  <div class="top">
    <header>
      <span class="team" style="--team: {team.color}"><span class="door" aria-hidden="true"></span>{team.name}</span>
      <span class="where" aria-live="polite">You are in: <strong>{here?.name ?? "the corridor"}</strong></span>
      {#if game.phase === "walk" && game.timer}
        <span class="left" class:over={left === 0} role="timer">{left === 0 ? "Time is up" : `Walk and spot · ${formatLeft(left)} left`}</span>
      {/if}
      <StatusPill status={connection.status} />
    </header>
    {#if isDay}
      <DayBar {scenario} {minute} found={cluesFound.length} total={scenario.day.clues.length} latest={messages.at(-1) ? { from: scenario.people.find((p) => p.id === messages.at(-1)!.from)?.name ?? "", text: messages.at(-1)!.text } : undefined} />
    {/if}
    {#if hint && hint.at !== closedHint}
      <div class="hint" role="status">
        <span><strong>Hint from your teacher:</strong> {hint.text}</span>
        <button class="close" aria-label="Close the hint" onclick={() => (closedHint = hint.at)}>×</button>
      </div>
    {/if}
    {#if game.phase === "walk" && left === 0 && !paused}
      <p class="timeup" role="status">Time is up. Finish your note and wait for your teacher to start the day.</p>
    {/if}
  </div>

  <section class="map">
    <div class="views" role="group" aria-label="View">
      <button aria-pressed={view === "map"} onclick={() => (view = "map")}>Map</button>
      <button aria-pressed={view === "room"} onclick={() => (view = "room")}>Room view</button>
    </div>
    {#if view === "map"}
      <OfficeMap {scenario} players={game.players} you={me.id} myTeam={me.team} yourPosition={position} {visited} {clueRooms} notes={connection.notes} near={nearby.map((n) => n.id)} onpoint={walkTo} />
    {:else}
      <RoomScene {scenario} roomId={here?.id ?? null} others={teammatesHere} onspot={goToSpot} onroom={walkToRoom} />
    {/if}
    <div class="prompt" aria-live="polite">
      {#if nearby.length > 0}
        {#each nearby as spot (spot.kind + spot.id)}
          <button class="action" onclick={() => openCloseUp(spot)}>
            {spot.kind === "person" ? "Talk to" : "Look at"} {spot.name}
            {#if spot === nearby[0]}<kbd>E</kbd>{/if}
          </button>
        {/each}
      {:else}
        <span class="quiet">Walk up to a person or a thing to talk or look closer.</span>
      {/if}
      <button class="action sticky" onclick={() => startNote(nearby[0] ?? null)}>Sticky note</button>
    </div>
    <p class="help">{view === "map" ? "Tap or click where you want to go." : "Tap a person or a thing, or a door to walk there."} On a keyboard: arrow keys or W A S D, and E to talk or look.</p>
  </section>

  <aside>
    {#if isDay}
      <section><Chat {scenario} events={messages} /></section>
      <section><ClueList {scenario} found={cluesFound} /></section>
    {/if}
    <section class="goal">
      <p class="eyebrow">Your goal</p>
      <p>{scenario.goal}</p>
    </section>

    <section>
      <h2>Rooms <small>{visited.size} of {scenario.map.rooms.length} visited by your team</small></h2>
      <ul class="rooms">
        {#each scenario.map.rooms as room (room.id)}
          <li class:done={visited.has(room.id)} class:here={here?.id === room.id}>
            <button class="room" onclick={() => walkToRoom(room.id)} aria-label="Walk to {room.name}, {visited.has(room.id) ? 'visited' : 'not visited yet'}{here?.id === room.id ? ', you are here' : ''}">
              <span class="box" aria-hidden="true">{visited.has(room.id) ? "✓" : ""}</span>
              {room.name}
              {#if here?.id === room.id}<small aria-hidden="true">you are here</small>{/if}
            </button>
            {#if spotsByRoom.get(room.id)}
              <ul class="in-room">
                {#each spotsByRoom.get(room.id) ?? [] as spot (spot.kind + spot.id)}
                  <li><button class="spot" onclick={() => walkToSpot(spot)} aria-label="Walk to {spot.name}">{spot.name}</button></li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <NotesPanel
      notes={connection.notes}
      players={game.players}
      me={me.id}
      onshare={(id, shared) => connection.shareNote(id, shared)}
      onmerge={(keep, drop) => connection.mergeNotes(keep, drop)}
      ondelete={(id) => connection.removeNote(id)}
    />

    <section>
      <h2>Worth protecting <small>{found.length} of {scenario.assets.length} found by your team</small></h2>
      {#if found.length > 0}
        <ul class="found">
          {#each found as id (id)}
            <li>{scenario.assets.find((a) => a.id === id)?.name ?? id}</li>
          {/each}
        </ul>
      {:else}
        <p class="empty">Ask people questions to find out what data this company depends on.</p>
      {/if}
    </section>

    {#if teammates.length > 0}
      <section>
        <h2>Your team</h2>
        <ul class="mates">
          {#each teammates as p (p.id)}
            <li class:offline={!p.online}><strong>{p.name}</strong> <small>{p.online ? roomName(p.room) : "offline"}</small></li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if connection.error}<p class="warn" role="alert">{connection.error}</p>{/if}
  </aside>
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
    max-width: 1700px;
    margin: 0 auto;
    gap: 12px 20px;
    padding: 12px 16px 24px;
  }
  .top {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .left {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .left.over,
  .timeup {
    color: var(--alert-dark);
  }
  .timeup {
    margin: 0;
    font-weight: 600;
  }
  .paused {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
    background: rgb(28 36 48 / 0.8);
    color: #fff;
  }
  .paused .big {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 700;
    margin: 0;
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .team {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 20px;
  }
  .door {
    width: 14px;
    height: 22px;
    border-radius: 3px;
    background: var(--team);
  }
  .where {
    flex: 1;
    color: var(--slate);
  }
  .where strong {
    color: var(--ink);
  }
  .map {
    min-width: 0;
  }
  .prompt {
    margin-top: 10px;
    min-height: 52px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .quiet,
  .empty {
    color: var(--slate);
    font-size: 14px;
    margin: 6px 0 0;
  }
  .action {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 8px 16px;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--blue);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
  .action.sticky {
    background: var(--sticky);
    color: var(--ink);
  }
  .action.sticky:hover {
    background: #f5d450;
  }
  .action:hover {
    background: var(--blue-dark);
  }
  kbd {
    font: inherit;
    font-size: 13px;
    padding: 0 7px;
    border-radius: 6px;
    background: rgb(255 255 255 / 0.25);
  }
  .found {
    margin-top: 8px;
  }
  .found li::before {
    content: "✓ ";
    color: var(--safe);
    font-weight: 700;
  }
  .help {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--slate);
  }
  aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  aside section {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 14px 16px;
  }
  .goal {
    border-left: 6px solid var(--sticky);
  }
  .goal p:last-child {
    margin: 2px 0 0;
    font-weight: 600;
  }
  .eyebrow {
    margin: 0;
    color: var(--slate);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  h2 {
    font-size: 18px;
    display: flex;
    flex-direction: column;
  }
  h2 small {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 13px;
    color: var(--slate);
  }
  ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rooms > li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .room {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 4px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .room:hover,
  .spot:hover {
    background: var(--blue-soft);
  }
  .here .room {
    font-weight: 700;
  }
  .in-room {
    margin: 0 0 4px 38px;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }
  .spot {
    min-height: 44px;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--paper);
    color: var(--blue-dark);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .rooms small {
    margin-left: auto;
    color: var(--blue);
    font-weight: 600;
  }
  .box {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid var(--line);
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }
  .done .box {
    background: var(--safe);
    border-color: var(--safe);
  }
  .here {
    font-weight: 700;
  }
  .mates li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .mates small {
    color: var(--slate);
  }
  .mates .offline {
    opacity: 0.55;
  }
  .warn {
    color: var(--alert-dark);
    margin: 0;
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
  .hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #ffe27a;
    color: var(--ink);
    border-radius: var(--radius-m);
    padding: 10px 14px;
    font-size: 18px;
  }
  .hint .close {
    min-width: 44px;
    min-height: 44px;
    font-size: 26px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--ink);
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
