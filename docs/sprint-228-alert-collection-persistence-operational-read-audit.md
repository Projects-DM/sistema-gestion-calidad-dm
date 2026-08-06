# Sprint 228 — Alert Collection Persistence Audit & Operational Read Model

> Nivel 5 · Colección de alertas · Auditoría de persistencia · Certificación del modelo de lectura operacional

## Tipo
Auditoría de Arquitectura · Validación de flujo Presentation/Data · Certificación de colección de alertas

**Auditoría exclusiva.** No modifica código. No altera Alert Engine, Notification Engine,
Runtime, Metadata, Providers, Contratos, Persistence Layer ni Evaluation Engine.

---

## 1. Sumario

El Sprint 227 certificó la transición a la administración por **colección** de alertas.
La infraestructura visual quedó operativa, pero dos comportamientos indican que la
colección **solo existe durante la sesión de edición** y aún no forma parte del modelo
persistido del recurso. Esta auditoría localiza exactamente dónde se rompe el ciclo:

```
UI → Collection(panel) → Application Service → Persistence → Metadata → Carga posterior → Presentation
```

## 2. Problemas observados (AP-01…AP-03)
- **AP-01** — Dentro de Configuración, «Nueva alerta → Guardar → cambiar de módulo →
  volver»: la alerta desaparece. La colección no sobrevive al ciclo.
- **AP-02** — En el módulo operativo (Experiencias Operacionales → Alertas) solo aparece
  la configuración antigua; la nueva colección nunca llega.
- **AP-03** — La vista operacional representa el **formulario** (p.ej. "Programa de
  mantenimiento preventivo") en vez de la **alerta** ("Recordatorio semanal / Próxima
  ejecución / Prioridad / Estado").

## 3. Auditoría A1 — Persistencia (¿llega la colección al Application Service?)

**Hallazgo:** `AlertConfigurationPanel` llama:
```js
serviceRef.current.saveConfiguration({ resource, formState: activeConfig });
```
Solo envía `selectedAlert` (**`activeConfig`**). El collection `alerts[]` / `configs[]`
**nunca llega** al `AlertConfigurationApplicationService`.

## 4. Auditoría A2 — Metadata (¿única o colección?)

**Hallazgo (Caso A):** el sistema persiste un **`alertConfiguration` único**. El Mapper
`mapFormStateToMetadata(formState)` produce **un solo objeto** de metadata canónica
(resuelto a la clave `alert_config`/`alertConfiguration` vía el Resolver certificado).
No existe ruta de `alertConfigurations[]`.

## 5. Auditoría A3 — Reconstrucción

**Hallazgo:** al cargar, `AlertConfigurationResolver` lee una **única** configuración y
`mapMetadataToFormState` genera **un único formState**. El Panel inicializa la colección
con **una sola** entrada (`alerts = [{ alert-1 }]`, `configs = { alert-1: load.formState }`).
No reconstruye la colección; crea una alerta.

## 6. Auditoría A4 — Ownership (certificado)

- **AlertConfigurationPanel** (responsable de): administrar la colección, seleccionar,
  crear, duplicar, eliminar. **Nunca**: evaluar alertas.
- **AlertConfigurationForm**: editar una alerta; nunca administrar colección.
- **Alert Engine**: evaluar la metadata. **Nunca**: dibujar tarjetas.
- **Módulo Operacional**: consumir estados. **Nunca**: persistir alertas.

## 7. Auditoría A5 — Modelo operacional

La vista del módulo debe mostrar por alerta: Estado, Próxima ejecución, Fecha inicio,
Repetición, Prioridad, Canal, Última/Próxima ejecución. **No** repetir info del formulario.

## 8. Auditoría A6 — Estados operacionales

El módulo debe consumir los estados producidos por el Alert Engine: **Activa · Próxima ·
Hoy · Vencida · Deshabilitada**. La UI **nunca** los calcula.

## 9. Auditoría A7 — Notification Center

El `Bell` de `DashboardLayout` existe pero **sin punto de integración** con el Alert
Engine (mostrar contador/badge/panel). No crear `NotificationCenterV2`, `AlertBellService`
ni `AlertDashboardService`; solo identificar el punto de conexión para Sprint 229.

## 10. Causa raíz (resumen)

La colección es **presentational-only**. El **Application Service** y el **Mapper**
persisten una **única** configuración y reconstruyen **una** sobre carga. El
`alerts[]`/`configs[]` del Panel (Sprint 227) no se serializa a metadata ni se lee de
vuelta, por lo que aparece únicamente durante la sesión.

## 11. Política de reutilización (AR1–AR14)
Reutilizar Panel · Form · Application Service · Persistence Port · Runtime · Metadata ·
Alert Engine · Notification Engine; sin motores/providers/repositories nuevos; no romper
compatibilidad SSOT; Presentation consume solo estados; arquitectura desacoplada.

## 12. Sprint siguiente (229)
Implementará solo las correcciones: persistencia completa de la colección · reconstrucción
al reabrir · vista operacional basada en la colección · tarjetas orientadas a la alerta ·
consumo del estado del Alert Engine (sin recalcular en la UI).

## 13. Definición de Cumplida
Ciclo de persistencia audidad · Application Service → Persistence validado · modelo de
metadata identificado (Caso A) · reconstrucción auditada (una alerta) · ownership
certificado · vista operacional auditada · Notification Center auditado · reutilización
certificada · **sin cambios funcionales** · SSOT preservado.

## 14. Certificación AR1–AR14 → **14/14 PASS**