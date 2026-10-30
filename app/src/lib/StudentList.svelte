<script lang="ts">
  import { teamById, type Player } from "@open-door/shared";
  import Face from "./Face.svelte";

  let { players, onrename, onremove }: { players: Player[]; onrename: (id: string, name: string) => void; onremove: (id: string) => void } = $props();

  let editing = $state<string | null>(null);
  let draft = $state("");
  let confirming = $state<string | null>(null);

  function startEdit(p: Player) {
    editing = p.id;
    draft = p.name;
    confirming = null;
  }
  function save(event: SubmitEvent, id: string) {
    event.preventDefault();
    if (draft.trim()) onrename(id, draft);
    editing = null;
  }
  function remove(id: string) {
    onremove(id);
    confirming = null;
  }
</script>

<details class="students">
  <summary>Manage students ({players.length})</summary>
  {#if players.length === 0}
    <p class="empty">Nobody has joined yet.</p>
  {:else}
    <ul>
      {#each players as p (p.id)}
        <li class:offline={!p.online}>
          <Face face={p.face} size={28} />
          {#if editing === p.id}
            <form onsubmit={(e) => save(e, p.id)}>
              <input aria-label="New name for {p.name}" bind:value={draft} maxlength="24" />
              <button type="submit">Save</button>
              <button type="button" class="plain" onclick={() => (editing = null)}>Cancel</button>
            </form>
          {:else}
            <span class="name"><strong>{p.name}</strong> <small>{p.team ? teamById(p.team).name : "no table yet"}{p.online ? "" : " · offline"}</small></span>
            <button type="button" aria-label="Rename {p.name}" onclick={() => startEdit(p)}>Rename</button>
            {#if confirming === p.id}
              <button type="button" class="danger" onclick={() => remove(p.id)}>Remove {p.name} for good?</button>
              <button type="button" class="plain" onclick={() => (confirming = null)}>Keep</button>
            {:else}
              <button type="button" class="plain" aria-label="Remove {p.name}" onclick={() => (confirming = p.id)}>Remove</button>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</details>

<style>
  .students { background: var(--paper); border-radius: var(--radius-m); padding: 10px 14px; box-shadow: var(--shadow-1); }
  summary { cursor: pointer; font-weight: 700; min-height: 44px; display: flex; align-items: center; }
  ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 6px; }
  li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-height: 44px; }
  li.offline { opacity: 0.7; }
  .name { flex: 1 1 160px; min-width: 0; display: flex; flex-direction: column; overflow-wrap: anywhere; }
  small { color: var(--slate); }
  form { display: flex; gap: 8px; flex: 1 1 260px; flex-wrap: wrap; }
  input { flex: 1 1 140px; min-height: 44px; padding: 0 10px; font: inherit; border: 1px solid var(--line); border-radius: var(--radius-m); }
  button { min-height: 44px; padding: 0 14px; font: inherit; font-weight: 600; cursor: pointer; background: var(--paper); color: var(--blue); border: 2px solid var(--blue); border-radius: var(--radius-m); }
  button.plain { border-color: var(--line); color: var(--ink); }
  button.danger { background: var(--alert-dark); border-color: var(--alert-dark); color: #fff; }
  .empty { margin: 8px 0 0; color: var(--slate); }
</style>
