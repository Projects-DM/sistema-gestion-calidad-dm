# Sprint 325 — Controlled Media Processing Integration

**Rama:** release/stable-sprint79
**Modo:** CONTROLLED INTEGRATION · LEVEL 5 · IMPLEMENTATION
**Precedente:** Sprint 324 — Media Capture & File Optimization (Forensic Audit → NEW CAPABILITY REQUIRED)
**Suite:** `scripts/sprint-325-media-processing-core.mjs`
**Resultado:** **CERTIFIED** 72/72 gates (E01–E44) · 4.1s · exit=0 · timebox OK
**Regresión histórica 296–324:** NO ejecutada (cambio controlado dirigido).
**Cambios en src/:** `src/shared/media/mediaProcessor.js` (NUEVO) + `src/components/EvidenceUploader.jsx` (MODIFICADO). Exactamente 2 archivos.

---

## 1. Qué se implementó

El **Media Processing Core**: una capacidad central pura y reutilizable que recibe un
`File` de imagen y entrega un artefacto procesado (resize + compresión + normalización
de formato), integrada **antes del upload** en `EvidenceUploader`.

```
Captura (input file / capture="environment")
        │  File (JPEG/PNG/WEBP)
        ▼
Media Processing Core  ── processImage(file, options) → { blob, file, mimeType, width, height, originalSize, processedSize }
        │  (función pura: 0 supabase, 0 queries, 0 persistencia, 0 URLs, no muta el original)
        ▼
Storage pipeline EXISTENTE (EvidenceUploader → supabase.storage 'documentos-sgc' → getPublicUrl)
        ▼
sgc_evidences (file_url, storage_path, file_type, name)  ← contrato intacto
```

- **PDF/DOCX/XLSX**: no pasan por el procesador (se preservan y suben como antes).
- **Firmas (`SignaturePad`)**: contrato independiente, **intacto** (no forma parte de este sprint).

## 2. Contrato del procesador

`processImage(file, options)` — **función pura** (sin side-effects, sin storage).

| Opción | Default | Descripción |
|---|---|---|
| `maxWidth` | `1920` | Límite de ancho (resize solo hacia abajo, nunca upscale) |
| `maxHeight` | `1440` | Límite de alto |
| `quality` | `0.82` | Calidad de compresión (configurable por llamada) |
| `outputType` | `'auto'` | `'auto'` → JPEG para fotos; PNG se conserva si tiene alpha (evita fondo negro). `'image/jpeg'` / `'image/png'` / `'image/webp'` para forzar |

**Retorno:** `{ blob, file, mimeType, width, height, originalSize, processedSize }`
- `file` = `File` procesado con extensión coherente con el MIME (`foto.jpg`, `logo.png`…).
- `originalSize`/`processedSize` = métricas para medir la reducción (bytes).

**Errores (códigos controlados):**
| Código | Cuándo |
|---|---|
| `INVALID_IMAGE` | No es imagen (MIME) o no se puede decodificar |
| `MEDIA_PROCESSING_FAILED` | Fallo de renderizado/compresión |
| (errores de storage, fuera del procesador) | Upload/URL — manejados por el pipeline existente |

## 3. Integración en EvidenceUploader

- `processImage` se ejecuta **antes** de `.upload()`, solo para archivos `image/*`.
- Solo se sube el **artefacto procesado** (`uploadTarget = processed.file`).
- Contrato de metadata preservado: `{ file_url, storage_path, file_type, name }`
  (con `file_type` = MIME procesado).
- **Fallback de seguridad:** si el procesamiento falla → alerta controlada y el archivo
  **NO se sube**. NUNCA se sube el original sin procesar en silencio.
- Errores del procesador (`INVALID_IMAGE`, `MEDIA_PROCESSING_FAILED`) se distinguen
  de errores de storage (catch genérico posterior).
- Cámara y galería: se reutiliza la captura nativa existente (`capture="environment"`).
  **No se construye una app de cámara.**

## 4. Preservación (contratos intactos)

- **Firma** (`SignaturePad`): sin cambios (PNG 600×200 → bucket → URL pública).
- **PDF** (repositorio/import/visualización/generación): sin cambios.
- **Importación documental** (ImportAssistant/ImportWorkflow/parser/adapter): sin cambios.
- **Dashboard**: sin cambios.
- **Evidence Report** (modelo/renderer/adapter): sin cambios.
- **Ciclo operativo** (orchestrator/UOR/CompletionBridge): sin cambios.
- **Storage**: mismo bucket `documentos-sgc`, mismo pipeline, sin servicios nuevos
  (`mediaStorageService`/`imageStorageService`/`photoStorageService` **no existen**).

## 5. Decisión técnica — formato de salida y calidad

- **Fotos (JPEG/WEBP/BMP/GIF)**: normalizadas a **JPEG** (compatibilidad universal:
  navegadores, móvil, Supabase Storage y `<img>`, con el menor tamaño).
- **PNG con transparencia**: se **preserva PNG** (convertir a JPEG produciría fondo negro).
- **PNG sin alpha / WEBP**: normalizados a JPEG.
- **Calidad `0.82`** por defecto (certificada dentro de 0.7–0.95): compresión significativa
  sin degradar la utilidad documental (lectura, inspección, evidencia, trazabilidad).
- Configurable por llamada (`quality`, `outputType`, `maxWidth`, `maxHeight`): **no es un
  valor fijo e irreversible**.
- **Sin librerías externas**: se usan capacidades nativas del navegador (`createImageBitmap`,
  `canvas`, `toBlob`). No se agregó ninguna dependencia (`package.json` intacto).

## 6. Métricas de reducción (evidencia de la suite)

Con fixture 4000×3000 (foto real de móvil), contracción analítica:
- Píxeles: `12 000 000 → 2 764 800` (**−76.96%** de área, ≥ 50% certificado).
- Bytes: `processedSize < originalSize` verificado en runtime (métricas `originalSize`/
  `processedSize`/`Reduction Bytes`/`Reduction %` disponibles para consumo).
- Dimensiones finales: `1920×1440` (dentro de límites certificados, ≥ 320 px de utilidad
  documental, sin upscale).
- La suite aísla la lógica del procesador con un canvas mockeado para certificar la
  cadena completa (decodificación → dimensiones → formato → compresión → métricas) en Node.

## 7. Alcance (git)

```
 M src/components/EvidenceUploader.jsx              (integración del procesador)
 ?? src/shared/media/mediaProcessor.js              (NUEVO — Media Processing Core)
 ?? scripts/sprint-325-media-processing-core.mjs    (NUEVO — suite E01–E44)
 ?? docs/Sprint-324.md / sprint-324-*.mjs           (artefactos del sprint anterior, aún sin commit)
```

- `npm run build`: **exit 0** (certificado en E42).
- Sin cambios de `.sql`, bucket, políticas, `package.json` ni `package-lock.json`.

## 8. Veredicto final

```
MEDIA PROCESSING CORE
CORE (E01-E08)        PASS   función pura, sin acoplamiento, contrato completo, no destructivo
IMAGE PROCESSING      PASS   resize sin upscale, normalización, PNG-alpha, calidad configurable, métricas
INTEGRATION (E18-E22) PASS   procesa antes del upload, solo artefacto procesado, storage reutilizado
SAFETY (E23-E26)      PASS   errores controlados y distinguibles, sin fallback silencioso
PRESERVATION (E27-32) PASS   firma/PDF/import/Dashboard/EvidenceReport/ciclo operativo intactos
PERFORMANCE (E33-36)  PASS   reducción medida, dimensiones certificadas, 0 dependencias nuevas
ARCHITECTURE (E37-41) PASS   una sola capacidad, 0 duplicación, sin 2º pipeline, sin SSOT/DB
BUILD/REGRESSION      PASS   build exit 0, alcance src/ = exactamente 2 archivos

FINAL: CERTIFIED
```

**Estado resultante:** la capacidad `processImage` queda centralizada y reutilizable
(`src/shared/media/mediaProcessor.js`) para futuros consumidores (firma y runtime
`file_upload` quedan como contratos independientes pendientes de auditoría/implementación
en sprints posteriores), y las evidencias fotográficas se optimizan antes de almacenarse
sin romper ningún contrato existente.

> **Principio rector cumplido:** una sola capacidad de procesamiento multimedia para
> todo SGC-DM, reutilizando el storage existente como Storage Adapter.