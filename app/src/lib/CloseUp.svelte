<script lang="ts">
  import { onMount } from "svelte";
  import Bust from "./Bust.svelte";
  import Prop from "./Prop.svelte";
  import type { PersonInScenario, Scenario, Spot } from "@open-door/shared";

  let {
    scenario,
    spot,
    onask,
    onnote,
    onclose,
  }: {
    scenario: Scenario;
    spot: Spot;
    /** Called with the person's id and the index of the question the player chose. */
    onask: (person: string, topic: number) => void;
    /** Called when the player wants to write a sticky note about this person or thing. */
    onnote: (spot: Spot) => void;
    onclose: () => void;
  } = $props();

  const person = $derived<PersonInScenario | undefined>(spot.kind === "person" ? scenario.people.find((p) => p.id === spot.id) : undefined);
  const thing = $derived(spot.kind === "thing" ? scenario.things.find((t) => t.id === spot.id) : undefined);
  const roomName = $derived(scenario.map.rooms.find((r) => r.id === spot.room)?.name ?? "");

  /** Questions already asked in this window, in order. Closing the window starts a fresh talk. */
  let asked = $state<number[]>([]);
  /** The technical "look closer" layer is hidden until asked for (progressive disclosure). */
  let technical = $state(false);
  let dialog: HTMLDivElement | undefined;
  let closeButton: HTMLButtonElement | undefined;

  function ask(index: number) {
    if (!person || asked.includes(index)) return;
    asked = [...asked, index];
    onask(person.id, index);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    }
  }

  onMount(() => {
    closeButton?.focus();
    dialog?.scrollIntoView({ block: "nearest" });
  });
</script>

<svelte:window onkeydown={keydown} />

<div class="backdrop" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && onclose()}>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="closeup-title" bind:this={dialog}>
    <header>
      <div class="title">
        <h2 id="closeup-title">{spot.name}</h2>
        <p>{person && person.role !== roomName ? `${person.role} · ${roomName}` : roomName}</p>
      </div>
      <button class="close" bind:this={closeButton} onclick={onclose} >Back</button>
    </header>

    <div class="body">
      <div class="art" class:person={!!person} aria-hidden={person ? "true" : undefined}>
        {#if person}<div class="big-bust"><Bust id={person.id} size={200} /></div>{:else}<Prop id={spot.id} name={spot.name} />{/if}
      </div>
      <div class="content">
    {#if person}
      <div class="talk" aria-live="polite">
        <p class="bubble them">{person.hello}</p>
        {#each asked as index (index)}
          {@const topic = person.topics[index]!}
          <p class="bubble you">{topic.ask}</p>
          <p class="bubble them">{topic.answer}</p>
        {/each}
      </div>
      {#if asked.length < person.topics.length}
        <div class="asks">
          <p class="eyebrow">Ask a question</p>
          {#each person.topics as topic, index (index)}
            {#if !asked.includes(index)}
              <button class="ask" onclick={() => ask(index)}>{topic.ask}</button>
            {/if}
          {/each}
        </div>
      {:else}
        <p class="done">That is everything {person.name} wants to tell you. Close this window to keep walking.</p>
      {/if}
    {:else if thing}
      <p class="thing-text">{thing.text}</p>
      <p class="hint">Think about it: what could go wrong here?</p>
      {#if thing.closer}
        {#if technical}
          <p class="technical" aria-live="polite"><strong>Technical:</strong> {thing.closer}</p>
        {:else}
          <button class="link" onclick={() => (technical = true)}>Look closer (technical)</button>
        {/if}
      {/if}
    {/if}
    <button class="note" onclick={() => onnote(spot)}>Write a sticky note about {spot.name}</button>
      </div>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(28 36 48 / 0.55);
  }
  .card {
    width: min(980px, 100%);
    max-height: min(760px, 100%);
    overflow-y: auto;
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 20px 60px rgb(28 36 48 / 0.35);
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: 20px;
    align-items: start;
  }
  .art {
    border-radius: var(--radius-m);
    overflow: hidden;
    background: #f0ddbf;
    display: grid;
    place-items: center;
    min-height: 200px;
  }
  .art.person {
    padding: 24px;
    background: linear-gradient(#fbe9da, #f0ddbf);
  }
  .big-bust {
    line-height: 0;
    border-radius: 50%;
    border: 6px solid #fff;
    box-shadow: 0 10px 28px rgb(28 36 48 / 0.25);
    width: min(200px, 100%);
  }
  .big-bust :global(svg) {
    width: 100%;
    height: auto;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .title {
    flex: 1;
    min-width: 0;
  }
  h2 {
    font-size: 24px;
  }
  .title p {
    margin: 2px 0 0;
    color: var(--slate);
  }
  .close {
    flex: none;
    border: 2px solid var(--line);
    background: var(--paper);
    border-radius: var(--radius-s);
    padding: 8px 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .close:hover {
    border-color: var(--blue);
  }
  .talk {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .bubble {
    margin: 0;
    padding: 10px 14px;
    border-radius: 16px;
    max-width: 88%;
  }
  .them {
    background: var(--mist);
    border-bottom-left-radius: 4px;
    align-self: flex-start;
  }
  .you {
    background: var(--blue-soft);
    color: var(--blue-dark);
    border-bottom-right-radius: 4px;
    align-self: flex-end;
    font-weight: 600;
  }
  .asks {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .eyebrow {
    margin: 0;
    color: var(--slate);
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ask {
    text-align: left;
    padding: 12px 14px;
    min-height: 48px;
    border-radius: var(--radius-m);
    border: 2px solid var(--blue);
    background: var(--paper);
    color: var(--blue-dark);
    font-weight: 600;
    cursor: pointer;
  }
  .ask:hover {
    background: var(--blue-soft);
  }
  .note {
    align-self: flex-start;
    min-height: 48px;
    padding: 8px 16px;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--sticky);
    color: var(--ink);
    font-weight: 700;
    cursor: pointer;
  }
  .link {
    align-self: flex-start;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--blue);
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
  }
  .technical {
    margin: 0;
    padding: 10px 14px;
    border-radius: var(--radius-s);
    background: var(--blue-soft);
    border-left: 4px solid var(--blue);
  }
  .thing-text {
    margin: 0;
    font-size: 18px;
  }
  .hint,
  .done {
    margin: 0;
    color: var(--slate);
  }
  @media (max-width: 760px) {
    .body {
      grid-template-columns: minmax(0, 1fr);
    }
    .art {
      max-height: 220px;
    }
    .art.person {
      max-height: none;
      padding: 14px;
    }
    .big-bust {
      width: 130px;
    }
    .art :global(svg) {
      max-height: 220px;
    }
  }
  @media (max-width: 600px) {
    .backdrop {
      padding: 0;
      place-items: stretch;
    }
    .card {
      width: 100%;
      max-height: none;
      border-radius: 0;
    }
  }
</style>
