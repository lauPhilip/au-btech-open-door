<script lang="ts">
  import { teamById, TEAMS, type Game, type Grade, type Scenario } from "@open-door/shared";

  let { game, scenario }: { game: Game; scenario: Scenario } = $props();

  const teams = $derived(TEAMS.filter((t) => game.results[t.id]));
  const SYMBOL: Record<Grade, { mark: string; word: string }> = {
    hit: { mark: "✓", word: "on a note" },
    close: { mark: "½", word: "close, wrong place or person" },
    miss: { mark: "–", word: "missed" },
  };
  const found = (id: string) => (game.results[id as keyof Game["results"]] ?? []).filter((g) => g === "hit").length;
</script>

<table class="debrief" aria-label="Which team saw which problem coming">
  <thead>
    <tr>
      <th scope="col" class="what">Problem on the day</th>
      {#each teams as t (t.id)}
        <th scope="col" style="--team: {teamById(t.id).color}"><span class="sw"></span>{t.name}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each scenario.threats as threat, i (threat.id)}
      <tr>
        <th scope="row" class="what">{threat.text}</th>
        {#each teams as t (t.id)}
          {@const g = game.results[t.id]?.[i] ?? "miss"}
          <td class={g}><span class="mark" aria-hidden="true">{SYMBOL[g].mark}</span><span class="sr">{SYMBOL[g].word}</span></td>
        {/each}
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr>
      <th scope="row" class="what">Problems seen</th>
      {#each teams as t (t.id)}<td><strong>{found(t.id)}</strong> of {scenario.threats.length}</td>{/each}
    </tr>
  </tfoot>
</table>
<p class="key" aria-hidden="false">
  <span><b class="k hit">✓</b> on a note</span>
  <span><b class="k close">½</b> close, wrong place or person</span>
  <span><b class="k miss">–</b> missed</span>
</p>

<style>
  .debrief { width: 100%; border-collapse: separate; border-spacing: 6px; font-size: 20px; }
  th, td { padding: 6px 12px; border-radius: 10px; }
  thead th { text-align: center; background: var(--paper); border-bottom: 6px solid var(--team); font-size: 24px; white-space: nowrap; }
  .sw { display: inline-block; width: 16px; height: 16px; border-radius: 50%; background: var(--team); margin-right: 10px; }
  th.what { text-align: left; font-weight: 500; background: var(--paper); }
  thead th.what { border-bottom: 6px solid transparent; font-weight: 700; }
  td { text-align: center; background: var(--paper); font-size: 26px; }
  .mark { font-size: 36px; font-weight: 800; line-height: 1; }
  td.hit { background: var(--safe-soft); color: var(--safe-ink); }
  td.close { background: var(--close-soft); color: var(--close-ink); }
  td.miss { background: var(--quiet-soft); color: var(--quiet-ink); }
  tfoot td, tfoot th { background: transparent; font-size: 24px; }
  .key { display: flex; gap: 28px; margin: 4px 8px 0; font-size: 20px; color: var(--slate); }
  .k { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; margin-right: 8px; font-size: 22px; }
  .k.hit { background: var(--safe-soft); color: var(--safe-ink); }
  .k.close { background: var(--close-soft); color: var(--close-ink); }
  .k.miss { background: var(--quiet-soft); color: var(--quiet-ink); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
