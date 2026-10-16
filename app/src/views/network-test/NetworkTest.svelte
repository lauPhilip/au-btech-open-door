<script lang="ts">
  // The hello room from milestone M1, now at /network-test.
  //   /network-test?room=herning-1                  a student device
  //   /network-test?room=herning-1&view=projector   the projector
  import Join from "./Join.svelte";
  import Student from "./Student.svelte";
  import Projector from "./Projector.svelte";
  import { roomFromUrl } from "../../lib/format";

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
