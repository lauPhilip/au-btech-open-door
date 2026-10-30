<script lang="ts">
  import { TEAM_MAX, TEAMS, type Player, type TeamId } from "@open-door/shared";
  import Face from "./Face.svelte";

  let { players, large = false, onmove }: { players: Player[]; large?: boolean; onmove?: (id: string, team: TeamId) => void } = $props();
  const full = (id: string) => (players.filter((p) => p.team === id).length >= TEAM_MAX);

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
              {#if p.late}<small>joined late</small>{/if}
              {#if onmove}
                <select aria-label="Move {p.name} to another table" value={p.team ?? ""} onchange={(e) => onmove(p.id, e.currentTarget.value as TeamId)}>
                  {#each TEAMS as t (t.id)}<option value={t.id} disabled={t.id !== p.team && full(t.id)}>{t.name}{t.id !== p.team && full(t.id) ? " (full)" : ""}</option>{/each}
                </select>
              {/if}
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
    box-shadow: var(--shadow-1);
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
  select { margin-left: auto; min-height: 44px; font: inherit; max-width: 130px; }
</style>
