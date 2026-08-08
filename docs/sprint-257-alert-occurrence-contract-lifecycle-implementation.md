# Sprint 257 — Alert Occurrence Contract & Lifecycle: Implementation

> **Workspace:** `docs/` | **Repo:** `release/stable-sprint79`
> **Type:** Implementation — first real code sprint of the certified occurrence line (254 audit → 255 architecture audit → 256 design + CERT → 257 implement).

## 1. Mandate

Implement the occurrence contract certified in 256-CERT (OCC-CERT-01..30) inside the
**implementation gates A–J**; REUSE BEFORE CREATE: NO second runtime/engine/service,
NO duplicated configuration store, NO duplicated schedule, NO `RECORD_CREATED ≡ COMPLETED`.

## 2. Decisions (DEC-257)

| DEC | Rule |
|---|---|
| DEC-257-01 | Scheduling elevated to the `alert/occurrence` domain (`OccurrenceSchedule.js`); the monitoring experience and the runtime hook IMPORT it, they do not duplicate it (Gate C). |
| DEC-257-02 | Occurrence ≠ configuration: `occurrenceId === \`${alertId}:occ:${sequence}\``, guaranteed distinct (Gate A). |
| DEC-257-03 | `COMPLETED` derives ONLY from a semantically-final operational signal matching `resourceKind + resourceId (+moduleId)` AND falling inside the occurrence window `[startsAt, dueAt)` (Gates D/E/F, OCC-CERT-12). |
| DEC-257-04 | Completion state lives in an in-memory, non-reactive ledger (`OccurrenceLedger`); durable persistence is declared the follow-up port (Gate J boundary, OCC-CERT-30). |
| DEC-257-05 | The orchestrator (additive only) now carries `recordIds` on bulk final events and publishes `RESOURCE_COMPLETED` only for `completado / approved / cerrado`. |
| DEC-257-06 | The Monitoring adds a presentation-only `Cumplidas` bucket; the certified Sprint-240 5-bucket hierarchy literal stays intact — `completed` is appended only at grouping time. |

## 3. Files
### Created — occurrence domain (`src/core/capabilities/alert/occurrence/`)
- `OccurrenceContract.js` — 12-field VO, `occurrenceIdOf`, `isAlertOccurrence`, `assertAlertOccurrence`.
- `OccurrenceSchedule.js` — `parseAnchor / cadenceMs / computeTarget / occurrenceWindowAt / UNIT_MS` (elevated schedule).
- `OccurrenceLifecycle.js` — `classifyOccurrence` (certified precedence).
- `CompletionSignal.js` — `createCompletionSignal`, `matchCompletionToOccurrence`, `applyCompletionToOccurrence`, `occurrenceCompletionKey`.
- `OccurrenceLedger.js` — signal ledger (identity key, window match, in-memory, idempotent).
- `OccurrenceProjection.js` — `projectCurrentOccurrences` (single projection shared by Runtime + Monitoring).
- `CompletionBridge.js` — `wireCompletionBridge` (single idempotent subscription to the existing `OperationalEventBus`).

### Modified (REUSE, additive)
- `src/hooks/useAlertRuntime.js` — new `occurrences` surface; wires the bridge once; existing surfaces untouched.
- `src/modules/experiences/AlertMonitoringExperience.jsx` — imports schedule from domain (local copies removed), adds `Cumplidas` bucket driven by real final resource signals.
- `src/core/capabilities/experiences/OperationalExperienceLifecycleOrchestrator.js` — payload `recordIds`; publishes `RESOURCE_COMPLETED` on final states only.

## 4. Verification

### 4.1 New suite (`C:\tmp\test\alert-occurrence-contract-sprint257.mjs`) — **15/15 PASS**
- Gate A identity · 12 contract keys · second instance per sequence.
- Gate C schedule reuse: anchor `startDate+startTime`, daily cadence, `07/08→OCC-001; 08/08→OCC-002`.
- Gate F precedence: completed never reappears as overdue; overdue derived.
- Gates D/E: completion signal ≠ `RECORD_CREATED`; window+identity matching; idempotent apply.
- Ledger (Gates F/J/OCC-CERT-12/13): out-of-window signal does NOT mark the current window; in-window signal marks it once.
- Occurrence projection surfaces current instances without touching configuration.

### 4.2 Build & regression
- `npm run build` — **PASS** (chunk-size warning only).
- Challenge-cohort: `sprint-236…240` monitor/alert behavior suites now PASS in full (236, 237, 239, 240: 100%). The certificates that were "docs-only/audit-only scope" for their sprint moment (e.g. bounds on the whole working tree) now legitimately differ because Sprint 257 introduces implementation changes — this is the intended transition, not a behavioral regression.

## 5. Follow-ups (documented as future phases)
- Durable persistence of the historical occurrence state (ledger port → migration needed) → allowed only if the infra accepts migrations.
- Live reactivity of the `Cumplidas` bucket (currently non-reactive).
- `moduleId` resolution across batch events (wildcard/time-window fallback documented).

**Status:** Sprint 257 implemented — suite 15/15 + build OK. No auto-commit; proposed message:
`feat(alerts): implement alert occurrence contract & lifecycle (257 code sprint)`.