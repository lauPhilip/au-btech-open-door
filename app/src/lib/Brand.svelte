<script lang="ts">
  let { size = 36 }: { size?: number } = $props();
</script>

<div class="brand">
  <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true"><rect x="14" y="6" width="44" height="62" rx="8" fill="#2E5BDB"></rect><path d="M22 14 L46 10 L46 66 L22 62 Z" fill="#FFE27A"></path></svg>
  <span>Open Door</span>
</div>

<style>
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 20px;
  }
</style>
