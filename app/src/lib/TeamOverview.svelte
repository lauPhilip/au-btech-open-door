<script lang="ts">
  import { teamById, teamProgress, type Game, type Scenario, type TeamId } from "@open-door/shared";
  import type { GameConnection } from "./game.svelte";

  let { connection, game, scenario, now }: { connection: GameConnection; game: Game; scenario: Scenario; now: number } = $props();

  const since = $derived(Math.max(game.timer?.startedAt ?? 0, connection.resumedAt));
  const rows = $derived(teamProgress(game, scenario, connection.lastMove, since, now));
  /** The team whose hint choices are open, if any. */
  let hintFor = $state<TeamId | null>(null);

  function choices(unvisited: string[]): string[] {
    const list = unvisited.slice(0, 2).map((room) => `Have you been to the ${room} yet?`);
    list.push("Talk to everyone in the room you are in.");
    return list;
  }
  function send(team: TeamId, text: string) {
    connection.hint(team, text);
    hintFor = null;
  }
  const minutes = (ms: number) => Math.floor(ms / 60_000);
</script>

<div class="overview" role="table" aria-label="Progress per team">
  {#each rows as r (r.team)}
    {@const t = teamById(r.team)}
    <div class="row" class:stuck={r.stuck} role="row" style="--team: {t.color}">
      <div class="name" role="cell"><span class="sw" aria-hidden="true"></span><strong>{t.name}</strong> <small>{r.members} {r.members === 1 ? "student" : "students"}</small></div>
      <div role="cell"><b>{r.rooms}</b> of {r.roomsTotal} rooms</div>
      <div role="cell"><b>{r.notes}</b> {r.notes === 1 ? "note" : "notes"}</div>
      {#if game.phase === "day"}<div role="cell"><b>{r.clues}</b> of {scenario.day.clues.length} clues</div>{/if}
      <div class="state" role="cell">
        {#if r.stuck}
          <span class="flag"><span aria-hidden="true">⚠</span> May need help · no movement for {minutes(r.idleMs)} min</span>
        {:else}
          <span class="ok"><span aria-hidden="true">✓</span> Moving</span>
        {/if}
      </div>
      <div role="cell">
        <button class="send" aria-expanded={hintFor === r.team} onclick={() => (hintFor = hintFor === r.team ? null : r.team)}>Send a hint</button>
      </div>
      {#if hintFor === r.team}
        <ul class="hints" aria-label="Hints for {t.name}">
          {#each choices(r.unvisited) as text (text)}
            <li><button class="choice" onclick={() => send(r.team, text)}>{text}</button></li>
          {/each}
        </ul>
      {/if}
    </div>
  {/each}
  {#if rows.length === 0}<p class="empty">No team has any students yet.</p>{/if}
</div>

<style>
  .overview { display: grid; gap: 10px; container-type: inline-size; }
  .row {
    display: grid; grid-template-columns: minmax(150px, 1.3fr) repeat(3, minmax(90px, 1fr)) minmax(180px, 1.6fr) auto;
    align-items: center; gap: 12px; background: var(--paper); border-left: 8px solid var(--team);
    border-radius: var(--radius-m); padding: 10px 14px; box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06);
  }
  .row.stuck { background: #fff4d6; outline: 2px solid #b36b00; }
  .name { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .name small { color: var(--slate); }
  .sw { width: 12px; height: 12px; border-radius: 50%; background: var(--team); }
  .flag { color: #7a4600; font-weight: 700; }
  .ok { color: #0f5a33; font-weight: 600; }
  .hints { grid-column: 1 / -1; list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .choice {
    width: 100%; min-height: 44px; text-align: left; font: inherit; padding: 8px 14px; cursor: pointer;
    background: var(--blue-soft); color: var(--blue-dark); border: 1px solid var(--blue); border-radius: 10px;
  }
  .send {
    min-height: 44px; padding: 0 16px; font: inherit; font-weight: 700; cursor: pointer;
    background: var(--paper); color: var(--blue); border: 2px solid var(--blue); border-radius: var(--radius-m);
  }
  .send:hover { background: var(--blue-soft); }
  .empty { color: var(--slate); margin: 0; }
  @container (max-width: 940px) {
    .row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .name, .state { grid-column: 1 / -1; }
  }
</style>
