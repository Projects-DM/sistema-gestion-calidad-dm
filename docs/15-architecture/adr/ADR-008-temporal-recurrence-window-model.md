# ADR-008: Temporal Recurrence Window Model

**Status:** ACCEPTED  
**Date:** 2026-05-15 (Sprint 341), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 341 (certification), Sprint 346-348 (preserved), Sprint 350 (verified)

---

## Context

The alert system requires flexible recurrence scheduling for operational checklists, measurements, audits, and maintenance tasks. The system must support:

- **Daily/Weekly/Monthly/Yearly** recurrence
- **Custom intervals** (every N days/weeks/months)
- **Calendar-aware** monthly/yearly (not simple 30/365 day intervals)
- **Local timezone** awareness (browser timezone)
- **Anchor stability**: `completedAt` must NOT redefine the recurrence anchor
- **No drift**: Recurrence windows derived from original anchor, not last completion

Previous attempts used simple `cron`-like expressions which failed for:
- **Monthly**: "30 days" ≠ calendar month (Feb vs March)
- **Yearly**: Leap year handling (Feb 29 → Feb 28)
- **Timezone**: Server vs browser timezone drift
- **Anchor drift**: Using `completedAt` as new anchor causes drift

## Decision

Adopt a **Temporal Recurrence Window Model** with the following invariants:

### Core Invariants (Sprint 341 Certified)

| Invariant | Specification | Status |
|-----------|---------------|--------|
| **ANCHOR-IMMUTABILITY** | `windowStart = startDate + startTime (local)` — never changes | ✅ CERTIFIED |
| **WINDOW-CALCULATION** | `windowEnd = windowStart + period` (derived, not stored) | ✅ CERTIFIED |
| **ANCHOR-STABILITY** | `completedAt` **NEVER** redefines anchor | ✅ CERTIFIED |
| **NEXT-DERIVED** | Next window = derived from anchor (not from `completedAt`) | ✅ CERTIFIED |
| **MONTHLY-CALENDAR** | Monthly = Calendar month (Model A + CAL-001) | ✅ CERTIFIED |
| **YEARLY-CALENDAR** | Yearly = Calendar year + leap saturation (29/02→28/02) | ✅ CERTIFIED |
| **WEEKLY-7DAY** | Weekly = 7 days (NOT ISO week) | ✅ CERTIFIED |
| **CUSTOM-MULTIPLIER** | Custom = N × unidad (days/weeks/months) | ✅ CERTIFIED |
| **TIMEZONE-LOCAL** | Timezone = LOCAL (browser) | ✅ CERTIFIED |

### Window Calculation Model

```javascript
// Anchor: Fixed at creation
const anchor = {
  startDate: '2026-01-15',      // YYYY-MM-DD (local date)
  startTime: '08:00',           // HH:mm (local time)
  timezone: 'America/Bogota'    // Browser timezone
};

// Period definitions
const periods = {
  daily:   { amount: 1, unit: 'day' },
  weekly:  { amount: 7, unit: 'day' },  // NOT ISO week
  monthly: { amount: 1, unit: 'month' }, // Calendar month
  yearly:  { amount: 1, unit: 'year' },  // Calendar year
  custom:  { amount: N, unit: 'day' | 'week' | 'month' }
};

// Window calculation (pure function, no side effects)
function calculateWindow(anchor, period, occurrenceIndex) {
  const windowStart = addPeriod(anchor.startDate, anchor.startTime, period, occurrenceIndex);
  const windowEnd = addPeriod(windowStart, period);
  return { windowStart, windowEnd };
}

// Monthly: Calendar month (NOT 30 days)
// Jan 15 + 1 month = Feb 15 (not Feb 14)
// Jan 31 + 1 month = Feb 28/29 (saturation)

// Yearly: Calendar year (NOT 365 days)
// Feb 29 + 1 year = Feb 28 (saturation in non-leap)
```

### Recurrence State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    RECURRENCE STATE                         │
│                                                             │
│  SCHEDULED  ──(windowStart reached)──►  ACTIVE             │
│      │                                                    │
│      │ (windowEnd passed without completion)             │
│      ▼                                                    │
│  OVERDUE  ──(completedAt recorded)──►  COMPLETED         │
│      │                                                    │
│      │ (next occurrence calculated)                       │
│      ▼                                                    │
│  SCHEDULED (next) ◄──(next window derived from ANCHOR)──│
└─────────────────────────────────────────────────────────────┘
```

### Critical Rules

| Rule | Description |
|------|-------------|
| **NO-ANCHOR-MUTATION** | `completedAt` stored for audit only — NEVER used to recalculate anchor |
| **DERIVED-WINDOWS** | All future windows computed from original `anchor` + `period` × `n` |
| **TIMEZONE-CONSISTENCY** | All calculations in user's local timezone (browser) |
| **SATURATION-HANDLING** | Month-end saturation: Jan 31 + 1 month = Feb 28/29 |
| **LEAP-YEAR** | Feb 29 + 1 year = Feb 28 (non-leap) / Feb 29 (leap) |

## Consequences

### Positive
- **Zero drift**: Anchor immutability guarantees zero recurrence drift over years
- **Calendar-correct**: Monthly/yearly follow calendar, not fixed day counts
- **Timezone-safe**: All calculations in user's local timezone
- **Audit-friendly**: Every occurrence traceable to original anchor
- **Testable**: Pure functions, no side effects, easy to unit test

### Negative
- **Complexity**: Calendar arithmetic more complex than fixed intervals
- **Timezone edge cases**: DST transitions require careful handling
- **Leap year logic**: Feb 29 saturation requires special handling
- **Testing burden**: Many calendar edge cases to cover

## Implementation Evidence

| Sprint | Artifact |
|--------|----------|
| Sprint 341 | Temporal Engine certification (all invariants verified) |
| Sprint 346 | Tenant persistence — temporal engine **PRESERVED** |
| Sprint 347 | Wiring audit — temporal engine **PRESERVED** |
| Sprint 348 | Correction — temporal engine **PRESERVED** |
| Sprint 350 | Deployment audit — temporal engine **PRESERVED** |

### Key Files

| File | Role |
|------|------|
| `src/core/capabilities/alert/occurrence/OccurrenceSchedule.js` | Temporal engine core |
| `src/core/capabilities/alert/occurrence/OccurrenceLedger.js` | Uses schedule for window calculation |
| `src/hooks/useAlertRuntime.js` | Integrates schedule into runtime |

## Related ADRs
- ADR-001: Metadata-Driven Architecture (form schema includes recurrence config)
- ADR-006: Tenant-Scoped Persistence (tenant isolation for schedules)

---

**Supersedes**: Cron-like recurrence expressions (Sprints 1-340)  
**Next Review**: 2026-12-01