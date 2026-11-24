<script>
  let { office } = $props();
  let officeName = $state(office.config.officeName);
  let region = $state(office.config.region);
  let placement = $state(office.branding.placement);
  let file = $state(null);

  $effect(() => {
    officeName = office.config.officeName;
    region = office.config.region;
    placement = office.branding.placement;
  });

  async function saveLogo() {
    if (!file) return;
    await MB.store.updateBranding(file, placement);
  }

  function saveConfig() {
    const config = structuredClone(office.config);
    config.officeName = officeName;
    config.region = region;
    MB.store.saveConfig(config);
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
  <label class="field">Office name<input bind:value={officeName} /></label>
  <label class="field">Region<input bind:value={region} /></label>
  <p class="muted">Airports: {office.config.airports.map((airport) => airport.code).join(", ")}</p>
  <p class="muted">Personnel: {office.config.personnel.map((person) => person.name).join(", ")}</p>
  <button class="btn" type="button" onclick={saveConfig}>Save configuration</button>
  <p class="muted">Saving creates the next version and keeps the previous snapshot.</p>
</section>
