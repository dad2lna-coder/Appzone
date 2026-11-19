# Wrapping a standalone HTML app with Tauri (later)

When an app under `apps/<name>/` is ready:

1. From the app folder (or a new sibling folder):
   ```bash
   npm create tauri-app@latest
   # or cargo install tauri-cli && cargo tauri init
   ```

2. Point `tauri.conf.json` at the static files:
   - Set `"frontendDist": "../"` (or a `dist` folder you copy into)
   - Or use `beforeBuildCommand` to copy/prepare the HTML assets

3. Build the EXE:
   ```bash
   cargo tauri build
   # or npm run tauri build
   ```

4. Output is under `src-tauri/target/release/bundle/`

## Tips for pure static HTML
- No Vite/Webpack required if the app is already static
- Use `devUrl` only during development if you want a local server; for pure files Tauri can load `index.html` directly
- Keep all assets relative so they work both in browser and inside the Tauri webview
- Icons go in `src-tauri/icons/`

## Shared code
If multiple apps later need shared Rust logic, extract a workspace crate at the monorepo root.
