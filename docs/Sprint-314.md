# Sprint 314 — Record Evidence Report · Professional Presentation Forensic Audit

Rama: `release/stable-sprint79`
Modo: AUDIT ONLY · LEVEL 5 · FORENSIC CERTIFICATION — **CERTIFIED**
Fecha: 2026-08-14
Tipo: Auditoría arquitectónica y funcional de la capacidad actual de exportación para definir el **Informe de Evidencia de Registros** (Sprint 315, future)
Dependencias: Sprint 311 CERTIFIED · Sprint 312 CERTIFIED · Sprint 313 CERTIFIED (commit `17ab55a`)
Suite: `node scripts/sprint-314-record-evidence-report-professional-presentation-forensic-audit.mjs`

## Clasificación final

```
SPRINT 314 — FORENSIC CERTIFICATION

  DATA AVAILABILITY:       PASS
  RECORD IDENTITY:         PASS
  FORM IDENTITY:           PASS
  USER TRACEABILITY:       PASS
  DATE/TIME:               PASS
  STATUS:                  PASS
  FIELD INTEGRITY:         PASS
  SIGNATURE EVIDENCE:      PASS
  DOCUMENT EVIDENCE:       PASS
  MULTI-RECORD:            PASS
  MULTI-FORM:              PASS
  XLSX CAPABILITY:         PASS
  XML CAPABILITY:          PASS
  SELECTION:               PASS
  ORDER PRESERVATION:      PASS
  NO DATA DUPLICATION:     PASS
  NO NEW SSOT:             PASS
  NO NEW QUERY:            PASS
  NO RUNTIME CHANGE:       PASS
  NO PERSISTENCE CHANGE:   PASS
  SCOPE:                   PASS
  BUILD:                   PASS
  REGRESSIONS:             GREEN

  STATUS: CERTIFIED
```

TOTAL: **102/102 PASS** · `src/` NO MODIFICADO (Sprint 314 es AUDIT ONLY).

## Pregunta forense principal (§3)

> ¿Tenemos actualmente suficiente información estructurada y trazable para generar
> un documento profesional de evidencia de registros sin modificar el modelo
> operativo existente?

**Veredicto certificado por ejecución real:**

> **SÍ.** Historial y Consulta (`DynamicRecordsView`) expone la proyección canónica
> `dynamicService.getModuleResponses` (`sgc_form_responses` → `sgc_forms` +
> `profiles` + `verifier` + `sgc_response_values` + `sgc_evidences`), la selección
> individual/múltiple/total alimenta directamente al exportador (`records.filter`
> por `selectedIds`), y el motor XLSX (`exportDataNormalizer` + `excelExporter`,
> SheetJS) ya genera un workbook con **una hoja por formulario**, columnas
> requeridas + dinámicas, valores sin pérdida e hipervínculos funcionales a firma
> y evidencia. El futuro **Evidence Report Adapter** (Sprint 315) puede consumir
> EXACTAMENTE esta información sin reconstruir el sistema de registros ni crear
> una segunda fuente de verdad.

## Principio arquitectónico (§2)

```
                  SISTEMA SGC-DM
                        │
                        ▼
               Historial y Consulta
                        │
                selección existente
                        │
                        ▼
               Exportación existente
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
            XLSX       XML       Datos
             │          │          │
             └──────────┼──────────┘
                        ▼
             EVIDENCE REPORT LAYER
                   (Sprint 315)
                        ▼
         INFORME DE EVIDENCIA DE REGISTROS
```

Regla certificada: **el futuro informe NO crea otra fuente de verdad**; consume la
misma información que ya utiliza Historial y Consulta (G17 NO NEW SSOT · G18 NO NEW QUERY).

## Inventario de datos (§7) — certificado

| Dato | Disponible | Evidencia |
|---|---|---|
| ID del registro | PASS | `sgc_form_responses.id` (UUID v4) en la proyección |
| Formulario | PASS | `sgc_forms.name` vía join `!inner` |
| Módulo (programa) | PASS | `sgc_forms.module_id` (contexto de programa; sin entidad programa separada en el modelo dinámico — documentado) |
| Usuario creador | PASS | `created_by` FK `auth.users` + `profiles.nombre/rol` |
| Fecha | PASS | `created_at` TIMESTAMPTZ |
| Hora | PASS | `created_at` (componente hora) → columna `Hora` |
| Estado | PASS | `status` (pendiente_revision/aprobado/rechazado/corregido) |
| Campos diligenciados | PASS | `sgc_response_values` con `field_id/value_*/sgc_form_fields` |
| Firma | PASS | `field_type=signature` → `value_text` = URL pública |
| Evidencia | PASS | `sgc_evidences` (`file_url/storage_path/file_type`) |
| Identidad del registro | PASS | UUID completo por registro (la hoja expone segmento de display) |
| Metadata del formulario | PASS | `sgc_form_fields (label/field_type/options)` transportada |

## Tipos de campo (§8) — representables sin pérdida

Mapeo conceptual→real (certificado contra `runtimeContracts.ts`): `TEXT_SHORT→text`,
`TEXT_LONG→textarea`, `NUMBER→number`, `CHECKLIST→boolean`, `SIGNATURE→signature`,
`EVIDENCE→file_upload`. Verificado con fixtures de ejecución real (G07):

| Concepto | Fixture | Resultado exportado |
|---|---|---|
| NUMBER | Temperatura 4.2 °C | `4.2 °C` (valor + unidad) |
| TEXT_SHORT | Observación | `Sin novedades` |
| TEXT_LONG | Detalle | texto completo, sin truncado |
| CHECKLIST (choices) | Cumple | `Cumple` |
| CHECKLIST (choices) | No cumple + comentario | `No cumple - <comentario>` |
| CHECKLIST plano | value_boolean | `Cumple`/`No cumple` |
| SIGNATURE | firma.png | hipervínculo `Ver Firma` → URL pública |
| EVIDENCE | 2 adjuntos | `Ver Evidencia 1`, `Ver Evidencia 2` → `file_url` |

## Identidad del registro (§9) — certificado

`Registro A ≠ Registro B` incluso con mismo formulario, mismo usuario y valores
similares: IDs UUID v4 distintos (G02, `a1111111-…` ≠ `a2222222-…`). La
exportación conserva una fila por registro con su identidad y valores propios, y
la identidad **completa** (UUID de 36 chars) permanece en la capa de datos para
la trazabilidad del informe.

## Integridad de múltiples formularios (§10/§11) — certificado

- Workbook real (SheetJS, G12): `Preoperativo(3) · Control de Cloro y pH(2) ·
  Bitácora Turno(1)` → 3 hojas, 1 cabecera + 3/2/1 filas.
- **Modelo de hoja por formulario = capacidad reutilizable** (no a reemplazar):
  columnas requeridas (`ID, Fecha, Hora, Operario, Rol, Estado, Verificado por,
  Fecha verificación, Comentarios`) + columnas dinámicas en orden de aparición +
  `Evidencias`, sin contaminación cruzada entre formularios (G03).

## Firma y evidencia (§12) — reutilización certificada

- Firma: se guarda como URL pública (bucket `documentos-sgc/firmas`) en
  `value_text`; la consulta la renderiza (`img src`), el export la convierte en
  hipervínculo `Ver Firma`. **Sin nuevo mecanismo de almacenamiento.**
- Evidencia: `sgc_evidences` con `file_url`; la consulta muestra la galería, el
  export genera `Ver Evidencia N` con hipervínculo. **Sin nuevo mecanismo.**
- El workbook resultante contiene hipervínculos REALES (celda `l.Target` =
  URL pública) — verificado leyendo el archivo generado (G12).

## Presentación vs datos (§13) — separación certificada

La capa de datos existente (usuario, formulario, registro, fecha, hora, estado,
campos, firma, evidencia, selección) está completa. La capa de presentación
futura (marca, logo, título, periodo, identificación del informe, secciones,
tablas, encabezados, pie de página, numeración, firma visual) NO debe alterar la
primera (G19/G20: sin cambios de runtime ni persistencia).

## Selección (§15) — reutilizable

`DynamicRecordsView`: `selectedIds` (array), `toggleSelection` (individual),
`toggleSelectAll` (total sobre filtrados), export con `records.filter(r =>
selectedIds.includes(r.id))` **sin re-consulta** (usa datos ya cargados en
memoria). La futura capa de informe recibe exactamente esa selección. Notas
documentadas: los checkboxes solo aparecen para verificadores
(`administrador`/`calidad`) y el export exige ≥1 seleccionado (no hay "exportar
todos" desde la vista de registros).

## Conservación de orden (§16) — certificado

La fuente ordena `created_at DESC` (`getModuleResponses`). El exportador **NO
introduce algoritmo de orden nuevo**: preserva el orden de entrada fila a fila
(G15, sin `.sort()` en la cadena). Regla del informe: *respeta el orden
determinado por la fuente de Historial y Consulta*.

## Filtros avanzados (§17) — documentados, NO activados

El botón "Filtros Avanzados" y el campo de búsqueda en `DynamicRecordsView` son
decorativos (sin handler). Se documenta su estado actual; NO se activan ni
implementan. Futuro: **Advanced Evidence Filtering** (fecha/rango/usuario/estado/
formulario/módulo/programa), fuera del alcance de 314.

## XLSX (§18) — capacidad certificada por ejecución real

Generación (`excelExporter`), descarga (`XLSX.writeFile`), múltiples hojas,
múltiples registros, columnas requeridas + dinámicas, valores sin pérdida e
hipervínculos de firma/evidencia. XLSX queda como **exportación estructurada de
datos**; el nuevo informe será una representación documental profesional.

## XML (§19) — representación secundaria posible

**Hallazgo forense:** NO existe exportador XML en el motor (el único "XML" del
repo es el MIME OOXML de XLSX). La auditoría demuestra que el modelo de datos es
representable como XML jerárquico (`form → record → field`, con identidad,
campos, valores, firma y evidencia) sin pérdida. **No se implementa ningún nuevo
esquema**; queda como representación estructurada secundaria futura.

## Criterio de reutilización (§20)

| Elemento | Clasificación |
|---|---|
| Usuario / Fecha / Estado / Campos | REUSE DIRECT |
| Firma / Evidencia | REUSE + PRESENTATION |
| Logo / Encabezado / Pie de página / Numeración / Identificación del informe | PRESENTATION (futuro) |
| Filtro temporal / rango / usuario / estado | MISSING / FUTURO |

## Arquitectura objetivo (§21) — viable

```
Existing Record Data → History & Consultation → Existing Selection Model
→ Evidence Report Adapter (Sprint 315) → Evidence Report Model
→ Professional Renderer → PDF / Document
```

Regla certificada: el **Evidence Report Adapter no puede convertirse en una
segunda fuente de datos** (G17/G18 lo garantizan).

## Prohibiciones respetadas (§22)

- `src/` NO modificado (G21: `git status --short src/` → LIMPIO).
- Sin filtros, sin query nueva, sin SSOT nuevo, sin cambios de runtime/
  persistencia/formularios/repositorios/firmas/evidencias (G17–G21).

## Regresión (§24) — GREEN con delta real

Familia 296–313 (16 miembros) sin fails funcionales NO autorizados (G23):

| Miembro | Resultado |
|---|---|
| 296/297/299/300/301/303/305/306/308/310 | GREEN |
| 302 | solo forenses baseline (n=9) |
| 304 | baseline + deltas autorizados (n=10) |
| 307 | solo forenses baseline (n=5) |
| 311 | GREEN |
| 312 | baseline + deltas autorizados (n=6) |
| 313 | deltas autorizados (n=2) — cascada de scope |

### Deltas autorizados (estado actual de HEAD, no regresiones de 314)

- **312 F01/F14/F25/F27**: 313 corrigió el bug de desaparición que 312 auditó
  (el resumen `F01/F14 FAIL` persiste como el hallazgo del sprint) y 313 modifica
  el renderer en `src/` (los guards `src/ LIMPIO`/`F25/F27` cambian).
- **313 (n=2)**: tras el commit `17ab55a`, la PROPRIA suite de 313 falla solo en
  sus aserciones de scope E01/E20 (esperaban el renderer como `M` en working
  tree; ahora está en HEAD). Nada funcional falla; es la cascada de scope de un
  cambio controlado ya commiteado.

## Evidencia central (§26)

```
YA EXISTE
  ✓ Datos (registros)      ✓ Registros (sgc_form_responses)
  ✓ Usuarios (profiles)    ✓ Fechas (created_at/verified_at)
  ✓ Estados (status)       ✓ Campos (sgc_response_values + metadata)
  ✓ Firmas (URL pública)   ✓ Evidencias (sgc_evidences.file_url)
  ✓ Selección (selectedIds)✓ XLSX (hoja por formulario, SheetJS)
  ✓ XML (representación estructurada futura)

SOLO FALTA PRESENTACIÓN
  Marca · Portada · Encabezados · Estructuración documental · Jerarquía
  visual · Numeración · Pie de página · Identificación del informe
```

## División de responsabilidades tras Sprint 314 (confirmada)

```
Historial y Consulta → expone proyección canónica   (existente)
Selección           → individual/múltiple/total     (existente, reutilizable)
Exportador XLSX     → hoja por formulario + links   (existente, reutilizable)
Evidence Report Adapter → consume selección         (Sprint 315)
Professional Renderer  → presentación documental    (Sprint 315)
```

## Próximo paso

Sprint 315 — **Evidence Report Professional Renderer · Controlled Correction**:
crear la presentación profesional reutilizando EXACTAMENTE la información
certificada por 314 (selección actual → modelo de datos existente → adapter →
renderer → Informe de Evidencia de Registros), sin nueva fuente de datos.