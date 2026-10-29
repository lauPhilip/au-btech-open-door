<script lang="ts">
  import { router } from "./lib/router.svelte";
  import Play from "./views/play/Play.svelte";
  import Teacher from "./views/teacher/Teacher.svelte";
  import Screen from "./views/screen/Screen.svelte";
  import NetworkTest from "./views/network-test/NetworkTest.svelte";
  import Dev from "./views/dev/Dev.svelte";
  import Brand from "./lib/Brand.svelte";

  const TITLES: Record<string, string> = {
    student: "Join your class",
    teacher: "Teacher",
    screen: "Big screen",
    "network-test": "Network test",
    dev: "Simulator",
    "not-found": "Page not found",
  };

  $effect(() => {
    document.title = `Open Door · ${TITLES[router.route.view] ?? ""}`;
  });
</script>

{#if router.route.view === "student"}
  {#key router.route.code}<Play code={router.route.code} />{/key}
{:else if router.route.view === "teacher"}
  {#key router.route.code}<Teacher code={router.route.code} />{/key}
{:else if router.route.view === "screen"}
  {#key router.route.code}<Screen code={router.route.code} />{/key}
{:else if router.route.view === "dev"}
  <Dev code={router.route.code} />
{:else if router.route.view === "network-test"}
  <NetworkTest />
{:else}
  <main class="nf"><Brand /><h1>Page not found</h1><p><a href="/">Join a class</a> or <a href="/teacher">start a session</a>.</p></main>
{/if}

<style>
  .nf {
    max-width: 480px;
    margin: 15vh auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
