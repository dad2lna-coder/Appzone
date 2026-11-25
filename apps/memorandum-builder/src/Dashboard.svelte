<script>
  import Wizard from "./Wizard.svelte";

  let { office, showDesk = true } = $props();
  const shortcuts = [
    ["/new", "New Memorandum", "Create a new memorandum using a template"],
    ["/templates", "Manage Templates", "Create, edit and publish templates"],
    ["/batch", "Batch Generation", "Import JSON and generate multiple documents"],
    ["/branding", "Branding & Config", "Manage logos, airports and routing"],
    ["/archive", "Archive", "View and restore historical documents"],
  ];
  let person = $derived(
    (office.config.personnel || []).find((entry) => entry.id === (office.config.issuingOfficialIds || [])[0])
      || (office.config.personnel || [])[0]
      || null,
  );
  let initials = $derived(
    person ? person.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "",
  );
  let docs = $derived(MB.store.state.documents.filter((doc) => doc.officeId === office.id));
  let events = $derived(MB.store.state.activity.slice(0, 5));
</script>

<div class="head">
  <div>
    <h1>Memorandum Builder</h1>
    <p class="sub">Official Memorandum Generation and Management</p>
  </div>
  {#if person}
    <div class="person">
      <span class="avatar">{initials}</span>
      <span><b>{person.name}</b><br /><span class="muted">{person.title}</span></span>
    </div>
  {/if}
</div>

{#if showDesk}
  <div class="shortcuts">
    {#each shortcuts as [href, title, text] (href)}
      <a class="card" href={"#" + href}>
        <span class="well">+</span>
        <span><b>{title}</b><br /><small>{text}</small></span>
      </a>
    {/each}
  </div>
{/if}

<div class="split">
  <section class="panel">
    <div class="navybar"><h2>Create New Memorandum</h2></div>
    <div class="body"><Wizard {office} /></div>
  </section>
  <div>
    <section class="panel">
      <div class="navybar"><h2>Recent Activity</h2><a href="#/archive">View All</a></div>
      <div class="body list">
        {#each events as event (event.id)}
          <article><span>{event.message}<br /><span class="muted">{new Date(event.at).toLocaleString()}</span></span></article>
        {:else}
          <p class="muted">No activity yet.</p>
        {/each}
      </div>
    </section>
    <section class="card">
      <h2>Quick Links</h2>
      <div class="list">
        <a href="#/templates">Import Word Document</a>
        <a href="#/batch">Import Batch JSON</a>
        <a href="#/settings">Export Configuration</a>
        <a href="#/archive">View Archive</a>
      </div>
    </section>
  </div>
</div>

{#if showDesk}
  <div class="bottom">
    <section class="card">
      <h2>Templates</h2>
      <div class="list">
        {#each office.templates.slice(0, 4) as item (item.id)}
          <a class="line" href={"#/templates/" + encodeURIComponent(item.id)}>
            <span>{item.name}</span><span class="badge">v{item.version} {item.status}</span>
          </a>
        {/each}
      </div>
    </section>
    <section class="card">
      <h2>Documents</h2>
      <div class="list">
        {#each docs.slice(0, 4) as doc (doc.documentId)}
          <article>
            <span><b>{doc.filenamePdf || doc.filenameDocx || doc.documentId}</b><br /><span class="muted">{doc.subject}</span></span>
            <span class="badge">{doc.hasPdf ? "PDF" : "DOCX"}</span>
          </article>
        {:else}
          <p class="muted">No documents yet.</p>
        {/each}
      </div>
    </section>
    <section class="card">
      <h2>System Status</h2>
      <p class="muted">Storage is in this browser. {docs.length} document{docs.length === 1 ? "" : "s"} saved.</p>
      <p class={office.branding.logoDataUrl ? "notice success" : "notice warning"}>
        {office.branding.logoDataUrl ? "Logo is embedded locally." : "Add a logo before finished copies."}
      </p>
    </section>
  </div>
{/if}
