# Sprint 261 — Resolución y Enrollment Multi-Config en el Runtime de Alertas

> Nivel 5 · Runtime · Implementación · Cierre de la brecha identificada en Sprint 260

## Tipo
Implementación · Runtime

**Impacto:** corrige el punto de colapso de la capa **Runtime / Enrollment**
identificado en el Sprint 260 (IDENTITY-BOUNDARY-AUDIT). No modifica el dominio de
configuración, la proyección de ocurrencias (Sprint 257), el Alert Engine, los
schedulers, los providers ni la arquitectura operacional certificada. Cambio
aditivo y retrocompatible.

---

## 1. Resumen

El Sprint 260 (AUDIT) certificó que la **identidad** de una segunda alerta en un mismo
recurso se mantiene íntegra en todo el pipeline de dominio (config → feed →
projection → collector), y localizó el colapso en la **capa RUN/ENROLLMENT**:

- `extractResourceAlertMetadata` expone **solo** `raw.alertConfigurations[0]`
  (colapso a la PRIMERA configuración del recurso).
- El Runtime bindea **1 contexto por recurso**, no por configuración ⇒ la
  segunda alerta nunca entra en rules/rulesSet/dashboard (no existe config B en
  el runtime).

El Sprint 261 implementa la **Resolución Multi-ALERT en el Runtime** preservando el
contrato single-configuration y la política de Enrollment Explícito (Sprint 211,
E1–E4) evaluada **por cada** configuración de la colección.

## 2. Contrato de identidad (DEC-261-01/06, §9)

Una alerta se identifica por `identidad de recurso + identidad de configuración`,
nunca por resourceId solo:

```
  alertId      = "<resourceId>:alert:<index>"
  occurrenceId = occurrenceIdOf(alertId, sequence)   (dominio de ocurrencia, Sprint 257)
```

| Config | alertId | Antes | Ahora |
|--------|----------------------------------|--------------------------|--------------------------|
| A (idx 0) | `form:1:alert:0` | única visible | ✅ |
| B (idx 1) | `form:1:alert:1` | ❌ colapsada (`[0]`) | ✅ |
| C (idx 2) | `form:1:alert:2` | ❌ colapsada (`[0]`) | ✅ |

## 3. Cambios implementados (aditivos, sin romper)

| Archivo | Cambio |
|--------|--------|
| `AlertConfigurationResolver.js` | +`resolveResourceAlertConfigurations` (devuelve TODAS las configs como Value Objects inmutables, cada una con `index` + `alertId`); +`alertConfigIdOf` (identidad determinística). El API single `resolveResourceAlertConfiguration` queda documentado como contrato SOLO-single. |
| `ExplicitEnrollmentValidator.js` | +`evaluateAlertEnrollments` (E1–E4 **por** configuración; item con `index`, `alertId`, `enrolled`, `reasons`, `configuration`; recurso nunca configurado → lista vacía). `evaluateAlertEnrollment` refactorizado para delegar en el multi (retrocompatible). Se eliminó código muerto. |
| `operational-configuration/index.js` | Re-exporta `resolveResourceAlertConfigurations`, `alertConfigIdOf`, `evaluateAlertEnrollments`. |
| `src/hooks/useAlertRuntime.js` | `deriveRulesFromBinding` consume `evaluateAlertEnrollments` → **una regla por configuración enrolled**, cada regla con su `alertId`. El caso single (1 alerta) produce 1 regla exactamente (comportamiento histórico). |

No se toca el dominio de ocurrencia: `OccurrenceProjection` ya iteraba por
colección; el Runtime ahora entrega el `alertId` por configuración alineado con
`occurrenceIdOf(alertId, sequence)`.

## 4. Reglas de Enrollment (Sprint 211, preservadas por item)

```
E1  Existe configuración (el item existe en la colección).
E2  Fue creada EXPLICITAMENTE (metadata persistida no vacía).
E3  Está HABILITADA  (enabled === true, decisión delegada al Resolver via shouldProduceAlert).
E4  Es una configuración VÁLIDA (objeto).

RECURSO
  ├── A (explicita + habilitada)     → enrolled  (una regla, alertId :0)
  └── B (explicita + deshabilitada) → NO enrolled (solo A consume runtime)
```

No se fabrica ninguna alerta implícita: un recurso nunca configurado produce una
lista **vacia** (`enrolled: false`, sin items).

## 5. Compatibilidad (retrocompatible)

- Recurso con `alertConfiguration` (única) → 1 unim (AC-01/AC-13), idéntico al
  comportamiento histórico de `evaluateAlertEnrollment`.
- Recurso con `alertConfigurations[]` → 1 enrollment por config con explicit EN
  enabled.
- `ENROLLMENT_REASONS` existentes preservados: `no-alert-config`,
  `empty-config`, `invalid-config`, `disabled`.

## 6. Verificación (ejecución aislada)

```js
const r = { id: 'form-1', alertConfiguration: { alertConfigurations: [
  { enabled: true,  priority: 'alta' },
  { enabled: false, priority: 'baja' },
  { enabled: true,  priority: 'media' },
] } };

resolveResourceAlertConfigurations(r).configurations.map(c => c.alertId)
// ['form-1:alert:0', 'form-1:alert:1', 'form-1:alert:2']

evaluateAlertEnrollments(r).items
// [{enrolled:true},{enrolled:false},{enrolled:true}]  → overall: true
```

- B (deshabilitada) no genera regla; A y C sí. Sin colapso, sin duplicación.

## 7. Guardrails

- **Lint:** los 4 archivos modificados pasan `eslint` sin errores nuevos (el único
  warning restante es preexistente: `react-hooks/exhaustive-deps`).
- No se modificó dominio de ocurrencia, motores, providers ni la arquitectura
  certificada previa (Sprint 257).

---

Sprint 261 cierra la brecha de Sprint 260: la segunda (y N-ésima) alerta de un mismo
recurso **ahora es transportada por el Runtime** con su propia identidad
(`<resourceId>:alert:<index>`), y cada consumidor descendente las procesa sin
colisión con la primera.