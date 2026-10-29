<script lang="ts">
  import { minutesToClock, type Scenario } from "@open-door/shared";

  let {
    scenario,
    minute,
    found,
    total,
    latest,
    large = false,
  }: {
    scenario: Scenario;
    /** The game clock, as minutes since midnight. */
    minute: number;
    /** Clues found by this team, and how many exist. Leave `found` null to hide the counter. */
    found: number | null;
    total: number;
    /** The newest chat message, shown under the alert so it is never missed on a small screen. */
    latest?: { from: string; text: string };
    large?: boolean;
  } = $props();

  const day = $derived(scenario.day);
</script>

<!-- The alert is red with white text (not red on white), and it also says ALERT in words. -->
<section class="bar" class:large aria-label="The day">
  <div class="clock">
    <p class="when">{day.name.split(",")[0]}</p>
    <p class="time" role="timer" aria-label="Game clock {minutesToClock(minute)}">{minutesToClock(minute)}</p>
    <p class="until">Day ends {day.ends}</p>
  </div>
  <div class="alert" role="alert">
    <p class="tag">Alert</p>
    <p class="text">{day.alert}</p>
  </div>
  {#if latest}
    <p class="latest" aria-hidden="true"><strong>{latest.from}:</strong> {latest.text}</p>
  {/if}
  {#if found !== null}
    <div class="clues" aria-label="Clues found: {found} of {total}">
      <p class="n">{found} / {total}</p>
      <p class="label">clues</p>
    </div>
  {/if}
</section>

<style>
  .bar {
    display: flex;
    align-items: stretch;
    gap: 12px;
    flex-wrap: wrap;
  }
  .clock,
  .clues {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 8px 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .clock p,
  .clues p {
    margin: 0;
    line-height: 1.15;
  }
  .when,
  .until,
  .label {
    color: var(--slate);
    font-size: 13px;
  }
  .time,
  .n {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 32px;
    font-variant-numeric: tabular-nums;
  }
  .alert {
    flex: 1 1 240px;
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--alert-dark);
    color: #fff;
    border-radius: var(--radius-m);
    padding: 8px 16px;
  }
  .tag {
    margin: 0;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 8px;
    border: 2px solid #fff;
    border-radius: 6px;
  }
  .text {
    margin: 0;
    font-weight: 700;
    font-size: 18px;
  }
  .latest {
    flex: 1 1 100%;
    margin: 0;
    padding: 6px 12px;
    border-radius: var(--radius-s);
    background: var(--paper);
    font-size: 14px;
  }
  .large .time,
  .large .n {
    font-size: 64px;
  }
  .large .when,
  .large .until,
  .large .label {
    font-size: 20px;
  }
  .large .text {
    font-size: 36px;
  }
  .large .tag {
    font-size: 22px;
  }
  .large .clock,
  .large .clues,
  .large .alert {
    padding: 14px 28px;
  }
</style>
