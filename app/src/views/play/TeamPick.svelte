<script lang="ts">
  import { TEAM_MAX, TEAMS, teamCounts, type Game, type Player, type TeamId } from "@open-door/shared";
  import Face from "../../lib/Face.svelte";

  let { game, me, error, onpick }: { game: Game; me: Player; error: string | null; onpick: (team: TeamId) => void } = $props();

  const counts = $derived(teamCounts(game));
</script>

<main class="page">
  <div class="wrap">
    <h1>Sit at a team table</h1>
    <p>Sit with the people next to you. Up to {TEAM_MAX} at each table.</p>
    <div class="tables">
      {#each TEAMS as team (team.id)}
        {@const members = game.players.filter((p) => p.team === team.id)}
        {@const full = counts[team.id] >= TEAM_MAX && me.team !== team.id}
        <button class="table" class:mine={me.team === team.id} style="--team: {team.color}" disabled={full} onclick={() => onpick(team.id)}>
          <span class="door" aria-hidden="true"></span>
          <span class="info">
            <strong>{team.name}</strong>
            <small>{full ? "Full" : `${counts[team.id]} of ${TEAM_MAX}`}</small>
          </span>
          <span class="faces" aria-label={members.map((m) => m.name).join(", ") || "Empty"}>
            {#each members as m (m.id)}<Face face={m.face} size={28} />{/each}
          </span>
        </button>
      {/each}
    </div>
    {#if error}<p class="warn" role="alert">{error}</p>{/if}
  </div>
</main>

<style>
  .page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .wrap {
    width: min(520px, 100%);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h1 {
    font-size: 32px;
  }
  p {
    margin: 0;
  }
  .tables {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 6px;
  }
  .table {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 68px;
    padding: 10px 16px;
    border-radius: var(--radius-m);
    border: 2px solid var(--line);
    border-left: 10px solid var(--team);
    background: var(--paper);
    text-align: left;
    cursor: pointer;
  }
  .table:hover:not(:disabled) {
    border-color: var(--team);
  }
  .table.mine {
    border-color: var(--team);
    box-shadow: 0 0 0 3px var(--blue-soft);
  }
  .table:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .door {
    width: 18px;
    height: 28px;
    border-radius: 4px;
    background: var(--team);
  }
  .info {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    font-size: 18px;
  }
  .info small {
    color: var(--slate);
    font-size: 14px;
  }
  .faces {
    margin-left: auto;
    display: flex;
  }
  .faces :global(svg + svg) {
    margin-left: -8px;
  }
  .warn {
    color: var(--alert-dark);
  }
</style>
