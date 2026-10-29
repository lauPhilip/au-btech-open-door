<script lang="ts">
  import { minutesToClock, clockToMinutes, type DayEvent, type Scenario } from "@open-door/shared";

  let { scenario, events, large = false }: { scenario: Scenario; events: DayEvent[]; large?: boolean } = $props();

  const person = (id: string) => scenario.people.find((p) => p.id === id);
</script>

<!-- A messaging-app look, because students already know how one works (Jakob's law). -->
<section class="chat" class:large aria-label="Messages from the company">
  <h2>Messages</h2>
  {#if events.length === 0}
    <p class="quiet">All quiet so far.</p>
  {:else}
    <ol aria-live="polite">
      {#each events as event (event.at + event.from)}
        {@const from = person(event.from)}
        <li>
          <span class="avatar" aria-hidden="true">{from?.name.charAt(0) ?? "?"}</span>
          <div class="bubble">
            <p class="who"><strong>{from?.name ?? event.from}</strong> <span>{from?.role ?? ""}</span> <time>{minutesToClock(clockToMinutes(event.at))}</time></p>
            <p class="text">{event.text}</p>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  h2 {
    font-size: 18px;
  }
  .chat.large h2 {
    font-size: 28px;
  }
  ol {
    list-style: none;
    margin: 10px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .avatar {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #fbe9da;
    border: 2px solid #c98b5e;
    color: #7a4a26;
    font-weight: 700;
  }
  .bubble {
    background: var(--mist);
    border-radius: 14px 14px 14px 4px;
    padding: 8px 12px;
    min-width: 0;
  }
  .who {
    margin: 0;
    font-size: 13px;
    color: var(--slate);
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
  }
  .who strong {
    color: var(--ink);
  }
  .who time {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }
  .text {
    margin: 2px 0 0;
  }
  .quiet {
    color: var(--slate);
    margin: 6px 0 0;
    font-size: 14px;
  }
  .large .text {
    font-size: 26px;
  }
  .large .who {
    font-size: 18px;
  }
  .large .avatar {
    width: 52px;
    height: 52px;
    font-size: 24px;
  }
</style>
