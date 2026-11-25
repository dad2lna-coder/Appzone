<script>
  let { office } = $props();

  function editableConfig(source) {
    const next = structuredClone(source);
    next.personnel = (next.personnel || []).map((person) => ({
      id: person.id,
      name: person.name || "",
      title: person.title || "",
      email: person.email || "",
    }));
    next.airports = (next.airports || []).map((airport) => ({
      _key: "ap-" + Math.random().toString(36).slice(2),
      code: airport.code || "",
      name: airport.name || "",
      locationsText: (airport.locations || []).join(", "),
    }));
    next.routing = (next.routing || []).map((route) => ({
      _key: "rt-" + Math.random().toString(36).slice(2),
      label: route.label || "",
      value: route.value || "",
    }));
    next.issuingOfficialIds = (next.issuingOfficialIds || []).slice();
    next.terminology = {
      employee: (next.terminology && next.terminology.employee) || "",
      station: (next.terminology && next.terminology.station) || "",
    };
    next.defaultRecipients = next.defaultRecipients || "";
    next.defaultCc = next.defaultCc || "";
    return next;
  }

  let config = $state(editableConfig(office.config));
  let placement = $state(office.branding.placement);
  let file = $state(null);

  $effect(() => {
    config = editableConfig(office.config);
    placement = office.branding.placement;
  });

  let signers = $derived(
    config.personnel.filter((person) => config.issuingOfficialIds.includes(person.id)),
  );

  async function saveLogo() {
    if (!file) return;
    await MB.store.updateBranding(file, placement);
  }

  function addPerson() {
    config.personnel = [...config.personnel, { id: "per-" + Date.now().toString(36), name: "", title: "", email: "" }];
  }

  function removePerson(id) {
    config.personnel = config.personnel.filter((person) => person.id !== id);
    config.issuingOfficialIds = config.issuingOfficialIds.filter((item) => item !== id);
  }

  function toggleSigner(id, checked) {
    const current = config.issuingOfficialIds.filter((item) => item !== id);
    if (!checked) {
      config.issuingOfficialIds = current;
      return;
    }
    const previousDefault = config.issuingOfficialIds[0];
    const next = current.concat(id);
    config.issuingOfficialIds = previousDefault && next.includes(previousDefault)
      ? [previousDefault, ...next.filter((item) => item !== previousDefault)]
      : next;
  }

  function setDefaultSigner(id) {
    if (!id || !config.issuingOfficialIds.includes(id)) return;
    config.issuingOfficialIds = [id, ...config.issuingOfficialIds.filter((item) => item !== id)];
  }

  function addAirport() {
    config.airports = [...config.airports, {
      _key: "ap-" + Date.now().toString(36) + Math.random().toString(36).slice(2),
      code: "",
      name: "",
      locationsText: "",
    }];
  }

  function removeAirport(key) {
    config.airports = config.airports.filter((airport) => airport._key !== key);
  }

  function addRoute() {
    config.routing = [...config.routing, {
      _key: "rt-" + Date.now().toString(36) + Math.random().toString(36).slice(2),
      label: "",
      value: "",
    }];
  }

  function removeRoute(key) {
    config.routing = config.routing.filter((route) => route._key !== key);
  }

  function saveConfig() {
    const personnel = config.personnel
      .map((person) => ({
        id: person.id,
        name: String(person.name || "").trim(),
        title: String(person.title || "").trim(),
        email: String(person.email || "").trim(),
      }))
      .filter((person) => person.name);
    const allowed = new Set(personnel.map((person) => person.id));
    const airports = config.airports
      .map((airport) => ({
        code: String(airport.code || "").trim().toUpperCase(),
        name: String(airport.name || "").trim(),
        locations: String(airport.locationsText || "").split(",").map((item) => item.trim()).filter(Boolean),
      }))
      .filter((airport) => airport.code);
    const routing = config.routing
      .map((route) => ({
        label: String(route.label || "").trim(),
        value: String(route.value || "").trim(),
      }))
      .filter((route) => route.label);
    MB.store.saveConfig({
      officeName: config.officeName,
      region: config.region,
      airports,
      personnel,
      routing,
      defaultRecipients: config.defaultRecipients || "",
      defaultCc: config.defaultCc || "",
      issuingOfficialIds: config.issuingOfficialIds.filter((id) => allowed.has(id)),
      terminology: {
        employee: (config.terminology && config.terminology.employee) || "",
        station: (config.terminology && config.terminology.station) || "",
      },
    });
  }
</script>

<h1>Branding and configuration</h1>
<section class="card">
  <h2>Logo</h2>
  <p class="muted">{office.branding.logoName} · v{office.branding.version} · {office.branding.widthPx}×{office.branding.heightPx}</p>
  {#if office.branding.logoDataUrl}<img alt="Current logo" src={office.branding.logoDataUrl} style="max-width:220px" />{/if}
  <p><input type="file" accept="image/png,image/jpeg,image/svg+xml,.svg" onchange={(event) => (file = event.currentTarget.files && event.currentTarget.files[0])} /></p>
  <label class="field">Placement
    <select bind:value={placement}>
      <option>left</option>
      <option>center</option>
      <option>right</option>
    </select>
  </label>
  <button class="btn" type="button" onclick={saveLogo}>Save logo</button>
</section>
<section class="card">
  <h2>Office</h2>
  <label class="field">Office name<input bind:value={config.officeName} /></label>
  <label class="field">Region<input bind:value={config.region} /></label>

  <h2>Personnel</h2>
  <div class="list">
    {#each config.personnel as person (person.id)}
      <article class="card">
        <label class="field">Name<input bind:value={person.name} /></label>
        <label class="field">Title<input bind:value={person.title} /></label>
        <label class="field">Email<input bind:value={person.email} /></label>
        <label class="row">
          <input type="checkbox" checked={config.issuingOfficialIds.includes(person.id)} onchange={(event) => toggleSigner(person.id, event.currentTarget.checked)} />
          Can sign
        </label>
        <button class="btn secondary" type="button" onclick={() => removePerson(person.id)}>Remove</button>
      </article>
    {:else}
      <p class="muted">No people yet.</p>
    {/each}
  </div>
  <p><button class="btn secondary" type="button" onclick={addPerson}>Add person</button></p>
  <label class="field">Default signer
    <select value={signers.some((person) => person.id === config.issuingOfficialIds[0]) ? config.issuingOfficialIds[0] : ""} onchange={(event) => setDefaultSigner(event.currentTarget.value)}>
      {#if !signers.length}<option value="">No signers yet</option>{/if}
      {#each signers as person (person.id)}
        <option value={person.id}>{person.name || "Unnamed"}</option>
      {/each}
    </select>
  </label>

  <h2>Airports</h2>
  <div class="list">
    {#each config.airports as airport (airport._key)}
      <article class="card">
        <label class="field">Code<input bind:value={airport.code} /></label>
        <label class="field">Name<input bind:value={airport.name} /></label>
        <label class="field">Locations<input bind:value={airport.locationsText} placeholder="Gate 1, Gate 2" /></label>
        <button class="btn secondary" type="button" onclick={() => removeAirport(airport._key)}>Remove airport</button>
      </article>
    {/each}
  </div>
  <p><button class="btn secondary" type="button" onclick={addAirport}>Add airport</button></p>

  <h2>Routing</h2>
  <div class="list">
    {#each config.routing as route (route._key)}
      <article class="card">
        <label class="field">Label<input bind:value={route.label} /></label>
        <label class="field">Value<input bind:value={route.value} /></label>
        <button class="btn secondary" type="button" onclick={() => removeRoute(route._key)}>Remove row</button>
      </article>
    {/each}
  </div>
  <p><button class="btn secondary" type="button" onclick={addRoute}>Add row</button></p>

  <label class="field">Default recipients<input bind:value={config.defaultRecipients} /></label>
  <label class="field">Default CC<input bind:value={config.defaultCc} /></label>

  <h2>Terminology</h2>
  <label class="field">Employee word<input bind:value={config.terminology.employee} /></label>
  <label class="field">Station word<input bind:value={config.terminology.station} /></label>

  <button class="btn" type="button" onclick={saveConfig}>Save configuration</button>
  <p class="muted">Saving creates the next version and keeps the previous snapshot.</p>
</section>
