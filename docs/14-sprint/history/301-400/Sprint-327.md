# Sprint 327 — Document Repository Media Capture · Controlled Integration

**Rama:** release/stable-sprint79
**Modo:** LEVEL 5 · IMPLEMENTATION · CONTROLLED INTEGRATION
**Precedente:** Sprint 326 — Forensic Integration Audit (CONTROLLED EXTENSION REQUIRED)
**Dependencias:** Sprint 324 (audit multimedia) · Sprint 325 (Media Processing Core) · Sprint 326 (audit de integración)
**Suite:** `scripts/sprint-327-document-repository-media-capture-controlled-integration.mjs`
**Resultado:** **CERTIFIED** 118/118 checks (E01–E80 + casos A–L) · 4.6s · exit=0 · timebox OK
**Regresión histórica 296–326:** NO ejecutada (cambio controlado dirigido).
**Cambios src/ (4 autorizados):** `documentsService.js` · `ImageViewerModal.jsx` (nuevo) · `DocumentModule.jsx` · `ModuleDocumentViewer.jsx`
**Clasificación:** **CONTROLLED INTEGRATION**

---

## 1. Objetivo

> Una fotografía optimizada por `processImage()` (Sprint 325) es ya un **documento del Repositorio
> Documental** con el contrato existente (`documentsService` + `documentos-sgc` + `sgc_records`/`sgc_programs`),
> sin segundo pipeline, sin entidad photo, sin servicio nuevo y sin tocar los contratos operacionales.

**Logrado:** la captura de cámara/archivo (`image/*`, `capture="environment"`) se integra en ambos
niveles del repositorio (Programas y Registros/Certificados) procesando la imagen con el Media
Processing Core **antes** del upload, persistiendo el artefacto procesado como un documento MIME-agnóstico
y presentándolo con un visor MIME-aware.

## 2. Implementación

### 2.1 `src/services/documentsService.js` — única extensión de contrato

```js
const safeName = safeStorageName(file.name);
const ext = safeName.includes('.') ? safeName.split('.').pop() : 'pdf';
const filePath = `programs/${module}_${Date.now()}.${ext}`;
```

- `uploadProgram` **ya no hardcodea `.pdf`**: deriva la extensión del artefacto real vía `safeStorageName`
  (Programa: `programs/{module}_{ts}.jpg` para foto, `.pdf` para PDF).
- `uploadRecord` **intacto** (genérico desde 324): `{module}/{type}/{ts}_{safeName}` conserva cualquier extensión.
- **0 lógica de foto** en el service (`isPhoto`/`image`/`photo`): el service es MIME-agnóstico.
- `deleteRecord`/`deleteProgram` → `storage.remove([storage_path])`: eliminación **MIME-independiente**.

### 2.2 `src/components/ImageViewerModal.jsx` — NUEVO (presentacional puro)

- Modal sobre portal con `<img src={doc.file_url}>`, título y botón cerrar.
- **0** supabase/`.from(`/`.upload(`/`.remove(`/`getPublicUrl`/`processImage`/canvas: decisión de
  presentación, no pipeline.

### 2.3 `src/components/DocumentModule.jsx` — Nivel 1 (Programas)

- Dos acciones explícitas por programa: **`Subir Programa PDF`** (input `accept=".pdf"` + gate
  `file.type !== 'application/pdf'`, intacto) y **`Tomar foto`** (input `accept="image/*" capture="environment"`,
  cámara móvil y galería desktop).
- `handlePhotoUpload`: `processImage(file)` → `target = processed.file || processed.blob` →
  `documentsService.uploadProgram(module, target, user.id)`. Errores de procesamiento
  (`MEDIA_ERROR.INVALID_IMAGE` / `MEDIA_ERROR.MEDIA_PROCESSING_FAILED`) → alert + **return sin upload**
  (0 fallback silencioso). Storage errors → catch genérico separado.
- Reemplazo explícito: botón PDF (fileInput) y botón foto (cameraInput); ambos reemplazan el programa único.
- Visor MIME-aware: `resolveDocumentKind(doc)` → `image` ⇒ `ImageViewerModal` · else ⇒ `PdfViewerModal`.

### 2.4 `src/modules/documentViewer/ModuleDocumentViewer.jsx` — Nivel 2 (Registros/Certificados)

- Por categoría: **`Subir`** (input `accept=".pdf"` + gate PDF) y **`Tomar foto`** (input
  `id={uploadInputId}_{c.id}_photo`, `accept="image/*" capture="environment"`).
- `handlePhotoUpload(categoryKey, file)` → `processImage` → `uploadRecord(moduleSlug, categoryKey, target, user.id)`.
- `handleReplace` **MIME-aware**: `file?.type?.startsWith('image/')` ⇒ rama foto (processImage→upload);
  resto ⇒ rama upload directo (PDF→imagen, imagen→imagen, imagen→PDF). Contrato delete+upload preservado.
- `handleOpenDocument` → `resolveDocumentKind(record)` ⇒ `setImageDoc(record)` (ImageViewerModal) ·
  else ⇒ `openViewer(record)` (PdfViewerModal).
- UI neutralizada: botón **`Ver documento`**, contador **`{n} documentos`**, título **`Eliminar documento`**,
  `Reemplazar` con `accept="image/*,application/pdf"`.
- `resolveDocumentKind` (regla MIME): `file_type` si existe; si no, extensión de `storage_path`/`file_url`;
  default `pdf` (legacy preservado). IMAGE_EXTS = `jpg, jpeg, png, webp, bmp, gif`.

## 3. Pipeline certificado

```
 CAPTURE   (Subir PDF directo / Tomar foto image/* + capture)
    -> PROCESS   processImage (resize ≤1920×1440 · calidad 0.82 · normalización)
    -> STORAGE   documentsService -> documentos-sgc (paths genéricos)
    -> REFERENCE sgc_records / sgc_programs  (metadata = artefacto procesado)
    -> PRESENTATION  PdfViewerModal | ImageViewerModal (decisión por MIME)
    -> REPLACE   PDF<->IMAGEN, 1 único artefacto final
    -> DELETE    storage_path, MIME-independiente
```

## 4. Invariantes verificadas

| Invariante | Estado |
|---|---|
| ONE BUCKET | `documentos-sgc` en exactamente 3 archivos (documentsService + SignaturePad + EvidenceUploader) |
| ONE STORAGE OWNER por dominio | `documentsService` único owner del repositorio (0 `.upload(`/`.from(` en la UI del repositorio) |
| ONE MEDIA PROCESSOR | `export async function processImage` ×1; 3 consumidores (EvidenceUploader, DocumentModule, ModuleDocumentViewer) |
| 2+ CONSUMIDORES | 3 consumidores del mismo módulo `media/mediaProcessor` |
| ONE DOCUMENT MODEL | `sgc_records` / `sgc_programs` (sin `sgc_photos`/`sgc_images`/`sgc_media`) |
| 0 PHOTO ENTITY | 0 `sgc_photos` · 0 `photoStorageService` · 0 `photo\b` en service |
| UPLOAD TARGET ≠ ORIGINAL | `target = processed.file || processed.blob`; 0 upload del original tras procesamiento exitoso |
| METADATA = ACTUAL ARTIFACT | `name`/`file_url`/`storage_path` del artefacto procesado (`{base}.jpg`) |

## 5. Prohibido / no introducido

- 0 `getUserMedia`/`webkitGetUserMedia`/`RTCPeerConnection`/`CameraService`/`CameraContext` en `src/`.
- 0 segundo bucket, tabla, servicio o Media Processor. 0 compresión/resize en UI o service
  (solo `mediaProcessor`). PDF/DOCX/XLSX nunca pasan por `processImage()`.
- 0 `.sql`, 0 `package.json`/lock, 0 `createBucket`/`createPolicy`.
- Contratos intactos (git scope): SignaturePad, EvidenceUploader, EvidenceReportModel/Renderer,
  dispatchEvidenceAdapter, CompletionBridge, Orchestrator, UOR/UOD, ImportWorkflow, documentParser,
  filterCore, sgcFilterAdapter.

## 6. Alcance (git)

```
 M src/components/DocumentModule.jsx                          (Sprint 327)
 M src/modules/documentViewer/ModuleDocumentViewer.jsx        (Sprint 327)
 M src/services/documentsService.js                           (Sprint 327)
 ?? src/components/ImageViewerModal.jsx                       (Sprint 327 — nuevo)
 ?? scripts/sprint-327-document-repository-media-capture-controlled-integration.mjs
 ?? docs/Sprint-327.md
 M src/components/EvidenceUploader.jsx                        (pendiente Sprint 325)
 ?? src/shared/media/mediaProcessor.js                        (pendiente Sprint 325)
 ?? docs/Sprint-324.md · Sprint-325.md · Sprint-326.md        (pendientes de commit)
 ?? scripts/sprint-324-*.mjs · sprint-325-*.mjs · sprint-326-*.mjs  (pendientes de commit)
```

- `src/` modificados = **exactamente** los 4 autorizados (E69). `src/` nuevos = ImageViewerModal + mediaProcessor.
- `npm run build`: **exit 0** (E76).

## 7. Veredicto final

```
CAPTURE OWNERSHIP             PASS   ModuleDocumentViewer + DocumentModule + documentsService
CAPTURE UI                    PASS   Subir (PDF) + Tomar foto (image/* capture) por categoría/programa
MEDIA PROCESSING              PASS   processImage reutilizado (1 definición, 3 consumidores)
NO DUPLICATE PROCESSING       PASS   0 compresión/resize fuera de mediaProcessor
DOCUMENT CONTRACT             PASS   sgc_records/sgc_programs MIME-agnósticos; metadata = artefacto
STORAGE REUSE                 PASS   documentsService único owner; bucket documentos-sgc
PDF PRESERVATION              PASS   Subir PDF intacto; PDF nunca pasa por processImage
IMAGE SUPPORT                 PASS   imagen → processImage → uploadRecord/uploadProgram
VIEWER                        PASS   PdfViewerModal | ImageViewerModal por MIME (nunca asume PDF)
REPLACE                       PASS   MIME-aware: PDF→imagen / imagen→imagen / imagen→PDF
DELETE                        PASS   storage_path, MIME-independiente
ERROR DISTINCTION             PASS   INVALID_IMAGE / MEDIA_PROCESSING_FAILED → return sin upload · storage → catch genérico
EVIDENCE PIPELINE             PASS   EvidenceUploader intacto (mismo Media Processor)
SIGNATURE PIPELINE            PASS   SignaturePad intacto
NO SECOND PIPELINE            PASS   0 servicios de storage paralelos
NO NEW SSOT                   PASS   sin modelo/entidad Photo
NO NEW BUCKET                 PASS   único documentos-sgc
NO NEW SERVICE                PASS   0 mediaStorageService/photoStorageService/imageStorageService
SCOPE                         PASS   src/ = 4 autorizados + pendientes 325
BUILD                         PASS   npm run build exit 0

FINAL: CERTIFIED
```

**Clasificación: CONTROLLED INTEGRATION** — extensión controlada y localizada sobre el contrato
documental existente (una línea de path en `uploadProgram` + gates de UI + decisión de presentación),
reutilizando `processImage()` y `documentsService`, sin segundo pipeline ni modelo nuevo.

> **Principio rector:** ONE DOCUMENT REPOSITORY · ONE STORAGE CONTRACT · ONE MEDIA PROCESSOR ·
> ONE DOCUMENT REFERENCE MODEL.