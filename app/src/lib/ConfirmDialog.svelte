<script lang="ts">
  import type { Snippet } from "svelte";

  /** A question that needs a yes or no. The safe answer is focused first and Escape picks it. */
  let {
    open,
    title,
    children,
    safe,
    risky,
    onsafe,
    onrisky,
    extra,
  }: {
    open: boolean;
    title: string;
    children: Snippet;
    safe: string;
    risky: string;
    onsafe: () => void;
    onrisky: () => void;
    /** An optional third action, shown first (for example "Download the class record"). */
    extra?: Snippet;
  } = $props();

  const uid = $props.id();
  let dialog: HTMLDialogElement | undefined = $state();
  let safeButton: HTMLButtonElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      safeButton?.focus();
    } else if (!open && dialog.open) dialog.close();
  });
</script>

<dialog bind:this={dialog} aria-labelledby="{uid}-title" oncancel={(e) => { e.preventDefault(); onsafe(); }}>
  <h2 id="{uid}-title">{title}</h2>
  <div class="body">{@render children()}</div>
  <div class="actions">
    {#if extra}{@render extra()}{/if}
    <button bind:this={safeButton} class="primary" onclick={onsafe}>{safe}</button>
    <button class="plain" onclick={onrisky}>{risky}</button>
  </div>
</dialog>

<style>
  dialog { width: min(480px, calc(100vw - 32px)); border: none; border-radius: var(--radius-l); padding: 24px; box-shadow: var(--shadow-2); color: var(--ink); background: var(--paper); }
  dialog::backdrop { background: rgb(20 24 40 / 0.55); }
  h2 { margin: 0 0 10px; font-size: 24px; }
  .body { margin-bottom: 18px; color: var(--ink); }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .actions :global(button), .actions button { min-height: 48px; padding: 0 18px; font: inherit; font-weight: 700; cursor: pointer; border-radius: var(--radius-m); border: 2px solid var(--blue); background: var(--paper); color: var(--blue); }
  .primary { background: var(--blue); color: #fff; }
  .plain { border-color: var(--line); color: var(--ink); }
  .actions :global(button.primary) { background: var(--blue); color: #fff; }
</style>
