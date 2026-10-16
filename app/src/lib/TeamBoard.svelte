<script lang="ts">
  import { TEAM_MAX, TEAMS, type Player } from "@open-door/shared";
  import Face from "./Face.svelte";

  let { players, large = false }: { players: Player[]; large?: boolean } = $props();

  const byTeam = $derived(TEAMS.map((team) => ({ team, members: players.filter((p) => p.team === team.id) })));
</script>

<div class="board" class:large>
  {#each byTeam as { team, members } (team.id)}
    <section class="table" style="--team: {team.color}; --team-ink: {team.ink}">
      <h3><span class="door" aria-hidden="true"></span>{team.name} <small>{members.length}/{TEAM_MAX}</small></h3>
      {#if members.length === 0}
        <p class="empty">Waiting for players…</p>
      {:else}
        <ul>
          {#each members as p (p.id)}
            <li class:offline={!p.online}>
              <Face face={p.face} size={large ? 40 : 28} />
              <span>{p.name}</span>
              {#if !p.online}<small>offline</small>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 12px;
  }
  .table {
    background: var(--paper);
    border-radius: var(--radius-m);
    border-top: 6px solid var(--team);
    padding: 12px 14px;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06);
  }
  h3 {
    font-size: 18px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h3 small {
    margin-left: auto;
    font-family: var(--font-body);
    color: var(--slate);
    font-weight: 600;
    font-size: 14px;
  }
  .door {
    width: 12px;
    height: 18px;
    border-radius: 3px;
    background: var(--team);
  }
  ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  li small {
    color: var(--slate);
    font-weight: 500;
  }
  li.offline {
    opacity: 0.55;
  }
  .empty {
    margin: 10px 0 0;
    color: var(--slate);
    font-size: 14px;
  }
  .large h3 {
    font-size: 24px;
  }
  .large li {
    font-size: 22px;
  }
  .large .empty {
    font-size: 20px;
  }
</style>
