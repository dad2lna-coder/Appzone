# Downloads

This folder is published to GitHub Pages at `/downloads/`.

The Windows files it links to are not stored in this repo. They are built by the
**Desktop Memorandum Builder** workflow (`.github/workflows/desktop-memorandum-builder.yml`)
from `desktop/memorandum-builder/` and uploaded to the `memorandum-builder-latest`
GitHub release, replacing the previous files on every build:

- `MemorandumBuilder-setup.exe` — NSIS installer
- `MemorandumBuilder.exe` — portable exe
