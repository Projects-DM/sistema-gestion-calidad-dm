# Sprint 222 — Alert Configuration UX Refactoring & Multi-Alert Administration

## Estado
**IMPLEMENTATION CERTIFIED · ALERT UX REFACTORED · MULTI-ALERT READY**

## 1. Resumen ejecutivo
La auditoría del Sprint 221 confirmó que la infraestructura resuelve el problema
funcional; el problema era la Presentation Layer, que exponía parámetros internos
del motor. En Sprint 222 la pantalla de configuración de alertas se refactorizó a
una experiencia **basada en intención de negocio**, organizada en **seis bloques
funcionales**, ocultando los parámetros técnicos del motor y habilitando la
administración de múltiples alertas por recurso. Toda la infraestructura
certificada permanece intacta.

## 2. Principio arquitectónico certificado
La UI deja de representar la implementación del motor y expresa únicamente la
intención del usuario:

```
Administrador → Alert Configuration UI → alertConfiguration Metadata
             → Alert Engine → Evaluation Engine → Notification Engine
```

La UI nunca conoce cómo calcula el motor.

## 3. Modelo UX implementado (6 bloques)
1. **Información** — Nombre y Descripción (identificadores de la alerta;
   permiten varios intents sobre un mismo formulario).
2. **Programación** — «¿Cuándo desea ejecutar esta alerta?»: Al vencimiento ·
   Fecha específica · Todos los días · Cada semana · Cada mes · Personalizado.
   Solo aparecen parámetros adicionales cuando la opción lo requiere.
3. **Repetición** — ¿Repetir? No / Sí (+ Cada [cantidad] [unidad]).
4. **Prioridad** — Alta · Media · Baja.
5. **Notificación** — Notificar + Canal + Destinatarios.
6. **Finalización** — Cerrar automáticamente + Alerta activa.

## 4. Parámetros ocultados (NO eliminados)
`riskModel`, `riskYellow`, `riskRed` y la configuración interna de evaluación
**siguen viviendo en la metadata** y siguen siendo usados por el motor, pero
**nunca vuelven a mostrarse** en la UI.

## 5. Compatibilidad metadata (SSOT)
Cada control del nuevo formulario sigue mapeando 1:1 a los **mismos campos del
formState** que alimentan el Mapper certificado; `name`/`description` son campos
presentacionales adicionales **ignorados** por el Mapper/Validation (los campos
desconocidos jamás rompen el contrato de 9 campos canónicos).

No existe migración, transformación ni actualización de contratos.

## 6. Reutilización certificada
Se reutilizan íntegramente: `AlertConfiguration`, Alert Engine, Notification
Engine, Evaluation Engine, Runtime, Metadata, Providers, Contratos, Dynamic
Forms, Document Repository y Dashboard Alerts. **Prohibido**: `AlertConfigurationV2`,
`AlertEngineV2`, `NotificationEngineV2`, `MetadataV2`, Providers nuevos,
Repositories nuevos.

## 7. Administración de múltiples alertas
El contenedor `AlertConfigurationPanel` funciona como administrador de una
colección: lista de alertas (con su nombre), alta «＋ Nueva alerta», selección y
edición mediante el formulario reutilizado. Persiste la metadata `alertConfiguration`
compatible.

## 8. Certificación
`C:\tmp\test\sprint-222-alert-configuration-ux-refactoring-certification.mjs`
→ **UI1–UI14 PASS (14/14)**.

### Alcance
Exclusivamente Presentation Layer (`AlertConfigurationForm.jsx`, contenedor de
administración). Cero cambios en Runtime, Alert/Notification/Evaluation Engine,
Lifecycle, Providers, Contratos, Persistence, Mapper, Validation o Metadata Model.

## 9. Evolución
Base lista para, sin modificar la arquitectura: Sprint 223 Alert Templates,
Sprint 224 Alert Preview, Sprint 225 Notification Center Integration.