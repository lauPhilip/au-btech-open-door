<script lang="ts">
  import type { DayEvent, Room, Scenario, Game, Player, Spot } from "@open-door/shared";
  import type { GameConnection } from "../../lib/game.svelte";
  import Chat from "../../lib/Chat.svelte";
  import ClueList from "../../lib/ClueList.svelte";
  import NotesPanel from "../../lib/NotesPanel.svelte";

  /** The side panel: goal, rooms, notes, what the team found, teammates, and on the day the chat and clues. */
  let {
    connection,
    game,
    scenario,
    me,
    here,
    visited,
    found,
    teammates,
    spotsByRoom,
    messages,
    cluesFound,
    onroom,
    onspot,
  }: {
    connection: GameConnection;
    game: Game;
    scenario: Scenario;
    me: Player;
    here: Room | null;
    visited: Set<string>;
    found: readonly string[];
    teammates: Player[];
    spotsByRoom: Map<string, Spot[]>;
    messages: DayEvent[];
    cluesFound: readonly number[];
    onroom: (roomId: string) => void;
    onspot: (spot: Spot) => void;
  } = $props();

  const isDay = $derived(game.phase === "day");
  const roomName = (id: string | null) => scenario.map.rooms.find((r) => r.id === id)?.name ?? "Corridor";
</script>

  <aside>
    {#if isDay}
      <section><Chat {scenario} events={messages} /></section>
      <section><ClueList {scenario} found={cluesFound} /></section>
    {/if}
    <section class="goal">
      <p class="eyebrow">Your goal</p>
      <p>{scenario.goal}</p>
    </section>

    <section>
      <h2>Rooms <small>{visited.size} of {scenario.map.rooms.length} visited by your team</small></h2>
      <ul class="rooms">
        {#each scenario.map.rooms as room (room.id)}
          <li class:done={visited.has(room.id)} class:here={here?.id === room.id}>
            <button class="room" onclick={() => onroom(room.id)} aria-label="Walk to {room.name}, {visited.has(room.id) ? 'visited' : 'not visited yet'}{here?.id === room.id ? ', you are here' : ''}">
              <span class="box" aria-hidden="true">{visited.has(room.id) ? "✓" : ""}</span>
              {room.name}
              {#if here?.id === room.id}<small aria-hidden="true">you are here</small>{/if}
            </button>
            {#if spotsByRoom.get(room.id)}
              <ul class="in-room">
                {#each spotsByRoom.get(room.id) ?? [] as spot (spot.kind + spot.id)}
                  <li><button class="spot" onclick={() => onspot(spot)} aria-label="Walk to {spot.name}">{spot.name}</button></li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    <NotesPanel
      notes={connection.notes}
      players={game.players}
      me={me.id}
      onshare={(id, shared) => connection.shareNote(id, shared)}
      onmerge={(keep, drop) => connection.mergeNotes(keep, drop)}
      ondelete={(id) => connection.removeNote(id)}
    />

    <section>
      <h2>Worth protecting <small>{found.length} of {scenario.assets.length} found by your team</small></h2>
      {#if found.length > 0}
        <ul class="found">
          {#each found as id (id)}
            <li>{scenario.assets.find((a) => a.id === id)?.name ?? id}</li>
          {/each}
        </ul>
      {:else}
        <p class="empty">Ask people questions to find out what data this company depends on.</p>
      {/if}
    </section>

    {#if teammates.length > 0}
      <section>
        <h2>Your team</h2>
        <ul class="mates">
          {#each teammates as p (p.id)}
            <li class:offline={!p.online}><strong>{p.name}</strong> <small>{p.online ? roomName(p.room) : "offline"}</small></li>
          {/each}
        </ul>
      </section>
    {/if}
    {#if connection.error}<p class="warn" role="alert">{connection.error}</p>{/if}
  </aside>

<style>
  .found {
    margin-top: 8px;
  }
  .found li::before {
    content: "✓ ";
    color: var(--safe);
    font-weight: 700;
  }
  aside {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  aside section {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 14px 16px;
  }
  .goal {
    border-left: 6px solid var(--sticky);
  }
  .goal p:last-child {
    margin: 2px 0 0;
    font-weight: 600;
  }
  .eyebrow {
    margin: 0;
    color: var(--slate);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  h2 {
    font-size: 18px;
    display: flex;
    flex-direction: column;
  }
  h2 small {
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 13px;
    color: var(--slate);
  }
  ul {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rooms > li {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .room {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 4px 6px;
    border: 0;
    border-radius: var(--radius-s);
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .room:hover,
  .spot:hover {
    background: var(--blue-soft);
  }
  .here .room {
    font-weight: 700;
  }
  .in-room {
    margin: 0 0 4px 38px;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px;
  }
  .spot {
    min-height: 44px;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--paper);
    color: var(--blue-dark);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .rooms small {
    margin-left: auto;
    color: var(--blue);
    font-weight: 600;
  }
  .box {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 2px solid var(--line);
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
  }
  .done .box {
    background: var(--safe);
    border-color: var(--safe);
  }
  .here {
    font-weight: 700;
  }
  .mates li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .mates small {
    color: var(--slate);
  }
  .mates .offline {
    opacity: 0.55;
  }
  .warn {
    color: var(--alert-dark);
    margin: 0;
  }
  .empty {
    color: var(--slate);
    font-size: 14px;
    margin: 6px 0 0;
  }
  /* Laptops and big screens: the side panel scrolls by itself so the page does not. */
  @media (min-width: 861px) and (min-height: 600px) {
    aside {
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: var(--space-1);
    }
  }
</style>
