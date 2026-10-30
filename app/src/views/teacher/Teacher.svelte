<script lang="ts">
  import { scenarios, type Minutes } from "@open-door/shared";
  import { createSession } from "../../lib/api";
  import { loadTeacherKey, saveTeacherKey } from "../../lib/saved";
  import { router } from "../../lib/router.svelte";
  import Brand from "../../lib/Brand.svelte";
  import TeacherRoom from "./TeacherRoom.svelte";

  let { code }: { code: string | null } = $props();

  const key = $derived(code ? loadTeacherKey(code) : null);

  const choices = Object.values(scenarios);
  let scenarioId = $state(choices[0]?.id ?? "");
  let minutes = $state<Minutes>(90);
  let busy = $state(false);
  let problem = $state<string | null>(null);

  async function create(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    problem = null;
    try {
      const session = await createSession(scenarioId, minutes);
      saveTeacherKey(session.code, session.teacherKey);
      router.go(`/teacher?code=${session.code}`);
    } catch (error) {
      problem = error instanceof Error ? error.message : "Something went wrong.";
    } finally {
      busy = false;
    }
  }
</script>

{#if code && key}
  <TeacherRoom {code} teacherKey={key} />
{:else}
  <main class="page">
    <form class="card" onsubmit={create}>
      <Brand />
      <h1>Start a class session</h1>
      {#if code}
        <p class="warn">This browser does not have the teacher key for session {code}. Start a new session, or open the teacher page in the browser that created it.</p>
      {/if}
      <fieldset>
        <legend>Scenario</legend>
        {#each choices as s (s.id)}
          <label class="option">
            <input type="radio" name="scenario" value={s.id} bind:group={scenarioId} />
            <span><strong>{s.company.name} · {s.title}</strong><small>{s.company.place}. {s.goal}</small></span>
          </label>
        {/each}
      </fieldset>
      <fieldset>
        <legend>Length</legend>
        <div class="lengths">
          {#each [45, 90] as const as m (m)}
            <label class="pill"><input type="radio" name="minutes" value={m} bind:group={minutes} /> {m} minutes</label>
          {/each}
        </div>
      </fieldset>
      <button type="submit" disabled={busy || !scenarioId}>{busy ? "Creating…" : "Create session"}</button>
      {#if problem}<p class="warn" role="alert">{problem}</p>{/if}
      <p class="note">You get a four-letter code for the class. Everything about the session is deleted after six hours.</p>
    </form>
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
    width: min(520px, 100%);
    background: var(--paper);
    border-radius: var(--radius-l);
    padding: 28px 24px;
    box-shadow: var(--shadow-2);
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  h1 {
    font-size: 32px;
  }
  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
  }
  .option {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
    cursor: pointer;
  }
  .option:has(input:checked) {
    border-color: var(--blue);
    background: var(--blue-soft);
  }
  .option span {
    display: flex;
    flex-direction: column;
  }
  .option small {
    color: var(--slate);
    font-size: 14px;
  }
  .lengths {
    display: flex;
    gap: 8px;
  }
  .pill {
    flex: 1;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
    font-weight: 600;
    cursor: pointer;
  }
  .pill:has(input:checked) {
    border-color: var(--blue);
    background: var(--blue-soft);
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
  button:hover:not(:disabled) {
    background: var(--blue-dark);
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .warn {
    margin: 0;
    color: var(--alert-dark);
  }
  .note {
    margin: 0;
    font-size: 14px;
    color: var(--slate);
  }
</style>
