<script lang="ts">
  import { onDestroy } from "svelte";
  import { clampToMap, roomAt, spotsNear, teamById, teamRevealed, teamVisited, type Game, type Player, type Scenario, type Spot } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import { heldDirection, keyDirection, step, type Point } from "../../lib/movement";
  import CloseUp from "../../lib/CloseUp.svelte";
  import NoteForm from "../../lib/NoteForm.svelte";
  import NotesPanel from "../../lib/NotesPanel.svelte";
  import OfficeMap from "../../lib/OfficeMap.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

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

  const team = $derived(teamById(me.team!));
  const visited = $derived(teamVisited(game, me.team!));
  const here = $derived(roomAt(scenario, position.x, position.y));
  const teammates = $derived(game.players.filter((p) => p.team === me.team && p.id !== me.id));
  const nearby = $derived(spotsNear(scenario, position.x, position.y));
  const found = $derived(teamRevealed(game, me.team!));
  /** The person or thing whose close-up is open, or null while walking. */
  let open = $state<Spot | null>(null);
  /** The note form is open; `about` is who or what it is about. */
  let noting = $state<{ about: Spot | null } | null>(null);
  const roomName = (id: string | null) => scenario.map.rooms.find((r) => r.id === id)?.name ?? "Corridor";

  function tick(now: number) {
    frame = 0;
    const seconds = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    const { at, arrived } = step(position, target, heldDirection(held), seconds);
    const next = clampToMap(scenario, at.x, at.y);
    if (arrived) target = null;
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

  function walkTo(x: number, y: number) {
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
  <header>
    <span class="team" style="--team: {team.color}"><span class="door" aria-hidden="true"></span>{team.name}</span>
    <span class="where" aria-live="polite">You are in: <strong>{here?.name ?? "the corridor"}</strong></span>
    <StatusPill status={connection.status} />
  </header>

  <section class="map">
    <OfficeMap {scenario} players={game.players} you={me.id} myTeam={me.team} yourPosition={position} {visited} notes={connection.notes} near={nearby.map((n) => n.id)} onpoint={walkTo} />
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
    <p class="help">Tap or click where you want to go. On a keyboard: arrow keys or W A S D, and E to talk or look.</p>
  </section>

  <aside>
    <section class="goal">
      <p class="eyebrow">Your goal</p>
      <p>{scenario.goal}</p>
    </section>

    <section>
      <h2>Rooms <small>{visited.size} of {scenario.map.rooms.length} visited by your team</small></h2>
      <ul class="rooms">
        {#each scenario.map.rooms as room (room.id)}
          <li class:done={visited.has(room.id)} class:here={here?.id === room.id}>
            <span class="box" aria-hidden="true">{visited.has(room.id) ? "✓" : ""}</span>
            {room.name}
            {#if here?.id === room.id}<small>you are here</small>{/if}
            <span class="visually-hidden">{visited.has(room.id) ? "visited" : "not visited yet"}</span>
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
    grid-template-columns: 1fr 300px;
    grid-template-rows: auto 1fr;
    gap: 12px 20px;
    padding: 12px 16px 24px;
  }
  header {
    grid-column: 1 / -1;
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
  .rooms li {
    display: flex;
    align-items: center;
    gap: 10px;
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
  @media (max-width: 860px) {
    .walk {
      grid-template-columns: 1fr;
    }
  }
</style>
