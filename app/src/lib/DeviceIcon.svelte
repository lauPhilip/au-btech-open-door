<script lang="ts">
  import type { Device } from "@open-door/shared";

  let { device, size = 20 }: { device: Device; size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label={device}>
  {#if device === "phone"}
    <rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path>
  {:else if device === "tablet"}
    <rect x="4" y="2" width="16" height="20" rx="2"></rect><path d="M11 18h2"></path>
  {:else}
    <rect x="3" y="4" width="18" height="12" rx="1"></rect><path d="M1 20h22"></path>
  {/if}
</svg>
