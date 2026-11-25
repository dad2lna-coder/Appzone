<script>
  let { office } = $props();
  let revision = $state(0);
  let selected = $state({});

  $effect(() => {
    const unsubscribe = MB.store.subscribe(() => {
      revision += 1;
    });
    return unsubscribe;
  });

  let docs = $derived(revision >= 0 ? MB.store.state.documents.filter((doc) => doc.officeId === office.id) : []);

  function exportCsv() {
    const picked = docs.filter((doc) => selected[doc.documentId]).map((doc) => doc.documentId);
    const ids = picked.length
      ? picked
      : docs.filter((doc) => doc.status !== "archived").map((doc) => doc.documentId);
    MB.store.exportCsv(ids);
  }
</script>

<h1>Archive</h1>
{#if docs.length}
  <p class="row"><button class="btn" type="button" onclick={exportCsv}>Export CSV</button></p>
{/if}
{#if !docs.length}
  <p>No documents yet.</p>
{:else}
  <div class="list">
    {#each docs as doc (doc.documentId)}
      <article class="card">
        <div class="row">
          <input type="checkbox" aria-label={"Select " + doc.documentId} checked={!!selected[doc.documentId]} onchange={(event) => { selected = { ...selected, [doc.documentId]: event.currentTarget.checked }; }} />
          <div>
            <b>{doc.documentId}</b> {doc.subject}<br />
            <span class="muted">{doc.status}{doc.signatureField ? " · signature field" : ""}</span>
          </div>
        </div>
        <div class="row">
          {#if doc.hasDocx}<button class="btn secondary" type="button" onclick={() => MB.store.download(doc.documentId, "docx")}>DOCX</button>{/if}
          {#if doc.hasPdf}<button class="btn secondary" type="button" onclick={() => MB.store.download(doc.documentId, "pdf")}>PDF</button>{/if}
          <button class="btn ghost" type="button" onclick={() => MB.store.setDocumentStatus(doc.documentId, doc.status === "archived" ? "generated" : "archived")}>
            {doc.status === "archived" ? "Restore" : "Archive"}
          </button>
        </div>
      </article>
    {/each}
  </div>
{/if}
