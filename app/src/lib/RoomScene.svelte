<script lang="ts">
  // The room view (issue #21): the inside of the room you are standing in, with your own character in it.
  // It shows the same people and things as the top-down map. Walk to a door and the view slides to the next room.
  import { fly } from "svelte/transition";
  import { spots, type Player, type Scenario, type Spot } from "@open-door/shared";
  import type { Point } from "./movement";
  import Bust from "./Bust.svelte";
  import Face from "./Face.svelte";

  let {
    scenario,
    roomId,
    others = [],
    you = null,
    position = null,
    onspot,
    onroom,
    onwalk,
  }: {
    scenario: Scenario;
    /** The room you are in, or null in a corridor (the last room stays on screen until you reach the next). */
    roomId: string | null;
    /** Teammates in the same room. */
    others?: Player[];
    /** Your own character: face and team colour. */
    you?: { face: number; color: string; name: string } | null;
    /** Where you stand on the map; the scene draws you at the matching place in the room. */
    position?: Point | null;
    onspot: (spot: Spot) => void;
    onroom: (id: string) => void;
    /** Tapped on the floor: walk there (map coordinates). */
    onwalk?: (x: number, y: number) => void;
  } = $props();

  // Painted pictures of the rooms (one per room id). A room without a picture falls back to the drawn scene below.
  const pictures = import.meta.glob("../assets/art/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
  const art: Record<string, string> = {};
  for (const [path, url] of Object.entries(pictures)) art[path.split("/").pop()!.replace(".webp", "")] = url;
  /** Where the things worth looking at are in each painted room (scene units). */
  const ART_SPOTS: Record<string, { x: number; y: number }> = {
    "order-screen": { x: 311, y: 135 },
    "invoice-tray": { x: 461, y: 205 },
    "mail-screen": { x: 316, y: 176 },
    "visitor-book": { x: 305, y: 236 },
    router: { x: 391, y: 219 },
    "label-printer": { x: 559, y: 224 },
  };
  // Fetch the other pictures quietly so a door opens without a pause.
  $effect(() => {
    for (const url of Object.values(art)) new Image().src = url;
  });

  const W = 800;
  const H = 450;
  const SIDE = 90; // floor margin at each side of the scene
  const rooms = $derived(scenario.map.rooms);
  const startId = $derived(rooms.find((r) => r.start)?.id ?? rooms[0]?.id ?? null);

  // While you cross the corridor between two rooms, keep showing the room you just left.
  // svelte-ignore state_referenced_locally
  let shownId = $state<string | null>(roomId ?? startId);
  let slide = $state(1);
  $effect(() => {
    if (roomId && roomId !== shownId) {
      const from = rooms.find((r) => r.id === shownId);
      const to = rooms.find((r) => r.id === roomId);
      if (from && to) slide = center(to).x + center(to).y * 0.001 >= center(from).x + center(from).y * 0.001 ? 1 : -1;
      shownId = roomId;
    }
  });
  const room = $derived(rooms.find((r) => r.id === shownId));
  const here = $derived(shownId ? spots(scenario).filter((s) => s.room === shownId) : []);
  const reduceMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function center(r: { rect: [number, number, number, number] }): Point {
    return { x: r.rect[0] + r.rect[2] / 2, y: r.rect[1] + r.rect[3] / 2 };
  }

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  /** Map coordinates to a place on the floor of the scene. */
  function toScene(p: Point): Point {
    if (!room) return { x: W / 2, y: 340 };
    const [rx, ry, rw, rh] = room.rect;
    return { x: SIDE + clamp01((p.x - rx) / rw) * (W - 2 * SIDE), y: 312 + clamp01((p.y - ry) / rh) * 84 };
  }
  /** A tap on the floor back to map coordinates. */
  function toMap(sx: number, sy: number): Point {
    const [rx, ry, rw, rh] = room!.rect;
    return { x: rx + clamp01((sx - SIDE) / (W - 2 * SIDE)) * rw, y: ry + clamp01((sy - 312) / 84) * rh };
  }

  /** Where a thing stands up on its table or shelf; people stand on the floor. */
  const THING_Y: Record<string, number> = { "label-printer": 290, "order-screen": 200, router: 215, "visitor-book": 290, "invoice-tray": 295, "mail-screen": 205 };
  function place(spot: Spot): Point {
    const x = toScene({ x: spot.x, y: spot.y }).x;
    const painted = spot.kind === "thing" && shownId && art[shownId] ? ART_SPOTS[spot.id] : undefined;
    if (painted) return painted;
    return { x, y: spot.kind === "thing" ? (THING_Y[spot.id] ?? 290) : 280 };
  }
  const placed = $derived(here.map((spot) => ({ spot, ...place(spot) })));

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const me = $derived(position ? toScene(position) : null);
  const mates = $derived(others.map((p) => ({ p, ...toScene({ x: p.x, y: p.y }) })));

  /** The nearest room in each direction from here: these are the doors in the walls. */
  const doors = $derived.by(() => {
    const result: { dir: "left" | "right" | "up" | "down"; room: { id: string; name: string } }[] = [];
    if (!room) return result;
    const from = center(room);
    for (const dir of ["left", "right", "up", "down"] as const) {
      let best: { id: string; name: string } | null = null;
      let bestGap = Infinity;
      for (const r of rooms) {
        if (r.id === room.id) continue;
        const c = center(r);
        const dx = c.x - from.x;
        const dy = c.y - from.y;
        const heading = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
        const gap = Math.hypot(dx, dy);
        if (heading === dir && gap < bestGap) {
          best = r;
          bestGap = gap;
        }
      }
      if (best) result.push({ dir, room: best });
    }
    return result;
  });
  const arrow = { left: "◀", right: "▶", up: "▲", down: "▼" } as const;

  function floorTap(event: MouseEvent) {
    if (!onwalk || !room || (event.target as HTMLElement).closest("button")) return;
    const frame = event.currentTarget as HTMLElement;
    const box = frame.getBoundingClientRect();
    const sx = ((event.clientX - box.left) / box.width) * W;
    const sy = ((event.clientY - box.top) / box.height) * H;
    if (sy < 262) return;
    const to = toMap(sx, sy);
    onwalk(to.x, to.y);
  }
</script>

<section class="scene" aria-label={room ? `Inside the ${room.name}` : "In the corridor"}>
  {#if room}
    {#key shownId}
      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="frame" onclick={floorTap} in:fly={{ x: reduceMotion ? 0 : slide * 90, duration: reduceMotion ? 0 : 320 }}>
        <svg viewBox="0 0 {W} {H}" role="img" aria-label="Illustration of the {room.name}">
          {#if shownId && art[shownId]}
            <image href={art[shownId]} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
          {:else}
          <defs>
            <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF3E6" /><stop offset="1" stop-color="#F1E2CC" /></linearGradient>
            <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9BF98" /><stop offset="1" stop-color="#C4A47A" /></linearGradient>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE6F5" /><stop offset="0.62" stop-color="#E8F2F7" /><stop offset="0.62" stop-color="#8DB46B" /><stop offset="1" stop-color="#6F9A4A" /></linearGradient>
            <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3C9" stop-opacity="0.55" /><stop offset="1" stop-color="#FFF3C9" stop-opacity="0" /></linearGradient>
            <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#3a2a18" stop-opacity="0" /><stop offset="1" stop-color="#3a2a18" stop-opacity="0.22" /></radialGradient>
            <filter id="soft" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#3a2a18" flood-opacity="0.22" /></filter>
          </defs>
          <!-- the back wall: plaster above, a band of timber slats below, like the Herning campus building -->
          <rect width={W} height="262" fill="url(#wall)" />
          <g>{#each Array.from({ length: 40 }, (_, i) => i) as i (i)}<rect x={i * 20 + 1} y="168" width="17" height="86" fill={["#C9A06B", "#BF9660", "#D2AA76", "#C49B66"][i % 4]} />{/each}</g>
          <rect y="162" width={W} height="8" fill="#9C7647" /><rect y="252" width={W} height="10" fill="#8A6538" />
          <!-- a long glass band onto the green roof and the pond -->
          <rect x="150" y="22" width="500" height="64" rx="4" fill="url(#sky)" />
          <path d="M150 64 Q 260 58 380 66 T 650 62 V86 H150 Z" fill="#7FB0C7" opacity="0.55" />
          <path d="M275 22 V86 M400 22 V86 M525 22 V86" stroke="#9C7647" stroke-width="6" fill="none" /><rect x="150" y="22" width="500" height="64" rx="4" fill="none" stroke="#9C7647" stroke-width="8" />
          <path d="M170 22 L270 22 L228 86 L158 86 Z" fill="#fff" opacity="0.18" /><path d="M420 22 L520 22 L478 86 L408 86 Z" fill="#fff" opacity="0.14" />
          <!-- the floor: planks, with a patch of daylight from the window -->
          <rect y="262" width={W} height={H - 262} fill="url(#floor)" />
          {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}<path d={`M${W / 2 + (i - 5.5) * 20} 262 L${(i - 5.5) * 150 + W / 2} ${H}`} stroke="#8A6538" stroke-opacity="0.08" stroke-width="2" />{/each}
          <path d="M170 262 L520 262 L640 450 L260 450 Z" fill="url(#beam)" />
          <!-- the walls and the plants in the corners are the same in every room, so it all feels like one building -->
          <g filter="url(#soft)">
            <rect x="24" y="214" width="34" height="40" rx="5" fill="#B5683C" /><circle cx="41" cy="196" r="24" fill="#4E9D6E" /><circle cx="26" cy="206" r="15" fill="#5DB07F" /><circle cx="56" cy="204" r="15" fill="#3F8A5D" />
            <rect x="742" y="214" width="34" height="40" rx="5" fill="#B5683C" /><circle cx="759" cy="196" r="24" fill="#4E9D6E" /><circle cx="744" cy="206" r="15" fill="#5DB07F" /><circle cx="774" cy="204" r="15" fill="#3F8A5D" />
          </g>
          <g filter="url(#soft)">
        {#if shownId === "packing"}
          <rect x="190" y="130" width="140" height="10" fill="#B58B5A" /><rect x="190" y="180" width="140" height="10" fill="#B58B5A" /><rect x="196" y="140" width="40" height="40" fill="#C99A68" /><rect x="244" y="148" width="50" height="32" fill="#D7AE7C" /><rect x="200" y="90" width="52" height="40" fill="#D7AE7C" />
          <rect x="250" y="270" width="190" height="14" rx="3" fill="#8D6A45" /><rect x="262" y="284" width="10" height="70" fill="#7A5A3A" /><rect x="418" y="284" width="10" height="70" fill="#7A5A3A" />
          <rect x="300" y="236" width="76" height="34" rx="6" fill="#3D4A5C" /><rect x="312" y="244" width="30" height="8" rx="2" fill="#fff" /><circle cx="360" cy="248" r="4" fill="#E8573F" /><rect x="304" y="262" width="68" height="6" fill="#fff" />
          <rect x="480" y="300" width="70" height="56" fill="#C99A68" /><rect x="500" y="262" width="60" height="42" fill="#D7AE7C" />
        {:else if shownId === "server"}
          <rect x="450" y="90" width="120" height="250" rx="6" fill="#33404F" />
          {#each [0, 1, 2, 3, 4, 5] as i (i)}<rect x="462" y={104 + i * 36} width="96" height="26" rx="3" fill="#46556A" /><circle cx="474" cy={117 + i * 36} r="3.5" fill={i % 3 === 1 ? "#E8573F" : "#52C48A"} /><circle cx="488" cy={117 + i * 36} r="3.5" fill="#52C48A" />{/each}
          <rect x="260" y="226" width="130" height="14" rx="3" fill="#8D6A45" /><rect x="296" y="196" width="58" height="30" rx="5" fill="#fff" stroke="#9AA4B2" stroke-width="3" /><path d="M308 196 L300 168 M342 196 L350 168" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" /><circle cx="312" cy="212" r="3" fill="#52C48A" /><circle cx="324" cy="212" r="3" fill="#52C48A" />
          <path d="M520 340 C540 380 600 390 640 360" fill="none" stroke="#2E5BDB" stroke-width="5" /><path d="M530 340 C550 396 620 400 660 370" fill="none" stroke="#E8573F" stroke-width="5" />
        {:else if shownId === "reception"}
          <rect x="230" y="262" width="230" height="80" rx="6" fill="#B58B5A" /><rect x="230" y="256" width="230" height="14" rx="4" fill="#C99A68" /><rect x="290" y="244" width="70" height="14" rx="2" fill="#fff" stroke="#9AA4B2" stroke-width="2" />
          <rect x="250" y="90" width="150" height="46" rx="6" fill="#2E5BDB" /><text x="325" y="121" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">Reception</text>
          <rect x="500" y="300" width="30" height="50" rx="4" fill="#A8683C" /><circle cx="515" cy="286" r="24" fill="#4E9D6E" /><circle cx="498" cy="296" r="16" fill="#5DB07F" />
        {:else if shownId === "webshop"}
          <rect x="220" y="262" width="200" height="14" rx="3" fill="#8D6A45" /><rect x="240" y="276" width="10" height="70" fill="#7A5A3A" /><rect x="390" y="276" width="10" height="70" fill="#7A5A3A" />
          <rect x="260" y="150" width="130" height="86" rx="6" fill="#33404F" /><rect x="268" y="158" width="114" height="70" rx="3" fill="#EEF2FC" />
          {#each [0, 1, 2, 3, 4] as i (i)}<rect x="276" y={166 + i * 12} width={70 + (i % 3) * 10} height="6" rx="3" fill={i === 1 ? "#E8573F" : "#9AA4B2"} />{/each}
          <rect x="316" y="236" width="14" height="26" fill="#33404F" /><rect x="470" y="150" width="90" height="62" rx="5" fill="#33404F" /><rect x="476" y="156" width="78" height="50" rx="3" fill="#CFE4F5" />
        {:else if shownId === "accounting"}
          <rect x="220" y="262" width="210" height="14" rx="3" fill="#8D6A45" /><rect x="236" y="276" width="10" height="70" fill="#7A5A3A" /><rect x="404" y="276" width="10" height="70" fill="#7A5A3A" />
          <rect x="300" y="248" width="80" height="16" rx="3" fill="#C99A68" /><rect x="306" y="240" width="68" height="10" fill="#fff" /><rect x="310" y="232" width="60" height="10" fill="#F6F0E4" />
          <rect x="470" y="110" width="120" height="150" rx="4" fill="#B58B5A" />{#each [0, 1, 2] as i (i)}<rect x="480" y={120 + i * 46} width="100" height="36" rx="3" fill="#C99A68" /><rect x="520" y={134 + i * 46} width="20" height="6" rx="2" fill="#7A5A3A" />{/each}
        {:else if shownId === "ceo"}
          <rect x="180" y="262" width="270" height="18" rx="4" fill="#6E4B2E" /><rect x="200" y="280" width="14" height="76" fill="#5B3D25" /><rect x="420" y="280" width="14" height="76" fill="#5B3D25" />
          <rect x="260" y="226" width="90" height="44" rx="5" fill="#33404F" /><rect x="266" y="232" width="78" height="32" rx="3" fill="#EEF2FC" />
          <rect x="470" y="96" width="110" height="80" rx="3" fill="#fff" stroke="#B7A98F" stroke-width="5" /><path d="M482 160 L508 128 L530 150 L548 124 L568 160 Z" fill="#8FB8DE" />
        {:else if shownId === "meeting"}
          <ellipse cx="380" cy="320" rx="190" ry="44" fill="#8D6A45" />{#each [220, 300, 380, 460, 540] as x (x)}<rect x={x - 18} y="350" width="36" height="34" rx="8" fill="#3D4A5C" />{/each}
          <rect x="260" y="96" width="260" height="110" rx="4" fill="#fff" stroke="#B7A98F" stroke-width="5" /><path d="M280 130 H420 M280 156 H480 M280 182 H380" stroke="#9AA4B2" stroke-width="5" stroke-linecap="round" />
        {:else if shownId === "warehouse"}
          {#each [0, 1, 2] as i (i)}<rect x={190 + i * 190} y="120" width="150" height="190" fill="none" stroke="#7A5A3A" stroke-width="7" /><path d={`M${190 + i * 190} 184 H${340 + i * 190} M${190 + i * 190} 248 H${340 + i * 190}`} stroke="#7A5A3A" stroke-width="7" />
            <rect x={200 + i * 190} y="132" width="50" height="46" fill="#D7AE7C" /><rect x={262 + i * 190} y="140" width="64" height="38" fill="#C99A68" /><rect x={204 + i * 190} y="196" width="70" height="46" fill="#C99A68" /><rect x={286 + i * 190} y="204" width="44" height="38" fill="#D7AE7C" />{/each}
        {:else if shownId === "dock"}
          <rect x="230" y="110" width="260" height="170" fill="#8C97A6" /><path d="M230 140 H490 M230 170 H490 M230 200 H490 M230 230 H490 M230 260 H490" stroke="#7A8594" stroke-width="3" /><rect x="230" y="262" width="260" height="14" fill="#E9C13C" />
          <rect x="520" y="230" width="90" height="120" fill="#D7AE7C" /><rect x="540" y="196" width="80" height="40" fill="#C99A68" />
        {/if}

          </g>
          {/if}
          {#each placed as p (p.spot.kind + p.spot.id)}
            {#if p.spot.kind === "person"}<ellipse cx={p.x} cy={p.y + 66} rx="48" ry="9" fill="#000" opacity="0.16" />{/if}
          {/each}
          <rect width={W} height={H} fill="url(#vignette)" pointer-events="none" />
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

        {#each mates as m (m.p.id)}
          <span class="mate" style="left: {pct(m.x, W)}; top: {pct(m.y, H)}"><Face face={m.p.face} size={44} /><span class="tag">{m.p.name}</span></span>
        {/each}
        {#if you && me}
          <span class="me" style="left: {pct(me.x, W)}; top: {pct(me.y, H)}; --team: {you.color}"><span class="avatar"><Face face={you.face} size={60} /></span><span class="tag you">You</span></span>
        {/if}

        {#each doors as d (d.dir)}
          <button class="door {d.dir}" onclick={() => onroom(d.room.id)} aria-label="Door to {d.room.name}"><span aria-hidden="true">{arrow[d.dir]}</span> {d.room.name}</button>
        {/each}
      </div>
    {/key}
  {:else}
    <div class="corridor" role="status"><p class="big">Walking in the corridor…</p></div>
  {/if}

  <details class="more">
    <summary>Go to any room</summary>
    <nav class="doors" aria-label="Doors to other rooms">
      {#each rooms.filter((r) => r.id !== roomId) as r (r.id)}
        <button onclick={() => onroom(r.id)}>{r.name}</button>
      {/each}
    </nav>
  </details>
</section>

<style>
  .scene { display: flex; flex-direction: column; gap: 10px; }
  .frame { container-type: inline-size; position: relative; border-radius: var(--radius-l); overflow: hidden; background: #f6ebdc; box-shadow: 0 1px 2px rgba(28, 36, 48, 0.08), 0 8px 24px rgba(28, 36, 48, 0.1); cursor: pointer; }
  svg { display: block; width: 100%; height: auto; }
  .hot {
    position: absolute; transform: translate(-50%, -50%); min-width: 44px; min-height: 44px; padding: 0; border: none; background: transparent;
    display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; font: inherit;
  }
  .bust { border-radius: 50%; box-shadow: 0 3px 10px rgba(28, 36, 48, 0.25); line-height: 0; border: 3px solid #fff; }
  .bust :global(svg) { width: clamp(52px, 11cqw, 92px); height: auto; }
  .ring { width: clamp(44px, 8cqw, 64px); height: clamp(44px, 8cqw, 64px); border-radius: 50%; border: 3px dashed var(--blue); background: rgba(255, 255, 255, 0.35); }
  .name { background: var(--paper); color: var(--ink); border-radius: 999px; padding: 3px 10px; font-weight: 700; font-size: clamp(11px, 2cqw, 15px); box-shadow: 0 1px 3px rgba(28, 36, 48, 0.25); white-space: nowrap; }
  .hot:hover .name, .hot:focus-visible .name { background: var(--blue); color: #fff; }
  .hot:hover .ring { background: rgba(46, 91, 219, 0.2); }
  .me, .mate { position: absolute; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: none; transition: left 110ms linear, top 110ms linear; }
  .avatar { line-height: 0; border-radius: 50%; border: 4px solid var(--team); background: #fff; box-shadow: 0 6px 12px rgba(28, 36, 48, 0.3); }
  .avatar :global(svg) { width: clamp(38px, 8cqw, 60px); height: auto; }
  .mate :global(svg) { width: clamp(26px, 5.4cqw, 44px); height: auto; border-radius: 50%; box-shadow: 0 3px 8px rgba(28, 36, 48, 0.25); }
  .tag { margin-top: 3px; background: rgba(255, 255, 255, 0.92); color: var(--ink); border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: clamp(10px, 1.8cqw, 13px); }
  .tag.you { background: var(--blue); color: #fff; }
  .door {
    position: absolute; min-height: 44px; max-width: 44%; padding: 6px 14px; border: 2px solid rgba(255, 255, 255, 0.9); border-radius: 999px;
    background: rgba(30, 64, 168, 0.92); color: #fff; font: inherit; font-weight: 700; font-size: clamp(12px, 2.1cqw, 15px); cursor: pointer; box-shadow: 0 3px 10px rgba(28, 36, 48, 0.3);
  }
  .door:hover, .door:focus-visible { background: var(--blue); }
  .door.left { left: 8px; top: 24%; }
  .door.right { right: 8px; top: 24%; }
  .door.up { left: 50%; top: 6px; transform: translateX(-50%); }
  .door.down { left: 50%; bottom: 8px; transform: translateX(-50%); }
  .corridor { background: var(--paper); border-radius: var(--radius-l); padding: 40px 24px; text-align: center; }
  .corridor .big { font-size: 24px; font-weight: 700; margin: 0; }
  .more summary { cursor: pointer; font-weight: 600; color: var(--slate); min-height: 44px; display: flex; align-items: center; }
  .doors { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-bottom: 6px; }
  .doors button {
    min-height: 44px; padding: 0 14px; border-radius: 999px; border: 2px solid var(--line); background: var(--paper); font: inherit; font-weight: 600; cursor: pointer; color: var(--ink);
  }
  .doors button:hover { border-color: var(--blue); }
  @media (prefers-reduced-motion: reduce) { .me, .mate { transition: none; } }
</style>
