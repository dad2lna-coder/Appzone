<script>
  import Preview from "./Preview.svelte";

  let { office } = $props();
  let step = $state(0);
  let templateId = $state("");
  let mode = $state("guided");
  let values = $state({});
  let linked = $state(true);
  let subject = $state("");
  let body = $state("");
  let result = $state(null);
  let busy = $state(false);

  let usable = $derived(office.templates.filter((item) => item.status !== "archived"));
  let template = $derived(office.templates.find((item) => item.id === templateId) || null);

  $effect(() => {
    if (templateId || !usable.length) return;
    const first = usable.find((item) => item.status === "published") || usable[0];
    templateId = first.id;
    values = MB.initialValues(first, office.config);
  });

  let memo = $derived.by(() => {
    if (!template) return null;
    return MB.resolveMemorandum({
      template,
      config: office.config,
      values: { ...MB.initialValues(template, office.config), ...values },
      mode,
      documentId: "PREVIEW",
      brandingVersion: office.branding.version,
      overrides: mode === "full" && !linked ? { subject, body } : undefined,
    });
  });

  function choose(id) {
    const next = office.templates.find((item) => item.id === id);
    if (!next) return;
    templateId = id;
    values = MB.initialValues(next, office.config);
    result = null;
  }

  function setField(id, value) {
    values = { ...values, [id]: value };
  }

  function setRange(id, part, value) {
    const current = String(values[id] || "|").split("|");
    if (part === "start") current[0] = value;
    else current[1] = value;
    setField(id, current.join("|"));
  }

  async function generate(formats) {
    if (!template || busy) return;
    busy = true;
    const response = await MB.store.generate({
      templateId,
      values,
      mode,
      formats,
      overrides: mode === "full" && !linked ? { subject, body } : undefined,
    });
    result = response;
    step = 3;
    busy = false;
  }

  const steps = ["Select Template", "Populate Fields", "Preview", "Generate"];
</script>

<div class="steps">
  {#each steps as label, index (label)}
    <button type="button" class="step" class:on={step === index} disabled={index > step} onclick={() => (step = index)}>
      <span class="num">{index + 1}</span>{label}
    </button>
  {/each}
</div>

{#if step === 0}
  <div class="wizard">
    <div>
      <label class="field">
        Memorandum Type
        <select value={templateId} onchange={(event) => choose(event.currentTarget.value)}>
          {#each usable as item (item.id)}
            <option value={item.id}>{item.name}</option>
          {/each}
        </select>
      </label>
      <p class="field">Mode</p>
      <div class="modes">
        <button type="button" class="mode" class:on={mode === "guided"} onclick={() => (mode = "guided")}>
          <b>Guided Mode</b><br /><span class="muted">Edit only designated fields</span>
        </button>
        <button type="button" class="mode" class:on={mode === "full"} onclick={() => (mode = "full")}>
          <b>Full Edit Mode</b><br /><span class="muted">Edit the entire document</span>
        </button>
      </div>
      <p><button class="btn" type="button" onclick={() => (step = 1)}>Next: Populate Fields →</button></p>
    </div>
    {#if memo}<Preview {memo} logoUrl={office.branding.logoDataUrl || ""} />{/if}
  </div>
{:else if step === 1 && template}
  {#each template.fields.filter((field) => mode === "full" || field.guided) as field (field.id)}
    <label class="field">
      {field.label}{field.required ? " *" : ""}
      {#if field.type === "textarea"}
        <textarea value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)}></textarea>
      {:else if field.type === "date"}
        <input type="date" value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)} />
      {:else if field.type === "dateRange"}
        <input type="date" value={(values[field.id] || "").split("|")[0] || ""} onchange={(event) => setRange(field.id, "start", event.currentTarget.value)} />
        <input type="date" value={(values[field.id] || "").split("|")[1] || ""} onchange={(event) => setRange(field.id, "end", event.currentTarget.value)} />
      {:else if field.type === "airport"}
        <select value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)}>
          <option value="">Select</option>
          {#each office.config.airports as airport (airport.code)}
            <option value={airport.code}>{airport.code}</option>
          {/each}
        </select>
      {:else if field.type === "location"}
        <select value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)}>
          <option value="">Select</option>
          {#each (office.config.airports.find((item) => item.code === values.airport)?.locations || []) as location (location)}
            <option>{location}</option>
          {/each}
        </select>
      {:else if field.type === "personnel"}
        <select value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)}>
          <option value="">Select</option>
          {#each office.config.personnel as person (person.id)}
            <option value={person.id}>{person.name}</option>
          {/each}
        </select>
      {:else}
        <input value={values[field.id] || ""} onchange={(event) => setField(field.id, event.currentTarget.value)} />
      {/if}
    </label>
  {/each}
  <label class="field">Recipients<textarea value={values.recipients || ""} onchange={(event) => setField("recipients", event.currentTarget.value)}></textarea></label>
  <label class="field">CC<input value={values.cc || ""} onchange={(event) => setField("cc", event.currentTarget.value)} /></label>
  <label class="field">
    Issuing official
    {#if (office.config.personnel || []).length}
      <select value={values.issuingOfficial || ""} onchange={(event) => setField("issuingOfficial", event.currentTarget.value)}>
        {#if !(office.config.personnel || []).some((person) => person.id === values.issuingOfficial)}
          <option value="">Select</option>
        {/if}
        {#each office.config.personnel as person (person.id)}
          <option value={person.id}>{person.name}</option>
        {/each}
      </select>
    {:else}
      <p class="muted">Add people under Branding & Config to pick a signer.</p>
    {/if}
  </label>
  <label class="field">Date<input type="date" value={values.memoDate || ""} onchange={(event) => setField("memoDate", event.currentTarget.value)} /></label>
  {#if mode === "full"}
    <label class="field"><input type="checkbox" checked={linked} onchange={(event) => (linked = event.currentTarget.checked)} /> Keep subject and body linked to the fields</label>
    <label class="field">Subject<textarea disabled={linked} value={subject} oninput={(event) => { linked = false; subject = event.currentTarget.value; }}></textarea></label>
    <label class="field">Body<textarea disabled={linked} value={body} oninput={(event) => { linked = false; body = event.currentTarget.value; }}></textarea></label>
  {/if}
  {#if memo}<Preview {memo} logoUrl={office.branding.logoDataUrl || ""} />{/if}
{:else if memo}
  <Preview {memo} logoUrl={office.branding.logoDataUrl || ""} />
  {#if result}
    <p><b>{result.documentId || "Not generated"}</b></p>
    {#each result.errors as error (error)}<p class="warn">{error}</p>{/each}
    {#each result.warnings as warning (warning)}<p class="notice warning">{warning}</p>{/each}
    {#if result.documentId}
      <div class="row">
        <button class="btn secondary" type="button" onclick={() => MB.store.download(result.documentId, "docx")}>Download DOCX</button>
        <button class="btn secondary" type="button" onclick={() => MB.store.download(result.documentId, "pdf")}>Download PDF</button>
      </div>
    {/if}
  {/if}
{/if}

<div class="row" style="margin-top:12px">
  <button class="btn secondary" type="button" disabled={step === 0} onclick={() => (step = Math.max(0, step - 1))}>Back</button>
  <button class="btn secondary" type="button" disabled={!template || busy} onclick={() => generate(["docx"])}>Generate DOCX</button>
  <button class="btn secondary" type="button" disabled={!template || busy} onclick={() => generate(["pdf"])}>Generate PDF</button>
  <button class="btn" type="button" disabled={!template || busy} onclick={() => generate(["docx", "pdf"])}>Generate both</button>
</div>
