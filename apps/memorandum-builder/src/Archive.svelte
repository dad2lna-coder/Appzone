<script>
  let { office } = $props();
  let docs = $derived(MB.store.state.documents.filter((doc) => doc.officeId === office.id));
</script>

<h1>Archive</h1>
{#if !docs.length}
  <p>No documents yet.</p>
{:else}
  <div class="list">
    {#each docs as doc (doc.documentId)}
      <article class="card">
        <div>
          <b>{doc.documentId}</b> {doc.subject}<br />
          <span class="muted">{doc.status}{doc.signatureField ? " · signature field" : ""}</span>
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
