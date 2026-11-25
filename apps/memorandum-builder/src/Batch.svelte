<script>
  let { office } = $props();
  let input;
  let revision = $state(0);
  let draft = $derived(revision >= 0 ? MB.store.state.batchDraft : null);
  let template = $derived(draft ? office.templates.find((item) => item.id === draft.templateId) : null);
  let batchDocs = $derived(revision >= 0 && draft ? MB.store.state.documents.filter((doc) => doc.batchId === draft.batchId) : []);

  $effect(() => {
    const unsubscribe = MB.store.subscribe(() => {
      revision += 1;
    });
    return unsubscribe;
  });

  function loadParsed(parsed, fileName) {
    if (!parsed.draft) {
      MB.store.state.notice = { tone: "danger", text: parsed.fileErrors.join(" ") };
      return;
    }
    parsed.draft.fileName = fileName;
    MB.store.setBatch(parsed.draft);
  }

  async function onFile(event) {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (!file) return;
    loadParsed(MB.parseBatchJson(await file.text(), office.templates), file.name);
  }
</script>

<div class="row">
  <button class="btn" type="button" onclick={() => loadParsed(MB.parseBatchJson(JSON.stringify(MB.SAMPLE_BATCH), office.templates), "sample")}>Load sample batch</button>
  <button class="btn secondary" type="button" onclick={() => input.click()}>Import JSON</button>
  <input bind:this={input} hidden type="file" accept="application/json,.json" onchange={onFile} />
</div>
<p class="muted">The sample is included in the page. A copy also sits in samples/batch-schedule.json.</p>
{#if draft}
  <h2>{draft.batchId}</h2>
  <p>{template ? template.name : "Missing template"}</p>
  <label><input type="checkbox" checked={draft.allOrNothing} onchange={(event) => { draft.allOrNothing = event.currentTarget.checked; MB.store.setBatch(draft); }} /> All or nothing</label>
  <div class="list">
    {#each draft.records as record, index (record.key)}
      {@const issues = template ? MB.validateFieldValues(template, record.values, "guided") : [{ message: "No template" }]}
      <article class="card">
        <label>
          <input type="checkbox" checked={record.included} onchange={(event) => { draft.records[index].included = event.currentTarget.checked; MB.store.setBatch(draft); }} />
          <b>{record.key}</b>
        </label>
        {#if issues.length}<p class="warn">{issues.map((issue) => issue.message).join(" ")}</p>{:else}<p class="muted">Ready</p>{/if}
      </article>
    {/each}
  </div>
  <button class="btn" type="button" onclick={() => MB.store.generateBatch()}>Generate included records</button>
  {#if batchDocs.length}
    <button class="btn secondary" type="button" onclick={() => MB.store.exportCsv(batchDocs.map((doc) => doc.documentId))}>Export batch CSV</button>
  {/if}
{:else}
  <p>No batch loaded.</p>
{/if}
