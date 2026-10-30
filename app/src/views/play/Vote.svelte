<script lang="ts">
  import { teamById, teamVote, type Game, type Player, type Scenario } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import Face from "../../lib/Face.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

  let { connection, game, scenario, me }: { connection: GameConnection; game: Game; scenario: Scenario; me: Player } = $props();

  const choice = $derived(scenario.day.final_choice);
  const mine = $derived(game.votes[me.id]);
  const tally = $derived(me.team ? teamVote(game, scenario, me.team) : null);
  const team = $derived(me.team ? teamById(me.team) : null);
  const allIn = $derived(tally !== null && tally.voted === tally.members);
</script>

<main class="page">
  <div class="card">
    <header>
      <span class="me"><Face face={me.face} size={40} /> <strong>{me.name}</strong></span>
      <StatusPill status={connection.status} />
    </header>
    <p class="eyebrow">Last step · {team?.name}</p>
    <h1>{choice.question}</h1>
    <p class="help">Talk it over at your table, then vote. You can change your vote until the teacher moves on.</p>

    <div class="options" role="radiogroup" aria-label="What should the CEO do?">
      {#each choice.options as option, i (i)}
        <button
          class="option"
          class:chosen={mine === i}
          role="radio"
          aria-checked={mine === i}
          onclick={() => connection.vote(i)}
        >
          <span class="mark" aria-hidden="true">{mine === i ? "✓" : String.fromCharCode(65 + i)}</span>
          <span class="text">{option.text}</span>
          {#if allIn && tally}<span class="count">{tally.counts[i]} {tally.counts[i] === 1 ? "vote" : "votes"}</span>{/if}
        </button>
      {/each}
    </div>

    {#if tally}
      <p class="status" aria-live="polite">
        {#if allIn}Everyone at your table has voted. Wait for the result.{:else}{tally.voted} of {tally.members} at your table {tally.voted === 1 ? "has" : "have"} voted.{/if}
      </p>
    {/if}
    {#if connection.error}<p class="warn" role="alert">{connection.error}</p>{/if}
  </div>
</main>

<style>
  .page { min-height: 100dvh; display: grid; place-items: center; padding: 16px; }
  .card { width: min(var(--column), 100%); display: flex; flex-direction: column; gap: 14px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .me { display: flex; align-items: center; gap: 10px; }
  .eyebrow { margin: 0; color: var(--slate); font-weight: 600; }
  h1 { font-size: 28px; margin: 0; line-height: 1.25; }
  .help { margin: 0; color: var(--slate); }
  .options { display: flex; flex-direction: column; gap: 12px; }
  .option {
    display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px;
    min-height: 64px; padding: 12px 16px; text-align: left; font: inherit; font-size: 18px;
    background: var(--paper); color: var(--ink); border: 2px solid #d5dbe4; border-radius: var(--radius-l); cursor: pointer;
  }
  .option:hover { border-color: var(--blue); }
  .option.chosen { border-color: var(--blue-dark); background: var(--blue-soft); font-weight: 600; }
  .mark {
    width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-weight: 700;
    border: 2px solid currentColor; color: var(--slate);
  }
  .chosen .mark { background: var(--blue-dark); border-color: var(--blue-dark); color: #fff; }
  .count { font-size: 14px; color: var(--slate); font-weight: 600; }
  .status { margin: 0; font-weight: 600; }
  .warn { color: #b93a25; margin: 0; }
</style>
