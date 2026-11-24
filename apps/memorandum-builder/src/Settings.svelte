<script>
  let input;

  async function onPackage(event) {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (!file) return;
    try {
      await MB.store.importPackage(file);
    } catch (error) {
      MB.store.note(error.message || "Import failed.", "danger");
    }
  }
</script>

<h1>Settings</h1>
<section class="card">
  <h2>Storage</h2>
  <p>Templates, office configuration, branding, and generated files stay in this browser. Clearing site data removes them. Export a package before you switch browsers.</p>
  <p>Nothing is uploaded. Word and PDF files are built on this page.</p>
  <div class="row">
    <button class="btn" type="button" onclick={() => MB.store.exportPackage()}>Export office package</button>
    <button class="btn secondary" type="button" onclick={() => input.click()}>Import package</button>
    <input bind:this={input} hidden type="file" accept=".zip" onchange={onPackage} />
    <button class="btn ghost" type="button" onclick={() => confirm("Replace the saved office with the sample office?") && MB.store.reset()}>Reset sample office</button>
  </div>
  <p class="notice info">Svelte components live in src/ and are compiled in the browser from esm.sh. There is no Node install and no build step. Open this folder through a local web address. file:// blocks the component fetches.</p>
  <p class="muted">The PDF signature box is an empty Acrobat field. Signing it with a PIV card was not verified here. Imported Word formatting is kept only when the original package contains the placeholders.</p>
</section>
