<script lang="ts">
  import { t } from "../../lib/i18n.svelte";
  import type { Spot } from "@open-door/shared";

  /** Under the picture: what you can do right here (talk, look, write a note) and how to move. */
  let { view, nearby, online, onopen, onnote }: { view: "map" | "room"; nearby: Spot[]; online: boolean; onopen: (spot: Spot) => void; onnote: (about: Spot | null) => void } = $props();
</script>

<div class="prompt" aria-live="polite">
  {#if nearby.length > 0}
    {#each nearby as spot (spot.kind + spot.id)}
      <button class="action" onclick={() => onopen(spot)}>
        {spot.kind === "person" ? t("walk.talkTo") : t("walk.lookAt")} {spot.name}
        {#if spot === nearby[0]}<kbd>E</kbd>{/if}
      </button>
    {/each}
  {:else}
    <span class="quiet">{t("walk.quiet")}</span>
  {/if}
  <button class="action sticky" disabled={!online} onclick={() => onnote(nearby[0] ?? null)}>{t("walk.sticky")}</button>
  </div>
  <p class="help">{view === "map" ? t("walk.helpMap") : t("walk.helpRoom")} {t("walk.helpKeys")}</p>

<style>
  .prompt {
  margin-top: 10px;
  min-height: 52px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  }
  .quiet {
  color: var(--slate);
  font-size: 14px;
  margin: 6px 0 0;
  }
  .action.sticky:hover {
  background: var(--sticky-hover);
  }
  .action.sticky {
  background: var(--sticky);
  color: var(--ink);
  }
  .action:hover {
  background: var(--blue-dark);
  }
  .action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 8px 16px;
  border: 0;
  border-radius: var(--radius-m);
  background: var(--blue);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  }
  kbd {
  font: inherit;
  font-size: 13px;
  padding: 0 7px;
  border-radius: 6px;
  background: rgb(255 255 255 / 0.25);
  }
  .help {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--slate);
  }
  @media (min-width: 861px) and (min-height: 600px) {
  .prompt {
    grid-column: 2;
    grid-row: 2;
    margin: 0;
  }
  .help {
    grid-column: 1 / -1;
    grid-row: 3;
    margin: 0;
  }
  }
  .action:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
