<script lang="ts">
  import { onDestroy } from "svelte";
  import { isTeamId, scenarios, teamById } from "@open-door/shared";
  import { GameConnection } from "../../lib/game.svelte";
  import type { SavedPlayer } from "../../lib/saved";
  import Face from "../../lib/Face.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";
  import Story from "../../lib/Story.svelte";
  import TeamPick from "./TeamPick.svelte";
  import Walk from "./Walk.svelte";

  let { code, player, onleave }: { code: string; player: SavedPlayer; onleave: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const connection = new GameConnection(code, { as: "player", id: player.id });
  // svelte-ignore state_referenced_locally
  connection.join(player.name, player.face);
  onDestroy(() => connection.close());

  const game = $derived(connection.game);
  const scenario = $derived(game ? scenarios[game.scenario] : undefined);
  const me = $derived(game?.players.find((p) => p.id === player.id));
  const team = $derived(me?.team ? teamById(me.team) : null);
  const teammates = $derived(game && me?.team ? game.players.filter((p) => p.team === me.team) : []);

  // Developer simulator only (/dev): `?as=NAME&team=blue` sits down at that table without a click.
  const url = new URL(window.location.href);
  const autoTeam = url.searchParams.has("as") ? url.searchParams.get("team") : null;
  $effect(() => {
    if (me && !me.team && isTeamId(autoTeam)) connection.chooseTeam(autoTeam);
  });

  /** In the lobby a player can go back and pick another table. */
  let changingTeam = $state(false);
</script>

{#if connection.ended}
  <main class="page"><div class="card"><h1>This session has ended</h1><p>Thanks for playing. <a href="/">Join another session</a>.</p></div></main>
{:else if !game || !scenario || !me}
  <main class="page"><div class="card"><p class="big">Joining session {code}…</p><StatusPill status={connection.status} /></div></main>
{:else if !me.team || (changingTeam && game.phase === "lobby")}
  <TeamPick {game} {me} error={connection.error} onpick={(t) => { connection.chooseTeam(t); changingTeam = false; }} />
{:else if game.phase === "walk" || game.phase === "day"}
  <Walk {connection} {game} {scenario} {me} />
{:else}
  <main class="page">
    <div class="card wide">
      <header>
        <span class="me"><Face face={me.face} size={40} /> <strong>{me.name}</strong></span>
        <StatusPill status={connection.status} />
      </header>
      {#if game.phase === "lobby" && team}
        <section class="seat" style="--team: {team.color}">
          <p class="eyebrow">Your team</p>
          <h1>{team.name}</h1>
          <ul>
            {#each teammates as p (p.id)}
              <li><Face face={p.face} size={32} /> {p.id === me.id ? "You" : p.name}</li>
            {/each}
          </ul>
        </section>
        <p class="wait">You're in. Look at the big screen — your teacher will start soon.</p>
        <div class="links">
          <button class="link" onclick={() => (changingTeam = true)}>Change team</button>
          <button class="link" onclick={onleave}>Change name or face</button>
        </div>
      {:else}
        <Story {scenario} />
      {/if}
    </div>
  </main>
{/if}

<style>
  .page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .card {
    width: min(480px, 100%);
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 24px;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06), 0 8px 24px rgba(28, 36, 48, 0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .card.wide {
    width: min(560px, 100%);
    background: transparent;
    box-shadow: none;
    padding: 0;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .me {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .big {
    font-size: 22px;
    margin: 0;
  }
  .seat {
    background: var(--paper);
    border-radius: var(--radius-l);
    border-top: 8px solid var(--team);
    padding: 20px 24px;
  }
  .seat h1 {
    font-size: 36px;
  }
  .eyebrow {
    margin: 0;
    color: var(--slate);
    font-weight: 600;
  }
  ul {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-weight: 600;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .wait {
    margin: 0;
    font-size: 18px;
  }
  .links {
    display: flex;
    gap: 16px;
  }
  .link {
    background: none;
    border: none;
    padding: 8px 0;
    color: var(--blue);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
