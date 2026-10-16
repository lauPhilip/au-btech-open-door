<script lang="ts">
  import { cleanName, FACE_COUNT, NAME_MAX } from "@open-door/shared";
  import { lastProfile, loadPlayer, randomId, savePlayer, type SavedPlayer } from "../../lib/saved";
  import Face from "../../lib/Face.svelte";

  let { code, onready }: { code: string; onready: (player: SavedPlayer) => void } = $props();

  const last = lastProfile();
  let name = $state(last.name);
  let face = $state(last.face);

  function submit(event: SubmitEvent) {
    event.preventDefault();
    // Keep the same id when someone changes their name or face, so they stay one player.
    const player = { id: loadPlayer(code)?.id ?? randomId(), name: cleanName(name), face };
    savePlayer(code, player);
    onready(player);
  }
</script>

<h1>Who are you?</h1>
<form onsubmit={submit}>
  <label for="name">First name or nickname</label>
  <input id="name" bind:value={name} maxlength={NAME_MAX} autocomplete="given-name" autocapitalize="words" required />
  <fieldset>
    <legend>Pick a face</legend>
    <div class="faces">
      {#each Array.from({ length: FACE_COUNT }, (_, i) => i) as f (f)}
        <label class="face" class:on={face === f}>
          <input type="radio" name="face" value={f} bind:group={face} class="visually-hidden" />
          <Face face={f} size={52} label="Face {f + 1}" />
        </label>
      {/each}
    </div>
  </fieldset>
  <button type="submit" disabled={name.trim().length === 0}>Next</button>
</form>
<p class="note">No account. Your name is only shown in this session and is deleted after class.</p>

<style>
  h1 {
    font-size: 32px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  label[for="name"],
  legend {
    font-weight: 600;
  }
  #name {
    font-size: 18px;
    padding: 12px 14px;
    border-radius: var(--radius-m);
    border: 1px solid #c9cfd8;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 6px 0 0;
  }
  legend {
    margin-bottom: 8px;
  }
  .faces {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }
  .face {
    display: grid;
    place-items: center;
    padding: 4px;
    border-radius: var(--radius-m);
    border: 2px solid transparent;
    cursor: pointer;
  }
  .face.on {
    border-color: var(--blue);
    background: var(--blue-soft);
  }
  .face:has(input:focus-visible) {
    outline: 3px solid var(--blue);
    outline-offset: 2px;
  }
  button {
    margin-top: 6px;
    min-height: 52px;
    border: none;
    border-radius: var(--radius-m);
    background: var(--blue);
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
  }
  .note {
    margin: 0;
    font-size: 13px;
    color: var(--slate);
  }
</style>
