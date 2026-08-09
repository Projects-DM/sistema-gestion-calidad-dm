# Sprint 263 — Alert Configuration Metadata Round-Trip Preservation

> Nivel 5 · Arquitectura e Implementación · Configuration Pipeline Hardening
> Estado: IMPLEMENTADO · Validado

## Tipo
Implementación · Configuration / Metadata Pipeline
Dependencia: Sprint 262 (ROOT CAUSE CERTIFIED)

## 1. Resumen

Sprint 262 certificó que el round-trip del editor de alertas perdía
irreversiblemente `name`, `description`, `startDate` y `startTime` (16/16 FAIL
en `audit-262-b`). La causa: `AlertConfigurationApplicationService#loadCollection`
reconstruía los borradores del editor desde el **Value Object canónico**
(`resolveResourceAlertCollection` → `createAlertConfiguration`, 9 campos), que
descarta la metadata de presentación. Al re-guardar, los campos vacíos se
persistían sobre los valores originales y la tarjeta de monitoreo degradaba a
«Alerta · Próxima ejecución: —».

Sprint 263 corrige **la fuente**: el loader del editor ahora reconcilia los
borradores desde un **Metadata Envelope por índice** que transporta la
configuración operativa (VO, intacto) **junto a** la metadata de presentación.
El editor puede cargar → editar → guardar una colección **[A,B,C]** sin destruir
identidad ni metadata individual.

## 2. Decisión de estrategia (DEC-263 · §2)

| Estrategia | ¿Compativa? | Decisión |
|-----------|-------------|----------|
| B — VO extendido | ❌ | `AlertConfiguration` es un Value Object **inmutable con exactamente 9 campos** (`CONFIGURATION_KEYS`) y `isAlertConfiguration`/`assertAlertConfiguration` exigen exactamente ese contrato. **Runtime** (`resolveResourceAlert`, `useAlertRuntime`), **Enrollment** y **Ocurrencia** (`OccurrenceProjection`) dependen de él. Contaminarlo con campos de presentación rompería la identidad certificada. |
| A — Metadata Envelope | ✅ | El VO queda **intacto** como SSOT operativo; la metadata de presentación viaja como envelope hermano por índice. El editor obtiene `{...configuration, ...metadata}` para el FormState. Compatible con Sprints 261 y 257. |

**Elegido: Estrategia A — Metadata Envelope.**

## 3. DEC-263 — Trazado

| DEC | Regla | Estado |
|-----|-------|--------|
| DEC-263-01 | No tocar `occurrence/**` | ✅ intacto |
| DEC-263-02 | No tocar `useAlertRuntime` | ✅ intacto |
| DEC-263-03 | No tocar Enrollment | ✅ intacto |
| DEC-263-04 | No tocar `AlertMonitoringExperience` | ✅ intacto |
| DEC-263-05 | No tocar `Scheduler` / `OccurrenceSchedule` | ✅ intacto |
| DEC-263-06 | No crear un segundo mecanismo de persistencia | ✅ reusa `saveCollection` |
| DEC-263-07 | Editor conserva metadata pese a cambiar solo `priority/enabled` | ✅ (test CASE 2) |
| DEC-263-08 | Nueva alerta conserva defaults temporales Sprint 259 | ✅ (no modificado) |
| DEC-263-09 | Borrado voluntario persiste vacío (sin imponer HOY/AHORA) | ✅ (test CASE 4) |
| DEC-263-10 | Abrir y guardar sin modificar no pierde información | ✅ (test CASE 1) |
| DEC-263-11 | Colección [A,B,C] conserva identidad y metadata individual | ✅ (test CASE 6) |
| DEC-263-12 | NO usar `alertConfigurations[0]` como preservación | ✅ envelope por índice |

## 4. Cambios implementados

| Archivo | Cambio |
|---------|--------|
| `AlertConfigurationResolver.js` | **+`resolveResourceAlertEnvelope(resource)`** — accessor read-only y aditivo. Reconcilia la colección resuelta con el raw persistido y devuelve por índice `{ index, alertId, configuration (VO), metadata }`, donde `metadata = { name, description, startDate, startTime, timezone }` (PRESENTATION_KEYS). Nunca modifica `resolveResourceAlertConfiguration`/`resolveResourceAlertCollection`; alertId determinístico por índice (`alertConfigIdOf`), nunca global ni `[0]`. |
| `AlertConfigurationMapper.js` | **+`timezone`** en `mapMetadataToFormState` y `mapFormStateToMetadata` (redondeo simétrico), reusa el per-item mapper ya preparado para leer/volcar metadata. |
| `AlertConfigurationApplicationService.js` | **`loadCollection(resource)`** usa `resolveResourceAlertEnvelope`: `formStates = mapCollectionToFormStates(items.map(({configuration, metadata}) => ({...configuration, ...metadata})))`. El editor reb e borradores completos (config + metadata) en lugar del VO pelado. Devuelve además `items[]` por índice. |
| `index.js` | Exporta `resolveResourceAlertEnvelope`. |

NO se modifican: `AlertConfiguration.js` (VO 9 keys), `ExplicitEnrollmentValidator.js` (excepto cambios Sprint 261 pendientes), `useAlertRuntime.js`, `occurrence/**`, UI.

## 5. Round-trip validado (fixture)

`C:\Users\USUARIO\AppData\Local\Temp\opencode\roundtrip-263.mjs` — 46/46 PASS:

| CASO | Escenario | Resultado |
|------|-----------|-----------|
| 1 | persist → load → map → save-reload, sin cambios (A,B) | A→A, B→B; name/desc/startDate/startTime/timezone intactos; re-save válido |
| 2 | Solo `B.priority` (alta→media) | B.metadata intacto; A intacta |
| 3 | Solo `B.name` | A intacta, B.editada, C intacta |
| 4 | Borrado deliberado `name/date/time` | Persiste `''` (NO re-impone defaults) |
| 5/6 | Tres alertas A/B/C, edit B, save→reload | A→A, B→B', C→C (nunca blanco/duplicado) |
| 261 | `resolveResourceAlertConfigurations` | 3 configs, alertId `:0/:1/:2` estables |
| 261 | `evaluateAlertEnrollments` | 3 items enrolled |
| single | Un solo config legacy | name preservado |
| UI | `service.loadCollection` | 3 formStates con names A/B/C |
| FPE | `service.saveCollection` (port P) | `{alertConfigurations:[...]}` con name/fechas |

## 6. Compatibilidad

- **Sprint 257**: `occurrence/**` **INTACTO** (DEC-263-01/14). `OccurrenceProjection`,
  `OccurrenceSchedule`, `OccurrenceLifecycle`, `OccurrenceLedger` sin cambios;
  `occurrenceId` de contrato intacto.
- **Sprint 261**: el resolver multi (`resolveResourceAlertConfigurations`) sigue
  devolviendo A/B/C con `alertId :0/:1/:2`, y `evaluateAlertEnrollments` produce A/B/C
  enrolled (validado). La corrección no toca Enrollment.
- **Sprint 259**: `activeKey === null` como estado inicial del editor (NEW ALERT
  MODE) se mantiene; defaults temporales HOY/AHORA solo al entrar en nuevo modo.
- **Sprint 262**: el round-trip defectuoso está cerrado (root causa en la fuente,
  no en el componente de monitoreo).

## 7. Acceptance Criteria

AC-01..04 name/description/startDate/startTime sobreviven el round-trip — ✅
AC-05 timezone sobrevive si existe — ✅ (nuevo campo simétrico del mapper)
AC-06 A y B metadata independiente — ✅ ; AC-07 tres alertas — ✅
AC-08 cambiar configuración no borra metadata — ✅ ; AC-09 cambiar metadata no
afecta otras — ✅ ; AC-10 borrar persiste vacío — ✅
AC-11 defaults Sprint 259 se conservan — ✅ ; AC-12 `activeKey === null` — ✅
AC-13 Sprint 261 multi-enrollment — ✅ ; AC-14 Sprint 257 intacto — ✅
AC-15 `alertId` estable/determinístico — ✅
AC-16 `occurrenceId` de contrato — ✅
AC-17 UI recibe metadata completa — ✅ (test UI)
AC-18/19 próxima ejecución y tiempo restante con anchor válido — resolvable
  (la proyección `projectConfigCards` suma el anchor del `raw`); el fallback
  «Alerta» deja de activarse con metadata válida (AC-20).

## 8. Regression Gate

- `npm run build` → OK.
- `npm run lint` → sin errores nuevos en archivos modificados
  (los errores listados son pre-existentes en la base).
- Fixture round-trip → 46/46 PASS.

## 9. Próximo paso (no implementado aquí)

- Ninguno de corrección requerido. El comportamiento de monitoreo debe verificar
  visualmente que las tarjetas muestran name/frecuencia/ancla desde ahora; si se
  detecta alguna regresión de la proyección de fecha, vivirá en la capa de
  lectura de `raw`, fuera del alcance de Metadata Round-Trip.

## 10. Archivos revisados/afectados

- `src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js`
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js`
- `src/core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js`
- `src/core/capabilities/alert/operational-configuration/index.js`