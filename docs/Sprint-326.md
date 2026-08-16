# Sprint 326 — Document Repository Media Capture · Forensic Integration Audit

**Rama:** release/stable-sprint79
**Modo:** AUDIT ONLY · LEVEL 5 · FORENSIC INTEGRATION AUDIT
**Precedente:** Sprint 325 — Controlled Media Processing Integration
**Dependencias:** Sprint 324 (audit multimedia) · Sprint 325 (Media Processing Core)
**Suite:** `scripts/sprint-326-document-repository-media-capture-forensic-audit.mjs`
**Resultado:** **CERTIFIED** 94/94 gates (E01–E70) · 4.6s · exit=0 · timebox OK
**Regresión histórica 296–325:** NO ejecutada (audit dirigido).
**Cambios:** 0 en src/ · 0 SQL · 0 storage · 0 dependencias (AUDIT ONLY).
**Clasificación única:** **CONTROLLED EXTENSION REQUIRED**

---

## 1. Pregunta forense

> ¿Una fotografía optimizada por `processImage()` puede convertirse en un documento del
> Repositorio Documental con el contrato existente (`documentsService` + `documentos-sgc`),
> sin alterar el contrato de PDF ni los consumidores, y sin crear un segundo pipeline?

**Respuesta:** SÍ en el contrato de storage/modelo (REUSE), con una **extensión controlada y
localizada** en: (a) `uploadProgram` hardcodea `.pdf` en el path (Nivel 1 Programa) y
(b) gates de UI (accept/check MIME/visor/etiquetas). **NO** es un gap estructural y **NO**
requiere un segundo pipeline, servicio, bucket ni SSOT.

## 2. Ownership (respuestas A)

| Pregunta | Respuesta |
|---|---|
| ¿Quién posee el botón Subir? | `ModuleDocumentViewer.jsx` (Registros/Certificados, por categoría) y `DocumentModule.jsx` (Programas, Nivel 1) |
| ¿Quién administra el repositorio seleccionado? | `ModuleDocumentViewer` (`getRepositories` + `setActiveRepositoryId`) |
| ¿Quién administra la categoría seleccionada? | `ModuleDocumentViewer` (`getCategories(activeRepositoryId)`, `category_key`) |
| ¿Quién administra los documentos? | `ModuleDocumentViewer` (`docsByCategory[category_key]` vía `getRecords`) |
| ¿Quién ejecuta el upload? | `handleUpload` / `handleFileUpload` → `documentsService.uploadRecord` / `uploadProgram` |
| ¿Qué service persiste? | `documentsService` (sgc_records / sgc_programs + storage) |

## 3. Contrato documental (respuestas B)

- **Modelo real** — persistido por `documentsService`:
  - `sgc_programs`: `{ module, name, file_url, storage_path, created_by }`
  - `sgc_records`: `{ module, type, name, file_url, storage_path, created_by }`
- **Obligatorios:** `module`, `name`, `file_url`, `storage_path` (+`type` en registros). `created_by` = auditoría.
- **¿Depende de PDF?** NO. **No se persiste `file_type`** → el modelo es **MIME-agnóstico**.
  El documento se identifica por su **metadata documental** (repositorio→`module`, categoría→`type`,
  `name`, `file_url`, `storage_path`), no por ser PDF.
- **Extensión hardcodeada:** solo en `uploadProgram` (`programs/${module}_${Date.now()}.pdf`).
  `uploadRecord` deriva la extensión de `safeStorageName(file.name)` → conserva `.pdf/.jpg/.jpeg/.webp/.png`.
- **`storage_path`** (`{module}/{type}/{ts}_{safeName}`) y **`file_url`** (`getPublicUrl`) funcionan
  indistintamente para PDF e imagen (sin parámetro de tipo).

## 4. Storage (respuestas C)

- El repositorio usa `documentsService` **directamente** (sin storage en la UI).
- Bucket único: `documentos-sgc` (`BUCKET_NAME`).
- Paths: `programs/` y `{module}/{type}/`.
- `uploadRecord` acepta **File genérico** (`storage.upload(filePath, file)` sin gate MIME en el service).
- **Eliminación** (`deleteRecord`/`deleteProgram` → `storage.remove([storage_path])`) y **reemplazo**
  (Registros: delete+upload; Programas: remove existente+update) son **MIME-independientes**.
- `safeStorageName` normaliza acentos y conserva `\w . -` → reutilizable para imágenes.

## 5. Presentación / Viewer (respuestas D)

- La UI determina "es PDF" por **hardcode**: `accept=".pdf"`, check `file.type !== 'application/pdf'`,
  tooltips "Ver PDF"/"Eliminar PDF", etiqueta `"{n} PDFs"`, icono `FileText`.
- `Ver` está acoplado a **`PdfViewerModal` (iframe `#toolbar=0`)** sin ramificación por MIME.
- **No existe ImageViewer** en `src/`. La decisión de presentación objetivo:
  `file_type` → `application/pdf` ⇒ PDF Viewer · `image/*` ⇒ Image Viewer (decisión de presentación, **no** nuevo pipeline).
- Supuestos `application/pdf` en consumidores: **solo 4 sitios** (DocumentModule:41, ModuleDocumentViewer:19/224,
  EvidenceUploader:111) → ningún otro consumidor se ve afectado.
- `Reemplazar` está hardcodeado **PDF→PDF** a nivel UI; el service ya permite otro MIME (sin regla de negocio que lo prohíba).

## 6. Separación de tipos de archivo (regla §5)

```
                    DOCUMENT FILE
                         │
             ┌───────────┴───────────┐
             │                       │
          PDF/etc.                IMAGE
             │                       │
             │                processImage()
             │                       │
             └───────────┬───────────┘
                         ▼
                  documentsService
```

PDF/DOCX/XLSX → upload directo existente (nunca pasan por `processImage()`). IMAGE → `processImage()` → upload existente.

## 7. Punto de integración correcto (evidencia)

El punto es **`ModuleDocumentViewer.handleUpload` / `DocumentModule.handleFileUpload`** (los handlers
que hoy gatean PDF), inyectando `processImage()` **antes** de `documentsService`, sin tocar el service:

```
Subir archivo  (PDF/etc. → directo)
Tomar foto     (image/* → capture nativo → processImage() → processed.file → documentsService)
```

- `documentsService` se **reutiliza tal cual** para Registros (`uploadRecord` ya es genérico).
- `uploadProgram` (Programas) requiere la **única extensión de contrato**: derivar la extensión del
  archivo (safeStorageName) en lugar del `.pdf` hardcodeado, si el Nivel 1 debe aceptar imágenes.
- Se persiste la referencia del **artefacto realmente almacenado** (p. ej. `foto.png` → `foto.jpg`
  procesado), no del original. Sin duplicación original→storage + processed→storage.

## 8. Captura fotográfica

Reutiliza el mecanismo nativo certificado en 324–325: `<input type="file" accept="image/*" capture="environment" />`
(Móvil → cámara del dispositivo; Desktop → selector de archivos). **NO** se introduce
`getUserMedia()`/WebRTC/CameraService/CameraContext/app de cámara (verificado: 0 en src).

## 9. Límites de tamaño

- Frontend: **sin límites** en el repositorio ni en `EvidenceUploader` (0 `maxSize` en src).
- Supabase: sin límites en código (config externa del bucket).
- Procesador: sin tope fijo; `processImage` (Sprint 325) entrega `processedSize < originalSize`
  con dimensiones ≤ 1920×1440 y calidad 0.82. El objeto persistido será el **procesado**.

## 10. Duplicación (§16)

- El Repositorio Documental **NO implementa storage directamente**: `DocumentModule` y
  `ModuleDocumentViewer` no contienen `supabase.storage`/`getPublicUrl`/`.upload(`/`.remove([`.
- Storage concentrado en **3 archivos** (`documentsService` + SignaturePad + EvidenceUploader).
- **NO existe STORAGE OWNERSHIP DUPLICATION** en el repositorio → `documentsService` es el único owner.
- **0** `mediaStorageService`/`photoStorageService`/`imageStorageService` → **NO SECOND PIPELINE**.

## 11. Contratos que NO se tocan (verificado por git scope)

`SignaturePad`, `EvidenceUploader`, `EvidenceReportModel`, `EvidenceReportRenderer`,
`dispatchEvidenceAdapter`, `CompletionBridge`, `OperationalExperienceLifecycleOrchestrator`,
`UniversalOperationalRuntime`, `UniversalOperationalDashboard`, `ImportWorkflow`, `documentParser`,
`filterCore`, `sgcFilterAdapter` — sin dependencia directa e inevitable detectada.

## 12. Alcance (git)

```
 M src/components/EvidenceUploader.jsx    (pendiente de Sprint 325 — NO de 326)
 ?? src/shared/media/mediaProcessor.js     (pendiente de Sprint 325 — NO de 326)
 ?? scripts/sprint-326-*.mjs               (suite de 326)
 ?? docs/Sprint-324.md · Sprint-325.md · Sprint-324/325 suites  (pendientes de commit)
```

- Sprint 326 **no agregó nada a `src/`** (los únicos archivos de src son los pendientes del 325).
- Sin `.sql`, sin `package.json`/lock, sin bucket/políticas. `npm run build`: **exit 0**.

## 13. Veredicto final

```
CAPTURE OWNERSHIP             PASS   ModuleDocumentViewer + DocumentModule + documentsService
DOCUMENT CONTRACT             PASS   sgc_records/sgc_programs MIME-agnósticos (sin file_type)
STORAGE REUSE                 PASS   documentsService único owner; bucket documentos-sgc; paths genéricos
MEDIA PROCESSOR REUSE         PASS   processImage consumible como File antes de upload (0 duplicación)
PDF PRESERVATION              PASS   upload directo existente; sin conversión PDF→imagen
SIGNATURE PRESERVATION        PASS   firma intacta
EVIDENCE PRESERVATION         PASS   evidence pipeline intacto
VIEWER CONTRACT               PASS   acoplamiento PDF (iframe) clasificado; decisión de presentación
REPLACE CONTRACT              PASS   MIME-independiente en service; gate UI localizada
DELETE CONTRACT               PASS   storage_path → MIME-independiente
MIME / EXTENSION              PASS   safeStorageName conserva .pdf/.jpg/.jpeg/.webp/.png
NO DUPLICATE STORAGE          PASS   repositorio 0% storage directo
NO SECOND PIPELINE            PASS   0 servicios de storage paralelos
NO NEW SSOT                   PASS   sin modelo/entidad Photo
NO NEW BUCKET                 PASS   único documentos-sgc
NO NEW SERVICE                PASS   0 mediaStorageService/photoStorageService/imageStorageService
SCOPE                         PASS   0 cambios src/ (AUDIT ONLY)
BUILD                         PASS   npm run build exit 0

FINAL: CERTIFIED
```

**Clasificación única: CONTROLLED EXTENSION REQUIRED**

- **REUSE:** el contrato documental absorbe imágenes sin segundo pipeline (`uploadRecord`,
  delete, replace, `storage_path`, `file_url` ya son MIME-independientes).
- **EXTENSIÓN controlada localizada:**
  1. `uploadProgram` hardcodea `.pdf` en el path (Nivel 1 Programa) → derivar extensión del archivo.
  2. Gates de UI (`accept=".pdf"`, check MIME, visor iframe, etiquetas "PDF") en los 2 componentes.
  3. Decisión de presentación: ramificar `Ver` por MIME (PDF Viewer vs Image Viewer) y `Reemplazar` para aceptar imágenes.
- **NO** es `ARCHITECTURAL GAP` ni `SECOND PIPELINE FORBIDDEN`.

**→ Sprint 327 = CONTROLLED INTEGRATION** (consumidor de imagen en el Repositorio reutilizando
`documentsService` + `processImage()` + bucket `documentos-sgc`, sin nuevos modelos).

> **Principio rector:** ONE DOCUMENT REPOSITORY · ONE STORAGE CONTRACT · ONE MEDIA PROCESSOR ·
> ONE DOCUMENT REFERENCE MODEL.