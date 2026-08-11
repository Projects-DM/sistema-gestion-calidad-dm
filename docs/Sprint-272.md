# Sprint 272 — Auditoría Forense: Causa Raíz de la Configuración Dinámica de Alertas

**Branch:** `release/stable-sprint79`
**Modo:** AUDIT ONLY (sin cambios de código) · **evidencia en BD real + read-path certificado**
**SSOT:** este documento (`docs/Sprint-272.md`)
**Dependencias:** Spr 271 (write-path certificado, no reabrir) · Spr 270 (persistencia de capabilities, no reabrir) · Spr 211 (enrollment) · 261 (multi-alert) · 263 (envelope)

Gas de cierre: **SPRINT 272 — AUDITORÍA COMPLETA** · Código: **0 cambios** · `.mjs`: **4 diagnósticos (no producción)**

---

## 1. Mandato (SSOT)

> **Determinar la causa raíz REAL por la que la configuración de alertas creada dentro
> de módulos dinámicos (formularios/repositorios del módulo) no persiste o no se visualiza
> en runtime — mediante auditoría exclusivamente de solo lectura. Sin tocar código.**

Restricciones duras (baselines certificados que NO se reabren):
- **Sprint 271** ya eliminó el write-path silencioso (throw determinístico) y quedó certificado.
- **Sprint 270** ya restauró la persistencia/asignación de capabilities, certificado.

Sprint 272 solo diagnostica, correlaciona y recomienda. No corrige.

---

## 2. Contexto certificado (reutilizado de Spr 271)

```
AlertConfigurationPanel (UI)
      ↓ saveCollection({ resource, formStates })
AlertConfigurationApplicationService.saveCollection
      ↓ port.saveConfiguration(resource, { alertConfigurations })
AlertConfigurationPersistenceAdapter.saveConfiguration
      ↓ resolveResourceHandler(reference)   (FORM_HANDLER | REPOSITORY_HANDLER)
      ↓ handler.write(reference, { alertConfigurations })
dynamicService.updateForm | documentRepositoriesService.updateRepository
```

Lectura (runtime / enrollment / panel de edición):
```
AlertConfigurationResolver
      ↓ extractResourceAlertCollection / extractResourceAlertMetadata
        (único lector autorizado de `alert_config` / `alertConfiguration`)
      ↓ normalizeAlertConfiguration → createAlertConfiguration (VO inmutable)
      ↓ resolveResourceAlertCollection / resolveResourceAlertEnvelope
ExplicitEnrollmentValidator.evaluateAlertEnrollments   (E1–E4)
```

---

## 3. Preguntas que debía responder la auditoría (Q-A…Q-F)

| ID | Pregunta | Respuesta | Evidencia |
|---|---|---|---|
| Q-A | ¿Existen recursos con alertas configuradas en la BD hoy? | Sí, 1: form `asdasd` (módulo `sadsad`) | Part 1: 1/2 forms con config |
| Q-B | ¿El form `asdasd` se certifica end-to-end (write → read → enrollment)? | Sí | Part 3: `metadata`, colección 1, enrolled |
| Q-C | ¿`weew` (form del módulo `ertre`) tiene config? | No — `alert_config={}` (objeto vacío) | Part 1/2/3 |
| Q-D | ¿Por qué hay módulos dinámicos con form pero sin config? | Capability `operational-experiences` ausente en `ertre`; `{}` no se enrola (E2) | Part 2/3 |
| Q-E | ¿El read-path distingue `{}` de una config real? | Sí — `enrolled:false` reason `empty-config` | Part 3 + ExplicitEnrollmentValidator E2 |
| Q-F | ¿Qué módulos SÍ podrían mostrar alertas hoy? | `sadsad`/`zxc` (tienen `alert-monitoring` en `enabledExperiences`) | Part 2 |

---

## 4. Evidencia forense — Part 1 (estado de la BD real)

Script: `scripts/forensic_sprint272.mjs` (solo lectura). Proyecto Supabase real `ruzomcnxsnhlfqlefsrc`.

```
MODULES (5)                     FORMS (2)                          REPOSITORIES (0)
  configuracion        operational   [noconfig] weew   alert_config={}
  limpieza-desinfeccion draft        [CONFIG]  asdasd  alert_config={alertConfigurations}
  ertre                draft
  sadsad               configurable
  zxc                  configurable
→ forms WITH alert config: 1/2   ·   repos WITH config: 0/0
```

**Lectura clave:** los 4 módulos creados dinámicamente (draft/configurable) usan el contrato
"Nuevo módulo"; **2 de ellos NO tienen ningún form** (`limpieza-desinfeccion`, `zxc`, `configuracion`).
Solo `ertre` y `sadsad` tienen forms.

---

## 5. Evidencia forense — Part 2 (correlación módulo → form → capabilities)

Script: `scripts/forensic_sprint272_part2.mjs` (solo lectura).

| Módulo | state | capabilities | operational-exp. | form | alert_config |
|---|---|---|---|---|---|
| `configuracion` | operational | *(vacío)* | ✗ | 0 | — |
| `limpieza-desinfeccion` | draft | forms, records | ✗ | 0 | — |
| `ertre` | draft | *(vacío)* | ✗ | 1 (`weew`) | `{}` |
| `sadsad` | configurable | forms, records, repository, operational-experiences | ✓ `[…, "alert-monitoring"]` | 1 (`asdasd`) | `{alertConfigurations}` |
| `zxc` | configurable | forms, records, repository, operational-experiences | ✓ `[…, "alert-monitoring"]` | 0 | — |

**Lectura clave (contrato de binding por capability):**
- `ertre`: capability `operational-experiences` **ausente** ⇒ la pestaña/tab de Experiencias
  Operacionales no se monta (CapabilityPublicSet.getTabs filtra `uiRole==='tab'`), y aunque el
  form tuviera config, el **Runtime del módulo no expone la experiencia Alertas**.
- `sadsad`/`zxc`: capability presente con `alert-monitoring` en `enabledExperiences` ⇒ el módulo
  SÍ monta `OperationalExperiencesContent` → `AlertMonitoringExperience`.

---

## 6. Evidencia forense — Part 3 (certificación del READ-PATH real)

Script: `scripts/forensic_sprint272_part3.mjs` (solo lectura) + runner `scripts/run_forensic_sprint272_part3.mjs`
(SSR de Vite para `import.meta.env`).

```
FORM asdasd   (módulo sadsad — capability alert-monitoring PRESENTE)
  alert_config raw: {"alertConfigurations":[{name:"Alerta Test Formulario", …enabled:true…}]}
  extractResourceAlertCollection          → array(1)
  resolveResourceAlertCollection.source:  metadata | collection: 1
  resolveResourceAlertEnvelope.source:    metadata | items: 1
  enrollments.enrolled: true | reasons: []
  ⇒ READ-PATH: certificado — config persistida se lee y se enrola.

FORM weew   (módulo ertre — capability alert-monitoring AUSENTE)
  alert_config raw: {}          ← objeto vacío (no null), NO escrito por el usuario
  extractResourceAlertCollection          → array(1)   [{}  envuelto como single]
  resolveResourceAlertCollection.source:  metadata | collection: 1   ← source=metadata con {} es AMBIGUO
  resolveResourceAlertEnvelope.source:    metadata | items: 1
  enrollments.enrolled: false | reasons: ["empty-config"]   ← E2 rechaza {} correctamente

COLUMN alert_config DEFAULT: no consultable vía information_schema (sin permiso publishable key).
  Nota: {} en la fila ≠ default de columna verificado; escribe {"alertConfigurations":[…]}, por lo
  que {} proviene de un INSERT/UPDATE que dejó el objeto vacío (nunca configurado).
```

**Lectura clave:** el read-path es CORRECTO y determinístico — `{}` nunca fabrica una alerta
(E2 en ExplicitEnrollmentValidator:100-103). La divergencia no está en el read-path.

---

## 7. Matriz de verdad UI → BD → Runtime (Síntesis)

| # | Escenario | Database `alert_config` | Resolver source | Enrollment | Tab Experiencias en módulo | Resultado observable |
|---|---|---|---|---|---|---|
| 1 | Config real escrita (asdasd/sadsad) | `{alertConfigurations:[…]}` | metadata | **enrolled** | habilitado (`alert-monitoring`) | **CORRECTO — se visualiza** |
| 2 | Módulo sin capability exp. (weew/ertre) | `{}` o config | metadata/default | no (empty-config si `{}`) | **no montado** | **NO se ve (sin capability)** |
| 3 | Módulo con capability pero SIN escribir | `{}` | metadata (ambiguo) / default | no | habilitado pero vacío | NO se ve (enrollment correcto) |
| 4 | Repositorios | — (0 filas) | — | — | — | No aplicable hoy (0 repos en DB) |

---

## 8. Causa raíz — conclusión (ESTA ES LA RESPUESTA DEL MANDATO)

> **La escritura y la lectura de la configuración de alertas son CORRECTAS y ya no pueden
> fail-silent (Spr 271) ni producir enrollment fantasma (Spr 211/261/263). La causa raíz de
> que la alerta "no aparezca" en un módulo dinámico es el CONTRATO DE BINDING DE LA CAPABILITY
> `operational-experiences`: si el módulo no tiene esa capability, o la experience `alert-monitoring`
> no está en su `enabledExperiences`, el Runtime del módulo NO monta la experiencia Alertas —
> con independencia de que `alert_config` sí se haya persistido.**

Evidencia de apoyo:
1. `asdasd` (config real en módulo CON `alert-monitoring`) → enrolled ✓, resolución completa.
2. `weew` (form sin config real + módulo SIN capability) → `{}`, rejected → correcto, no fantasma.
3. La divergencia visible: los módulos del contrato "Nuevo módulo" (`draft`) no asignan
   `operational-experiences`; el usuario configura en `Configuration.jsx` (global) pero el
   módulo dinámico ni siquiera tiene la pestaña de experiencias.

---

## 9. Hallazgos (clasificados)

### 9.1 Funcionalidad verificada OK
- **F1** Write-path certificado (Spr 271) — invariante: 271.1 PASS, 271.6/271.7/271.8 PASS.
- **F2** Read-path determinístico — `{}`/`null` nunca producen alerta fantasma (Part 3).
- **F3** Enrollment multi-config correcto (E1–E4 por ítem).
- **F4** Determinismo de identidad `resourceId:alert:index` intacto (alertConfigIdOf).

### 9.2 Observaciones / divergencias (NO son bugs de write/read)
- **O1** `alert_config={}` en weew: objeto vacío en fila — no es default de columna certificado
  (information_schema sin permiso). Indica que jamás se escribió una config para `weew`.
- **O2** Módulos `draft` (`ertre`, `limpieza-desinfeccion`): sin capability
  `operational-experiences` ⇒ sin experiencia de alertas independientemente del estado de la fila.
- **O3** `#{capabilities}` vacío en `configuracion`/`ertre` (Part 2): capability set no asignado —
  coherencia con el hallazgo de Sp 270 (persistencia) cuando el módulo se crea sin asignaciones.

### 9.3 Riesgo de lectura (NUEVO — detectado en esta auditoría)
- **R1** `extractResourceAlertCollection` (resolver:85) envuelve CUALQUIER objeto no-array como
  single: `{}` → `[{}]` (array de 1). `resolveResourceAlertCollection` reporta `source='metadata'`
  para `{}` porque `raw.length` es 1 (líneas 100-105). Aunque enrollment luego rechaza (E2), la
  señal `source=metadata` es AMBIGUA para un recurso nunca configurado. **Recomendación:** tratar
  `{}` como ausente (source `default`, colección vacía) en `extractResourceAlertCollection` /
  `resolveResourceAlertCollection`, sin tocar el contrato de enrollment.

---

## 10. Recomendaciones (para backlog — FUERA del alcance de esta auditoría)

1. **Binding**: en el contrato "Nuevo módulo" (preferiblemente ya en Spr 270/271) asegurar que
   módulos dinámicos con formularios lleven la capability `operational-experiences` y, si aplica,
   `alert-monitoring` en `enabledExperiences`; o documentar que la experiencia es opt-in por módulo.
2. **ResourceId de una sola fuente**: `Configuration.jsx:557-561` pasa el form de
   `getFormsByModule` (incluye `id` y `module_id`) — verificado OK; mantener para repos en
   `DocumentRepositoriesAdmin.jsx:769-787` (incluye `id`).
3. **R1 (ambigüedad `source=metadata` con `{}`)**: normalizar `{}` → `default` en el Resolver.
4. **Verificabilidad de default de columna**: la publishable key no ve `information_schema`; para
   certificar el default de `alert_config` se requiere SQL con service role (fuera de este script).

---

## 11. Acceptance Criteria / Artefactos

| AC | Descripción | Evidencia |
|---|---|---|
| AC-272-01 | Estado real de módulos/forms/repos documentado | Part 1 (corrida fresca §4) |
| AC-272-02 | Correlación módulo→capability→experience documentada | Part 2 (§5) |
| AC-272-03 | Read-path certificado sobre filas reales | Part 3 — asdasd enrolled, weew rejected (§6) |
| AC-272-04 | Causa raíz única y con evidencia | §8 con apoyo en F1–F4 |
| AC-272-05 | CERO cambios de código/UI/contratos/tablas | `git status` — 4 archivos modificados = Spr 271 únicamente, 0 nuevos en src |
| AC-272-06 | Artefactos de diagnóstico aislados (no producción) | `scripts/forensic_sprint272*.mjs` + `run_forensic_sprint272_part3.mjs` |

**Verificación de no-contaminación (pret / post):** `git status --short` confirma que los únicos
archivos modificados en `src/` son los 4 del Sprint 271; los `.mjs` de diagnóstico están sin
trackear (no producción, no se incluyen en build).

---

## 12. Límites arquitectónicos respetados

- **0 cambios** en: Resolver, Enrollment, Mapper, Validation, Port, AppService, Adapter,
  services infra, UI (Panel/Configuration/DocumentRepositoriesAdmin/DynamicModule), runtime,
  engine ni dominio.
- Los `.mjs` de diagnóstico son **read-only** y se ejecutan bajo SSR de Vite solo para resolver
  `import.meta.env`; ninguna es parte del build de producción.

---

## Estado final

```
SPRINT 272 — AUDITORÍA COMPLETA (AUDIT ONLY)
Código: 0 cambios   ·   Diagnósticos: 4 .mjs (no producción)
Causa raíz: binding de capability 'operational-experiences' (no write ni read)
Read-path: certificado (asdasd enrolled · weew rejected)
Hallazgo nuevo: R1 — source=metadata ambiguo para {} (recomendado a backlog)
Siguiente: backlog (R1, binding de módulos draft, verificación default de columna con service role)
```