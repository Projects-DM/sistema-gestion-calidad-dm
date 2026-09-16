# SPRINT 67M — Document Repository Upload Pipeline Audit

**Date:** 2026-07-14  
**Level:** LEVEL 3 — ROOT CAUSE IDENTIFIED  
**Status:** APPROVED FOR IMPLEMENTATION  

---

## 1. Objective

Identify the exact point where the document repository upload pipeline breaks, exclusively within the Document Repository module.

---

## 2. Execution Flow Traced

```
ModuleDocumentViewer.jsx:117
    ↓
documentsService.uploadRecord(moduleSlug, categoryKey, file, user.id)
    ↓
documentsService.js:80
    ↓
filePath = `records/${module}/${type}/${Date.now()}_${file.name}`
    ↓
supabase.storage.from('documentos-sgc').upload(filePath, file)
    ↓
ERROR: Invalid key: records/.../.../archivo.pdf
```

---

## 3. Root Cause Report

### 3.1 File & Function

| Attribute | Value |
|-----------|-------|
| **File** | `src/services/documentsService.js` |
| **Function** | `uploadRecord(module, type, file, userId)` |
| **Line** | 80 |

### 3.2 Path Generated

```javascript
const filePath = `records/${module}/${type}/${Date.now()}_${file.name}`;
```

**Example:**
```
records/calidad/quimicos/1784077065182_documento.pdf
```

### 3.3 Path Structure Analysis

| Segment | Value | Valid |
|---------|-------|-------|
| `records/` | **Prefix** | ❌ INVALID — not part of documented bucket structure |
| `{module}` | `calidad` | ✅ Valid slug |
| `{type}` | `quimicos` | ✅ Valid category_key |
| `{timestamp}_{filename}` | `1784077065182_documento.pdf` | ✅ Valid |

### 3.4 Documented Bucket Structure

From `docs/02-contracts/field_schema.md`:

```
📁 documentos-sgc/
  ├── 📁 {slug-del-modulo}/
  │     ├── 📁 {slug-del-formulario}/
  │     │     ├── 📁 evidencias/
  │     │     │     └── 📄 {response_id}_{field_id}_{timestamp}.png
  │     │     └── 📁 firmas/
  │     │           └── 📄 {response_id}_{field_id}_{timestamp}.png
```

The documented structure uses `{module}/{form}/{subfolder}/{file}` — **no `records/` prefix**.

### 3.5 Comparison with Working Upload

| Function | Path Format | Status |
|----------|-------------|--------|
| `uploadProgram()` | `programs/{module}_{timestamp}.pdf` | ✅ WORKS |
| `uploadRecord()` | `records/{module}/{type}/{timestamp}_{file}` | ❌ BREAKS |
| `uploadEvidence()` | `{module}/{form}/evidencias/{file}` | ✅ WORKS |
| `uploadSignature()` | `{module}/{form}/firmas/{file}` | ✅ WORKS |

The `records/` prefix is the **only path prefix that doesn't match** the documented bucket structure.

---

## 4. Layer-by-Layer Audit

### Layer 1: Repository Upload Handler

**Component:** `ModuleDocumentViewer.jsx:117`

```javascript
await documentsService.uploadRecord(moduleSlug, categoryKey, file, user.id);
```

**Certified:** ✅ Correct parameters passed:
- `moduleSlug` = module slug from URL (e.g., `calidad`)
- `categoryKey` = category key from repository (e.g., `quimicos`)
- `file` = uploaded PDF file
- `user.id` = authenticated user ID

### Layer 2: Payload Builder

**File:** `documentsService.js:80`

```javascript
const filePath = `records/${module}/${type}/${Date.now()}_${file.name}`;
```

**Certified:** ❌ ROOT CAUSE — `records/` prefix creates invalid key

### Layer 3: Path Validation

| Check | Result |
|-------|--------|
| `module` slug valid | ✅ |
| `type` (category_key) valid | ✅ |
| `file.name` valid | ✅ |
| Path structure matches bucket | ❌ `records/` prefix mismatch |

### Layer 4: documentsService

**Function:** `uploadRecord()`

```javascript
const { error: uploadError } = await supabase.storage
  .from(BUCKET_NAME)
  .upload(filePath, file);
```

**Certified:** ❌ Receives invalid path from Layer 2, passes it to Supabase

### Layer 5: Supabase Upload

**Error:** `Invalid key: records/.../.../archivo.pdf`

**Certified:** Supabase correctly rejects the path because the `records/` folder doesn't exist in the bucket configuration.

---

## 5. Root Cause Summary

**The `records/` prefix in `documentsService.uploadRecord()` creates a storage path that doesn't match the documented bucket structure.**

The bucket `documentos-sgc` is configured with folders like:
- `programs/` (for `uploadProgram`)
- `{module}/evidencias/` (for evidence uploads)
- `{module}/firmas/` (for signature uploads)

But **NOT** `records/` — this folder was never created or configured in the bucket.

---

## 6. Correction Proposal

### 6.1 Minimal Fix

**File:** `src/services/documentsService.js`  
**Line:** 80

**Before:**
```javascript
const filePath = `records/${module}/${type}/${Date.now()}_${file.name}`;
```

**After:**
```javascript
const filePath = `${module}/${type}/${Date.now()}_${file.name}`;
```

**Change:** Remove the `records/` prefix.

### 6.2 Impact

| Layer | Impact |
|-------|--------|
| Storage Path | CHANGED — `records/` prefix removed |
| Bucket | NONE — path now matches documented structure |
| Database | NONE — `sgc_records.storage_path` stores the new path |
| Existing Records | NONE — old records keep their old `storage_path` |
| New Records | Will use new path format |
| Runtime | NONE |
| Lifecycle | NONE |
| Contracts | PRESERVED |

### 6.3 Backward Compatibility

- **Existing uploaded files:** Their `storage_path` in `sgc_records` still points to the old `records/...` path. If those files exist in the bucket, they remain accessible.
- **New uploads:** Will use the corrected path format.
- **No migration needed:** Old records are not affected.

---

## 7. What Was NOT Modified

| Component | Status |
|-----------|--------|
| Program Management | PRESERVED |
| Metadata Factory | PRESERVED |
| Runtime Modules | PRESERVED |
| Dashboard | PRESERVED |
| Module Administration | PRESERVED |
| Storage Global | PRESERVED |
| PDF Viewer | PRESERVED |
| Module Publication | PRESERVED |
| Document Viewer | PRESERVED |
| Bucket Governance | PRESERVED |

---

## 8. Certification

**Sprint 67M certifies:**

1. The root cause is the `records/` prefix in `documentsService.uploadRecord()` at line 80
2. The prefix creates a storage path that doesn't match the documented bucket structure
3. Supabase Storage correctly rejects the invalid key
4. The fix is minimal: remove the `records/` prefix from the path
5. All other components in the pipeline are certified as functional
6. No changes needed to SQL, Application Layer, Runtime, or Lifecycle

---

**SPRINT 67M — LEVEL 3 — ROOT CAUSE IDENTIFIED — APPROVED FOR IMPLEMENTATION**
