# HTML Apps Monorepo

Central repository for standalone offline HTML apps.

## Goals
- Collect all pure HTML/CSS/JS apps in one place
- Refactor, clean up, and modernize them here
- Later wrap each app **individually** as a Tauri desktop EXE (Windows)

## Online test environment

Every app in `apps/` is auto-deployed to GitHub Pages on push to `main` by `.github/workflows/pages.yml` (no workflow edit needed when adding an app; folder `apps/<name>` appears at `https://dad2lna-coder.github.io/Appzone/<name>/`).

<!-- APP-LINKS:START -->
- [Appzone index](https://dad2lna-coder.github.io/Appzone/)
- [Example App](https://dad2lna-coder.github.io/Appzone/example-app/)
- [Leave Bid](https://dad2lna-coder.github.io/Appzone/leave-bid/)
- [Memorandum Builder](https://dad2lna-coder.github.io/Appzone/memorandum-builder/)
<!-- APP-LINKS:END -->

## Structure

```
html-apps/
├── apps/                  # One folder per app
│   ├── example-app/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   ├── memorandum-builder/  # Svelte, open via a static server. No build step.
│   └── your-app-name/
│       └── ...
├── shared/                # Optional shared CSS, JS libs, assets (keep local, no CDN)
├── .gitignore
└── README.md
```

## Adding a new app
1. Create `apps/<app-name>/`
2. Put pure static files there (`index.html` at the root of the app folder)
3. Keep everything self-contained and offline-first (no CDNs)

## Later: wrapping an app in Tauri
When ready to turn one app into a desktop EXE:

### Recommended approach (per-app Tauri)
Inside the app folder (or alongside it):

```
apps/my-app/
├── index.html
├── ...
└── src-tauri/          # added when wrapping
    ├── tauri.conf.json
    ├── Cargo.toml
    └── src/
```

In `tauri.conf.json` point the frontend to the static files:

```json
{
  "build": {
    "frontendDist": "../",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "windows": [{ "title": "My App", "width": 1200, "height": 800 }]
  }
}
```

Or use a simple build step that copies the HTML into a `dist/` folder if you prefer.

### Alternative
Keep pure HTML under `apps/` and create separate Tauri projects that reference the built/copied static assets. Useful if you want shared Rust code later.

## Notes
- Prefer local JS libraries (SortableJS, dayjs, etc.) inside each app or under `shared/`
- No external CDNs
- Dark mode + intentional visual design where it makes sense
- Existing related work: `ArchiveLauncher` (Tauri launcher for HTML apps)

## Next steps
- Copy your existing standalone HTML apps into `apps/`
- Refactor as needed
- When an app is stable, add its Tauri wrapper and produce the EXE
