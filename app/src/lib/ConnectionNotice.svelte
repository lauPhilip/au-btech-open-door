<script lang="ts">
  import type { GameConnection } from "./game.svelte";

  /** What a student needs to know about the connection: errors stay until closed, and a drop never feels like lost work. */
  let { connection }: { connection: GameConnection } = $props();
  const offline = $derived(connection.status !== "connected");
</script>

<div class="notices">
  {#if connection.error}
    <p class="notice error" role="alert">
      <span>{connection.error}</span>
      <button aria-label="Close this message" onclick={() => connection.dismissError()}>×</button>
    </p>
  {/if}
  {#if offline && connection.status === "reconnecting"}
    <p class="notice info" role="status">The connection dropped. Trying again. Your notes are safe.</p>
  {:else if connection.reconnected}
    <p class="notice ok" role="status">Back online. Your notes are safe.</p>
  {/if}
</div>

<style>
  .notices { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: var(--z-overlay); width: min(560px, calc(100vw - 24px)); display: grid; gap: 8px; pointer-events: none; }
  .notice { margin: 0; padding: 10px 14px; border-radius: var(--radius-m); font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: var(--shadow-2); pointer-events: auto; }
  .error { background: var(--alert-dark); color: #fff; }
  .info { background: var(--warn-soft); color: var(--warn-ink); border: 1px solid var(--warn-edge); }
  .ok { background: var(--safe-soft); color: var(--safe-dark); border: 1px solid var(--safe-dark); }
  button { flex: none; min-width: 44px; min-height: 44px; font-size: 26px; line-height: 1; background: transparent; border: none; color: inherit; cursor: pointer; }
</style>
