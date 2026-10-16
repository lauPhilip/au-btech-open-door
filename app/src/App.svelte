<script lang="ts">
  import Join from "./views/Join.svelte";
  import Student from "./views/Student.svelte";
  import Projector from "./views/Projector.svelte";
  import { roomFromUrl } from "./lib/format";

  const url = new URL(window.location.href);
  const room = roomFromUrl(url);
  const projector = url.searchParams.get("view") === "projector";

  let name = $state<string | null>(null);
</script>

{#if projector}
  <Projector {room} />
{:else if name === null}
  <Join onjoin={(n) => (name = n)} />
{:else}
  <Student {room} {name} />
{/if}
