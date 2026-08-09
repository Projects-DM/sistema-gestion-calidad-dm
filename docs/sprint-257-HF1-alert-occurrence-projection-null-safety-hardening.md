# Sprint 257-HF1 — Alert Occurrence Projection Null-Safety & Contract Boundary Hardening

> **Workspace:** `docs/` | **Repo:** `release/stable-sprint79`
> **Type:** Hotfix — RUNTIME STABILIZATION. Same architecture, boundary hardening only.

## 1. Mandate

Fix the runtime crash `TypeError: Cannot read properties of null (reading 'startsAt')`
reported at `OccurrenceProjection.js:76:28` (call chain: `projectCurrentOccurrences` →
`useAlertRuntime.js:504` → `Dashboard.jsx`). The fix lives at the QUALIFIED BOUNDARY:
invalid occurrence candidates are **rejected BEFORE they reach projection** — the
projection must never dereference a null schedule window.

Hotfix constraints honored:
- Hotfix, NOT a new architecture. No runtime/engine/scheduler/store/context/Redux/Zustand.
- `OccurrenceSchedule` stays the single source of truth; no duplicated scheduling.
- No `?? {}` fabrication, no `try/catch` as the correction mechanism, no optional-chaining-only.
- `isAlertOccurrence()` / `assertAlertOccurrence()` (OccurrenceContract.js) reused as the ONLY
  validation authority — no parallel/v2 validator.
- Identity, lifecycle precedence and completion contract intact.
- `useAlertRuntime` surfaces unchanged (fix is upstream, in the domain).
- Dashboard.jsx NOT modified.
- Monitoring keeps consuming the domain projection / SSOT schedule; `Cumplidas` bucket and
  the Sprint-240 hierarchy intact (no local `parseAnchor`/`computeTarget`/`cadenceMs` reintroduced).

## 2. Root cause

- **Source of null:** `occurrenceWindowAt(anchorMs, cadence, now)` returns `null`
  (`OccurrenceSchedule.js:80`) when `anchorMs` is `null` or `Number.isNaN(anchorMs)`.
- **Line/expression:** `OccurrenceProjection.js:76` — `startsAt: window.startsAt`,
  after `const window = occurrenceWindowAt(anchorMs, cadence, now)` at line 69.
- **Why null is possible:** `parseAnchor(rawItem || cfg)` returns `null` when the candidate
  carries no `startDate`/`startTime`. Sprint-254 audit certified that `startDate / startTime`
  are *presentational identifiers, empty by default*; legacy and default collections routinely
  hit this. The pre-HF guard `if (anchorMs === null && cadence === null) return;` only rejected
  the BOTH-null case — a candidate with `periodicity` (cadence non-null) but empty anchor
  passed through, `occurrenceWindowAt(null, cadence, now)` → `null`, then the dereference at
  line 76 crashed.

## 3. Boundary fix (`src/core/capabilities/alert/occurrence/OccurrenceProjection.js`)

```
Candidate ── Contract Validation ── Valid Occurrence ── Projection
```

1. `isProjectableOccurrenceCandidate(rawItem || cfg, anchorMs)` — rejects before ANY window
   dereference: candidate must be an object and `anchorMs` finite/non-null.
2. `const window = occurrenceWindowAt(...)`; `if (!window) return;` — defense-in-depth: a
   null window is never dereferenced.
3. Occurrence is built with `createAlertOccurrence` (contract VO), then
   `if (!isAlertOccurrence(occurrence)) return;` — the contract itself is the final gate.
   Only valid occurrences reach `out`.

No fabrication, no defaulting, no optional chaining as the mechanism.

## 4. Verification

### 4.1 New HF1 suite — `C:\tmp\test\alert-occurrence-projection-null-safety-sprint257-hf1.mjs`
**20/20 PASS** — the 10 mandated tests (projection-level):

| # | Test | Result |
|---|---|---|
| 1 | `null` → no TypeError, no `startsAt` access | PASS |
| 2 | `undefined` resources → `[]`, no crash | PASS |
| 3 | valid occurrence projected, `assertAlertOccurrence` OK | PASS |
| 4 | config → schedule → occurrence → projection PASS | PASS |
| 5 | `periodicity = null` → once window, no crash | PASS |
| 6 | legacy config (`startDate:''`) rejected, never fabricated | PASS |
| 7 | daily OCC-001/002/003 identity continuity | PASS |
| 8 | completed precedence (never re-classified overdue) | PASS |
| 9 | out-of-window completion not applied | PASS |
| 10 | idempotency + no input mutation | PASS |

### 4.2 Regression (per sprint, individual)
| Suite | Result |
|---|---|
| Sprint 257 (`alert-occurrence-contract-sprint257.mjs`) | 15/15 PASS |
| Sprint 236 (time projection audit) | 14/14 PASS |
| Sprint 237 (temporal projections) | 17/17 PASS |
| Sprint 239 (temporal anchor persistence) | 18/18 PASS |
| Sprint 240 (operational status classification) | 16/16 PASS |
| Sprint 238 (time persistence audit) | 15/16 PASS — only **TPA-14** fails, a stale "docs-only" working-tree snapshot guard from the 238 audit moment; expected divergence because later sprints legitimately add implementation files. |

### 4.3 Build & smoke
- `npm run build` — **PASS** (chunk-size warning only).
- `npx eslint src/core/capabilities/alert/occurrence/` — **clean**.
- Runtime smoke: `vite preview` — **HTTP 200** (Dashboard entry serves; crash path
  exercised in the projection suites with the exact legacy/default fixture shapes).

## 5. Status

**Sprint 257-HF1 complete** — crash root-caused and fixed at the contract boundary; suite
20/20 NEW + 15/15 Sprint 257 + 236/237/239/240 green; build OK. No auto-commit; proposed
message: `fix(alerts): harden occurrence projection contract boundary (HF1 null-safety)`.