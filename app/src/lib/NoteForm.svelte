<script lang="ts">
  import { onMount } from "svelte";
  import {
    ACTOR_CHOICES,
    HARM_CHOICES,
    LIKELIHOOD_CHOICES,
    NOTE_MAX_CHARS,
    type Actor,
    type Harm,
    type Likelihood,
    type NoteInput,
  } from "@open-door/shared";

  let {
    about = null,
    aboutName = null,
    onsubmit,
    onclose,
  }: {
    /** Id of the person or thing the note is about, if any. */
    about?: string | null;
    aboutName?: string | null;
    onsubmit: (input: NoteInput) => void;
    onclose: () => void;
  } = $props();

  let text = $state("");
  let harm = $state<Harm[]>([]);
  let actor = $state<Actor[]>([]);
  let likelihood = $state<Likelihood | null>(null);
  let tried = $state(false);
  let field: HTMLInputElement | undefined;

  const ready = $derived(text.trim().length > 0 && harm.length > 0 && actor.length > 0 && likelihood !== null);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    tried = true;
    if (!ready || likelihood === null) return;
    onsubmit({ text, harm, actor, likelihood, about });
    onclose();
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onclose();
    }
  }

  onMount(() => field?.focus());
</script>

<svelte:window onkeydown={keydown} />

<div class="backdrop" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && onclose()}>
  <div class="card" role="dialog" aria-modal="true" aria-labelledby="note-title">
  <form onsubmit={submit}>
    <header>
      <h2 id="note-title">Your sticky note</h2>
      <p class="private-line">private until you share</p>
      <button type="button" class="close" onclick={onclose}>Cancel</button>
    </header>
    <p class="on">On: <strong>{aboutName ?? "the place where you stand"}</strong></p>

    <div class="field">
      <label for="note-text">What could go wrong?</label>
      <input id="note-text" bind:this={field} bind:value={text} maxlength={NOTE_MAX_CHARS} autocomplete="off" placeholder="For example: a stranger reads the shared password" />
      <small class:low={NOTE_MAX_CHARS - text.length < 10}>{NOTE_MAX_CHARS - text.length} characters left</small>
    </div>

    <fieldset>
      <legend>It would…</legend>
      <div class="choices">
        {#each HARM_CHOICES as c (c.id)}
          <label class="chip" class:on={harm.includes(c.id)}>
            <input type="checkbox" checked={harm.includes(c.id)} onchange={() => (harm = toggle(harm, c.id))} />
            <strong>{c.label}</strong><small>{c.hint}</small>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Who might cause it?</legend>
      <div class="choices">
        {#each ACTOR_CHOICES as c (c.id)}
          <label class="chip" class:on={actor.includes(c.id)}>
            <input type="checkbox" checked={actor.includes(c.id)} onchange={() => (actor = toggle(actor, c.id))} />
            <strong>{c.label}</strong><small>{c.hint}</small>
          </label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>How likely?</legend>
      <div class="choices">
        {#each LIKELIHOOD_CHOICES as c (c.id)}
          <label class="chip" class:on={likelihood === c.id}>
            <input type="radio" name="likelihood" checked={likelihood === c.id} onchange={() => (likelihood = c.id)} />
            <strong>{c.label}</strong>
          </label>
        {/each}
      </div>
    </fieldset>

    {#if tried && !ready}
      <p class="warn" role="alert">Write a few words and pick at least one harm, one who and one likelihood.</p>
    {/if}
    <button class="stick" type="submit">{aboutName ? `Stick it on ${aboutName}` : "Stick it on"}</button>
  </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(28 36 48 / 0.55);
  }
  .card {
    width: min(620px, 100%);
    max-height: 100%;
    overflow-y: auto;
    background: #fff9d6;
    border-top: 10px solid var(--sticky);
    border-radius: var(--radius-m);
    padding: 18px 20px 20px;
    box-shadow: 0 20px 60px rgb(28 36 48 / 0.35);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  h2 {
    font-size: 22px;
  }
  .close {
    margin-left: auto;
    border: 2px solid var(--line);
    background: var(--paper);
    border-radius: var(--radius-s);
    padding: 6px 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .private-line {
    margin: 0;
    color: var(--slate);
    font-size: 14px;
  }
  .on {
    margin: 0;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .field label,
  legend {
    font-weight: 700;
  }
  .field input {
    padding: 12px;
    border: 2px solid var(--line);
    border-radius: var(--radius-s);
    background: #fff;
  }
  small {
    color: var(--slate);
  }
  small.low {
    color: var(--alert-dark);
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    padding: 0;
    margin-bottom: 6px;
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 48px;
    padding: 8px 12px;
    background: #fff;
    border: 2px solid var(--line);
    border-radius: var(--radius-m);
    cursor: pointer;
  }
  .chip.on {
    border-color: var(--blue);
    background: var(--blue-soft);
  }
  .chip:focus-within {
    outline: 3px solid var(--blue);
    outline-offset: 2px;
  }
  .chip input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .warn {
    margin: 0;
    color: var(--alert-dark);
    font-weight: 600;
  }
  .stick {
    align-self: flex-end;
    min-height: 48px;
    padding: 8px 22px;
    border: 0;
    border-radius: var(--radius-m);
    background: var(--blue);
    color: #fff;
    font-weight: 700;
    cursor: pointer;
  }
  .stick:hover {
    background: var(--blue-dark);
  }
  @media (max-width: 600px) {
    .backdrop {
      padding: 0;
      place-items: stretch;
    }
    .card {
      border-radius: 0;
    }
  }
</style>
