<script lang="ts">
  import { onDestroy } from "svelte";
  import { nextPhase, scenarios, type Phase } from "@open-door/shared";
  import { GameConnection } from "../../lib/game.svelte";
  import Brand from "../../lib/Brand.svelte";
  import TeamBoard from "../../lib/TeamBoard.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

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

  const STEPS: Array<{ phase: Phase; label: string; action: string; help: string }> = [
    { phase: "lobby", label: "Join", action: "", help: "Students scan the code on the big screen, pick a face and sit at a team table." },
    { phase: "story", label: "Story", action: "Start the story", help: "Karin, the CEO, tells the class what is at stake. Students read along on their phones." },
    { phase: "walk", label: "Walk", action: "Start walking", help: "Teams walk around the office together and visit every room." },
  ];
  const nextStep = $derived(STEPS.find((s) => s.phase === next));
  const currentIndex = $derived(STEPS.findIndex((s) => s.phase === game?.phase));

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
    <section class="panel"><h1>This session has ended</h1><p>Sessions are deleted six hours after they start. <a href="/teacher">Start a new session</a>.</p></section>
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
          {#if game.phase === "lobby" && withoutTeam.length > 0}
            <p class="warn">{withoutTeam.length} {withoutTeam.length === 1 ? "student has" : "students have"} not picked a team yet: {withoutTeam.map((p) => p.name).join(", ")}.</p>
          {/if}
        </div>
        <button class="primary" onclick={() => connection.setPhase(nextStep.phase)}>{nextStep.action}</button>
      {:else if game}
        <div>
          <h2>The class is walking</h2>
          <p>Watch the big screen. The day of the incident, notes and the debrief come in the next versions of Open Door.</p>
        </div>
      {/if}
    </section>
    {#if connection.error}<p class="warn" role="alert">{connection.error}</p>{/if}

    <section>
      <h2 class="section-title">Teams</h2>
      <TeamBoard {players} />
    </section>
  {/if}
</main>

<style>
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
  .next > div {
    flex: 1 1 320px;
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
</style>
