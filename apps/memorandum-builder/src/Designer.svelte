<script>
  let { office, templateId } = $props();
  let template = $derived(office.templates.find((item) => item.id === templateId));
  let draft = $state(null);
  let phrase = $state("");
  let fieldId = $state("");

  $effect(() => {
    if (!template) return;
    if (!draft || draft.id !== template.id) draft = structuredClone(template);
  });

  async function mark() {
    if (!draft) return;
    const literal = phrase.trim();
    if (!literal || !MB.FIELD_ID_PATTERN.test(fieldId.trim())) {
      MB.store.note("Enter a phrase and a field id that starts with a letter.", "danger");
      return;
    }
    draft = await MB.store.markPlaceholder(draft, literal, fieldId.trim());
  }

  function save(mode) {
    if (!draft) return;
    MB.store.saveTemplate(draft, mode, mode === "published" ? "Published" : "Saved from designer");
  }
</script>

<p><a href="#/templates">Templates</a></p>
{#if !template}
  <p>That template is not in the selected office.</p>
{:else if draft}
  <h1>{draft.name}</h1>
  <p class="muted">Version history is kept when you save. Publishing does not erase the previous version.</p>
  {#each draft.importWarnings as warning (warning)}
    <p class="notice warning">{warning}</p>
  {/each}
  <label class="field">Name<input bind:value={draft.name} /></label>
  <label class="field">Subject format<input bind:value={draft.subjectFormat} /></label>
  <label class="field">Body<textarea bind:value={draft.body} style="min-height:180px"></textarea></label>
  <div class="card">
    <h2>Mark a placeholder</h2>
    <p class="muted">Type a phrase that appears in the body or in the imported Word package. It becomes &#123;&#123;{fieldId || "fieldId"}&#125;&#125;.</p>
    <label class="field">Phrase<input bind:value={phrase} /></label>
    <label class="field">Field id<input bind:value={fieldId} placeholder="effectiveDate" /></label>
    <button class="btn secondary" type="button" onclick={mark}>Turn phrase into a field</button>
  </div>
  <h2>Fields</h2>
  <div class="list">
    {#each draft.fields as field, index (field.id)}
      <article class="card">
        <b>{field.label}</b> <span class="muted">&#123;&#123;{field.id}&#125;&#125;</span>
        <br />{field.type}{field.guided ? " · guided" : ""}{field.required ? " · required" : ""}
        <button class="btn ghost" type="button" onclick={() => (draft.fields = draft.fields.filter((_, item) => item !== index))}>Remove</button>
      </article>
    {/each}
  </div>
  <div class="row">
    <button class="btn secondary" type="button" onclick={() => save("draft")}>Save draft</button>
    <button class="btn" type="button" onclick={() => save("published")}>Publish</button>
  </div>
{/if}
