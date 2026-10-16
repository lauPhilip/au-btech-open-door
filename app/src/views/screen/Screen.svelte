<script lang="ts">
  import { onDestroy } from "svelte";
  import QRCode from "qrcode";
  import { scenarios, TEAMS, teamVisited } from "@open-door/shared";
  import { GameConnection } from "../../lib/game.svelte";
  import Brand from "../../lib/Brand.svelte";
  import TeamBoard from "../../lib/TeamBoard.svelte";
  import Story from "../../lib/Story.svelte";
  import OfficeMap from "../../lib/OfficeMap.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

  let { code }: { code: string } = $props();

  // svelte-ignore state_referenced_locally
  const connection = new GameConnection(code, { as: "screen" });
  onDestroy(() => connection.close());

  const game = $derived(connection.game);
  const scenario = $derived(game ? scenarios[game.scenario] : undefined);
  const players = $derived(game?.players ?? []);
  const seated = $derived(players.filter((p) => p.team).length);

  const joinUrl = $derived(`${window.location.origin}/j/${code}`);
  const shortHost = $derived(window.location.host);
  let qrSvg = $state("");
  $effect(() => {
    QRCode.toString(joinUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((svg) => (qrSvg = svg));
  });

  const progress = $derived(
    scenario && game
      ? TEAMS.map((team) => ({ team, rooms: teamVisited(game, team.id).size, members: players.filter((p) => p.team === team.id).length })).filter(
          (t) => t.members > 0,
        )
      : [],
  );
</script>

<main class="screen">
  <header>
    <Brand size={34} />
    {#if scenario}<span class="company">{scenario.company.name}, {scenario.company.place.split(",")[0]} · {scenario.title}</span>{/if}
    <StatusPill status={connection.status} />
  </header>

  {#if connection.ended}
    <section class="center"><h1>This session has ended</h1></section>
  {:else if !game || !scenario}
    <section class="center"><p class="big">Connecting to session {code}…</p></section>
  {:else if game.phase === "lobby"}
    <section class="lobby">
      <div class="join">
        <div class="qr" aria-hidden="true">{@html qrSvg}</div>
        <p class="go">Scan, or go to <strong>{shortHost}</strong> and type</p>
        <p class="code" aria-label="Code {code.split('').join(' ')}">{code}</p>
      </div>
      <div class="teams">
        <TeamBoard {players} large />
        <p class="count">{seated} {seated === 1 ? "student is" : "students are"} at a table · The teacher will start soon</p>
      </div>
    </section>
  {:else if game.phase === "story"}
    <section class="story-wrap">
      <Story {scenario} large autoplayMs={9000} />
    </section>
  {:else}
    <section class="walk">
      <div class="goal"><span class="eyebrow">Goal</span> {scenario.goal}</div>
      <div class="map-wrap"><OfficeMap {scenario} {players} names="all" /></div>
      <ul class="legend">
        {#each progress as { team, rooms } (team.id)}
          <li style="--team: {team.color}"><span class="sw"></span>{team.name} <small>{rooms} of {scenario.map.rooms.length} rooms</small></li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  .screen {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: 24px 32px;
    gap: 20px;
    font-size: 20px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  .company {
    flex: 1;
    color: var(--slate);
    font-weight: 600;
  }
  .center {
    flex: 1;
    display: grid;
    place-items: center;
  }
  .big {
    font-size: 32px;
  }
  .lobby {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(280px, 30%) 1fr;
    gap: 40px;
    align-items: start;
  }
  .join {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 24px;
    text-align: center;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06);
  }
  .qr :global(svg) {
    width: 100%;
    height: auto;
    max-width: 360px;
  }
  .go {
    margin: 12px 0 0;
  }
  .code {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 96px;
    letter-spacing: 0.08em;
    line-height: 1.1;
  }
  .teams {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .count {
    margin: 0;
    color: var(--slate);
    font-size: 24px;
  }
  .story-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
  }
  .walk {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
  }
  .goal {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 30px;
  }
  .eyebrow {
    display: inline-block;
    padding: 2px 10px;
    margin-right: 8px;
    border-radius: var(--radius-s);
    background: var(--sticky);
    font-size: 18px;
    vertical-align: middle;
  }
  .map-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    font-weight: 600;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .legend small {
    color: var(--slate);
    font-weight: 500;
  }
  .sw {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--team);
  }
  @media (max-width: 800px) {
    .lobby {
      grid-template-columns: 1fr;
    }
  }
</style>
