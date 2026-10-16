<script lang="ts">
  import { onDestroy } from "svelte";
  import QRCode from "qrcode";
  import { summarise } from "@open-door/shared";
  import { RoomConnection } from "../../lib/room.svelte";
  import DeviceIcon from "../../lib/DeviceIcon.svelte";

  let { room }: { room: string } = $props();

  // svelte-ignore state_referenced_locally
  const connection = new RoomConnection(room, null);
  onDestroy(() => connection.close());

  const joinUrl = $derived(`${window.location.origin}/network-test?room=${encodeURIComponent(room)}`);
  const shortUrl = $derived(joinUrl.replace(/^https?:\/\//, ""));
  let qrSvg = $state("");
  $effect(() => {
    QRCode.toString(joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((svg) => (qrSvg = svg));
  });

  const startedAt = Date.now();
  let peak = $state(0);
  $effect(() => {
    if (connection.people.length > peak) peak = connection.people.length;
  });

  const summary = $derived(summarise(connection.people.map((p) => p.rtt), connection.people.map((p) => p.reconnects)));

  let copied = $state(false);

  function resultText(): string {
    const s = summary;
    const minutes = Math.round((Date.now() - startedAt) / 60000);
    return [
      `Open Door network test — room "${room}"`,
      `Time: ${new Date().toLocaleString()}`,
      `Running for: ${minutes} min`,
      `Devices now: ${s.people} (peak ${peak})`,
      `Median round trip: ${s.medianRtt ?? "–"} ms`,
      `95th percentile: ${s.p95Rtt ?? "–"} ms`,
      `Slowest: ${s.maxRtt ?? "–"} ms`,
      `Devices under 400 ms: ${s.under400} of ${s.people}`,
      `Reconnects in total: ${s.reconnects}`,
      `Devices: ${deviceCounts()}`,
    ].join("\n");
  }

  function deviceCounts(): string {
    const counts: Record<string, number> = {};
    for (const p of connection.people) counts[p.device] = (counts[p.device] ?? 0) + 1;
    return Object.entries(counts).map(([device, n]) => `${n} ${device}${n === 1 ? "" : "s"}`).join(", ") || "none";
  }

  async function copyResults() {
    try {
      await navigator.clipboard.writeText(resultText());
      copied = true;
      setTimeout(() => (copied = false), 2500);
    } catch {
      window.prompt("Copy the results:", resultText());
    }
  }
</script>

<main class="projector">
  <section class="left">
    <p class="eyebrow">Open Door · Network test</p>
    <h1>Join on your phone or laptop</h1>
    <div class="join">
      <div class="qr" aria-hidden="true">{@html qrSvg}</div>
      <div class="url">
        <span>Scan the code, or go to</span>
        <strong>{shortUrl}</strong>
      </div>
    </div>
    <div class="summary">
      <div class="stat"><span class="k">Median round trip</span><span class="v">{summary.medianRtt ?? "–"} <small>ms</small></span></div>
      <div class="stat"><span class="k">Slowest 5%</span><span class="v">{summary.p95Rtt ?? "–"} <small>ms</small></span></div>
      <div class="stat"><span class="k">Under 400 ms</span><span class="v">{summary.under400} <small>of {summary.people}</small></span></div>
      <div class="stat"><span class="k">Reconnects</span><span class="v">{summary.reconnects}</span></div>
    </div>
    <div class="actions">
      <button type="button" onclick={copyResults}>{copied ? "Copied" : "Copy results"}</button>
      <span class="status {connection.status}" role="status">{connection.status === "connected" ? "Live" : "Reconnecting…"}</span>
    </div>
  </section>

  <section class="right" aria-live="polite">
    <div class="countrow">
      <span class="count">{connection.people.length}</span>
      <span class="countlabel">devices connected<br /><small>peak {peak}</small></span>
    </div>
    <ul>
      {#each connection.people as person (person.id)}
        <li class:slow={person.rtt !== null && person.rtt >= 400}>
          <DeviceIcon device={person.device} size={22} />
          <span class="name">{person.name}</span>
          <span class="rtt">{person.rtt === null ? "…" : person.rtt}</span>
        </li>
      {/each}
    </ul>
  </section>
</main>

<style>
  .projector {
    min-height: 100dvh;
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: 32px;
    padding: 32px 48px;
  }
  @media (max-width: 900px) {
    .projector {
      grid-template-columns: 1fr;
      padding: 16px;
    }
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .eyebrow {
    margin: 0;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--blue);
    text-transform: uppercase;
    font-size: 16px;
  }
  h1 {
    font-size: clamp(30px, 3.4vw, 50px);
  }
  .join {
    display: flex;
    gap: 24px;
    align-items: center;
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 20px;
    flex-wrap: wrap;
  }
  .qr {
    width: 190px;
    height: 190px;
    flex-shrink: 0;
  }
  .qr :global(svg) {
    width: 100%;
    height: 100%;
  }
  .url {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 20px;
    color: var(--slate);
    min-width: 0;
  }
  .url strong {
    font-family: var(--font-display);
    font-size: clamp(22px, 2.4vw, 34px);
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .stat {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
  }
  .k {
    font-size: 16px;
    color: var(--slate);
  }
  .v {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 700;
  }
  .v small {
    font-size: 18px;
    color: var(--slate);
  }
  .actions {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  button {
    min-height: 48px;
    padding: 0 20px;
    border-radius: var(--radius-m);
    border: none;
    background: var(--ink);
    color: #fff;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
  }
  .status {
    padding: 6px 12px;
    border-radius: 999px;
    font-weight: 600;
    background: #fde3dd;
    color: var(--alert-dark);
  }
  .status.connected {
    background: #e2f3ec;
    color: var(--safe-dark);
  }
  .right {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
  }
  .countrow {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .count {
    font-family: var(--font-display);
    font-size: clamp(96px, 12vw, 180px);
    font-weight: 700;
    line-height: 0.9;
    color: var(--blue);
  }
  .countlabel {
    font-size: 26px;
    font-weight: 600;
  }
  .countlabel small {
    font-size: 18px;
    color: var(--slate);
    font-weight: 500;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-s);
    background: var(--mist);
    font-size: 20px;
    color: var(--slate);
  }
  li.slow {
    background: #fde3dd;
    color: var(--alert-dark);
  }
  .name {
    flex-grow: 1;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rtt {
    font-variant-numeric: tabular-nums;
    font-size: 16px;
  }
</style>
