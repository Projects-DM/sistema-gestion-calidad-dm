# Feature Overview — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** PROFESSIONAL PRESENTATION  
**Branch:** `release/stable-sprint79`

---

## 1. Feature Organization by Domain

The SGC-DM platform organizes capabilities into **functional domains** rather than technical layers. Each domain represents a coherent business capability.

---

## 2. Operations & Traceability Domain

### 2.1 Dispatch Management (`DynamicForm` + `DynamicModule`)

| Capability | Description | Status |
|------------|-------------|--------|
| **Batch/Lot Assignment** | Assign products to dispatch vehicles with lot tracking | ✅ Operational |
| **Vehicle/Driver Logs** | Track vehicle assignments and driver assignments per dispatch | ✅ Operational |
| **Dispatch Workflow** | End-to-end dispatch creation → assignment → completion | ✅ Operational |
| **Real-time Status** | Live dispatch status updates via Supabase Realtime | ✅ Operational |

**Technical Implementation:**
- `DynamicModule` renders module-specific dispatch forms
- `DynamicForm` with `engine_type: "BaseChecklist"` for dispatch checklists
- `dynamicService.js` handles `sgc_dispatches` + `sgc_dispatch_lots` tables
- Evidence upload for delivery photos via `EvidenceUploader`

---

### 2.2 Quality Inspections

| Capability | Description | Engine | Status |
|------------|-------------|--------|--------|
| **Checklist Inspections** | Boolean pass/fail with evidence requirements | `BaseChecklist` | ✅ |
| **Measurement Recording** | Numeric ranges with min/max validation | `BaseMediciones` | ✅ |
| **Audit Forms** | Multi-section audit forms with conditional logic | `BaseGeneric` | ✅ |
| **Maintenance Logs** | Equipment maintenance tracking | `BaseMantenimiento` | ✅ |
| **CAPA Forms** | Corrective/Preventive Actions | `BaseWorkflow` | 🚧 Planned |

**Engine Resolution:**
```javascript
// src/core/engine/EngineResolver.js
const ENGINE_MAP = {
  BaseChecklist,
  BaseMediciones,
  BaseGeneric  // fallback
};
```

**DynamicForm Rendering Pipeline:**
```
DynamicForm
  → dynamicService.getFormBySlug() → formDef
  → dynamicService.getFormFields() → fields[]
  → EngineResolver.resolveEngineComponent(formDef.engine_type)
  → LayoutEngine → DynamicFieldRenderer → ComponentRegistry
  → Atomic Field Components
```

---

### 2.3 Traceability Matrix

| Capability | Description | Status |
|------------|-------------|--------|
| **Lot/Batch Traceability** | End-to-end from source → dispatch → delivery | ✅ |
| **Product Genealogy** | Full genealogy tree from raw material to finished product | ✅ |
| **Dispatch Evidence** | Photos, signatures, GPS at each handoff | ✅ |
| **Audit Trail** | Immutable `sgc_audit_logs` per action | ✅ |

---

## 3. Quality Control Domain

### 3.1 Dynamic Forms Engine

| Feature | Description | Implementation |
|---------|-------------|----------------|
| **100+ Form Types** | Configured in `sgc_forms` + `sgc_form_fields` | Metadata-driven |
| **Dynamic Rendering** | `DynamicForm.jsx` + `EngineResolver` | Runtime-driven |
| **Engine Types** | `BaseChecklist`, `BaseMediciones`, `BaseGeneric`, `BaseWorkflow`, `BaseTrazabilidad`, `BaseMantenimiento` | 6 engines |
| **Field Types** | boolean, number, text, textarea, select, signature, date, file_upload, table | 10 types |
| **Conditional Logic** | Field visibility/required based on other field values | Reactive validation |
| **Evidence Requirements** | Conditional evidence (photos/signatures on critical values) | Conditional rendering |

### 3.2 Form Engines

| Engine | Use Case | Component |
|--------|----------|-----------|
| `BaseChecklist` | Boolean pass/fail with critical value triggers | `src/components/engines/BaseChecklist.jsx` |
| `BaseMediciones` | Numeric measurements with min/max/unit | `src/components/engines/BaseMediciones.jsx` |
| `BaseGeneric` | Fallback for simple forms | `src/components/engines/BaseGeneric.jsx` |
| `BaseWorkflow` | Multi-step workflows with approvals | `src/components/engines/BaseWorkflow.jsx` |
| `BaseTrazabilidad` | Traceability-specific forms | `src/components/engines/BaseTrazabilidad.jsx` |
| `BaseMantenimiento` | Maintenance-specific forms | `src/components/engines/BaseMantenimiento.jsx` |

### 3.3 Field Types & Components

| Field Type | Component | Validation |
|------------|-----------|------------|
| `boolean` | Radio (Cumple/No Cumple) | Required + Critical trigger |
| `number` | Input with min/max | Range validation |
| `text` / `textarea` | Text input / Textarea | Required, maxLength |
| `select` | Dropdown with choices | Required |
| `signature` | Canvas SignaturePad | Required + image upload |
| `date` / `time` / `datetime` | Native pickers | Format validation |
| `file_upload` | EvidenceUploader | Image compression + upload |
| `table` | DynamicTableField | Row add/remove |

**Component Registry Resolution:**
```typescript
// src/runtime/rendering/registry/ComponentRegistry.tsx
export const ComponentRegistry = {
  getComponent(fieldType) {
    switch(fieldType) {
      case "text": return lazy(() => import('../fields/FieldText'));
      case "number": return lazy(() => import('../fields/FieldNumber'));
      case "boolean": return lazy(() => import('../fields/FieldRadio'));
      case "signature": return lazy(() => import('../fields/SignatureField'));
      // ... fallback to generic text
    }
  }
}
```

---

## 4. Alert & Recurrence Domain

### 4.1 Temporal Recurrence Engine (ADR-008)

| Feature | Description | Certification |
|---------|-------------|---------------|
| **Anchor Immutability** | `completedAt` never redefines recurrence anchor | Sprint 341 Certified |
| **Calendar-Aware Monthly** | Calendar months (not 30-day) with day saturation | Sprint 341 |
| **Calendar-Aware Yearly** | Calendar years with leap saturation (29/02→28/02) | Sprint 341 |
| **Weekly (7-day)** | Fixed 7-day, NOT ISO week | Sprint 341 |
| **Custom Intervals** | N × unit (days/weeks/months/years) | Sprint 341 |
| **Local Timezone** | All calculations in browser timezone | Sprint 341 |

**Core Invariants (Sprint 341 Certified):**
| Invariant | Specification |
|-----------|---------------|
| ANCHOR-IMMUTABILITY | `windowStart = startDate + startTime (local)` — never changes |
| WINDOW-CALCULATION | `windowEnd = windowStart + period` (derived) |
| ANCHOR-STABILITY | `completedAt` NEVER redefines anchor |
| NEXT-DERIVED | Next window = derived from anchor |
| MONTHLY-CALENDAR | Calendar month (Model A + CAL-001) |
| YEARLY-CALENDAR | Calendar year + leap saturation (29/02→28/02) |
| WEEKLY-7DAY | 7 days (NOT ISO week) |

**Core Functions:**
| Function | Purpose |
|----------|---------|
| `parseAnchor(item)` | Parse startDate + startTime → anchor ms |
| `computeTarget(anchor, periodicity, now)` | Next occurrence target |
| `occurrenceWindowAt(anchor, periodicity, now)` | Current window [startsAt, dueAt) |
| `calendarAddMonths/years()` | Calendar arithmetic with saturation |

---

## 5. Alert & Completion Domain

### 5.1 Occurrence Management

| Capability | Description | Implementation |
|------------|-------------|----------------|
| **Occurrence Scheduling** | Recurring alerts with temporal engine | `OccurrenceSchedule.js` |
| **Completion Bridge** | Links form completion to occurrence | `CompletionBridge.js` |
| **Occurrence Ledger** | Tracks completion state per tenant | `OccurrenceLedger.js` |
| **Hybrid Persistence** | localStorage (immediate) + Supabase (shared) | `OccurrenceLedgerPersistencePort.js` |

### 5.2 Hybrid Persistence Architecture

```
Completion Signal
       ↓
CompletionBridge (injects tenantId)
       ↓
OccurrenceLedger (tenant-scoped keys)
       ↓
Hybrid Persistence Port
    ├── localAdapter (localStorage) → immediate UI feedback
    └── supabaseAdapter (tenant-scoped) → cross-browser sync
```

**Key Format:**
```
Specific: tenant::{tenantId}::occurrence::{alertId}::{occurrenceId}
Legacy:   tenant::{tenantId}::resource::{resourceKind}::{resourceId}::{moduleId}
```

### 5.3 Completion Flow

```
User Submit Form
      ↓
DynamicForm.handleSubmit() → dynamicService.submitFormResponse()
      ↓
runtimeActivationLayer.activate(internalEvent)
      ↓
OperationalEventBus.publish(COMPLETION_INTENT_EVENT)
      ↓
CompletionBridge.handleCompletionIntent()
      ↓
OccurrenceLedger.recordCompletion(signal with tenantId)
      ↓
Hybrid Adapter.writeSignal()
      ↓
localStorage (immediate) + Supabase (tenant-scoped)
      ↓
UI Updates: COMPLETED visible immediately
```

---

## 6. Document Management Domain

### 6.1 Evidence Capture

| Feature | Implementation | Storage |
|---------|---------------|---------|
| **Photo Evidence** | `EvidenceUploader` + Camera API | Supabase Storage |
| **Digital Signatures** | Canvas SignaturePad → PNG | Supabase Storage |
| **Document Upload** | PDF, images, docs | Supabase Storage |
| **Image Compression** | WebP compression (client-side) | Before upload |
| **Signed URLs** | Time-limited access | 1-year expiration |

### 6.2 Storage Structure

```
Bucket: documentos-sgc/
├── evidencias/
│   ├── {tenantId}/
│   │   ├── {responseId}/
│   │   │   ├── {timestamp}_{random}.webp
│   │   │   └── ...
│   │   └── ...
├── firmas/
│   ├── {tenantId}/
│   │   ├── {responseId}.png
│   │   └── ...
├── documentos/
│   ├── {tenantId}/
│   │   ├── {moduleId}/
│   │   │   ├── {documentId}.pdf
│   │   │   └── ...
```

### 6.3 RLS on Storage

```sql
-- Bucket: documentos-sgc (private)
CREATE POLICY "tenant_folder_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos-sgc' AND
    (storage.foldername(name))[1] = get_current_tenant()
  );
```

---

## 7. Configuration & Administration

### 7.1 Module Management

| Capability | Description |
|------------|-------------|
| **Module Creation** | Admin creates modules with icon, color, slug |
| **Form Management** | Create/edit forms per module with engine_type |
| **Field Definition** | Drag-drop field builder with 10 field types |
| **Role Configuration** | `roles_allowed` per form |
| **Alert Configuration** | Per-form alert_config JSON |

### 7.2 User Management

| Role | Capabilities |
|-------|-------------|
| `administrador` | Full tenant access, user/module management |
| `calidad` | Verify, export, configure modules, audit |
| `operativo` | Submit forms, upload evidence, view assigned |
| `consulta` | Read-only dashboard, forms |
| `conductor` | Submit assigned forms only |

---

## 8. Analytics & Reporting

### 8.1 Dashboard Metrics

| Metric | Source | Update |
|---------|---------|--------|
| Today's Responses | `sgc_form_responses` count (today) | Real-time |
| Total Responses | `sgc_form_responses` count (all) | Real-time |
| Non-Compliance Rate | Boolean `false` + out-of-range numbers | Real-time |
| Active Alerts | `sgc_alert_occurrence_completions` | Real-time |

### 8.2 Export Capabilities

| Format | Implementation |
|--------|----------------|
| **PDF** | `jsPDF` + `jspdf-autotable` (certificates, control sheets) |
| **Excel** | `xlsx` (import/export batch records) |
| **CSV** | Via `xlsx` export |

---

## 10. Feature Status Summary

| Domain | Capabilities | Status | Evidence |
|--------|--------------|--------|----------|
| **Operations** | Dispatch, Inspections, Traceability | ✅ Operational | Sprint 369 |
| **Quality Control** | Dynamic Forms, Engines, Fields | ✅ Operational | Sprint 369 |
| **Alert/Recurrence** | Temporal Engine, Completion | ✅ Certified | Sprint 341, 341 |
| **Documents** | Evidence, Signatures, Storage | ✅ Operational | Sprint 369 |
| **Admin/Config** | Modules, Forms, Fields, Roles | ✅ Operational | Sprint 369 |
| **Analytics** | Dashboard, Exports | ✅ Operational | Sprint 369 |
| **Tenant Isolation** | Multi-tenant, RLS, Hybrid | ✅ Enforced | Sprint 346-351 |
| **Auth/Security** | Auth, AuthZ, RLS, Storage | ✅ Hardened | Sprint 363, 369 |

---

## 11. Feature Gaps (Documented)

| Feature | Domain | Gap | Target Sprint |
|---------|--------|-----|---------------|
| Workflow Engine (`BaseWorkflow`) | Quality | Multi-step approvals | 387+ |
| CAPA Forms | Quality | Corrective/Preventive Actions | 387+ |
| Automated Testing Suite | Testing | Unit + E2E | 383+ |
| Cross-Tenant Negative Tests | Security | Tenant A cannot read Tenant B | 383+ |
| Cross-Browser Persistence Test | Persistence | Multi-browser sync | 383+ |
| Staging Environment | DevOps | Preview deployments | 384+ |
| Branch Protection | Governance | GitHub Settings | 383+ |
| CI Artifact Validation | CI/CD | Automated verification | 383+ |

---

*Document generated as part of Sprint 383 — Professional Project Presentation & Portfolio Readiness*  
*All features verified against Sprint 369 certification and Sprint 382 governance audit*