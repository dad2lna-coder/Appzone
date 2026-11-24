<script>
  let { office, route, open = false, onclose } = $props();
  const links = [
    ["/", "Dashboard"],
    ["/new", "New Memorandum"],
    ["/templates", "Template Manager"],
    ["/batch", "Batch Generation"],
    ["/branding", "Branding & Config"],
    ["/archive", "Archive"],
    ["/settings", "Settings"],
  ];

  function active(href) {
    return href === "/" ? route === "/" : route.startsWith(href);
  }
</script>

<aside class="sidebar" class:open>
  <div class="brand">
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <path d="M6 30c10-2 16-8 22-16 2 6 2 10-1 16-8 1-14 1-21 0z" fill="#7ec8ff" />
      <path d="M8 34c12-1 20-6 28-14 1 5 0 9-4 13-10 2-16 2-24 1z" fill="#d7ecff" />
    </svg>
    <div>
      <strong>Memorandum Builder</strong>
      <span>Create · Manage · Archive</span>
    </div>
  </div>
  <nav class="nav">
    {#each links as [href, label] (href)}
      <a class:active={active(href)} href={"#" + href} onclick={onclose}>{label}</a>
    {/each}
  </nav>
  <div class="art">
    <img src="assets/sidebar-airport.jpg" alt="" />
    <div class="fade"></div>
    <div class="office-card">
      <label>
        Office
        <select
          value={office.id}
          onchange={(event) => MB.store.setOffice(event.currentTarget.value)}
        >
          {#each MB.store.state.offices as item (item.id)}
            <option value={item.id}>{item.config.officeName}</option>
          {/each}
        </select>
      </label>
      <p class="ready"><span class="dot"></span> Ready <span class="muted">{office.config.region}</span></p>
    </div>
  </div>
</aside>
