<script lang="ts">
  import type { Scenario } from "@open-door/shared";

  let { scenario, found }: { scenario: Scenario; found: readonly number[] } = $props();

  const clues = $derived(scenario.day.clues);
  const roomName = (id: string) => scenario.map.rooms.find((r) => r.id === id)?.name ?? id;
</script>

<section>
  <h2>Clues <small>{found.length} of {clues.length} found by your team</small></h2>
  {#if found.length > 0}
    <ul>
      {#each found as index (index)}
        {@const clue = clues[index]}
        {#if clue}
          <li><strong>{roomName(clue.room)}</strong> {clue.text}</li>
        {/if}
      {/each}
    </ul>
  {:else}
    <p class="empty">Walk into the rooms to look for clues. Some rooms you would not visit first.</p>
  {/if}
</section>

<style>
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
    gap: 8px;
  }
  li {
    border-left: 4px solid var(--blue);
    background: var(--blue-soft);
    padding: 8px 10px;
    border-radius: 6px;
  }
  li strong {
    display: block;
    font-size: 13px;
    color: var(--blue-dark);
  }
  .empty {
    margin: 6px 0 0;
    color: var(--slate);
    font-size: 14px;
  }
</style>
