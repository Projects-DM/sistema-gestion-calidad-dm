# Sprint 226 — Alert Operational Visualization Audit & Multi-Alert Presentation Model

> Nivel 5 · Presentación de alertas · Visualización multi-alert · Auditoría de estado operacional

## Tipo
Arquitectura de Auditoría · Refinamiento UX · Certificación de la capa de presentación.

**Auditoría exclusiva. Sin cambios funcionales.** No modifica Alert Engine, Notification
Engine, Evaluation Engine, Runtime, Metadata, Providers, Contratos, Persistencia.

---

## 1. Resumen

Los Sprint 195–225 consolidaron la infraestructura del Alert Engine: metadata-driven,
desacoplada, reutilizable y compatible con Formularios Dinámicos y Repositorios
Documentales. La arquitectura funcional es correcta.

Las limitaciones actuales pertenecen **solo** a la forma en que las alertas se administran
y se representan visualmente en la capa de presentación.

## 2. Principio certificado (separación de responsabilidades)

```
Administrador → Alert Configuration → Metadata → Alert Engine → Estado
                                                              ↓
                                                  Presentation Layer (consume)
```

La Presentation Layer **solo consume** el estado producido por el motor. **Nunca**
calcula vencimientos ni evalúa riesgo.

## 3. A1 — Auditoría del modelo actual

La infraestructura permite configurar **múltiples alertas** por recurso, pero la UI hoy
presenta **una sola configuración visible**. Hay una incongruencia entre:

- Infraestructura → permite varias alertas
- UI → muestra una sola alerta / un único formulario

## 4. Hallazgos (UX-01…UX-04)

- **UX-01** — La pantalla induce a pensar que un formulario posee una única alerta.
  Arquitectónicamente es falso.
- **UX-02** — No existe una lista de alertas, solo un formulario.
- **UX-03** — El usuario no distingue rápido qué alerta es, para qué sirve, cuándo
  ejecuta, si está activa o si está vencida.
- **UX-04** — Se muestra información del formulario, no de la alerta.

## 5. Modelo certificado de administración (multi-alerta)

Cada recurso administra una **colección** de alertas:

```
Formulario
└── Alertas
      + Nueva alerta
      • Recordatorio semanal
      • Calibración mensual
      • Auditoría INVIMA
      • Revisión documental
```

Sin límite. Cada alerta mantiene la metadata existente. **No se crean contratos nuevos.**

## 6. Información visual relevante (A2 — clasificación)

Cada tarjeta muestra solo información operacional:

**Mantener**: Nombre de alerta · Descripción · Estado · Fecha inicial · Próxima
ejecución · Prioridad · Repetición · Canal de notificación.

**Ocultar**: Nombre completo del formulario · Código completo · Descripción del
formulario · Información del recurso (ya se está dentro del recurso).

## 7. Estados visuales certificados (A3)

La alerta representa **solo** el estado producido por el motor. No se calculan en la UI.

- 🟢 Activa
- 🟡 Próxima
- 🟠 Hoy
- 🔴 Vencida
- ⚫ Deshabilitada

## 8. Modelo de tarjetas (A4)

Cada alerta se representa como **una tarjeta independiente** — la tarjeta representa la
alerta, no el formulario.

## 9. Centro de notificaciones (A5)

La auditoría confirma que ya existe un icono de notificaciones en el Header
(`src/layouts/DashboardLayout.jsx`, `Bell`). Hoy **no consume** el Alert Engine.
Debe reutilizarse. **No** crear `NotificationCenterV2`.

## 10. Dashboard y módulo (A6)

- **Dashboard**: vista resumida (cantidad de alertas, próximas, vencidas).
- **Módulo**: detalle completo, administración, edición y creación.

## 11. Reutilización certificada

Reutilizar íntegramente: Alert Engine · Notification Engine · Runtime · AlertConfiguration
· AlertConfigurationPanel · AlertConfigurationForm · Dashboard · Header Notification Icon ·
Metadata · Providers · Contracts.

**No autorizado**: `AlertEngineV2` · `NotificationEngineV2` · `AlertListService` ·
`SchedulerService` · nuevos Providers · nuevos Repositories · nuevos motores.

## 12. Evolución certificada (roadmap)

- **Sprint 227** — Modelo visual de múltiples alertas (lista + tarjetas + resumen).
- **Sprint 228** — Estados visuales (badges, colores, indicadores).
- **Sprint 229** — Integración con el Notification Center del Header (badge, contador, panel).
- **Sprint 230** — Dashboard de alertas consolidado.

## 13. Restricciones (AV1–AV12)
Reutilizar Alert Engine / Notification Engine / Runtime / AlertConfiguration; mantener
metadata compatible; sin nuevos motores/servicios/providers/contratos; toda la lógica en el
Alert Engine; la UI solo representa; SSOT preservado.

## 14. Avance
Definición de Cumplida. Ready → **Sprint 227**.

## 15. Certificación AV1–AV14 → **14/14 PASS**