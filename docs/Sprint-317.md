# Sprint 317 — Advanced Filtering + Record Selection — Controlled Correction

## Objetivo
Implementar **Advanced Filtering** funcional y corregir la **selección de registros**
en `Historial y Consulta` (`DynamicRecordsView.jsx`), reutilizando el motor genérico de
Despachos (`UniversalOperationalRuntime`): **REUSE CORE · ADAPT DATA · DO NOT COPY UI WHOLESALE**.

Entregables:
- `src/shared/filters/filterCore.js` — **Generic Filter Core** (ESM puro, sin estado externo).
- `src/shared/filters/sgcFilterAdapter.js` — **SGC Filter Adapter** (mapea la proyección `getModuleResponses`).
- `src/components/DynamicRecordsView.jsx` — integración local (0 consultas nuevas).
- `scripts/sprint-317-advanced-filtering-record-selection-controlled-correction.mjs` — suite E01–E30.

## Pregunta forense (desde Sprint 316)
> ¿Por qué los operarios no pueden seleccionar registros? ¿Cómo habilitar filtros avanzados sin tocar la capa de datos?

**Respuesta: PARTIAL (corregido en este sprint).**
- Causa raíz selección: **ROLE GUARD + UI GUARD MISAPPLIED**. La columna de checkboxes
  solo se renderiza si `isVerificador` (`rol === 'administrador' || rol === 'calidad'`),
  y cada checkbox tenía `disabled={!canVerifyRecord && rec.status === 'pendiente_revision'}`
  con tooltip "No puedes verificar tus propios registros". El gate de *verificación*
  (legítimo, en el modal) se aplicaba por error al gate de *selección*.
- Filtros de Historial eran **PRESENTATION ONLY**: input de búsqueda sin `value`/`onChange`
  y botón "Filtros Avanzados" sin `onClick`. El único filtro real era el quick filter.

## Decisión de diseño (§6, §7)
- **Generic Filter Core** (`filterCore.js`): `applyFilters(records, toFields, criteria)`.
  Pipeline determinista `quick → search → advanced fields`, implementado con
  `Array.prototype.filter`: **devuelve los mismos objetos y conserva el orden de la fuente**
  (`created_at DESC`). El único `.sort()` es `uniqueSorted` (ordena arreglos derivados de
  opciones, nunca los registros). Puro, sin loops manuales, sin query, sin persistencia.
- **SGC Filter Adapter** (`sgcFilterAdapter.js`): `toFilterable(record)` expone el plano plano:
  `formulario` (`sgc_forms.name`), `usuario` (`profiles.nombre`), `estado` (`status`),
  `fechaKey` (`created_at` local), `verificacion` (`verified_at ? verificado : pendiente`),
  `hallazgo` (`computedStatus`), y `texto` (representación plana para la búsqueda).
- **DynamicRecordsView.jsx**: estado local `searchTerm` / `showFilters` / `filters{}`,
  opciones derivadas del dataset ya cargado (`formularioOptions`, `usuarioOptions`,
  `estadoOptions`, `hallazgoOptions`, `verificacionOptions`) — metadata-driven, sin
  formularios hardcodeados. Panel "Filtros Avanzados" siguiendo el lenguaje visual de
  Despachos/UOR con selects Formulario/Usuario/Estado/Verificación/Hallazgo + rango
  Desde/Hasta y botón "Limpiar filtros". Contador "N registros encontrados · M seleccionados".
- **Selección corregida**: se eliminaron `canVerifyRecord`/`isOwnRecord`/`disabled`/tooltip
  del checkbox. La columna sigue visible solo para verificadores (`isVerificador`), pero
  ahora **CAN_SELECT es independiente de CAN_VERIFY**. La segregación de funciones sigue
  intacta en el modal: `(rol === 'administrador' || rol === 'calidad') && selectedRecord.status === 'pendiente_revision'`
  + mensaje "Por principio de segregación de funciones".

## Archivos autorizados (Scope)
| Archivo | Cambio |
|---|---|
| `src/components/DynamicRecordsView.jsx` | Integración local (filtros + selección) |
| `src/shared/filters/filterCore.js` | Nuevo — Generic Filter Core |
| `src/shared/filters/sgcFilterAdapter.js` | Nuevo — SGC Filter Adapter |
| `scripts/sprint-317-*.mjs` | Suite |
| `docs/Sprint-317.md` | Este documento |

**Prohibidos (sin cambios, verificado por E28):** `dynamicService`, `SupabasePersistenceProvider`,
`runtimeContracts`, `evidenceReportModel`/`evidenceReportRenderer`, `excelExporter`,
`alertVisual` (arquitectura de alertas), almacenamiento de firmas/evidencias, persistencia runtime.

## Gates E01–E30 (139 checks)
- **E01–E13** — Advanced Filtering: dueño, estado, búsqueda, formulario, usuario, estado,
  fecha (desde), rango, verificación, hallazgo, composición, reset, subconjunto (mismos objetos).
- **E14** — Orden preservado (sin `.sort()` sobre registros; único `.sort()` = `uniqueSorted`).
- **E15–E17** — Selección individual, múltiple, y Select All sobre `filteredRecords`.
- **E18** — Contador de resultados vs selección.
- **E19** — **Prueba crítica §28**: registro propio + `pendiente_revision` → `CAN_SELECT=true`;
  `CAN_VERIFY` sigue gobernado por rol + status en el modal (segregación intacta).
- **E20–E21** — XLSX e Informe de Evidencia siguen usando `records.filter(selectedIds)`
  (cadena 315 inalterada) + checks dirigidos de runtime (modelo `EVID-`, normalizador).
- **E22–E23** — Multi-formulario y datos dinámicos (metadata-driven, sin hardcode).
- **E24–E27** — Sin nueva query, sin nuevo SSOT, sin mutación de persistencia, sin pérdida de datos.
- **E28** — Scope (solo archivos autorizados; prohibidos sin cambios).
- **E29** — `npm run build` → `✓ built in 2.52s`.
- **E30** — Runtime regression dirigida (core, adapter, modelo 315, normalizador, prop `moduleName`).

## Resultado
```
Gates: E01..E30   Pasaron: 139   Fallaron: 0   Tiempo: 3.2s
VEREDICTO: CERTIFIED (exit 0)
```

## Clasificación (§34 — 15 condiciones)
| Condición | Gates | Estado |
|---|---|---|
| FILTERS | E01–E13, E23 | PASS |
| INDIVIDUAL SELECTION | E15, E16 | PASS |
| SELECT ALL | E17 | PASS |
| VERIFY ≠ SELECT | E19 | PASS |
| XLSX | E20 | PASS |
| EVIDENCE REPORT | E21 | PASS |
| MULTI-FORM | E22 | PASS |
| ORDER | E14 | PASS |
| NO NEW QUERY | E24 | PASS |
| NO NEW SSOT | E25 | PASS |
| NO PERSISTENCE MUTATION | E26 | PASS |
| NO DATA LOSS | E27 | PASS |
| SCOPE | E28 | PASS |
| BUILD | E29 | PASS |
| RUNTIME | E30 | PASS |

**Regresión histórica familia 296–316: NO ejecutada (por diseño §25).**

## Próximo Sprint
- Considerar extraer el panel de filtros a un componente compartido (si una tercera
  experiencia lo necesita) siguiendo el mismo patrón de adaptadores.