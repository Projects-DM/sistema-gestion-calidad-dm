# Sprint 324 — Media Capture & File Optimization · Forensic Architecture Audit

**Rama:** release/stable-sprint79
**Modo:** AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION
**Precedente:** Sprint 323 — Operational Completion Convergence
**Suite:** `scripts/sprint-324-media-capture-file-optimization-forensic-audit.mjs`
**Resultado:** **CERTIFIED** 99/99 gates (E01–E60) · 4.4s · exit=0 · timebox OK
**Regresión histórica 296–323:** NO ejecutada (audit dirigido).
**Clasificación única:** **NEW CAPABILITY REQUIRED** (→ Sprint 325: CONTROLLED MEDIA PROCESSING INTEGRATION)

---

## 1. Pregunta forense

> ¿Existe actualmente una capacidad reutilizable de captura/procesamiento de imágenes y
> archivos que pueda centralizarse para reducir el tamaño de los objetos almacenados,
> sin crear un segundo pipeline de archivos ni alterar los contratos existentes?

**Respuesta:** NO existe ninguna capacidad de **procesamiento** de imágenes. El
**almacenamiento** SÍ es reutilizable (`documentsService`). Por lo tanto:
**NEW CAPABILITY REQUIRED** (Media Processing Core) reutilizando el contrato de storage
existente como Storage Adapter — sin segundo pipeline de archivos.

## 2. Inventario de pipelines de upload (5 = 4 funcionales + 1 incompleto)

| # | Pipeline | Captura | Procesamiento | Storage | Referencia persistida |
|---|---|---|---|---|---|
| 1 | **Firma** (`SignaturePad.jsx`) | canvas 600×200 → `toBlob PNG` | ninguno | bucket `documentos-sgc` (literal) `firmas/firma_{rand}_{ts}.png` | URL pública en `sgc_response_values.value_text` |
| 2 | **Evidencias** (`EvidenceUploader.jsx`) | `<input type=file>` + `capture="environment"` | ninguno | bucket `documentos-sgc` (literal) `evidencias/{rand}_{ts}.{ext}` | `sgc_evidences` (file_url, storage_path, file_type) |
| 3 | **Programas PDF** (`documentsService.uploadProgram`) | `<input type=file accept=.pdf>` | ninguno | `BUCKET_NAME` `programs/{module}_{ts}.pdf` | `sgc_programs` (file_url, storage_path) |
| 4 | **Registros PDF** (`documentsService.uploadRecord`) | `<input type=file accept=.pdf>` | `safeStorageName` (normalización de nombre) | `BUCKET_NAME` `{module}/{type}/{ts}_{safeName}` | `sgc_records` (file_url, storage_path) |
| 5 | **Runtime `file_upload`** (`FieldFileUpload.tsx`) | `<input type=file>` (options dinámicas) | ninguno | **NO SUBE A STORAGE** | `RuntimePayloadBuilder` serializa `File[]` como JSON (sin contenido útil) — **pipeline incompleto** |

## 3. Storage — un solo bucket

- Bucket único: **`documentos-sgc`** (`documentsService.js:3` constante `BUCKET_NAME`).
- **Duplicación:** el literal `'documentos-sgc'` está hardcodeado en `SignaturePad.jsx` y
  `EvidenceUploader.jsx` (no reutilizan la constante).
- Paths: `programs/`, `firmas/`, `evidencias/`, `{module}/{type}/`.
- **Sin** `getSignedUrl`/`createSignedUrl`/`.download()` — todo por URL pública (`getPublicUrl`).
- **Sin** configuración de bucket/políticas en código (`createBucket`/`createPolicy` ausentes).
- Discrepancia documental: `supabase/schema.sql:96` menciona `documentos-calidad` (legacy).
- **Sin límites de tamaño** en código; validación por atributo `accept` en la UI.

## 4. Procesamiento de imágenes — **NO EXISTE**

- `src/` entero: **0** usos de `drawImage`, `createImageBitmap`, `toDataURL`, `resize`,
  `compress`, `OffscreenCanvas`, `imageSmoothingQuality`.
- Único `canvas` de todo el sistema = dibujo de firma (`SignaturePad.jsx`).
- **Sin compresión, sin redimensionado, sin conversión de formato, sin pre-procesamiento.**
  Las fotos se suben en crudo (MIME original) al bucket.
- Única conversión existente: firma → PNG (`canvas.toBlob(resolve, 'image/png')`).
- Firma sin `devicePixelRatio`: resolución real fija 600×200 px.

## 5. Cámara

- **1 único punto** de captura nativa del navegador: `EvidenceUploader.jsx:109`
  `capture="environment"` (móvil, cámara trasera) + `accept="image/*"`.
- Desktop/galería: `<input type="file">` estándar (sin `capture`).
- El `File` resultante se trata con el pipeline existente (`handleFileChange`).
- **No se construye una aplicación de cámara independiente** — el navegador y el pipeline actual lo cubren.

## 6. Formularios dinámicos

- Tipos de campo soportados: `text, textarea, number, boolean, select, signature`
  (`FormBuilder.jsx:402-408,524-530`; `builderAdapter.js:8`). **NO existe campo `photo`/`image`.**
- `file_upload` (runtime, `runtimeContracts.ts`) registrado en `ComponentRegistry` — captura
  `File[]` pero **no sube a storage** (pipeline incompleto).
- `signature` en runtime = **placeholder** (`FieldSignature.tsx`); la captura real solo
  existe en los engines legacy (`BaseGeneric/BaseChecklist/BaseMediciones` → `SignaturePad`).
- Evidencias fotográficas: mecanismo externo al formulario (`EvidenceUploader` global en
  `DynamicForm.jsx`), subidas **antes** del submit (riesgo de huérfanos si se cancela).

## 7. Firmas (contrato independiente)

- `FOTO ≠ FIRMA`. La firma es un canal propio: canvas → PNG → bucket → URL.
- Se persiste la **URL pública** como `value_text`; no se guarda `storage_path`.
- `sgc_evidences` y evidencias fotográficas son un contrato distinto (metadata con
  `storage_path`). Una optimización de imágenes no debe romper el contrato de firma
  (PNG 600×200, URL pública, renderizado `<img>`).

## 8. Evidencias

- `EvidenceUploader.jsx`: sube inmediatamente al bucket; metadata `{file_url, storage_path, file_type, name}`.
- `dynamicService.submitFormResponse` inserta en `sgc_evidences` (`response_id, file_url, storage_path, file_type`).
- ⚠️ **Hallazgo:** `getModuleResponses` selecciona `sgc_evidences (id, file_url, file_type)` —
  **no expone `storage_path`** → imposible borrar evidencias desde la UI de registros.

## 9. PDF — inventario por dominio

| Dominio | Captura | Procesamiento | Storage | Referencia |
|---|---|---|---|---|
| Repositorio (programas) | `DocumentModule.jsx` `.pdf` | ninguno | bucket | `sgc_programs` |
| Repositorio (registros) | `ModuleDocumentViewer.jsx` `.pdf` | `safeStorageName` | bucket | `sgc_records` |
| Generación | jspdf + autotable: `evidenceReportRenderer.js`, `orchestrator.exportPdf`, `utils/dispatchesPdf.js` (dead code) | — | — | — |
| Importación | `documentParser.js` (`pdfjs-dist` + worker) | parse espacial | — | ImportAssistant / ImportWorkflow |
| Visualización | `PdfViewerModal.tsx` `<iframe src=file_url#toolbar=0>` | — | URL pública | — |

## 10. Dependencias multimedia (package.json)

| Dependencia | Uso |
|---|---|
| `jspdf` ^4.2.1 + `jspdf-autotable` ^5.0.7 | Generación PDF |
| `pdfjs-dist` ^6.1.200 | Solo importación de PDF |
| `mammoth` ^1.12.0, `xlsx` ^0.18.5 | Importación documental (docx/xlsx) |
| `@supabase/supabase-js` ^2.105.1 | Cliente central (`lib/supabase`) |

**No existe** ninguna librería de compresión/resize de imágenes (sharp, compressorjs,
browser-image-compression, canvas, jimp, html2canvas, etc.). Canvas = navegador nativo.

## 11. Arquitectura objetivo (Sprint 325)

```
                  ┌──────────────────────────┐
                  │   Media Processing Core   │  ← NUEVO (Sprint 325)
                  │   processImage(file,opt)  │
                  └────────────┬─────────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          ↓                    ↓                     ↓
   Dynamic Forms        Document Repository       Evidence
   (Signature/evidencia)  (programas/registros)  (foto/archivo)
          │                    │                     │
          └────────────────────┼─────────────────────┘
                               ↓
                    Storage Adapter (REUSE documentsService:
                    bucket, safeStorageName, upload/getPublicUrl/remove)
                               ↓
                        Supabase Storage (documentos-sgc)
```

- **Captura** = UI (input file + capture nativo). **Compresión/resize/normalización** =
  Media Processor. **Upload** = Storage Adapter. **Referencia** = dominio. **Presentación** = consumidor.
- El contrato propuesto `processImage(file, options) → { blob, file, mimeType, width, height,
  originalSize, processedSize }` **NO se implementa en 324**; se definirá en 325 solo si la
  certificación lo justifica.
- **Meta:** menor tamaño razonable SIN degradar la utilidad documental (lectura, inspección,
  evidencia, trazabilidad).

## 12. Veredicto final

```
MEDIA ARCHITECTURE
CAPTURE              PASS
IMAGE PIPELINE       PARTIAL
PDF PIPELINE         PASS
SIGNATURE            PASS
EVIDENCE             PASS
STORAGE              PASS
PROCESSING           MISSING
REUSE                PARTIAL
DUPLICATION          FOUND
CAMERA               PASS
OPTIMIZATION         MISSING
NO NEW SSOT          PASS
NO STORAGE CHANGE    PASS
SCOPE                PASS
BUILD                PASS

FINAL: CERTIFIED
```

**Decisión para Sprint 325:** `NO existe Media Processor → DEFINE CONTROLLED CAPABILITY`
→ **Sprint 325: CONTROLLED MEDIA PROCESSING INTEGRATION** (nuevo procesador central +
Storage Adapter reutilizando el contrato de `documentsService`, sin segundo pipeline de archivos).

> **Principio rector:** una sola capacidad de procesamiento multimedia para todo SGC-DM.