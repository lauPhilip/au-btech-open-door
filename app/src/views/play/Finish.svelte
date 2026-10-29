<script lang="ts">
  import { fileName, matchNotes, teamTable, THREAT_COLUMNS, toCsv, teamById, teamVote, type Game, type Note, type Player, type Scenario } from "@open-door/shared";
  import { download, printTables } from "../../lib/exporting";
  import type { GameConnection } from "../../lib/game.svelte";
  import Face from "../../lib/Face.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

  let { connection, game, scenario, me }: { connection: GameConnection; game: Game; scenario: Scenario; me: Player } = $props();

  const team = $derived(me.team ? teamById(me.team) : null);
  const vote = $derived(me.team ? teamVote(game, scenario, me.team) : null);
  const picked = $derived(vote?.winner != null ? scenario.day.final_choice.options[vote.winner] : null);
  const matches = $derived(me.team ? matchNotes(scenario, connection.notes as Note[], me.team) : []);
  const saw = $derived(matches.filter((m) => m.note).length);
  const table = $derived(me.team ? [[...THREAT_COLUMNS], ...teamTable(scenario, game, connection.notes as Note[], me.team)] : []);
  const base = $derived(fileName(team?.name ?? "team", game.code, "cypro-threats"));
  const title = $derived(`${scenario.company.name} · ${scenario.title} · ${team?.name ?? ""}`);
  const targetName = (id: string) => scenario.things.find((t) => t.id === id)?.name ?? scenario.people.find((p) => p.id === id)?.name ?? id;
</script>

<main class="page">
  <div class="card">
    <header>
      <span class="me"><Face face={me.face} size={40} /> <strong>{me.name}</strong></span>
      <StatusPill status={connection.status} />
    </header>

    <section class="result">
      <p class="eyebrow">{team?.name} decided</p>
      {#if picked}
        <h1>{picked.text}</h1>
        <p class="outcome">{picked.result}</p>
        <p class="score">{picked.best ? "★ " : ""}Score {picked.score} of 3{picked.best ? " · the best choice" : ""}</p>
      {:else}
        <h1>Your table did not agree</h1>
        <p class="outcome">The votes were split, so the CEO had to wait. Real teams meet this too: agree on one answer before the clock runs out.</p>
      {/if}
    </section>

    <section class="saw">
      <h2>You saw it coming: {saw} of {matches.length}</h2>
      <p class="help">A note counts when it is about the right thing and names the right harm.</p>
      <ul>
        {#each matches as m (m.threat.id)}
          <li class:hit={m.note}>
            <span class="badge" aria-hidden="true">{m.note ? "✓" : "–"}</span>
            <div>
              <p class="what"><strong>{targetName(m.threat.target)}</strong> · {m.note ? "your team saw it" : "your team did not note this"}</p>
              <p>{m.threat.text}</p>
              {#if m.note}<p class="note">“{m.note.text}”</p>{/if}
            </div>
          </li>
        {/each}
      </ul>
    </section>
    <section class="take">
      <h2>Take it with you</h2>
      <p class="help">Your team's notes as a CyPro threat table, ready for your report. Impact is left empty for you to fill in.</p>
      <div class="buttons">
        <button onclick={() => download(`${base}.csv`, toCsv(table))} disabled={table.length < 2}>Download CSV</button>
        <button onclick={() => printTables(title, [{ heading: "CyPro threat table", rows: table }])} disabled={table.length < 2}>Print or save as PDF</button>
      </div>
      {#if table.length < 2}<p class="help">Your team has no shared notes yet.</p>{/if}
    </section>
    <p class="help">Look at the big screen for the class debrief.</p>
  </div>
</main>

<style>
  .page { min-height: 100dvh; display: grid; place-items: center; padding: 16px; }
  .card { width: min(600px, 100%); display: flex; flex-direction: column; gap: 18px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  .me { display: flex; align-items: center; gap: 10px; }
  .eyebrow { margin: 0; color: var(--slate); font-weight: 600; }
  .result { background: var(--paper); border-radius: var(--radius-l); padding: 20px 24px; border-top: 8px solid var(--blue); }
  h1 { font-size: 26px; margin: 4px 0 8px; line-height: 1.25; }
  h2 { font-size: 22px; margin: 0; }
  .outcome { margin: 0 0 8px; font-size: 18px; }
  .score { margin: 0; font-weight: 700; color: var(--blue-dark); }
  .saw { background: var(--paper); border-radius: var(--radius-l); padding: 20px 24px; }
  .help { margin: 4px 0 0; color: var(--slate); }
  ul { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  li { display: grid; grid-template-columns: 32px 1fr; gap: 12px; padding: 12px; border-radius: var(--radius-m, 10px); background: var(--mist); }
  li.hit { background: #e6f4ec; }
  li p { margin: 0; }
  .badge { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; border: 2px solid var(--slate); color: var(--slate); }
  .hit .badge { background: #1d7a4a; border-color: #1d7a4a; color: #fff; }
  .what { font-size: 15px; color: var(--slate); }
  .note { margin-top: 6px !important; padding: 6px 10px; background: #ffe27a; border-radius: 4px; font-size: 15px; }
  .take { background: var(--paper); border-radius: var(--radius-l); padding: 20px 24px; }
  .buttons { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .buttons button { min-height: 48px; padding: 0 18px; border-radius: var(--radius-m); border: 2px solid var(--blue); background: var(--paper); color: var(--blue); font: inherit; font-weight: 700; cursor: pointer; }
  .buttons button:disabled { opacity: 0.5; cursor: default; }
</style>
