<script lang="ts">
  /** Four short steps for a first-time player. Shown above the picture the first time; the "?" button brings it back. It never covers the picture. */
  let { onclose }: { onclose: () => void } = $props();

  const steps = [
    { icon: "👣", title: "Walk around", text: "Tap the map, or use the arrow keys. Visit every room with your team." },
    { icon: "💬", title: "Talk and look", text: "Walk up to a person or a thing, then tap the blue button to talk or look closer." },
    { icon: "📝", title: "Write a sticky note", text: "Spot something risky? Tap Sticky note. Notes stay private until you share them." },
    { icon: "✅", title: "Tell your teacher", text: "When your whole table is done, tap Our table is done." },
  ];

</script>

<section class="howto" aria-labelledby="howto-title">
  <h2 id="howto-title">How to play</h2>
  <ol>
    {#each steps as step, i (step.title)}
      <li>
        <span class="icon" aria-hidden="true">{step.icon}</span>
        <span><strong>{i + 1}. {step.title}</strong><br />{step.text}</span>
      </li>
    {/each}
  </ol>
  <button onclick={onclose}>Got it</button>
</section>

<style>
  .howto { padding: 14px 18px; border: 2px solid var(--blue); border-radius: var(--radius-l); background: var(--paper); color: var(--ink); box-shadow: var(--shadow-1); }
  h2 { margin: 0 0 10px; font-size: 20px; }
  ol { list-style: none; margin: 0 0 12px; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px 16px; }
  li { display: flex; gap: 14px; align-items: flex-start; }
  .icon { flex: none; width: 44px; height: 44px; display: grid; place-items: center; font-size: 24px; background: var(--blue-soft); border-radius: 50%; }
  button { min-height: 48px; padding: 0 28px; font: inherit; font-size: 18px; font-weight: 700; color: #fff; background: var(--blue); border: none; border-radius: var(--radius-m); cursor: pointer; }
  button:hover { background: var(--blue-dark); }
</style>
