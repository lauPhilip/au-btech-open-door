<script lang="ts">
  import { t } from "../../lib/i18n.svelte";
  import { formatLeft, teamById, type DayEvent, type Game, type Player, type Room, type Scenario } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import DayBar from "../../lib/DayBar.svelte";
  import HowToPlay from "../../lib/HowToPlay.svelte";
  import { readStored, writeStored } from "../../lib/room.svelte";
  import StatusPill from "../../lib/StatusPill.svelte";

  /** The strip above the picture: team, place, countdown, "our table is done", the day bar, hints and notices. */
  let {
    connection,
    game,
    scenario,
    me,
    here,
    left,
    paused,
    minute,
    messages,
    cluesFound,
  }: {
    connection: GameConnection;
    game: Game;
    scenario: Scenario;
    me: Player;
    here: Room | null;
    left: number;
    paused: boolean;
    minute: number;
    messages: DayEvent[];
    cluesFound: readonly number[];
  } = $props();

  const isDay = $derived(game.phase === "day");
  const team = $derived(teamById(me.team!));
  /** Your table has told the teacher it is done with this step. */
  const tableReady = $derived(game.ready?.[me.team!] ?? null);
  const nextStepName = $derived(game.phase === "walk" ? "the day" : "the vote");
  /** The teacher's latest hint for this team, until the student closes it. */
  const hint = $derived(game.hints?.[me.team!]);
  let closedHint = $state(0);

  /** The how-to-play card shows once for each student in each session; the "?" button brings it back. */
  const helpKey = () => `open-door:howto:${game.code}`;
  let showHelp = $state(readStored(helpKey()) === null);
  function closeHelp() {
    showHelp = false;
    writeStored(helpKey(), "seen");
  }
</script>

  <div class="top">
    <header>
      <span class="team" style="--team: {team.color}"><span class="door" aria-hidden="true"></span>{team.name}</span>
      <span class="where" aria-live="polite">{t("walk.youAreIn")} <strong>{here?.name ?? t("walk.corridor")}</strong></span>
      {#if game.phase === "walk" && game.timer}
        <span class="left" class:over={left === 0} role="timer">{left === 0 ? t("walk.timeUp") : t("walk.timeLeft", { time: formatLeft(left) })}</span>
      {/if}
      <button class="done-btn" class:on={!!tableReady} aria-pressed={!!tableReady} disabled={paused || connection.status !== "connected"} onclick={() => connection.ready(!tableReady)}>
        <span aria-hidden="true">{tableReady ? "✓" : "☐"}</span>{tableReady ? t("walk.doneOn") : t("walk.done")}
      </button>
      <button class="help-btn" aria-label={t("walk.help")} aria-expanded={showHelp} onclick={() => (showHelp = !showHelp)}>?</button>
      <StatusPill status={connection.status} />
    </header>
    {#if me.late}
      <p class="ready-note late" role="status">{t("walk.late", { team: team.name })}</p>
    {/if}
    {#if showHelp}
      <HowToPlay onclose={closeHelp} />
    {/if}
    {#if tableReady}
      <p class="ready-note" role="status">{tableReady.by === me.name ? "You told" : `${tableReady.by} told`} your teacher your table is ready for {nextStepName}. Keep writing notes if you think of more, or tap the button again to say you are not done.</p>
    {/if}
    {#if isDay}
      <DayBar {scenario} {minute} found={cluesFound.length} total={scenario.day.clues.length} latest={messages.at(-1) ? { from: scenario.people.find((p) => p.id === messages.at(-1)!.from)?.name ?? "", text: messages.at(-1)!.text } : undefined} />
    {/if}
    {#if hint && hint.at !== closedHint}
      <div class="hint" role="status">
        <span><strong>Hint from your teacher:</strong> {hint.text}</span>
        <button class="close" aria-label="Close the hint" onclick={() => (closedHint = hint.at)}>×</button>
      </div>
    {/if}
    {#if game.phase === "walk" && left === 0 && !paused}
      <p class="timeup" role="status">Time is up. Finish your note and wait for your teacher to start the day.</p>
    {/if}
  </div>

<style>
  .help-btn { width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--line); background: var(--paper); color: var(--blue-dark); font: inherit; font-size: 20px; font-weight: 700; cursor: pointer; }
  .help-btn:hover { background: var(--blue-soft); }
  .top {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .left {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .left.over,
  .timeup {
    color: var(--alert-dark);
  }
  .timeup {
    margin: 0;
    font-weight: 600;
  }
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .team {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 20px;
  }
  .door {
    width: 14px;
    height: 22px;
    border-radius: 3px;
    background: var(--team);
  }
  .where {
    flex: 1;
    color: var(--slate);
  }
  .done-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border: 2px solid var(--blue);
    border-radius: 999px;
    background: var(--paper);
    color: var(--blue-dark);
    font-weight: 700;
    cursor: pointer;
  }
  .done-btn:hover {
    background: var(--blue-soft);
  }
  .done-btn.on {
    background: var(--safe-dark);
    border-color: var(--safe-dark);
    color: #fff;
  }
  .done-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .ready-note {
    margin: 0;
    padding: 8px 14px;
    border-radius: var(--radius-m);
    background: var(--safe-soft);
    color: var(--safe-dark);
    font-weight: 600;
  }
  .where strong {
    color: var(--ink);
  }
  .hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--sticky);
    color: var(--ink);
    border-radius: var(--radius-m);
    padding: 10px 14px;
    font-size: 18px;
  }
  .hint .close {
    min-width: 44px;
    min-height: 44px;
    font-size: 26px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--ink);
  }
</style>
