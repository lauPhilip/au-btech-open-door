<script lang="ts">
  // The room view (issue #21): the inside of the room you are standing in, drawn as one warm illustration.
  // It shows the same people and things as the top-down map, so you can walk the building door to door.
  import { spots, type Player, type Scenario, type Spot } from "@open-door/shared";
  import Bust from "./Bust.svelte";

  let {
    scenario,
    roomId,
    others = [],
    onspot,
    onroom,
  }: {
    scenario: Scenario;
    /** The room you are in, or null in a corridor. */
    roomId: string | null;
    /** Teammates in the same room. */
    others?: Player[];
    onspot: (spot: Spot) => void;
    onroom: (id: string) => void;
  } = $props();

  const W = 800;
  const H = 450;
  const room = $derived(scenario.map.rooms.find((r) => r.id === roomId));
  const here = $derived(roomId ? spots(scenario).filter((s) => s.room === roomId) : []);

  /** Where a thing stands in the scene. Anything not listed is placed in a row along the middle. */
  const THING_AT: Record<string, { x: number; y: number }> = {
    "label-printer": { x: 330, y: 300 },
    "order-screen": { x: 330, y: 190 },
    router: { x: 330, y: 215 },
    "visitor-book": { x: 330, y: 300 },
    "invoice-tray": { x: 330, y: 295 },
  };
  const PERSON_AT = { x: 620, y: 290 };

  function place(spot: Spot, index: number): { x: number; y: number } {
    if (spot.kind === "thing") return THING_AT[spot.id] ?? { x: 200 + index * 140, y: 300 };
    return { x: PERSON_AT.x - index * 130, y: PERSON_AT.y };
  }
  const placed = $derived(
    here.map((spot, i) => ({ spot, ...place(spot, spot.kind === "thing" ? here.filter((s) => s.kind === "thing").indexOf(spot) : here.filter((s) => s.kind === "person").indexOf(spot)), i })),
  );
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
</script>

<section class="scene" aria-label={room ? `Inside the ${room.name}` : "In the corridor"}>
  {#if room}
    <div class="frame">
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="Illustration of the {room.name}">
        <rect width={W} height="260" fill="#F6EBDC" />
        <rect y="252" width={W} height="10" fill="#E6D3B8" />
        <rect y="262" width={W} height={H - 262} fill="#DCC6A6" />
        {#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x={i * 140 - 30} y="262" width="70" height={H - 262} fill="#000" opacity="0.025" />{/each}
        <!-- door and window are the same everywhere, so every room feels like the same building -->
        <rect x="40" y="70" width="90" height="182" rx="6" fill="#2E5BDB" opacity="0.9" /><rect x="52" y="82" width="66" height="160" rx="3" fill="#4F78EA" /><circle cx="108" cy="170" r="5" fill="#FFE27A" />
        <rect x="620" y="60" width="130" height="100" rx="6" fill="#CFE4F5" stroke="#B7A98F" stroke-width="6" /><path d="M685 60 V160 M620 110 H750" stroke="#B7A98F" stroke-width="4" />

        {#if roomId === "packing"}
          <rect x="190" y="130" width="140" height="10" fill="#B58B5A" /><rect x="190" y="180" width="140" height="10" fill="#B58B5A" /><rect x="196" y="140" width="40" height="40" fill="#C99A68" /><rect x="244" y="148" width="50" height="32" fill="#D7AE7C" /><rect x="200" y="90" width="52" height="40" fill="#D7AE7C" />
          <rect x="250" y="270" width="190" height="14" rx="3" fill="#8D6A45" /><rect x="262" y="284" width="10" height="70" fill="#7A5A3A" /><rect x="418" y="284" width="10" height="70" fill="#7A5A3A" />
          <rect x="300" y="236" width="76" height="34" rx="6" fill="#3D4A5C" /><rect x="312" y="244" width="30" height="8" rx="2" fill="#fff" /><circle cx="360" cy="248" r="4" fill="#E8573F" /><rect x="304" y="262" width="68" height="6" fill="#fff" />
          <rect x="480" y="300" width="70" height="56" fill="#C99A68" /><rect x="500" y="262" width="60" height="42" fill="#D7AE7C" />
        {:else if roomId === "server"}
          <rect x="450" y="90" width="120" height="250" rx="6" fill="#33404F" />
          {#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x="462" y={104 + i * 36} width="96" height="26" rx="3" fill="#46556A" /><circle cx="474" cy={117 + i * 36} r="3.5" fill={i % 3 === 1 ? "#E8573F" : "#52C48A"} /><circle cx="488" cy={117 + i * 36} r="3.5" fill="#52C48A" />{/each}
          <rect x="260" y="226" width="130" height="14" rx="3" fill="#8D6A45" /><rect x="296" y="196" width="58" height="30" rx="5" fill="#fff" stroke="#9AA4B2" stroke-width="3" /><path d="M308 196 L300 168 M342 196 L350 168" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" /><circle cx="312" cy="212" r="3" fill="#52C48A" /><circle cx="324" cy="212" r="3" fill="#52C48A" />
          <path d="M520 340 C540 380 600 390 640 360" fill="none" stroke="#2E5BDB" stroke-width="5" /><path d="M530 340 C550 396 620 400 660 370" fill="none" stroke="#E8573F" stroke-width="5" />
        {:else if roomId === "reception"}
          <rect x="230" y="262" width="230" height="80" rx="6" fill="#B58B5A" /><rect x="230" y="256" width="230" height="14" rx="4" fill="#C99A68" /><rect x="290" y="244" width="70" height="14" rx="2" fill="#fff" stroke="#9AA4B2" stroke-width="2" />
          <rect x="250" y="90" width="150" height="46" rx="6" fill="#2E5BDB" /><text x="325" y="121" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">Reception</text>
          <rect x="500" y="300" width="30" height="50" rx="4" fill="#A8683C" /><circle cx="515" cy="286" r="24" fill="#4E9D6E" /><circle cx="498" cy="296" r="16" fill="#5DB07F" />
        {:else if roomId === "webshop"}
          <rect x="220" y="262" width="200" height="14" rx="3" fill="#8D6A45" /><rect x="240" y="276" width="10" height="70" fill="#7A5A3A" /><rect x="390" y="276" width="10" height="70" fill="#7A5A3A" />
          <rect x="260" y="150" width="130" height="86" rx="6" fill="#33404F" /><rect x="268" y="158" width="114" height="70" rx="3" fill="#EEF2FC" />
          {#each [0, 1, 2, 3, 4] as i (i)}<rect x="276" y={166 + i * 12} width={70 + (i % 3) * 10} height="6" rx="3" fill={i === 1 ? "#E8573F" : "#9AA4B2"} />{/each}
          <rect x="316" y="236" width="14" height="26" fill="#33404F" /><rect x="470" y="150" width="90" height="62" rx="5" fill="#33404F" /><rect x="476" y="156" width="78" height="50" rx="3" fill="#CFE4F5" />
        {:else if roomId === "accounting"}
          <rect x="220" y="262" width="210" height="14" rx="3" fill="#8D6A45" /><rect x="236" y="276" width="10" height="70" fill="#7A5A3A" /><rect x="404" y="276" width="10" height="70" fill="#7A5A3A" />
          <rect x="300" y="248" width="80" height="16" rx="3" fill="#C99A68" /><rect x="306" y="240" width="68" height="10" fill="#fff" /><rect x="310" y="232" width="60" height="10" fill="#F6F0E4" />
          <rect x="470" y="110" width="120" height="150" rx="4" fill="#B58B5A" />{#each [0, 1, 2] as i (i)}<rect x="480" y={120 + i * 46} width="100" height="36" rx="3" fill="#C99A68" /><rect x="520" y={134 + i * 46} width="20" height="6" rx="2" fill="#7A5A3A" />{/each}
        {:else if roomId === "ceo"}
          <rect x="180" y="262" width="270" height="18" rx="4" fill="#6E4B2E" /><rect x="200" y="280" width="14" height="76" fill="#5B3D25" /><rect x="420" y="280" width="14" height="76" fill="#5B3D25" />
          <rect x="260" y="226" width="90" height="44" rx="5" fill="#33404F" /><rect x="266" y="232" width="78" height="32" rx="3" fill="#EEF2FC" />
          <rect x="470" y="96" width="110" height="80" rx="3" fill="#fff" stroke="#B7A98F" stroke-width="5" /><path d="M482 160 L508 128 L530 150 L548 124 L568 160 Z" fill="#8FB8DE" />
        {:else if roomId === "meeting"}
          <ellipse cx="380" cy="320" rx="190" ry="44" fill="#8D6A45" />{#each [220, 300, 380, 460, 540] as x (x)}<rect x={x - 18} y="350" width="36" height="34" rx="8" fill="#3D4A5C" />{/each}
          <rect x="260" y="96" width="260" height="110" rx="4" fill="#fff" stroke="#B7A98F" stroke-width="5" /><path d="M280 130 H420 M280 156 H480 M280 182 H380" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" />
        {:else if roomId === "warehouse"}
          {#each [0, 1, 2] as i (i)}<rect x={190 + i * 190} y="120" width="150" height="190" fill="none" stroke="#7A5A3A" stroke-width="7" /><path d={`M${190 + i * 190} 184 H${340 + i * 190} M${190 + i * 190} 248 H${340 + i * 190}`} stroke="#7A5A3A" stroke-width="7" />
            <rect x={200 + i * 190} y="132" width="50" height="46" fill="#D7AE7C" /><rect x={262 + i * 190} y="140" width="64" height="38" fill="#C99A68" /><rect x={204 + i * 190} y="196" width="70" height="46" fill="#C99A68" /><rect x={286 + i * 190} y="204" width="44" height="38" fill="#D7AE7C" />{/each}
        {:else if roomId === "dock"}
          <rect x="230" y="110" width="260" height="170" fill="#8C97A6" /><path d="M230 140 H490 M230 170 H490 M230 200 H490 M230 230 H490 M230 260 H490" stroke="#7A8594" stroke-width="3" /><rect x="230" y="262" width="260" height="14" fill="#E9C13C" />
          <rect x="520" y="230" width="90" height="120" fill="#D7AE7C" /><rect x="540" y="196" width="80" height="40" fill="#C99A68" />
        {/if}

        {#each placed as p (p.spot.kind + p.spot.id)}
          {#if p.spot.kind === "person"}
            <ellipse cx={p.x} cy={p.y + 62} rx="46" ry="9" fill="#000" opacity="0.12" />
          {/if}
        {/each}
      </svg>

      {#each placed as p (p.spot.kind + p.spot.id)}
        <button
          class="hot"
          class:person={p.spot.kind === "person"}
          style="left: {pct(p.x, W)}; top: {pct(p.y, H)}"
          aria-label={p.spot.kind === "person" ? `Talk to ${p.spot.name}` : `Look at ${p.spot.name}`}
          onclick={() => onspot(p.spot)}
        >
          {#if p.spot.kind === "person"}<span class="bust"><Bust id={p.spot.id} size={92} /></span>{:else}<span class="ring" aria-hidden="true"></span>{/if}
          <span class="name">{p.spot.name}</span>
        </button>
      {/each}

      {#if others.length > 0}
        <p class="with" aria-label="Teammates here"><span class="eyebrow">With you</span> {others.map((o) => o.name).join(", ")}</p>
      {/if}
    </div>
  {:else}
    <div class="corridor" role="status">
      <p class="big">Walking in the corridor…</p>
      <p>Pick a door below, or use the map.</p>
    </div>
  {/if}

  <nav class="doors" aria-label="Doors to other rooms">
    <span class="eyebrow">Doors</span>
    {#each scenario.map.rooms.filter((r) => r.id !== roomId) as r (r.id)}
      <button onclick={() => onroom(r.id)}>{r.name}</button>
    {/each}
  </nav>
</section>

<style>
  .scene { display: flex; flex-direction: column; gap: 10px; }
  .frame { container-type: inline-size; position: relative; border-radius: var(--radius-l); overflow: hidden; background: #f6ebdc; box-shadow: 0 1px 2px rgba(28, 36, 48, 0.08); }
  svg { display: block; width: 100%; height: auto; }
  .hot {
    position: absolute; transform: translate(-50%, -50%); min-width: 44px; min-height: 44px; padding: 0; border: none; background: transparent;
    display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; font: inherit;
  }
  .bust { border-radius: 50%; box-shadow: 0 3px 10px rgba(28, 36, 48, 0.25); line-height: 0; border: 3px solid #fff; }
  .bust :global(svg) { width: clamp(56px, 12cqw, 92px); height: auto; }
  .ring { width: clamp(44px, 8cqw, 64px); height: clamp(44px, 8cqw, 64px); border-radius: 50%; border: 3px dashed var(--blue); background: rgba(46, 91, 219, 0.08); }
  .name { background: var(--paper); color: var(--ink); border-radius: 999px; padding: 4px 12px; font-weight: 700; font-size: clamp(12px, 2cqw, 15px); box-shadow: 0 1px 3px rgba(28, 36, 48, 0.25); }
  .hot:hover .name, .hot:focus-visible .name { background: var(--blue); color: #fff; }
  .hot:hover .ring { background: rgba(46, 91, 219, 0.2); }
  .with { position: absolute; left: 12px; bottom: 10px; margin: 0; background: var(--paper); border-radius: 999px; padding: 6px 14px; font-weight: 600; }
  .eyebrow { color: var(--slate); font-weight: 700; margin-right: 6px; }
  .corridor { background: var(--paper); border-radius: var(--radius-l); padding: 40px 24px; text-align: center; }
  .corridor .big { font-size: 24px; font-weight: 700; margin: 0 0 4px; }
  .corridor p { margin: 0; }
  .doors { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .doors button {
    min-height: 44px; padding: 0 14px; border-radius: 999px; border: 2px solid var(--line); background: var(--paper); font: inherit; font-weight: 600; cursor: pointer; color: var(--ink);
  }
  .doors button:hover { border-color: var(--blue); }
</style>
