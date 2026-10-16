<script lang="ts">
  import { cleanName, NAME_MAX } from "@open-door/shared";
  import { readStored, writeStored } from "../lib/room.svelte";

  let { onjoin }: { onjoin: (name: string) => void } = $props();

  let name = $state(readStored("open-door:name") ?? "");

  function join(event: SubmitEvent) {
    event.preventDefault();
    const clean = cleanName(name);
    writeStored("open-door:name", clean);
    onjoin(clean);
  }
</script>

<main class="join">
  <div class="card">
    <div class="brand">
      <svg width="36" height="36" viewBox="0 0 72 72" aria-hidden="true"><rect x="14" y="6" width="44" height="62" rx="8" fill="#2E5BDB"></rect><path d="M22 14 L46 10 L46 66 L22 62 Z" fill="#FFE27A"></path></svg>
      <span>Open Door</span>
    </div>
    <h1>Network test</h1>
    <p>Help us check that the classroom game works on this network. Type your first name and press Join. Then keep the page open for five minutes.</p>
    <form onsubmit={join}>
      <label for="name">Your first name or a nickname</label>
      <input id="name" bind:value={name} maxlength={NAME_MAX} autocomplete="given-name" autocapitalize="words" enterkeyhint="go" />
      <button type="submit">Join</button>
    </form>
    <p class="note">No account. Your name is only shown in this room and is gone when you close the page.</p>
  </div>
</main>

<style>
  .join {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .card {
    width: min(440px, 100%);
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 28px 24px;
    box-shadow: 0 1px 2px rgba(28, 36, 48, 0.06), 0 8px 24px rgba(28, 36, 48, 0.06);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 20px;
  }
  h1 {
    font-size: 34px;
  }
  p {
    margin: 0;
    color: #3a4554;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  label {
    font-weight: 600;
    font-size: 15px;
  }
  input {
    font-size: 18px;
    padding: 12px 14px;
    border-radius: var(--radius-m);
    border: 1px solid #c9cfd8;
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
  button:hover {
    background: var(--blue-dark);
  }
  .note {
    font-size: 13px;
    color: var(--slate);
  }
</style>
