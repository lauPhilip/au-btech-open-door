<script lang="ts">
  // Large close-up illustrations of the things in the story, in the same warm style as the busts (issue #21).
  // A thing without its own drawing gets a plain labelled box, so a new scenario never shows a gap.
  let { id, name }: { id: string; name: string } = $props();
</script>

<svg viewBox="0 0 400 300" role="img" aria-label="Close-up of the {name}">
  <defs>
    <linearGradient id="desk-{id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C99A68" />
      <stop offset="1" stop-color="#A8763F" />
    </linearGradient>
    <radialGradient id="glow-{id}" cx="0.5" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#FFF6E2" />
      <stop offset="1" stop-color="#F0DDBF" />
    </radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#glow-{id})" />
  <!-- the wall behind: a strip of timber slats, like the building outside -->
  <g opacity="0.35">
    {#each Array.from({ length: 14 }, (_, i) => i) as i (i)}<rect x={i * 30 + 4} y="0" width="22" height="170" fill={i % 2 ? "#D9B98A" : "#CFA970"} />{/each}
  </g>
  <rect y="170" width="400" height="130" fill="url(#desk-{id})" />
  <rect y="170" width="400" height="6" fill="#8D6A45" opacity="0.5" />

  {#if id === "visitor-book"}
    <!-- an open guest book, seen from above, with a pen -->
    <ellipse cx="200" cy="262" rx="150" ry="14" fill="#000" opacity="0.15" />
    <path d="M50 170 L200 150 L350 170 L350 250 L200 232 L50 250 Z" fill="#6B3E2A" />
    <path d="M58 172 L198 154 L198 230 L58 246 Z" fill="#FBF6EA" />
    <path d="M202 154 L342 172 L342 246 L202 230 Z" fill="#F7F0DF" />
    <path d="M200 152 L200 232" stroke="#B9A88A" stroke-width="3" />
    {#each [0, 1, 2, 3, 4] as i (i)}
      <path d={`M70 ${184 + i * 12} L190 ${170 + i * 12}`} stroke="#C9BFA8" stroke-width="1.5" />
      <path d={`M210 ${170 + i * 12} L330 ${184 + i * 12}`} stroke="#C9BFA8" stroke-width="1.5" />
      <path d={`M76 ${180 + i * 12} q8 -6 14 0 t14 -2 t14 0`} stroke="#33404F" stroke-width="2" fill="none" stroke-linecap="round" />
      <path d={`M214 ${168 + i * 12} q8 -4 14 0 t14 2 t14 0`} stroke="#33404F" stroke-width="2" fill="none" stroke-linecap="round" />
    {/each}
    <path d="M252 200 L338 213" stroke="#E8573F" stroke-width="3" stroke-linecap="round" opacity="0.7" />
    <g transform="rotate(-20 330 120)"><rect x="300" y="108" width="70" height="8" rx="4" fill="#1E40A8" /><rect x="364" y="108" width="12" height="8" rx="2" fill="#C9CFD8" /></g>
  {:else if id === "label-printer"}
    <ellipse cx="200" cy="268" rx="150" ry="14" fill="#000" opacity="0.15" />
    <rect x="80" y="130" width="240" height="120" rx="14" fill="#3D4A5C" />
    <rect x="80" y="130" width="240" height="30" rx="14" fill="#4B5A70" />
    <rect x="104" y="166" width="104" height="52" rx="6" fill="#EEF2FC" /><path d="M116 182 H190 M116 196 H170" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" />
    <rect x="104" y="166" width="104" height="52" rx="6" fill="none" stroke="#1F2935" stroke-width="3" />
    <circle cx="246" cy="180" r="7" fill="#E8573F" /><circle cx="270" cy="180" r="7" fill="#52C48A" /><circle cx="294" cy="180" r="7" fill="#F2C94C" />
    <rect x="236" y="204" width="68" height="10" rx="3" fill="#1F2935" />
    <!-- a strip of shipping labels coming out of the slot -->
    <path d="M236 214 L232 262 L300 262 L304 214 Z" fill="#fff" stroke="#C9CFD8" stroke-width="2" />
    {#each [0, 1, 2] as i (i)}<rect x={244 + i * 0} y={224 + i * 12} width="48" height="5" rx="2" fill="#9AA4B2" />{/each}
    <rect x="258" y="248" width="24" height="8" fill="#33404F" />
  {:else if id === "order-screen" || id === "mail-screen"}
    <ellipse cx="200" cy="272" rx="130" ry="12" fill="#000" opacity="0.15" />
    <rect x="176" y="224" width="48" height="40" fill="#33404F" /><rect x="140" y="258" width="120" height="12" rx="5" fill="#33404F" />
    <rect x="60" y="44" width="280" height="186" rx="12" fill="#33404F" />
    <rect x="72" y="56" width="256" height="162" rx="6" fill="#EEF2FC" />
    {#if id === "order-screen"}
      <rect x="72" y="56" width="256" height="26" rx="6" fill="#2E5BDB" /><text x="86" y="75" font-size="15" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">New orders</text>
      {#each [0, 1, 2, 3, 4] as i (i)}
        <rect x="84" y={94 + i * 24} width="14" height="14" rx="3" fill={i === 0 ? "#52C48A" : "#C9CFD8"} />
        <rect x="108" y={97 + i * 24} width={120 + ((i * 37) % 60)} height="8" rx="4" fill="#9AA4B2" />
        <rect x="280" y={97 + i * 24} width="34" height="8" rx="4" fill={i === 1 ? "#E8573F" : "#C9CFD8"} />
      {/each}
    {:else}
      <rect x="72" y="56" width="256" height="26" rx="6" fill="#7C5CBF" /><text x="86" y="75" font-size="15" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">Inbox</text>
      {#each [0, 1, 2, 3] as i (i)}
        <rect x="84" y={92 + i * 30} width="22" height="16" rx="2" fill={i === 0 ? "#F2C94C" : "#fff"} stroke="#9AA4B2" stroke-width="2" /><path d={`M84 ${92 + i * 30} L95 ${102 + i * 30} L106 ${92 + i * 30}`} stroke="#9AA4B2" stroke-width="2" fill="none" />
        <rect x="116" y={93 + i * 30} width={110 + ((i * 29) % 50)} height="8" rx="4" fill={i === 0 ? "#33404F" : "#9AA4B2"} />
        <rect x="116" y={105 + i * 30} width={150 + ((i * 17) % 40)} height="6" rx="3" fill="#C9CFD8" />
      {/each}
    {/if}
  {:else if id === "router"}
    <ellipse cx="200" cy="268" rx="150" ry="14" fill="#000" opacity="0.15" />
    <path d="M130 160 L110 62 M270 160 L290 62" stroke="#9AA4B2" stroke-width="10" stroke-linecap="round" />
    <rect x="70" y="150" width="260" height="96" rx="14" fill="#fff" stroke="#9AA4B2" stroke-width="4" />
    {#each [0, 1, 2, 3, 4] as i (i)}<circle cx={104 + i * 34} cy="198" r="8" fill={i === 3 ? "#E8573F" : "#52C48A"} />{/each}
    <rect x="96" y="222" width="208" height="8" rx="4" fill="#C9CFD8" />
    <path d="M110 246 C100 280 60 286 40 276 M200 246 C200 286 260 290 290 278 M290 246 C300 276 340 282 366 270" fill="none" stroke="#2E5BDB" stroke-width="6" stroke-linecap="round" />
    <path d="M150 246 C150 276 120 292 90 290" fill="none" stroke="#E8573F" stroke-width="6" stroke-linecap="round" />
  {:else if id === "invoice-tray"}
    <ellipse cx="200" cy="270" rx="150" ry="14" fill="#000" opacity="0.15" />
    <rect x="80" y="226" width="240" height="36" rx="6" fill="#7A5A3A" />
    <g transform="rotate(-3 200 200)"><rect x="96" y="166" width="200" height="62" fill="#fff" stroke="#C9CFD8" stroke-width="2" /></g>
    <g transform="rotate(2 200 190)"><rect x="104" y="150" width="200" height="66" fill="#FBF6EA" stroke="#C9CFD8" stroke-width="2" /></g>
    <g transform="rotate(-1 200 180)">
      <rect x="110" y="132" width="196" height="72" fill="#fff" stroke="#C9CFD8" stroke-width="2" />
      <text x="124" y="154" font-size="14" font-weight="700" fill="#33404F" font-family="system-ui, sans-serif">INVOICE</text>
      {#each [0, 1, 2] as i (i)}<rect x="124" y={164 + i * 11} width={150 - i * 24} height="5" rx="2" fill="#9AA4B2" />{/each}
      <rect x="250" y="140" width="40" height="22" rx="3" fill="none" stroke="#E8573F" stroke-width="2" />
    </g>
    <rect x="292" y="220" width="40" height="30" rx="3" fill="#F6E7B8" stroke="#C9B77A" stroke-width="2" /><path d="M292 220 L312 236 L332 220" fill="none" stroke="#C9B77A" stroke-width="2" />
  {:else}
    <ellipse cx="200" cy="268" rx="130" ry="12" fill="#000" opacity="0.15" />
    <rect x="130" y="130" width="140" height="120" rx="12" fill="#E3ECF8" stroke="#7F9CC7" stroke-width="5" />
    <path d="M160 170 H240 M160 200 H220" stroke="#4A6A9C" stroke-width="8" stroke-linecap="round" />
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-m);
  }
</style>
