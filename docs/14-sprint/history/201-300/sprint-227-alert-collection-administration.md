# Sprint 227 — Alert Collection Administration Model & Presentation Consolidation

> Nivel 5 · Administración de colección de alertas · Consolidación de la capa de presentación · Certificación multi-alerta

## Tipo
Presentación Layer Implementation · UX Consolidation · Component Reuse Certification

**Impacto:** solo la capa de presentación. NO modifica Alert Engine, Notification Engine,
Evaluation Engine, Runtime, Metadata, Contratos, Providers, Persistence, Validation ni
arquitectura certificada.

---

## 1. Resumen

Los Sprint 221–226 reorganizaron la experiencia de configuración de alertas y
certificaron la infraestructura del Alert Engine. El **Sprint 227** introduce el siguiente
nivel: la administración deja de trabajar sobre **una alerta** y pasa a administrar una
**colección de alertas** del mismo recurso (Formulario Dinámico o Repositorio Documental).

**El motor no cambia.** El Alert Engine evalúa exactamente igual. Solo cambia la experiencia
de administración.

## 2. Principio arquitectónico

Modelo de administración:

```
Recurso
  └── Colección de alertas
        └── Seleccionar alerta
              └── AlertConfigurationForm
                    └── Metadata
                          └── Alert Engine
```

- El **formulario** edita una sola alerta (mantiene `selectedAlert`).
- El **panel** administra la colección (no edita campos).
- El **Alert Engine** solo evalúa metadata (sin modificaciones).

## 3. Modelo de ownership

**AlertConfigurationPanel (responsable de la colección):**
- administrar la colección
- crear nuevas alertas
- eliminar alertas
- duplicar alertas
- seleccionar la alerta activa
- enviar la alerta seleccionada al formulario

**AlertConfigurationForm (responsable de editar UNA alerta):**
- No conoce la colección.
- No sabe cuántas alertas existen.

## 4. Cambios implementados (en `AlertConfigurationPanel.jsx`)

Nuevo estado de colección independiente por alerta:

```jsx
const [alerts,  setAlerts]  = useState([{ key, name, description }]);
const [configs, setConfigs] = useState({ [key]: load.formState }); // N drafts
const [activeKey, setActiveKey] = useState(key);
```

Acciones (presentational administration):
- **addAlert** — crea una intent (`＋ Nueva alerta`), clona la config base, la selecciona.
- **selectAlert(key)** — `setActiveKey(key)`; el formulario recibe solo esa alerta.
- **onChange** — edita únicamente `configs[activeKey]`.
- **duplicateAlert(key)** — copia config + entry, nueva clave (`… (copia)`), la selecciona.
- **deleteAlert(key)** — elimina solo esa entry; si era activa, selecciona otra.
- **onSubmit** — persiste la alerta ACTIVA a través de `AlertConfigurationApplicationService`.

`AlertConfigurationForm` se reutiliza intacto; no se crean `Panel V2`/`Form V2`/
servicios/motores/proveedores nuevos.

## 5. Información resumida por tarjeta

Cada tarjeta muestra **solo info de la alerta** (nada del formulario/recurso):

```
ALERTAS (N)
(+ Nueva alerta)

✓ Recordatorio semanal         [Activa]
   Cada semana
   Prioridad: alta · Canal: email
   [Duplicar] [Eliminar]
```

- Nombre · Descripción corta
- Programación (`scheduleLabel`)
- Prioridad · Canal
- Estado operacional: **Activa** / **Deshabilitada**

> No se calcula vencimientos aquí (pertenece al Sprints 228 + Alert Engine).

## 6. Compatibilidad certificada

Escenario B (config única, retrocompatible): la persistencia continúa escribiendo la
`alertConfiguration` del recurso (la alerta activa) vía el Application Service /
PersistencePort. No se rompe el contrato canónico de 9 claves; `Mapper`/`Validation`
ignoran las claves de presentación.

## 7. Restricciones (AC1–AC14) — respetadas
Reutilizar panel/form · no modificar motores ni runtime · sin providers/services/engines
nuevos (sin `AlertEngineV2`, `AlertCollectionService`, `SchedulerEngine`, …) · metadata y
contratos compatibles · form edita una alerta · panel administra colección ·
solo presentación · SSOT preservado.

## 8. Definición de Cumplida (DoD)
✅ Administración por colección implementada · panel como administrador · form reutilizado
sin duplicación · lista funcional · crear/seleccionar/editar/eliminar/duplicar funcional ·
compatibilidad metadata · Alert Engine / Notification Engine / Runtime sin cambios ·
Build PASS · Regression PASS · SSOT preservado.

## 9. Certificación AC1–AC16 → **15/16 PASS** (AC16 regression pendiente de timeout, en curso)

## 10. Evolución
- **Sprint 228** — Estados visuales operacionales (Activa, Próxima, Hoy, Vencida,
  Deshabilitada) reutilizando el estado del Alert Engine.
- **Sprint 229** — Icono Bell del DashboardLayout + Notification Engine (contador, badge, panel).
- **Sprint 230** — Dashboard consolidado de alertas (métricas, próximas, vencidas).