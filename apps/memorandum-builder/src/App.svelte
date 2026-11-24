<script>
  import Sidebar from "./Sidebar.svelte";
  import Dashboard from "./Dashboard.svelte";
  import Templates from "./Templates.svelte";
  import Designer from "./Designer.svelte";
  import Batch from "./Batch.svelte";
  import Branding from "./Branding.svelte";
  import Archive from "./Archive.svelte";
  import Settings from "./Settings.svelte";

  let ready = $state(false);
  let revision = $state(0);
  let path = $state(location.hash.replace(/^#/, "") || "/");
  let menu = $state(false);

  $effect(() => {
    const onHash = () => {
      path = location.hash.replace(/^#/, "") || "/";
      menu = false;
    };
    window.addEventListener("hashchange", onHash);
    const off = MB.store.subscribe(() => {
      revision += 1;
      ready = MB.store.state.ready;
    });
    if (!MB.store.state.ready) MB.store.hydrate();
    return () => {
      window.removeEventListener("hashchange", onHash);
      off();
    };
  });

  let office = $derived(ready && revision >= 0 ? MB.store.office() : null);
  let route = $derived((path || "/").split("?")[0]);
  let notice = $derived(revision >= 0 ? MB.store.state.notice : null);
</script>

{#if !office}
  <p class="main">Loading office records…</p>
{:else}
  {#if menu}<button class="scrim" type="button" aria-label="Close navigation" onclick={() => (menu = false)}></button>{/if}
  <div class="app">
    <Sidebar {office} {route} open={menu} onclose={() => (menu = false)} />
    <div class="main">
      <button class="btn secondary menu" type="button" onclick={() => (menu = true)}>Menu</button>
      {#if notice}
        <div class="notice {notice.tone}">{notice.text} <button class="btn ghost" type="button" onclick={() => MB.store.dismiss()}>Dismiss</button></div>
      {/if}
      {#if route === "/" || route === "/new"}
        <Dashboard {office} showDesk={route === "/"} />
      {:else if route === "/templates"}
        <Templates {office} />
      {:else if route.startsWith("/templates/")}
        <Designer {office} templateId={decodeURIComponent(route.slice("/templates/".length))} />
      {:else if route === "/batch"}
        <Batch {office} />
      {:else if route === "/branding"}
        <Branding {office} />
      {:else if route === "/archive"}
        <Archive {office} />
      {:else if route === "/settings"}
        <Settings />
      {:else}
        <Dashboard {office} showDesk={true} />
      {/if}
    </div>
  </div>
{/if}
