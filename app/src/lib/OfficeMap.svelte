<script lang="ts">
  import { AVATAR_RADIUS, spots, teamById, type Note, type Player, type Scenario, type TeamId } from "@open-door/shared";

  let {
    scenario,
    players,
    you = null,
    myTeam = null,
    yourPosition = null,
    visited = new Set<string>(),
    names = "team",
    near = [],
    notes = [],
    clueRooms = [],
    onpoint,
  }: {
    scenario: Scenario;
    players: Player[];
    /** The viewer's player id; drawn on top with a blue ring. */
    you?: string | null;
    /** The viewer's team: teammates get names, others are drawn smaller. */
    myTeam?: TeamId | null;
    /** The viewer's own position, drawn from local movement so walking feels instant. */
    yourPosition?: { x: number; y: number } | null;
    /** Rooms the team has visited; they get a tick. */
    visited?: Set<string>;
    /** Whose names to show: teammates only, or everyone (projector). */
    names?: "team" | "all";
    /** Sticky notes to pin on the map: where the author stood, with the author's initial. */
    notes?: Note[];
    /** Rooms where the team has found a clue; they get a magnifier. */
    clueRooms?: string[];
    /** Ids of people and things within reach of the viewer; they get a highlight ring. */
    near?: string[];
    /** Called with map coordinates when the viewer taps or clicks the map. */
    onpoint?: (x: number, y: number) => void;
  } = $props();

  let svg = $state<SVGSVGElement | undefined>();

  // The picture of the building behind the room outlines (drawn once, with no text; names are added here).
  const art = import.meta.glob("../assets/art/map.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
  const mapArt = Object.values(art)[0] ?? null;

  const { width, height, rooms } = $derived(scenario.map);

  /** Where each person and thing stands (see `spots` in the shared package). */
  const cast = $derived(spots(scenario));

  /** Others first, then teammates, then you on top. */
  const drawn = $derived(
    players
      .filter((p) => p.team !== null)
      .map((p) => ({ ...p, ...(p.id === you && yourPosition ? yourPosition : {}) }))
      .sort((a, b) => rank(a) - rank(b)),
  );

  function rank(p: Player): number {
    if (p.id === you) return 2;
    return p.team === myTeam ? 1 : 0;
  }

  /** A slight, steady tilt for each pin, so the same note always leans the same way. */
  function tilt(id: string): number {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return (h % 13) - 6;
  }

  const pins = $derived(
    notes.map((note) => ({
      note,
      tilt: tilt(note.id),
      initial: initial(players.find((p) => p.id === note.author)?.name ?? "?"),
    })),
  );

  /** Fit a room's name beside its badges: smaller type first, then two lines. */
  function title(name: string, width: number): { lines: string[]; size: number; w: number } {
    const room = width - 20 - (width > 160 ? 40 : 0); // padding, and the tick badge beside wider rooms
    const fits = (text: string, size: number) => text.length * size * 0.56 <= room;
    if (fits(name, 20)) return { lines: [name], size: 20, w: name.length * 20 * 0.56 + 16 };
    const cut = name.lastIndexOf(" ");
    const lines = cut > 0 ? [name.slice(0, cut), name.slice(cut + 1)] : [name];
    const longest = Math.max(...lines.map((l) => l.length));
    const size = Math.max(13, Math.min(20, Math.floor(room / (longest * 0.56))));
    return { lines, size, w: longest * size * 0.56 + 16 };
  }

  function initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || "?";
  }

  function handlePointer(event: PointerEvent) {
    if (!onpoint || !svg) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    onpoint(point.x, point.y);
  }
</script>

<svg
  bind:this={svg}
  class="map"
  class:interactive={!!onpoint}
  viewBox="0 0 {width} {height}"
  role="img"
  aria-label="Top-down map of {scenario.company.name}"
  onpointerdown={handlePointer}
>
  <rect x="0" y="0" {width} {height} rx="18" class="corridor" />
  {#if mapArt}<image href={mapArt} x="0" y="0" {width} {height} preserveAspectRatio="none" class="art" aria-hidden="true" />{/if}
  {#each rooms as room (room.id)}
    {@const [x, y, w, h] = room.rect}
    {@const t = title(room.name, w)}
    {@const narrow = w < 120}
    {@const zoneName = scenario.map.zones.find((z) => z.id === room.zone)?.name ?? ""}
    <g class="room zone-{room.zone}" class:art={!!mapArt} class:seen={visited.has(room.id)}>
      <rect {x} {y} width={w} height={h} rx="10" />
      {#if !narrow && !mapArt}<text x={x + 16} y={y + h - 12} class="zone-name">{zoneName}</text>{/if}
      {#if mapArt}<rect x={x + 6} y={y + 8} width={Math.min(w - 12, Math.max(t.w, narrow ? 0 : zoneName.length * 8.4 + 20))} height={t.lines.length * (t.size + 2) + 8 + (narrow ? 0 : 20)} rx="8" class="label-bg" />{/if}
      <text x={x + (narrow ? 12 : 16)} y={y + 8 + t.size + 2} class="room-name" style="font-size: {t.size}px">
        {#each t.lines as line, i (i)}<tspan x={x + (narrow ? 12 : 16)} dy={i === 0 ? 0 : t.size + 2}>{line}</tspan>{/each}
      </text>
      {#if mapArt && !narrow}<text x={x + 16} y={y + 8 + t.lines.length * (t.size + 2) + 16} class="zone-line">{zoneName}</text>{/if}
      {#if clueRooms.includes(room.id)}
        <g transform="translate({narrow ? x + w - 28 : x + w - 68} {narrow ? y + h - 62 : y + 12})" aria-hidden="true">
          <circle cx="11" cy="11" r="11" class="clue-bg" />
          <circle cx="9.5" cy="9.5" r="4.5" class="clue-lens" />
          <path d="M13 13 L17 17" class="clue-lens" />
        </g>
      {/if}
      {#if visited.has(room.id)}
        <g transform="translate({narrow ? x + w - 28 : x + w - 34} {narrow ? y + h - 34 : y + 12})" aria-hidden="true">
          <circle cx="11" cy="11" r="11" class="tick-bg" />
          <path d="M6 11.5 L9.5 15 L16 8" class="tick" />
        </g>
      {/if}
    </g>
  {/each}

  {#each cast as spot (spot.kind + spot.id)}
    <g class="spot" class:npc={spot.kind === "person"} class:thing={spot.kind === "thing"} class:near={near.includes(spot.id)} transform="translate({spot.x} {spot.y})">
      {#if near.includes(spot.id)}<circle r="30" class="reach" />{/if}
      {#if spot.kind === "person"}
        <circle r="20" />
        <text y="6" class="npc-initial">{initial(spot.name)}</text>
      {:else}
        <rect x="-18" y="-18" width="36" height="36" rx="8" />
        <path d="M-8 -3 H8 M-8 5 H3" class="thing-lines" />
      {/if}
      <text y="38" class="npc-name">{spot.name}</text>
    </g>
  {/each}

  {#each pins as pin (pin.note.id)}
    <g class="pin" class:private={!pin.note.shared} transform="translate({pin.note.x + 12} {pin.note.y - 34}) rotate({pin.tilt})">
      <title>{pin.note.shared ? "Team note" : "Your private note"}: {pin.note.text}</title>
      <rect x="-13" y="-13" width="26" height="26" rx="3" />
      <text y="5" class="pin-initial">{pin.initial}</text>
    </g>
  {/each}

  {#each drawn as p (p.id)}
    {@const team = teamById(p.team!)}
    {@const mine = p.id === you}
    {@const friend = mine || names === "all" || p.team === myTeam}
    <g
      class="player"
      class:mine
      class:offline={!p.online}
      class:stranger={!friend}
      style="transform: translate({p.x}px, {p.y}px)"
    >
      {#if mine}<circle r={AVATAR_RADIUS + 6} class="ring" />{/if}
      <circle r={AVATAR_RADIUS} fill={team.color} stroke={team.ink} stroke-width="2" />
      <text y="5" class="player-initial" fill={team.id === "yellow" ? "#1C2430" : "#fff"}>{initial(p.name)}</text>
      {#if friend}<text y={AVATAR_RADIUS + 20} class="player-name">{mine ? "You" : p.name}</text>{/if}
    </g>
  {/each}
</svg>

<style>
  .map {
    display: block;
    width: 100%;
    height: auto;
    max-height: 100%;
    user-select: none;
    touch-action: manipulation;
  }
  .interactive {
    cursor: pointer;
  }
  .corridor {
    fill: #f7f3ec;
    stroke: var(--line);
    stroke-width: 2;
  }
  .room rect {
    fill: #eadbc8;
    stroke: #cdb89c;
    stroke-width: 2;
  }
  .room.zone-warehouse rect {
    fill: #dde3e8;
    stroke: #a9b5c0;
  }
  .room.zone-guest rect {
    fill: #e1eedb;
    stroke: #a4c295;
  }
  .zone-name {
    font-size: 15px;
    font-weight: 700;
    fill: #5b4a36;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .room.art rect:first-child { fill: transparent; stroke: rgba(255, 255, 255, 0.0); }
  .room.art.zone-guest rect:first-child { fill: #6fbf5a; fill-opacity: 0.08; }
  .room.art.zone-warehouse rect:first-child { fill: #4a6fa5; fill-opacity: 0.07; }
  .room.art.seen rect:first-child { fill: #2f9e6e; fill-opacity: 0.16; stroke: #2f9e6e; stroke-opacity: 0.8; stroke-width: 3; }
  .room.art rect.label-bg { fill: #fffaf0; fill-opacity: 0.94; stroke: none; }
  .zone-line { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; fill: #6b5a44; }
  .room.art .zone-name { fill: #3b2f21; stroke: #fffaf0; stroke-width: 4px; paint-order: stroke; }
  .room.seen rect {
    fill-opacity: 0.7;
  }
  .room-name {
    font-family: var(--font-display);
    font-weight: 700;
    fill: #4a3b2a;
  }
  .clue-bg {
    fill: var(--blue);
  }
  .clue-lens {
    fill: none;
    stroke: #fff;
    stroke-width: 2.2;
    stroke-linecap: round;
  }
  .tick-bg {
    fill: var(--safe);
  }
  .tick {
    fill: none;
    stroke: #fff;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .npc circle {
    fill: #fbe9da;
    stroke: #c98b5e;
    stroke-width: 2;
  }
  .thing rect {
    fill: #e3ecf8;
    stroke: #7f9cc7;
    stroke-width: 2;
  }
  .thing-lines {
    fill: none;
    stroke: #4a6a9c;
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .pin rect {
    fill: var(--sticky);
    stroke: #c9a52b;
    stroke-width: 1.5;
    filter: drop-shadow(0 1px 1px rgb(28 36 48 / 0.3));
  }
  .pin.private rect {
    fill: #fff3b8;
    stroke-dasharray: 4 3;
  }
  .pin-initial {
    font-family: var(--font-body);
    font-weight: 700;
    font-size: 14px;
    text-anchor: middle;
    fill: var(--ink);
  }
  .reach {
    fill: none;
    stroke: var(--blue);
    stroke-width: 3;
    stroke-dasharray: 6 5;
  }
  .npc-initial,
  .player-initial {
    font-family: var(--font-body);
    font-weight: 700;
    text-anchor: middle;
    font-size: 16px;
  }
  .npc-initial {
    fill: #7a4a26;
  }
  .npc-name,
  .player-name {
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 15px;
    text-anchor: middle;
    fill: var(--ink);
    paint-order: stroke;
    stroke: #f7f3ec;
    stroke-width: 4px;
  }
  .player {
    transition: transform 110ms linear;
  }
  .player.mine {
    transition: none;
  }
  .ring {
    fill: none;
    stroke: var(--blue);
    stroke-width: 4;
  }
  .player.stranger {
    opacity: 0.55;
  }
  .player.offline {
    opacity: 0.3;
  }
  @media (prefers-reduced-motion: reduce) {
    .player {
      transition: none;
    }
  }
</style>
