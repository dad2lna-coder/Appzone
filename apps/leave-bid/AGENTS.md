# leave-bid

Typed engine extracted from `apps/example-app/LeaveBid.html`. No UI.

## Map

- `src/data/` — JSON seed copied from `getDefaultState()` and the constants block. `index.ts` reassembles `getDefaultState()`.
- `src/domain/types.ts` — the contract. Uncertain fields are optional.
- `src/domain/*.ts` — pure functions. Inputs are arguments, not a `STATE` global. No DOM, no `localStorage`.
- `src/domain/__tests__/` — Vitest. Snapshot parity vs `apps/example-app/baseline/snapshots`.

## Rules

- Domain stays pure. Rendering stays in `LeaveBid.html` until a later React phase.
- Data stays JSON. Do not invent roster rows; the P1 synthetic roster is the only employee data.
- `types.ts` is the contract. No `any`.
- Keep each file at or under 300 lines. Split by sub-concern instead of growing a file.
- `apps/example-app/LeaveBid.html` is the reference implementation. Do not change it from this folder.
- Baseline snapshots are the source of truth. If a port must differ to drop DOM, it still has to match the snapshots. Note oddities in the PR; do not "fix" them here.
- Runtime dependencies: none. Dev dependencies: `typescript`, `vitest`.
