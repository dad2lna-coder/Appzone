# Memorandum Builder

Modular Svelte app. There is no install and no build step. The browser compiles the `.svelte` files with the Svelte 5 compiler from `https://esm.sh/svelte@5.59.1`.

pdf-lib and JSZip are local copies in `vendor/`. Office data stays in this browser.

## Open it

`file://` cannot fetch the component files. Serve the folder, then open the address:

```bash
cd apps/memorandum-builder
python3 -m http.server 8080
```

Any static server works. The first load needs network access so esm.sh can deliver Svelte.

## Layout

- `index.html` — entry
- `boot.js` — loads each `.svelte` file, compiles it, and mounts `src/App.svelte`
- `src/` — Svelte components (shell, wizard, templates, batch, branding, archive)
- `js/` — memorandum services: tokens, Word package editing, PDF signature field, storage
- `css/app.css` — layout
- `assets/` — sidebar art and mark
- `samples/` — batch JSON

## Limits

- Clearing site data deletes the office unless you export a package first.
- The PDF signature field is empty. Signing it with a PIV card was not verified here.
- Imported Word formatting is preserved only when placeholders can be replaced inside the original package.
- The Svelte compiler runs in the browser, so the first view is slower than a prebuilt bundle and needs the CDN.
