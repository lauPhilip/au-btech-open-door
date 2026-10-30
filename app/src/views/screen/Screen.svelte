<script lang="ts">
  import { onDestroy } from "svelte";
  import QRCode from "qrcode";
  import DebriefTable from "../../lib/DebriefTable.svelte";
  import CyProNames from "../../lib/CyProNames.svelte";
  import { allVotes, dayMinute, teamById, eventsBy, formatLeft, isPaused, leftMs, scenarios, TEAMS, teamClues, teamVisited } from "@open-door/shared";
  import { GameConnection } from "../../lib/game.svelte";
  import Brand from "../../lib/Brand.svelte";
  import TeamBoard from "../../lib/TeamBoard.svelte";
  import Story from "../../lib/Story.svelte";
  import OfficeMap from "../../lib/OfficeMap.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";
  import Chat from "../../lib/Chat.svelte";
  import DayBar from "../../lib/DayBar.svelte";
  import { Ticker } from "../../lib/ticker.svelte";

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

  // svelte-ignore state_referenced_locally
  const ticker = new Ticker(() => connection.now());
  onDestroy(() => ticker.stop());
  const isDay = $derived(game?.phase === "day");
  const paused = $derived(game?.timer ? isPaused(game.timer) : false);
  const left = $derived(game?.timer ? leftMs(game.timer, ticker.now) : 0);
  const minute = $derived(scenario && game ? dayMinute(scenario, game, ticker.now) : 0);
  /** Only the newest messages fit on the projector. */
  const ticker3 = $derived(scenario && isDay ? eventsBy(scenario, minute).slice(-3) : []);

  const votes = $derived(scenario && game ? allVotes(game, scenario) : []);

  const progress = $derived(
    scenario && game
      ? TEAMS.map((team) => ({ team, rooms: teamVisited(game, team.id).size, clues: teamClues(game, team.id).length, members: players.filter((p) => p.team === team.id).length })).filter(
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
  {:else if game.phase === "debrief"}
    <section class="debrief-screen">
      <div class="left">
        <ul class="decisions" aria-label="What each team decided">
          {#each votes as v (v.team)}
            {@const t = teamById(v.team)}
            {@const win = v.winner !== null ? scenario.day.final_choice.options[v.winner] : null}
            <li style="--team: {t.color}"><strong>{t.name}</strong> {#if win}<span>{win.best ? "★ " : ""}{win.text} <em>{win.result}</em></span>{:else}<span>– No decision: the votes were split</span>{/if}</li>
          {/each}
        </ul>
        <h1>Who saw it coming?</h1>
        <DebriefTable {game} {scenario} />
      </div>
      <aside class="right">
        <p class="question" aria-live="polite"><span class="eyebrow">Question for the class</span>{scenario.debrief.prompts[game.prompt] ?? ""}</p>
        <CyProNames />
        {#if scenario.debrief.next_class}<p class="next"><strong>Next class:</strong> {scenario.debrief.next_class}</p>{/if}
      </aside>
    </section>
  {:else if game.phase === "vote"}
    <section class="decide">
      <h1>{scenario.day.final_choice.question}</h1>
      <ul class="teams">
        {#each votes as v (v.team)}
          {@const t = teamById(v.team)}
          {@const win = v.winner !== null ? scenario.day.final_choice.options[v.winner] : null}
          <li style="--team: {t.color}">
            <span class="name"><span class="sw"></span>{t.name}</span>
            {#if game.phase === "vote"}
              <span class="state">{v.voted === v.members ? "✓ All voted" : `${v.voted} of ${v.members} voted`}</span>
            {:else if win}
              <span class="state"><strong>{String.fromCharCode(65 + (v.winner ?? 0))}</strong> {win.text}</span>
              <span class="result">{win.result}</span>
            {:else}
              <span class="state">– No decision: the votes were split</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <section class="walk">
      {#if isDay}
        <DayBar {scenario} {minute} found={null} total={scenario.day.clues.length} large />
      {:else}
        <div class="goal">
          <span class="eyebrow">Goal</span> {scenario.goal}
          {#if game.timer}<span class="walk-left" role="timer">{left === 0 ? "Time is up" : `${formatLeft(left)} left`}</span>{/if}
        </div>
      {/if}
      <div class="stage" class:with-chat={isDay}>
        <div class="map-wrap"><OfficeMap {scenario} {players} names="all" /></div>
        {#if isDay}<div class="chat-wrap"><Chat {scenario} events={ticker3} large /></div>{/if}
      </div>
      <ul class="legend">
        {#each progress as { team, rooms, clues } (team.id)}
          <li style="--team: {team.color}"><span class="sw"></span>{team.name} <small>{rooms} of {scenario.map.rooms.length} rooms{isDay ? ` · ${clues} of ${scenario.day.clues.length} clues` : ""}</small></li>
        {/each}
      </ul>
      {#if paused}<p class="paused" role="status">Paused by the teacher</p>{/if}
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
    box-shadow: var(--shadow-1);
    min-width: 0;
    container-type: inline-size;
  }
  .qr :global(svg) {
    width: 100%;
    height: auto;
    max-width: 360px;
  }
  .go {
    margin: 12px 0 0;
    overflow-wrap: anywhere;
  }
  .code {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    /* Four letters always fit the card, from a small simulator pane to a projector. */
    font-size: clamp(32px, 21cqw, 96px);
    letter-spacing: 0.05em;
    line-height: 1.1;
    white-space: nowrap;
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
  .walk-left {
    float: right;
    font-variant-numeric: tabular-nums;
  }
  .stage {
    flex: 1;
    min-height: 0;
    display: flex;
    gap: 24px;
  }
  .chat-wrap {
    flex: 0 0 34%;
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 16px 20px;
    overflow: hidden;
  }
  .paused {
    margin: 0;
    padding: 8px 20px;
    border-radius: var(--radius-m);
    background: var(--ink);
    color: #fff;
    font-weight: 700;
    font-size: 28px;
    text-align: center;
  }
  .map-wrap {
    flex: 1;
    min-width: 0;
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
  .decide {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .decide h1 {
    font-size: 44px;
    margin: 0;
  }
  .teams {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 16px;
  }
  .teams li {
    background: var(--paper);
    border-radius: var(--radius-l);
    border-left: 12px solid var(--team);
    padding: 18px 24px;
    display: grid;
    gap: 6px;
    font-size: 26px;
  }
  .teams .name {
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .teams .result {
    color: var(--slate);
    font-size: 22px;
  }
  .debrief-screen {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(320px, 1fr);
    gap: 28px;
    align-items: start;
  }
  .debrief-screen h1 {
    font-size: 34px;
    margin: 0 0 4px;
  }
  .question {
    background: var(--sticky);
    color: var(--ink);
    border-radius: var(--radius-l);
    padding: 16px 22px;
    font-size: 28px;
    font-weight: 600;
    margin: 0;
  }
  .question .eyebrow {
    display: block;
    font-size: 16px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .decisions {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    display: grid;
    gap: 8px;
    font-size: 20px;
  }
  .decisions li {
    background: var(--paper);
    border-left: 10px solid var(--team);
    border-radius: 10px;
    padding: 8px 16px;
  }
  .decisions em {
    color: var(--slate);
    font-style: normal;
  }
  .right {
    display: grid;
    gap: 16px;
  }
  .next {
    margin: 0;
    font-size: 22px;
  }
  @media (max-width: 1100px) {
    .debrief-screen {
      grid-template-columns: 1fr;
    }
  }
</style>
