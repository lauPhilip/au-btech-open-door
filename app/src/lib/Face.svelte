<script lang="ts">
  import { faceLook } from "@open-door/shared";

  let { face, size = 48, label }: { face: number; size?: number; label?: string } = $props();
  const look = $derived(faceLook(face));
</script>

<!-- A friendly round face. Drawn from three choices so the set is varied, never a caricature. -->
<svg width={size} height={size} viewBox="0 0 64 64" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"}>
  <circle cx="32" cy="32" r="31" fill="#EEF2FC" />
  {#if look.style === "long"}
    <path d="M14 30 C14 12 50 12 50 30 L52 54 L12 54 Z" fill={look.hair} />
  {:else if look.style === "bun"}
    <circle cx="32" cy="10" r="8" fill={look.hair} />
  {/if}
  <circle cx="32" cy="34" r="17" fill={look.skin} />
  {#if look.style === "short"}
    <path d="M15 31 C15 14 49 14 49 31 C44 24 22 22 15 31 Z" fill={look.hair} />
  {:else if look.style === "long"}
    <path d="M15 32 C16 16 48 16 49 32 C42 22 24 22 15 32 Z" fill={look.hair} />
  {:else if look.style === "bun"}
    <path d="M15 31 C16 16 48 16 49 31 C42 23 22 23 15 31 Z" fill={look.hair} />
  {:else if look.style === "curls"}
    <g fill={look.hair}>
      <circle cx="18" cy="26" r="6" /><circle cx="25" cy="20" r="6" /><circle cx="33" cy="18" r="6" /><circle cx="41" cy="20" r="6" /><circle cx="47" cy="26" r="6" />
    </g>
  {:else}
    <path d="M14 29 C14 15 50 15 50 29 Z" fill="#2E5BDB" />
    <rect x="30" y="26" width="24" height="5" rx="2.5" fill="#1E40A8" />
  {/if}
  <circle cx="26" cy="36" r="2.2" fill="#1C2430" />
  <circle cx="38" cy="36" r="2.2" fill="#1C2430" />
  <path d="M26 43 Q32 48 38 43" stroke="#1C2430" stroke-width="2.4" fill="none" stroke-linecap="round" />
</svg>
