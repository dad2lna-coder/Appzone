# leave-bid

React shell over the pure engine extracted from `apps/example-app/LeaveBid.html`.

## Map

- `src/data/` — JSON seed. `getDefaultState()` reassembles it.
- `src/domain/` — pure functions. No DOM, no store, no `localStorage`.
- `src/store/` — Zustand persist on `CBA_LEAVE_SUITE_2027_STATE_V3` (version 4). `migrate.ts` accepts a raw V3 blob. The storage adapter writes that raw object back so LeaveBid.html can read it. `file://` and `http://` do not share localStorage; use Import backup JSON across origins.
- `src/store/actions/` — the only place that writes state. One file per slice.
- `src/store/selectors.ts` — derived liability rows and KPIs.
- `src/app/` — header, tab nav, `tabs.ts` registry.
- `src/features/<tab>/` — one folder per ported tab.
- `src/shared/ui/` — dumb widgets. `src/io/xlsx.ts` is the only SheetJS import.
- `apps/example-app/LeaveBid.html` — reference. Do not edit it from here.

## Feature recipe

1. Add `src/features/<name>/` with a tab component split so every file stays ≤200 lines.
2. Register one line in `src/app/tabs.ts` (`id`, label, lazy component).
3. Put math in `domain/`. Do not change existing domain signatures; add a function instead.
4. Put state changes in `src/store/actions/<slice>.ts`. Components call actions; they do not set state.
5. Match the tab with the same id in `LeaveBid.html`. Read the P1 snapshots before calling a behavior difference a fix.
6. Keep `npm test`, `npm run typecheck`, and `npm run build` green. `base` stays `"./"` so `dist/` opens from `file://`.
