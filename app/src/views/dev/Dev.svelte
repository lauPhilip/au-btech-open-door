<script lang="ts">
  import { FACE_COUNT, scenarios, TEAMS, type Minutes, type TeamId } from "@open-door/shared";
  import { createSession } from "../../lib/api";
  import { scopeFor } from "../../lib/room.svelte";
  import { randomId } from "../../lib/saved";
  import { router } from "../../lib/router.svelte";
  import Brand from "../../lib/Brand.svelte";

  // Developer simulator: one window with the teacher, the projector and any number of
  // students, each in its own frame with its own saved identity (`?as=NAME`).
  let { code }: { code: string | null } = $props();

  interface Student {
    name: string;
    team: TeamId;
  }

  const scenarioId = Object.values(scenarios)[0]?.id ?? "";
  let minutes = $state<Minutes>(45);
  let busy = $state(false);
  let problem = $state<string | null>(null);
  let students = $state<Student[]>([
    { name: "Ana", team: "blue" },
    { name: "Ben", team: "blue" },
    { name: "Chen", team: "green" },
  ]);
  let newName = $state("");
  let newTeam = $state<TeamId>("blue");
  let layout = $state<"grid" | "students">("grid");

  const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "student";

  function faceFor(name: string): number {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return h % FACE_COUNT;
  }

  /** Give the frame its identity before it loads, so it skips the name and face form. */
  function prepare(code: string, student: Student): string {
    const as = slug(student.name);
    const scope = scopeFor(as);
    try {
      const key = `${scope}open-door:player:${code}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ id: randomId(), name: student.name, face: faceFor(student.name) }));
      }
    } catch {
      /* storage blocked: the frame shows the normal join form */
    }
    return `/j/${code}?as=${as}&team=${student.team}`;
  }

  async function create() {
    busy = true;
    problem = null;
    try {
      const session = await createSession(scenarioId, minutes);
      localStorage.setItem(`${scopeFor("teacher")}open-door:teacher:${session.code}`, session.teacherKey);
      router.go(`/dev?code=${session.code}`);
    } catch (error) {
      problem = error instanceof Error ? error.message : "Something went wrong.";
    } finally {
      busy = false;
    }
  }

  function addStudent(event: SubmitEvent) {
    event.preventDefault();
    const name = newName.trim().slice(0, 20);
    if (!name || students.some((s) => slug(s.name) === slug(name))) return;
    students = [...students, { name, team: newTeam }];
    newName = "";
  }

  function remove(student: Student) {
    students = students.filter((s) => s !== student);
  }

  function reset() {
    router.go("/dev");
  }
</script>

<main class="dev">
  <header>
    <Brand />
    <strong>Simulator</strong>
    {#if code}
      <span class="code">Session <code>{code}</code></span>
      <label class="check"><input type="checkbox" checked={layout === "students"} onchange={(e) => (layout = e.currentTarget.checked ? "students" : "grid")} /> Hide teacher and projector</label>
      <form class="add" onsubmit={addStudent}>
        <input aria-label="Student name" placeholder="Student name" bind:value={newName} maxlength="20" />
        <select aria-label="Team" bind:value={newTeam}>
          {#each TEAMS as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
        <button type="submit">Add student</button>
      </form>
      <button class="ghost" onclick={reset}>New session</button>
    {:else}
      <label>Length
        <select bind:value={minutes}><option value={45}>45 minutes</option><option value={90}>90 minutes</option></select>
      </label>
      <button disabled={busy} onclick={create}>{busy ? "Creating…" : "Create session and open everyone"}</button>
      {#if problem}<span class="warn" role="alert">{problem}</span>{/if}
    {/if}
  </header>

  {#if code}
    <div class="frames" class:solo={layout === "students"}>
      {#if layout === "grid"}
        <section class="frame wide">
          <h2>Teacher <a href="/teacher?code={code}&as=teacher" target="_blank" rel="noreferrer">open in a tab</a></h2>
          <iframe title="Teacher" src="/teacher?code={code}&as=teacher"></iframe>
        </section>
        <section class="frame wide">
          <h2>Projector <a href="/screen/{code}" target="_blank" rel="noreferrer">open in a tab</a></h2>
          <iframe title="Projector" src="/screen/{code}"></iframe>
        </section>
      {/if}
      {#each students as student (student.name)}
        <section class="frame">
          <h2>
            {student.name} <small>{student.team}</small>
            <span>
              <a href={prepare(code, student)} target="_blank" rel="noreferrer">open in a tab</a>
              <button class="x" onclick={() => remove(student)} aria-label="Remove {student.name}">✕</button>
            </span>
          </h2>
          <iframe title="Student {student.name}" src={prepare(code, student)}></iframe>
        </section>
      {/each}
    </div>
  {:else}
    <p class="intro">
      Creates a session and opens the teacher view, the projector and three students at their team tables, side by side.
      Each frame keeps its own identity, so you can play every role yourself. Add or remove students at any time.
    </p>
  {/if}
</main>

<style>
  .dev {
    min-height: 100dvh;
    padding: 12px 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 16px;
  }
  .code code {
    font-weight: 700;
    letter-spacing: 0.15em;
  }
  .add {
    display: flex;
    gap: 6px;
  }
  input,
  select,
  header button {
    font: inherit;
    padding: 6px 10px;
    border: 2px solid var(--line);
    border-radius: var(--radius-s);
    background: var(--paper);
  }
  header button:not(.ghost) {
    background: var(--blue);
    border-color: var(--blue);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }
  header .ghost {
    cursor: pointer;
  }
  .check {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .check input {
    padding: 0;
  }
  .warn {
    color: var(--alert-dark);
  }
  .intro {
    max-width: 60ch;
    color: var(--slate);
  }
  .frames {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 12px;
    align-items: start;
  }
  .frame {
    background: var(--paper);
    border-radius: var(--radius-m);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .frame.wide {
    grid-column: span 2;
  }
  h2 {
    font-size: 16px;
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  h2 small {
    color: var(--slate);
    font-family: var(--font-body);
  }
  h2 span {
    margin-left: auto;
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 13px;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  h2 a {
    margin-left: auto;
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 13px;
  }
  h2 span a {
    margin-left: 0;
  }
  .x {
    border: 0;
    background: none;
    cursor: pointer;
    color: var(--slate);
  }
  iframe {
    width: 100%;
    height: 620px;
    border: 1px solid var(--line);
    border-radius: var(--radius-s);
    background: var(--mist);
  }
  .wide iframe {
    height: 620px;
  }
  @media (max-width: 900px) {
    .frame.wide {
      grid-column: span 1;
    }
  }
</style>
