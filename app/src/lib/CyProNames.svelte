<script lang="ts">
  // What the class did has a name in the CyPro method (concept book, board 13, issue #30).
  const NAMES: ReadonlyArray<[game: string, cypro: string]> = [
    ["Rooms you walked", "System model"],
    ["Things worth protecting", "Assets"],
    ["Where data left the building", "Trust boundaries"],
    ["Your sticky notes", "Threats"],
    ["Leak · change · stop", "C · I · A"],
    ["Who might cause it", "Threat actors"],
    ["1–4 how likely", "Likelihood"],
  ];
</script>

<section class="names" aria-labelledby="names-h">
  <p class="eyebrow">Now you know the names</p>
  <h2 id="names-h">What you did has a name in the CyPro method</h2>
  <ul>
    {#each NAMES as [word, name] (word)}
      <li><span class="game">{word}</span><span class="arrow" aria-label="is called">→</span><strong>{name}</strong></li>
    {/each}
  </ul>
</section>

<style>
  .names { background: var(--paper); border-radius: var(--radius-l); padding: 20px 24px; }
  .eyebrow { margin: 0; color: var(--slate); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 16px; }
  h2 { margin: 4px 0 12px; font-size: 26px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 22px; }
  li { display: grid; grid-template-columns: 1fr 32px 1fr; align-items: center; gap: 8px; }
  .arrow { text-align: center; color: var(--blue-dark); font-weight: 800; }
  strong { color: var(--blue-dark); }
</style>
