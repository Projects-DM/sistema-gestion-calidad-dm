# Sprint 315 — Evidence Report · Professional Renderer · Controlled Correction

Rama: `release/stable-sprint79`
Modo: LEVEL 5 · CERTIFICATION (implementación + evidencia ejecutable) — **CERTIFIED**
Fecha: 2026-08-15
Tipo: Corrección controlada — nueva representación documental profesional de los registros existentes
Dependencias: Sprint 313 CERTIFIED (commit `17ab55a`) · Sprint 314 CERTIFIED (102/102, AUDIT ONLY)
Suite: `node scripts/sprint-315-evidence-report-professional-renderer-controlled-correction.mjs`

## Clasificación final

```
SPRINT 315 — CERTIFICATION

  REPORT ACTION            PASS
  SELECTION REUSED         PASS
  NO NEW QUERY             PASS
  NO NEW SSOT              PASS
  REPORT IDENTITY          PASS
  INSTITUTIONAL HEADER     PASS
  MODULE METADATA          PASS
  FORM METADATA            PASS
  RECORD IDENTITY          PASS
  USER TRACEABILITY        PASS
  DATE/TIME                PASS
  STATUS                   PASS
  DYNAMIC FIELDS           PASS
  SIGNATURE                PASS
  EVIDENCE                 PASS
  MULTIPLE RECORDS         PASS
  MULTIPLE FORMS           PASS
  NO DATA LOSS             PASS
  ORDER PRESERVATION       PASS
  PROFESSIONAL PAGINATION  PASS
  PAGE NUMBERING           PASS
  DOCUMENT SAFETY          PASS
  NO PERSISTENCE MUTATION  PASS
  BUILD                    PASS
  REGRESSIONS              PASS (GREEN)
  SCOPE                    PASS

  STATUS: CERTIFIED
```

TOTAL: **70/70 PASS**. Familia de regresión 296–314 **GREEN** con delta real.

## Regla de oro (§1)

> **Sprint 315 no construye un nuevo sistema de registros. Construye una nueva
> representación documental de registros que ya existen.**

El informe es una **representación profesional de la selección existente** de
Historial y Consulta. No introduce queries, tablas, almacenamiento ni estados
nuevos; reutiliza EXACTAMENTE la normalización de valores del XLSX actual y
presenta la información que el sistema ya transporta.

## Arquitectura implementada (§2)

```
Historial y Consulta (DynamicRecordsView)
        │  selectedIds (selección existente)
        ▼
   records.filter(r => selectedIds.includes(r.id))     ← sin re-consulta
        │
        ▼
EvidenceReportAdapter/Model (evidenceReportModel.js)
        │  buildEvidenceReportModel({ registros, moduleId, moduleName, now, documentSequence })
        ▼
ProfessionalRenderer (evidenceReportRenderer.js)       ← jsPDF + autotable
        │  renderEvidenceReport({ model })
        ▼
INFORME DE EVIDENCIA DE REGISTROS (PDF profesional)
```

Cadena completa: **selección → registros → adapter → modelo → renderer → PDF**.
Ningún componente del informe consulta Supabase ni `dynamicService`
(verificado: 0 hits en el código ejecutable, E03).

## Componentes entregados (§3)

| Archivo | Rol |
|---|---|
| `src/shared/report/evidenceReportModel.js` | Adapter + modelo documental. Construye `documentId`, resumen, agrupación por formulario, registros con campos/firmas/evidencias. 0 queries. |
| `src/shared/report/evidenceReportRenderer.js` | Renderer PDF (jsPDF + `jspdf-autotable`): cabecera institucional, identificación, resumen, contexto, registros, campos, firmas/evidencias, pie, "Página X de Y". Metadata driven, sin `if (formulario === ...)`. |
| `src/components/DynamicRecordsView.jsx` | Botón **"Informe de Evidencia"** junto a "Exportar"; handler síncrono sobre la selección en memoria; gate de selección vacía. |
| `src/pages/DynamicModule.jsx` | Pasa `moduleName` (contexto ya cargado en `modInfo`) a la vista — sin query nueva. |
| `src/shared/utils/exportDataNormalizer.js` | Exporta `getDateParts`, `normalizeSignatureCell`, `normalizeEvidenceCell`, `normalizeValue` (aditivo; el informe reutiliza la MISMA normalización del XLSX). |

## Decisión de presentación: firma y evidencia (§4)

Firma y evidencia se presentan como **enlaces verificables** (`Ver Firma 1`,
`Ver Evidencia 1 (image/jpeg)`) que apuntan a la URL pública ya almacenada.
El renderer usa `doc.textWithLink` (annotación clickeable real del PDF).
Razones certificadas:

- **Seguridad/práctica**: no se incrusta binario ni se hace fetch async desde el
  renderer (0 queries/0 red), manteniendo la regla de no-new-query.
- **Paridad**: los textos reutilizan `normalizeSignatureCell`/
  `normalizeEvidenceCell` → los mismos descriptores que el XLSX (E18).
- **Sin mecanismo nuevo**: el almacenamiento y la URL son los existentes
  (Sprint 314 §12).

## Identidad documental (§5)

`EVID-YYYY-MM-DD-NNN` — pertenece al **documento generado**, no al registro.
Deriva de la fecha de generación + secuencia por sesión (ref counter en la
vista). Dos informes con los mismos registros en distinto momento → IDs
distintos (E04/E05). No reemplaza `sgc_form_responses.id`.

## Gate de selección vacía (§6)

`selectedIds.length === 0` → la vista NO genera informe (alert). El modelo y el
renderer toleran cero registros (resumen en ceros) sin romper el documento
(E22) — pero la acción documental solo se produce sobre selección.

## Integridad de la información (E18 — no data loss)

- **Paridad campo a campo**: cada valor del informe es `normalizeValue(...)`
  del normalizador compartido → igual que el XLSX (números con unidad, boolean
  `Cumple`/`No cumple`/con comentario, texto sin truncado).
- **Paridad agregada**: TODA celda del workbook XLSX real (flatten de hojas)
  aparece en el texto del PDF; el único mapeo documentado es `Estado` raw
  (`aprobado`…) → etiqueta (`Aprobado`) mostrada por el informe, 1:1.
- Incluye ID completo del registro, usuario/rol, hallazgos críticos, fechas de
  creación/verificación, estado de cumplimiento y verificación, campos
  dinámicos, firmas y evidencias (E09–E15).

## Paginación y seguridad documental (E20–E22)

- Paginación profesional automática: `ensureSpace` corta secciones a
  `SAFE_BOTTOM`, `autoTable` respeta saltos, formularios nuevos inician página.
- Numeración real por página: `Página X de Y` en TODAS las páginas (E21).
- Texto largo se ajusta (`splitTextToSize`); sin títulos de registro huérfanos
  (el título convive con su sección `INFORMACIÓN DEL REGISTRO`); volumen real
  (18 registros / 2 formularios) sin páginas en blanco ni cierres perdidos.
- El informe NO persiste ni muta: sin `localStorage`/`insert`/`update`/`delete`;
  los registros de entrada quedan deep-equal tras render (E04/E23).

## XLSX intacto (§7)

La exportación XLSX NO se reemplaza: `exportService({ formato: 'xlsx' })`
permanece; el informe es una **salida complementaria** (E23). Ambos comparten la
misma normalización → coherencia garantizada.

## Alcance (E26)

```
 M src/shared/utils/exportDataNormalizer.js      ← export de helpers (aditivo)
 M src/components/DynamicRecordsView.jsx         ← botón + handler del informe
 M src/pages/DynamicModule.jsx                   ← prop moduleName (contexto existente)
?? src/shared/report/                            ← evidenceReportModel.js + evidenceReportRenderer.js
```

Fuera de alcance: queries nuevas, SSOT, storage, signature/evidence mechanisms,
filtros avanzados, XML.

## Regresión (§8) — GREEN con delta real

Familia 296–314 (17 miembros) sin fails funcionales NO autorizados (E25):

| Miembro | Resultado |
|---|---|
| 296/297/299/300/301/303/305/306/310/311 | GREEN |
| 302 | solo forenses baseline (n=9) |
| 304 | baseline + deltas autorizados (n=10) |
| 307 | solo forenses baseline (n=5) |
| 308 | solo forenses baseline + deltas (n=1) |
| 312 | baseline + deltas autorizados (n=10) |
| 313 | deltas autorizados (n=5) — cascada de scope |
| 314 | deltas autorizados (n=6) — cascada de scope |

### Deltas autorizados (no regresiones de 315)

- **312 F01/F14/F25/F27 + cascadas `src/ LIMPIO`**: hallazgos del propio sprint
  312 sobre el bug que 313 corrigió + guard de alcance que cambia porque 315
  modifica `src/`.
- **313 (n=5)**: `GATE COMPLETION≠DELETE`/`SCOPE` — la propia suite de 313
  esperaba el renderer como `M` en working tree; tras el commit `17ab55a` está
  en HEAD (misma cascada autorizada en 314).
- **314 (n=6)**: `G21`/`SCOPE`/`REGRESSIONS` — 314 es AUDIT ONLY y exige
  "`src/` sin modificaciones"; 315 modifica `src/` de forma INTENCIONAL y
  certificada. Sus sub-checks `G23` (regresión 296–313) quedaron **PASS**; la
  línea agregada del clasificador es la cascada de alcance documentada.
- **Cascadas globales autorizadas**: líneas de guard de alcance
  (`src/ sin modificaciones`, `src/ LIMPIO`, `deja de renderizar`, etc.) que
  aparecen en sprints previos por el estado INTENCIONAL del working tree,
  nunca por fallas funcionales.

## Cómo se certifica (§9)

La suite genera el PDF con el renderer real (jsPDF en Node), lo lee con
`pdfjs-dist` (extracción de texto por página) y verifica contenido, orden,
numeración y paginación sobre el **documento efectivamente producido**, no
sobre el código. La paridad con XLSX usa el workbook real del normalizador
compartido. `npm run build` (E24) pasa; `git status --short src/` (E26) coincide
exactamente con el alcance.

## Próximo paso

- **Advanced Evidence Filtering** (fecha/rango/usuario/estado/formulario/módulo):
  filtros avanzados documentados en 314 (§17), aún decorativos en la vista.
- **XML** como representación estructurada secundaria (314 §19).
- Mejorar el renderer (logo institucional, pie de firma oficial) dentro de la
  capa de presentación, sin alterar la capa de datos.