<script lang="ts">
  import { t } from "../../lib/i18n.svelte";
  import LanguageSwitch from "../../lib/LanguageSwitch.svelte";
  import { normaliseCode } from "@open-door/shared";
  import { findSession } from "../../lib/api";
  import { loadPlayer, type SavedPlayer } from "../../lib/saved";
  import { router } from "../../lib/router.svelte";
  import Brand from "../../lib/Brand.svelte";
  import Profile from "./Profile.svelte";
  import PlayerSession from "./PlayerSession.svelte";

  let { code }: { code: string | null } = $props();

  let typed = $state("");
  let problem = $state<string | null>(null);
  let checking = $state(false);
  /** null while checking, true or false once known. */
  let exists = $state<boolean | null>(null);
  // svelte-ignore state_referenced_locally
  let player = $state<SavedPlayer | null>(code ? loadPlayer(code) : null);

  $effect(() => {
    const c = code;
    exists = null;
    player = c ? loadPlayer(c) : null;
    if (!c) return;
    findSession(c)
      .then((s) => (exists = s !== null))
      .catch(() => (exists = true)); // offline for a moment: let the live connection try
  });

  async function submitCode(event: SubmitEvent) {
    event.preventDefault();
    const c = normaliseCode(typed);
    if (!c) {
      problem = "A code has four letters or numbers, like HXQ4.";
      return;
    }
    checking = true;
    problem = null;
    try {
      const session = await findSession(c);
      if (session) router.go(`/j/${c}`);
      else problem = `There is no session with the code ${c}. Check the big screen.`;
    } catch {
      problem = "Could not reach Open Door. Check your Wi-Fi and try again.";
    } finally {
      checking = false;
    }
  }
</script>

{#if code && exists !== false && player}
  <PlayerSession {code} {player} onleave={() => (player = null)} />
{:else}
  <main class="page">
    <div class="card">
      <Brand />
      <LanguageSwitch />
      {#if !code}
        <h1>{t("join.title")}</h1>
        <form onsubmit={submitCode}>
          <label for="code">{t("join.codeLabel")}</label>
          <input
            id="code"
            bind:value={typed}
            maxlength="6"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            enterkeyhint="go"
            placeholder="HXQ4"
          />
          <button type="submit" disabled={checking}>{checking ? t("join.checking") : t("join.next")}</button>
        </form>
        {#if problem}<p class="warn" role="alert">{problem}</p>{/if}
        <p class="note">{t("join.note")} <a href="/network-test">{t("join.networkTest")}</a>.</p>
      {:else if exists === false}
        <h1>{t("notfound.title")}</h1>
        <p>{t("notfound.text", { code })}</p>
        <button onclick={() => router.go("/")}>{t("notfound.again")}</button>
      {:else}
        <Profile {code} onready={(p) => (player = p)} />
      {/if}
    </div>
  </main>
{/if}

<style>
  .page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 16px;
  }
  .card {
    width: min(480px, 100%);
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 28px 24px;
    box-shadow: var(--shadow-2);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  h1 {
    font-size: 32px;
  }
  p {
    margin: 0;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  label {
    font-weight: 600;
  }
  input {
    font-family: var(--font-display);
    font-size: 36px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-align: center;
    padding: 10px 14px;
    border-radius: var(--radius-m);
    border: 1px solid #c9cfd8;
  }
  button {
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
    opacity: 0.6;
  }
  .warn {
    color: var(--alert-dark);
  }
  .note {
    font-size: 14px;
    color: var(--slate);
  }
</style>
