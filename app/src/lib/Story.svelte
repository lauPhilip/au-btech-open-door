<script lang="ts">
  import { onDestroy } from "svelte";
  import type { Scenario } from "@open-door/shared";

  let {
    scenario,
    large = false,
    autoplayMs = 0,
  }: {
    scenario: Scenario;
    /** Projector size. */
    large?: boolean;
    /** Move on by itself after this many milliseconds (0 = only on click). */
    autoplayMs?: number;
  } = $props();

  // The story cards, then one card with the goal.
  const cards = $derived([
    ...scenario.story.map((line) => {
      const person = scenario.people.find((p) => p.id === line.speaker);
      return { kind: "line" as const, who: person?.name ?? line.speaker, role: person?.role ?? "", text: line.text };
    }),
    { kind: "goal" as const, who: "", role: "", text: scenario.goal },
  ]);

  let index = $state(0);
  const card = $derived(cards[Math.min(index, cards.length - 1)]!);
  const last = $derived(index >= cards.length - 1);

  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    clearTimeout(timer);
    if (autoplayMs > 0 && !last) timer = setTimeout(() => index++, autoplayMs);
  });
  onDestroy(() => clearTimeout(timer));

  function key(event: KeyboardEvent) {
    if (event.key === "ArrowRight" || event.key === " ") {
      if (!last) index++;
    } else if (event.key === "ArrowLeft" && index > 0) {
      index--;
    }
  }
</script>

<svelte:window onkeydown={key} />

<section class="story" class:large aria-live="polite">
  {#key index}
    {#if card.kind === "line"}
      <div class="card line">
        <div class="speaker">
          <span class="avatar" aria-hidden="true">{card.who.charAt(0)}</span>
          <span><strong>{card.who}</strong>{#if card.role}<small>{card.role}</small>{/if}</span>
        </div>
        <p class="text">{card.text}</p>
      </div>
    {:else}
      <div class="card goal">
        <p class="eyebrow">Your goal</p>
        <p class="text">{card.text}</p>
        <p class="wait">{large ? "The teacher will start the walk." : "Wait for your teacher to start the walk."}</p>
      </div>
    {/if}
  {/key}

  <nav class="controls">
    <button onclick={() => index--} disabled={index === 0} aria-label="Back">←</button>
    <span class="dots" role="img" aria-label="Card {index + 1} of {cards.length}">
      {#each cards as _, i (i)}<span class="d" class:on={i === index}></span>{/each}
    </span>
    <button class="next" onclick={() => index++} disabled={last}>{last ? "That's it" : "Next"}</button>
  </nav>
</section>

<style>
  .story {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .card {
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 24px;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06), 0 8px 24px rgba(28, 36, 48, 0.06);
    animation: rise 260ms ease-out;
  }
  .line {
    background: #fbe9da;
  }
  .goal {
    border-left: 8px solid var(--sticky);
  }
  .speaker {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .speaker span:last-child {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }
  .speaker small {
    color: var(--slate);
  }
  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #c98b5e;
    color: #7a4a26;
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 20px;
  }
  .text {
    margin: 16px 0 0;
    font-size: 22px;
    line-height: 1.4;
  }
  .goal .text {
    margin-top: 4px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 26px;
  }
  .eyebrow {
    margin: 0;
    font-weight: 700;
    color: var(--slate);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 13px;
  }
  .wait {
    margin: 12px 0 0;
    color: var(--slate);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .dots {
    flex: 1;
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  .d {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--line);
  }
  .d.on {
    background: var(--blue);
  }
  button {
    min-height: 48px;
    min-width: 48px;
    padding: 0 18px;
    border-radius: var(--radius-m);
    border: 2px solid var(--line);
    background: var(--paper);
    font-weight: 700;
    cursor: pointer;
  }
  button.next {
    border: none;
    background: var(--blue);
    color: #fff;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .large .text {
    font-size: 40px;
  }
  .large .goal .text {
    font-size: 48px;
  }
  .large .speaker strong {
    font-size: 26px;
  }
  .large .card {
    padding: 40px 48px;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
</style>
