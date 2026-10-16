<script lang="ts">
  import { onDestroy } from "svelte";
  import { RoomConnection } from "../../lib/room.svelte";
  import { latencyLabel } from "../../lib/format";
  import DeviceIcon from "../../lib/DeviceIcon.svelte";

  let { room, name }: { room: string; name: string } = $props();

  // svelte-ignore state_referenced_locally
  const connection = new RoomConnection(room, name);
  onDestroy(() => connection.close());

  const latency = $derived(latencyLabel(connection.rtt));
  const position = $derived(connection.people.findIndex((p) => p.id === connection.you) + 1);
</script>

<main class="student">
  <header>
    <span class="brand">Open Door · Network test</span>
    <span class="status {connection.status}" role="status">
      {#if connection.status === "connected"}Connected{:else if connection.status === "reconnecting"}Reconnecting…{:else}Connecting…{/if}
    </span>
  </header>

  <section class="hero" aria-live="polite">
    <p class="label">Hi {name}. Devices in this room</p>
    <p class="count">{connection.people.length}</p>
    {#if position > 0}<p class="sub">You joined as number {position}.</p>{/if}
  </section>

  <section class="stats">
    <div class="stat">
      <span class="k">Your connection</span>
      <span class="v tone-{latency.tone}">{latency.text}</span>
    </div>
    <div class="stat">
      <span class="k">Reconnects</span>
      <span class="v">{connection.reconnects}</span>
    </div>
  </section>

  <section class="people">
    <h2>Everyone here</h2>
    <ul>
      {#each connection.people as person (person.id)}
        <li class:you={person.id === connection.you}>
          <DeviceIcon device={person.device} />
          <span class="name">{person.name}{person.id === connection.you ? " (you)" : ""}</span>
          <span class="rtt">{person.rtt === null ? "…" : `${person.rtt} ms`}</span>
        </li>
      {/each}
    </ul>
  </section>

  <p class="note">Please keep this page open until your teacher says the test is done.</p>
</main>

<style>
  .student {
    max-width: 640px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .brand {
    font-family: var(--font-display);
    font-weight: 700;
  }
  .status {
    padding: 6px 12px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    background: #fff4c7;
    color: #7a5b0a;
  }
  .status.connected {
    background: #e2f3ec;
    color: var(--safe-dark);
  }
  .status.reconnecting {
    background: #fde3dd;
    color: var(--alert-dark);
  }
  .hero {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 24px;
    text-align: center;
  }
  .hero p {
    margin: 0;
  }
  .label {
    color: var(--slate);
    font-weight: 600;
  }
  .count {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 96px;
    line-height: 1;
    color: var(--blue);
  }
  .sub {
    color: var(--slate);
    font-size: 14px;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .stat {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .k {
    font-size: 13px;
    color: var(--slate);
  }
  .v {
    font-size: 20px;
    font-weight: 700;
  }
  .tone-good {
    color: var(--safe-dark);
  }
  .tone-ok {
    color: var(--blue-dark);
  }
  .tone-slow {
    color: var(--alert-dark);
  }
  .tone-none {
    color: var(--slate);
  }
  .people {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 18px;
  }
  h2 {
    font-size: 20px;
    margin-bottom: 10px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 4px;
    border-bottom: 1px solid var(--mist);
    color: var(--slate);
  }
  li.you {
    color: var(--blue-dark);
    font-weight: 700;
  }
  .name {
    flex-grow: 1;
    color: var(--ink);
  }
  li.you .name {
    color: var(--blue-dark);
  }
  .rtt {
    font-variant-numeric: tabular-nums;
    font-size: 14px;
  }
  .note {
    margin: 0;
    font-size: 14px;
    color: var(--slate);
    text-align: center;
  }
</style>
