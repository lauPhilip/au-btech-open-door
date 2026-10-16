<script lang="ts">
  import { AVATAR_RADIUS, teamById, type Player, type Scenario, type TeamId } from "@open-door/shared";

  let {
    scenario,
    players,
    you = null,
    myTeam = null,
    yourPosition = null,
    visited = new Set<string>(),
    names = "team",
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
    /** Called with map coordinates when the viewer taps or clicks the map. */
    onpoint?: (x: number, y: number) => void;
  } = $props();

  let svg = $state<SVGSVGElement | undefined>();

  const { width, height, rooms } = $derived(scenario.map);

  /** Where each scenario character stands: lower right of their room. */
  const cast = $derived(
    scenario.people.map((person, i) => {
      const room = rooms.find((r) => r.id === person.room);
      const [rx, ry, rw, rh] = room?.rect ?? [0, 0, 0, 0];
      const sameRoomBefore = scenario.people.slice(0, i).filter((p) => p.room === person.room).length;
      return { ...person, x: rx + rw - 40 - sameRoomBefore * 56, y: ry + rh - 44 };
    }),
  );

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
  {#each rooms as room (room.id)}
    {@const [x, y, w, h] = room.rect}
    <g class="room" class:seen={visited.has(room.id)}>
      <rect {x} {y} width={w} height={h} rx="10" />
      <text x={x + 16} y={y + 32} class="room-name">{room.name}</text>
      {#if visited.has(room.id)}
        <g transform="translate({x + w - 34} {y + 12})" aria-hidden="true">
          <circle cx="11" cy="11" r="11" class="tick-bg" />
          <path d="M6 11.5 L9.5 15 L16 8" class="tick" />
        </g>
      {/if}
    </g>
  {/each}

  {#each cast as person (person.id)}
    <g class="npc" transform="translate({person.x} {person.y})">
      <circle r="20" />
      <text y="6" class="npc-initial">{initial(person.name)}</text>
      <text y="38" class="npc-name">{person.name}</text>
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
  .room.seen rect {
    fill: #f1e6d8;
  }
  .room-name {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 22px;
    fill: #4a3b2a;
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
