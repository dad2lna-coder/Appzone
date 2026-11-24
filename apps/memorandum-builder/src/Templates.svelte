<script>
  let { office } = $props();
  let input;

  async function onFile(event) {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (!file) return;
    const id = await MB.store.importDocx(file);
    location.hash = "/templates/" + id;
  }
</script>

<div class="row">
  <button class="btn" type="button" onclick={() => (location.hash = "/templates/" + MB.store.createBlank())}>New template</button>
  <button class="btn secondary" type="button" onclick={() => input.click()}>Import Word template</button>
  <input bind:this={input} hidden type="file" accept=".docx" onchange={onFile} />
</div>
<div class="list" style="margin-top:16px">
  {#each office.templates as template (template.id)}
    <article class="card">
      <div>
        <a href={"#/templates/" + encodeURIComponent(template.id)}><b>{template.name}</b></a>
        <br /><span class="muted">{template.category} · v{template.version} · {template.fields.length} fields</span>
      </div>
      <span class="badge">{template.status}</span>
    </article>
  {/each}
</div>
