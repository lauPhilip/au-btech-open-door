<script lang="ts">
  import { LOCALES } from "./i18n";
  import { i18n, t } from "./i18n.svelte";
</script>

<div class="lang" role="group" aria-label={t("language.label")}>
  {#each LOCALES as l (l.id)}
    <button aria-pressed={i18n.locale === l.id} lang={l.id} onclick={() => i18n.set(l.id)}>{l.name}</button>
  {/each}
</div>

<style>
  .lang { display: inline-flex; border: 2px solid var(--line); border-radius: 999px; overflow: hidden; background: var(--paper); }
  button { min-height: 44px; padding: 0 14px; border: none; background: transparent; font: inherit; font-weight: 700; color: var(--ink); cursor: pointer; }
  button[aria-pressed="true"] { background: var(--blue); color: #fff; }
</style>
