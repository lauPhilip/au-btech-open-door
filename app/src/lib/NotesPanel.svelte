<script lang="ts">
  import type { Note, Player } from "@open-door/shared";

  let {
    notes,
    players,
    me,
    onshare,
    onmerge,
    ondelete,
  }: {
    /** Your own notes plus the notes your team shared. */
    notes: Note[];
    players: Player[];
    me: string;
    onshare: (id: string, shared: boolean) => void;
    onmerge: (keep: string, drop: string) => void;
    ondelete: (id: string) => void;
  } = $props();

  const mine = $derived(notes.filter((n) => n.author === me && !n.shared));
  const team = $derived(notes.filter((n) => n.shared));
  const nameOf = (id: string) => (id === me ? "You" : (players.find((p) => p.id === id)?.name ?? "Teammate"));

  /** Team notes ticked for merging. */
  let picked = $state<string[]>([]);
  // Forget ticks for notes that were merged away or taken back.
  $effect(() => {
    const ids = new Set(team.map((n) => n.id));
    if (picked.some((id) => !ids.has(id))) picked = picked.filter((id) => ids.has(id));
  });

  function toggle(id: string) {
    picked = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id].slice(-2);
  }

  function merge() {
    if (picked.length !== 2) return;
    onmerge(picked[0]!, picked[1]!);
    picked = [];
  }
</script>

<section>
  <h2>My notes <small>{mine.length} · private until shared</small></h2>
  {#if mine.length > 0}
    <ul>
      {#each mine as note (note.id)}
        <li class="note private">
          <span class="text">{note.text}</span>
          <span class="row">
            <button class="share" onclick={() => onshare(note.id, true)}>Share with team</button>
            <button class="del" onclick={() => ondelete(note.id)} aria-label="Delete note: {note.text}">✕</button>
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="empty">Spot something that could go wrong? Press “Sticky note”.</p>
  {/if}
</section>

<section>
  <h2>Team notes <small>{team.length} · on the map</small></h2>
  {#if team.length > 0}
    <ul>
      {#each team as note (note.id)}
        <li class="note">
          <label class="pick">
            <input type="checkbox" checked={picked.includes(note.id)} onchange={() => toggle(note.id)} />
            <span class="visually-hidden">Pick for merging:</span>
            <span class="text">{note.text}</span>
          </label>
          <span class="row">
            <small>{nameOf(note.author)}{note.mergedWith.length > 0 ? ` + ${note.mergedWith.length}` : ""}</small>
            {#if note.author === me}
              <button class="share" onclick={() => onshare(note.id, false)}>Take back</button>
              <button class="del" onclick={() => ondelete(note.id)} aria-label="Delete note: {note.text}">✕</button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
    {#if team.length > 1}
      <button class="merge" disabled={picked.length !== 2} onclick={merge}>
        {picked.length === 2 ? "Merge the two ticked notes" : "Tick two similar notes to merge them"}
      </button>
    {/if}
  {:else}
    <p class="empty">Nothing shared yet. Share a note so your team sees it.</p>
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
  .note {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--sticky-paper);
    border-left: 4px solid var(--sticky);
    padding: 8px 10px;
    border-radius: 6px;
  }
  .note.private {
    border-left-style: dashed;
  }
  .pick {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    cursor: pointer;
  }
  .pick input {
    margin-top: 5px;
    width: 18px;
    height: 18px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }
  .row small {
    margin-right: auto;
    color: var(--slate);
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .share,
  .merge {
    min-height: 44px;
    padding: 6px 12px;
    border: 2px solid var(--blue);
    border-radius: var(--radius-m);
    background: var(--paper);
    color: var(--blue-dark);
    font-weight: 600;
  }
  .share:hover,
  .merge:not(:disabled):hover {
    background: var(--blue-soft);
  }
  .merge {
    margin-top: 10px;
    width: 100%;
  }
  .merge:disabled {
    cursor: default;
    color: var(--slate);
    border-color: var(--line);
  }
  .del {
    border: 0;
    background: none;
    color: var(--slate);
    min-width: 44px;
    min-height: 44px;
  }
  .empty {
    color: var(--slate);
    font-size: 14px;
    margin: 6px 0 0;
  }
</style>
