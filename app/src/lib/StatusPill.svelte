<script lang="ts">
  import type { Status } from "./room.svelte";

  let { status }: { status: Status } = $props();
</script>

<span class="pill {status}" role="status">
  {#if status === "connected"}Connected{:else if status === "reconnecting"}Reconnecting…{:else}Connecting…{/if}
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    background: var(--mist);
    color: var(--slate);
  }
  .pill::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
  .connected {
    background: #e3f4ec;
    color: var(--safe-dark);
  }
  .reconnecting {
    background: #fdeae6;
    color: var(--alert-dark);
  }
</style>
