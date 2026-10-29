<script lang="ts">
  import { onDestroy } from "svelte";
  import { classTable, debriefTable, fileName, THREAT_COLUMNS, toCsv, teamTable, teamById, TEAMS, dayMinute, eventsBy, formatLeft, isPaused, leftMs, minutesToClock, nextPhase, scenarios, type Phase } from "@open-door/shared";
  import { GameConnection } from "../../lib/game.svelte";
  import Brand from "../../lib/Brand.svelte";
  import TeamBoard from "../../lib/TeamBoard.svelte";
  import TeamOverview from "../../lib/TeamOverview.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";
  import { download, printTables } from "../../lib/exporting";
  import { Ticker } from "../../lib/ticker.svelte";

  let { code, teacherKey }: { code: string; teacherKey: string } = $props();

  // svelte-ignore state_referenced_locally
  const connection = new GameConnection(code, { as: "teacher", key: teacherKey });
  onDestroy(() => connection.close());

  const game = $derived(connection.game);
  const scenario = $derived(game ? scenarios[game.scenario] : undefined);
  const players = $derived(game?.players ?? []);
  const withoutTeam = $derived(players.filter((p) => !p.team));
  const online = $derived(players.filter((p) => p.online).length);
  const next = $derived(game ? nextPhase(game.phase) : null);
  const notTeacher = $derived(connection.role !== null && connection.role !== "teacher");

  // svelte-ignore state_referenced_locally
  const ticker = new Ticker(() => connection.now());
  onDestroy(() => ticker.stop());
  const timer = $derived(game?.timer ?? null);
  const paused = $derived(timer ? isPaused(timer) : false);
  const left = $derived(timer ? leftMs(timer, ticker.now) : 0);
  const clock = $derived(scenario && game ? minutesToClock(dayMinute(scenario, game, ticker.now)) : "");
  const messages = $derived(scenario && game?.phase === "day" ? eventsBy(scenario, dayMinute(scenario, game, ticker.now)).length : 0);

  const STEPS: Array<{ phase: Phase; label: string; action: string; help: string }> = [
    { phase: "lobby", label: "Join", action: "", help: "Students scan the code on the big screen, pick a face and sit at a team table." },
    { phase: "story", label: "Story", action: "Start the story", help: "Karin, the CEO, tells the class what is at stake. Students read along on their phones." },
    { phase: "walk", label: "Walk", action: "Start walking", help: "Teams walk around the office together, talk to people and write notes. Notes are private until a student shares them." },
    { phase: "day", label: "Day", action: "Start the day", help: "The incident begins: a clock, messages and an alert. Everyone's notes are shared with their team, and teams follow clues to the answer." },
    { phase: "vote", label: "Vote", action: "Start the vote", help: "Each team decides what Karin should do. Notes are shared with the team again, so nothing is lost." },
    { phase: "debrief", label: "Debrief", action: "Show the result", help: "Teams see their decision. The big screen shows which team saw which problem coming, the CyPro names and your questions." },
  ];
  const nextStep = $derived(STEPS.find((s) => s.phase === next));
  const currentIndex = $derived(STEPS.findIndex((s) => s.phase === game?.phase));

  // The class summary needs everyone's notes; ask for them when the day is over.
  $effect(() => {
    if (game && (game.phase === "vote" || game.phase === "debrief")) connection.requestSummary();
  });
  const summaryReady = $derived(game !== null && scenario !== undefined && (game.phase === "vote" || game.phase === "debrief"));
  const summaryBase = $derived(fileName(scenario?.company.name ?? "class", code));

  function downloadNotes() {
    if (!game || !scenario) return;
    download(`${summaryBase}-notes.csv`, toCsv([["Team", ...THREAT_COLUMNS], ...classTable(scenario, game, connection.allNotes)]));
  }
  function downloadDebrief() {
    if (!game || !scenario) return;
    download(`${summaryBase}-debrief.csv`, toCsv(debriefTable(scenario, game)));
  }
  function printSummary() {
    if (!game || !scenario) return;
    printTables(`${scenario.company.name} · ${scenario.title} · class summary`, [
      { heading: "Who saw it coming", rows: debriefTable(scenario, game) },
      ...TEAMS.filter((t) => game.players.some((p) => p.team === t.id)).map((t) => ({
        heading: `${teamById(t.id).name}: CyPro threat table`,
        rows: [[...THREAT_COLUMNS], ...teamTable(scenario, game, connection.allNotes, t.id)],
      })),
    ]);
  }

  const joinLink = $derived(`${window.location.origin}/j/${code}`);
  let copied = $state(false);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinLink);
      copied = true;
      setTimeout(() => (copied = false), 2500);
    } catch {
      window.prompt("Copy this link", joinLink);
    }
  }

  function openScreen() {
    window.open(`/screen/${code}`, `open-door-screen-${code}`);
  }
</script>

<main class="teacher">
  <header>
    <Brand size={30} />
    <StatusPill status={connection.status} />
  </header>

  {#if connection.ended}
    <section class="panel"><h1>This session has ended</h1><p>Sessions are deleted six hours after they start, or when you close them. <a href="/teacher">Start a new session</a>.</p></section>
  {:else if notTeacher}
    <section class="panel"><h1>Teacher key not accepted</h1><p>Open the teacher page in the browser that created session {code}, or <a href="/teacher">start a new session</a>.</p></section>
  {:else}
    <section class="top">
      <div class="code-block">
        <p class="eyebrow">{scenario ? `${scenario.company.name} · ${scenario.title}` : "Loading…"}{game ? ` · ${game.minutes} min` : ""}</p>
        <p class="code" aria-label="Session code {code.split('').join(' ')}">{code}</p>
        <p class="sub">{players.length} joined · {online} online</p>
      </div>
      <div class="actions">
        <button class="secondary" onclick={openScreen}>Open the big screen</button>
        <p class="hint">Show it on the projector. Students join from there.</p>
        <button class="secondary" onclick={copyLink}>{copied ? "Link copied" : "Copy the join link"}</button>
        <p class="hint link">No projector? Send students <strong>{joinLink.replace(/^https?:\/\//, "")}</strong></p>
      </div>
    </section>

    <ol class="steps" aria-label="Session steps">
      {#each STEPS as step, i (step.phase)}
        <li class:done={i < currentIndex} class:now={i === currentIndex}>
          <span class="dot">{i < currentIndex ? "✓" : i + 1}</span>{step.label}
        </li>
      {/each}
    </ol>

    <section class="panel next">
      {#if game && nextStep}
        <div>
          <h2>Next: {nextStep.label.toLowerCase()}</h2>
          <p>{nextStep.help}</p>
          {#if game.phase === "vote"}
            <p>{Object.keys(game.votes).length} of {players.filter((p) => p.team).length} students have voted.</p>
          {/if}
          {#if game.phase === "lobby" && withoutTeam.length > 0}
            <p class="warn">{withoutTeam.length} {withoutTeam.length === 1 ? "student has" : "students have"} not picked a team yet: {withoutTeam.map((p) => p.name).join(", ")}.</p>
          {/if}
        </div>
        <button class="primary" onclick={() => connection.setPhase(nextStep.phase)}>{nextStep.action}</button>
      {:else if game && scenario}
        <div>
          <h2>Debrief: question {game.prompt + 1} of {scenario.debrief.prompts.length}</h2>
          <p class="prompt">{scenario.debrief.prompts[game.prompt]}</p>
          <p>The big screen shows the table and this question. Teams see their own result on their phones.</p>
        </div>
        <div class="prompts">
          <button class="secondary" disabled={game.prompt === 0} onclick={() => connection.prompt(game.prompt - 1)}>Previous question</button>
          <button class="primary" disabled={game.prompt >= scenario.debrief.prompts.length - 1} onclick={() => connection.prompt(game.prompt + 1)}>Next question</button>
        </div>
      {/if}
    </section>
    {#if game && (game.phase === "walk" || game.phase === "day" || game.phase === "vote")}
      <section class="panel end">
        <div>
          <h2>Class done early?</h2>
          <p>Skip the rest and go straight to the summary. Every team's notes are graded and the big screen shows the table.</p>
        </div>
        <button class="secondary" onclick={() => confirm("End the walk now and show the summary? This cannot be undone.") && connection.setPhase("debrief")}>End now and show summary</button>
      </section>
    {/if}
    {#if game}
      <details class="panel close">
        <summary>Finished with this session?</summary>
        <div class="end">
          <p>Close it for everyone and delete all notes and names. Download the tables first, because they cannot be brought back.</p>
          <button class="secondary" onclick={() => confirm("Close the session for everyone and delete all data? This cannot be undone.") && connection.closeSession()}>Close the session</button>
        </div>
      </details>
    {/if}
    {#if connection.error}<p class="warn" role="alert">{connection.error}</p>{/if}

    {#if summaryReady}
      <section class="panel" aria-label="Class summary">
        <h2>Class summary</h2>
        <p>Every team's notes as a CyPro threat table, and the table of who saw what. Sessions are deleted six hours after they start, so save these before you close this page.</p>
        <div class="prompts">
          <button class="secondary" onclick={downloadNotes}>Download all notes (CSV)</button>
          <button class="secondary" onclick={downloadDebrief} disabled={game?.phase !== "debrief"}>Download the debrief table (CSV)</button>
          <button class="secondary" onclick={printSummary}>Print or save as PDF</button>
        </div>
      </section>
    {/if}

    {#if timer && game && scenario}
      <section class="panel control" aria-label="Class controls">
        <div class="readout">
          {#if game.phase === "walk"}
            <p class="label">Walk and spot</p>
            <p class="value" role="timer">{left === 0 ? "Time is up" : `${formatLeft(left)} left`}</p>
          {:else}
            <p class="label">Game clock · {scenario.day.name}</p>
            <p class="value" role="timer">{clock} <small>day ends {scenario.day.ends} · {messages} of {scenario.day.events.length} messages sent</small></p>
          {/if}
          {#if paused}<p class="paused-note" role="status">Paused: students cannot move or write.</p>{/if}
        </div>
        <div class="buttons">
          <button class="secondary" onclick={() => connection.timer(paused ? "resume" : "pause")}>{paused ? "Resume all" : "Pause all"}</button>
          {#if game.phase === "walk"}<button class="secondary" onclick={() => connection.timer("add")}>+5 minutes</button>{/if}
        </div>
      </section>
    {/if}

    <section>
      {#if game && scenario && (game.phase === "walk" || game.phase === "day")}
        <h2 class="section-title">How the teams are doing</h2>
        <TeamOverview {connection} {game} {scenario} now={ticker.now} />
      {:else}
        <h2 class="section-title">Teams</h2>
        <TeamBoard {players} onmove={game && (game.phase === "lobby" || game.phase === "story") ? (id, team) => connection.assign(id, team) : undefined} />
      {/if}
    </section>
  {/if}
</main>

<style>
  .end {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .teacher {
    max-width: 1080px;
    margin: 0 auto;
    padding: 16px 16px 48px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    align-items: flex-end;
  }
  .eyebrow {
    margin: 0;
    color: var(--slate);
    font-weight: 600;
  }
  .code {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 64px;
    letter-spacing: 0.08em;
    line-height: 1.05;
  }
  .sub {
    margin: 0;
    color: var(--slate);
  }
  .actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .hint {
    margin: 0;
    font-size: 14px;
    color: var(--slate);
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .steps li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px 6px 6px;
    border-radius: 999px;
    background: var(--paper);
    color: var(--slate);
    font-weight: 600;
  }
  .steps .dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--mist);
    font-size: 14px;
  }
  .steps li.now {
    color: var(--ink);
    box-shadow: inset 0 0 0 2px var(--blue);
  }
  .steps li.now .dot {
    background: var(--blue);
    color: #fff;
  }
  .steps li.done .dot {
    background: var(--safe);
    color: #fff;
  }
  .panel {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 20px;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06);
  }
  .panel p {
    margin: 6px 0 0;
  }
  .next {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
  }
  .close summary {
    cursor: pointer;
    font-weight: 700;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .close .end {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hint.link {
    word-break: break-all;
  }
  @media (max-width: 760px) {
    .actions {
      align-items: flex-start;
    }
    .next {
      position: sticky;
      bottom: 12px;
      z-index: 5;
      box-shadow: 0 8px 30px rgb(28 36 48 / 0.25);
    }
  }
  .next > div {
    flex: 1 1 320px;
  }
  .control {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }
  .control .label {
    margin: 0;
    color: var(--slate);
    font-weight: 600;
  }
  .control .value {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 40px;
    font-variant-numeric: tabular-nums;
  }
  .control .value small {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 500;
    color: var(--slate);
  }
  .buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .paused-note {
    margin: 4px 0 0;
    color: var(--alert-dark);
    font-weight: 700;
  }
  .section-title {
    font-size: 22px;
    margin-bottom: 10px;
  }
  button {
    min-height: 52px;
    padding: 0 22px;
    border-radius: var(--radius-m);
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
  }
  .primary {
    border: none;
    background: var(--blue);
    color: #fff;
  }
  .primary:hover {
    background: var(--blue-dark);
  }
  .secondary {
    border: 2px solid var(--blue);
    background: var(--paper);
    color: var(--blue);
  }
  .secondary:hover {
    background: var(--blue-soft);
  }
  .warn {
    color: var(--alert-dark);
    margin: 0;
  }
  .prompt { font-size: 20px; font-weight: 600; }
  .prompts { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
