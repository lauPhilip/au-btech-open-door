<script lang="ts">
  // Own illustrations in one warm style: a round bust for each person in the story (issue #21).
  // The look of each person is a few choices, so a new scenario can add people without new artwork.
  type Hair = "short" | "bun" | "long" | "cap" | "bald" | "curly";
  interface Look {
    skin: string;
    hair: string;
    style: Hair;
    shirt: string;
    glasses?: boolean;
    beard?: boolean;
    lanyard?: boolean;
    headset?: boolean;
    bg: string;
  }

  const LOOKS: Record<string, Look> = {
    karin: { skin: "#E8B796", hair: "#B9B3AA", style: "bun", shirt: "#1E40A8", bg: "#FBE9DA" },
    mei: { skin: "#F1C9A5", hair: "#2B2B2B", style: "long", shirt: "#E8573F", headset: true, bg: "#FDE6E0" },
    ahmed: { skin: "#B07A4F", hair: "#1F1A17", style: "short", shirt: "#2F7D5B", glasses: true, beard: true, bg: "#E2F1E9" },
    jana: { skin: "#D9A27A", hair: "#8A4B22", style: "cap", shirt: "#F2A93B", lanyard: true, bg: "#FFF0D6" },
    elena: { skin: "#F3D2B5", hair: "#C98B3C", style: "long", shirt: "#7C5CBF", glasses: true, bg: "#EEE8F8" },
    tomas: { skin: "#8C5A3A", hair: "#1F1A17", style: "bald", shirt: "#E9C13C", beard: true, bg: "#EAF0F7" },
  };
  const FALLBACK: Look[] = [
    { skin: "#E8B796", hair: "#3A2A20", style: "short", shirt: "#2E5BDB", bg: "#EEF2FC" },
    { skin: "#C98B62", hair: "#1F1A17", style: "curly", shirt: "#2F7D5B", bg: "#E2F1E9" },
    { skin: "#F1C9A5", hair: "#7A4A26", style: "long", shirt: "#E8573F", bg: "#FDE6E0" },
  ];

  let { id, size = 96, label = "" }: { id: string; size?: number; label?: string } = $props();
  const look = $derived(LOOKS[id] ?? FALLBACK[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % FALLBACK.length]!);
  const dark = $derived(look.skin);
</script>

<svg width={size} height={size} viewBox="0 0 100 100" role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
  <circle cx="50" cy="50" r="49" fill={look.bg} />
  <clipPath id="clip-{id}"><circle cx="50" cy="50" r="49" /></clipPath>
  <g clip-path="url(#clip-{id})">
    {#if look.style === "long"}<path d="M29 46 C26 20 42 13 50 13 C60 13 74 20 71 46 L74 84 L26 84 Z" fill={look.hair} />{/if}
    <path d="M10 100 C12 74 32 68 50 68 C68 68 88 74 90 100 Z" fill={look.shirt} />
    {#if look.lanyard}
      <path d="M40 69 L50 86 L60 69" fill="none" stroke="#1C2430" stroke-width="2.2" /><rect x="46" y="85" width="9" height="11" rx="1.5" fill="#fff" stroke="#1C2430" stroke-width="1.2" />
    {/if}
    <rect x="43" y="54" width="14" height="18" rx="5" fill={dark} />
    <path d="M43 62 Q50 68 57 62" fill="#000" opacity="0.08" />
    <ellipse cx="50" cy="42" rx="17" ry="20" fill={look.skin} />
    {#if look.beard}<path d="M34 46 C36 62 44 64 50 64 C56 64 64 62 66 46 C62 54 56 56 50 56 C44 56 38 54 34 46 Z" fill={look.hair} />{/if}
    {#if look.style === "short"}<path d="M33 40 C31 21 43 17 50 17 C60 17 69 23 67 40 C62 31 56 28 50 28 C44 28 38 31 33 40 Z" fill={look.hair} />{/if}
    {#if look.style === "bun"}<circle cx="50" cy="14" r="8" fill={look.hair} /><path d="M33 40 C31 21 43 18 50 18 C60 18 69 23 67 40 C62 31 56 27 50 27 C44 27 38 31 33 40 Z" fill={look.hair} />{/if}
    {#if look.style === "long"}<path d="M33 42 C31 22 43 18 50 18 C60 18 69 23 67 42 C62 32 56 28 50 28 C44 28 38 32 33 42 Z" fill={look.hair} />{/if}
    {#if look.style === "cap"}
      <path d="M32 38 C32 20 44 16 50 16 C60 16 69 22 68 38 Z" fill={look.shirt} /><path d="M30 38 H74 C74 41 70 42 64 42 H32 Z" fill={look.shirt} />
      <path d="M32 40 C28 40 30 44 34 44" fill={look.hair} />
    {/if}
    {#if look.style === "curly"}
      {#each [[36, 28], [44, 22], [52, 21], [60, 24], [66, 32], [34, 36]] as [cx, cy] (cx)}<circle {cx} {cy} r="8" fill={look.hair} />{/each}
    {/if}
    <circle cx="43" cy="44" r="1.9" fill="#1C2430" /><circle cx="57" cy="44" r="1.9" fill="#1C2430" />
    <path d="M44 52 Q50 57 56 52" fill="none" stroke="#1C2430" stroke-width="1.8" stroke-linecap="round" />
    {#if look.glasses}
      <circle cx="43" cy="44" r="5.5" fill="none" stroke="#1C2430" stroke-width="1.6" /><circle cx="57" cy="44" r="5.5" fill="none" stroke="#1C2430" stroke-width="1.6" /><path d="M48.5 44 H51.5" stroke="#1C2430" stroke-width="1.6" />
    {/if}
    {#if look.headset}<path d="M32 44 C30 20 70 20 68 44" fill="none" stroke="#1C2430" stroke-width="2.4" /><rect x="29" y="42" width="6" height="11" rx="3" fill="#1C2430" /><path d="M32 53 Q34 60 44 58" fill="none" stroke="#1C2430" stroke-width="1.8" />{/if}
  </g>
</svg>
