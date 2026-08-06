# Sprint 221 — Alert Configuration UX Audit & Metadata Simplification Model

## Estado
**ALERT CONFIGURATION AUDITED · UX SIMPLIFICATION CERTIFIED · READY FOR IMPLEMENTATION (SPRINT 222)**
Auditoría arquitectónica exclusiva. **Cero cambios funcionales** sobre el código.

## 1. Resumen ejecutivo
Desde el Sprint 195 el Alert Engine evolucionó hacia un motor desacoplado,
metadata-driven y reutilizable, correctamente certificado. La auditoría confirma
que **el problema no es arquitectónico**: la infraestructura es válida y reusable
para múltiples configuraciones sobre Formularios Dinámicos y Repositorios
Documentales.

El problema está **exclusivamente en la Presentation Layer**: la pantalla de
configuración expone parámetros internos del motor (evaluación) que no pertenecen
al proceso de configuración del usuario, aumentando complejidad visual, tiempo de
configuración y exigiendo al administrador conocer el motor.

## 2. Principio arquitectónico certificado
La configuración deja oficialmente de representar la implementación interna del
motor:

```
Usuario → Define intención → Metadata existente → Alert Engine → Evaluation → Notification
```

Nunca: `Usuario → Configura parámetros internos del motor`.

## 3. A1 — Auditoría de la pantalla actual (`AlertConfigurationForm.jsx`)
La pantalla presenta simultáneamente ~14 controles: enabled, priority, periodo
de gracia (switch+cantidad+unidad), periodicityMode/Amount/Unit, expiration,
riskModel, riskYellow, riskRed, notificationEnabled/Channel/Recipients,
automaticClose, repeatPolicy.

### Hallazgos
- **UX-01**: mezcla configuración funcional, parámetros técnicos y parámetros
  internos del motor en un único formulario.
- **UX-02**: el usuario debe comprender conceptos internos (`relative risk`,
  `riskYellow`, `riskRed`) cuando solo desea "avísame cuando ocurra esto".
- **UX-03**: no existe jerarquía visual entre campos; todos al mismo nivel.
- **UX-04**: no existe flujo natural; las preguntas aparecen desordenadas.

## 4. A2 — Clasificación oficial de campos
### Grupo A — Mantener visibles (necesarios para cualquier administrador)
| Campo actual            | Recomendación |
|-------------------------|---------------|
| enabled                 | Mantener      |
| priority                | Mantener      |
| periodicity (modo/cantidad) | Mantener  |
| expiration              | Mantener      |
| notificationEnabled     | Mantener      |
| notificationChannel/Recipients | Mantener |
| repeatPolicy            | Mantener      |
| automaticClose          | Mantener      |
| **Nombre** (nuevo)      | Recomendado   |
| **Descripción** (nuevo) | Recomendado   |

### Grupo B — Simplificar (no desaparecen; cambia su representación)
| Campo actual      | Nueva representación               |
|-------------------|------------------------------------|
| gracePeriod       | "Esperar antes de alertar"         |
| Unidad            | Integrada en el selector           |
| Política de vencimiento | Selector simple             |
| Modo de periodicidad   | Selector simplificado         |

### Grupo C — Internalizar (continúan en la metadata; dejan de mostrarse)
- `riskModel` (modelo de riesgo)
- `riskYellow` (umbral yellow)
- `riskRed` (umbral red)
- Configuración interna de evaluación

Estos pertenecen al Alert Engine, no al usuario.

## 5. A3 — Modelo UX certificado (6 bloques funcionales)
1. **Información** — Nombre, Descripción (identifican múltiples alertas sobre un
   mismo recurso).
2. **Programación** — "¿Cuándo desea ejecutar la alerta?": Fecha específica ·
   Cada día · Cada semana · Cada mes · Al vencimiento.
3. **Prioridad** — Alta · Media · Baja.
4. **Notificación** — Canal, Destinatarios.
5. **Repetición** — Repetir · No repetir.
6. **Vencimiento** — Nunca · Fecha · Basado en el documento · Basado en el formulario.

## 6. A4 — Modelo para múltiples alertas
La infraestructura actual ya soporta múltiples configuraciones; solo cambia la
experiencia de administración:

```
Formulario → Alertas
──────────────────────────────
＋ Nueva alerta
──────────────────────────────
✓ Recordatorio semanal
✓ Documento por vencer
✓ Auditoría mensual
✓ Calibración equipos
```

Cada alerta conserva exactamente la misma metadata existente (`alertConfiguration`).
**No se crean contratos nuevos.**

## 7. A5 — Reutilización certificada
Reutilizables íntegramente: `AlertConfiguration`, Alert Engine, Notification
Engine, Evaluation Engine, Runtime, metadata actual, Providers, Contratos.

**No autorizado**: `AlertEngineV2`, `AlertConfigurationV2`,
`NotificationServiceV2`, nuevos Providers, nuevos Repositories.

## 8. A6 — Política de simplificación (AS1–AS10)
AS1 Reutilizar infraestructura · AS2 No modificar Runtime · AS3 No modificar
Alert Engine · AS4 No modificar Notification Engine · AS5 Mantener metadata
compatible · AS6 Simplificar solo Presentation Layer · AS7 Ocultar parámetros
internos del motor · AS8 Reducir carga cognitiva · AS9 Múltiples alertas por
recurso · AS10 Mantener compatibilidad SSOT. **Todas certificadas.**

## 9. Arquitectura certificada
`Administrador → Alert Configuration UI → Alert Metadata → Alert Engine →
Evaluation Engine → Notification Engine → Dashboard → Experiencias Operacionales`.
La arquitectura continúa siendo válida; no requiere modificaciones.

## 10. Fuera del alcance
Sin IA de generación, sin reglas condicionales complejas, sin expresiones
lógicas, sin plantillas inteligentes, sin motores nuevos, sin cambios al Runtime,
Notification Engine ni Evaluation Engine.

## 11. Plan certificado — Sprint 222
Implementará exclusivamente la nueva experiencia visual reutilizando toda la
infraestructura:
- reorganizar la pantalla por bloques funcionales (A3);
- incorporar Nombre y Descripción como identificadores de alerta;
- simplificar controles existentes (Grupo B);
- ocultar parámetros técnicos del motor (Grupo C);
- mantener metadata 100% compatible;
- administrar múltiples alertas con experiencia clara (A4).

Sin modificar ningún contrato, provider, servicio ni motor certificado.

## 12. Definition of Done
Pantalla auditada · campos clasificados · reutilizables identificados ·
simplificables identificados · parámetros internos identificados · arquitectura
validada · Alert Engine preservado · Notification Engine preservado · Runtime
preservado · metadata preservada · estrategia certificada · SSOT preservado ·
**READY FOR IMPLEMENTATION (SPRINT 222)**.

## Certificación
`C:\tmp\test\sprint-221-alert-configuration-ux-audit-certification.mjs`
→ **AU1–AU12 PASS (12/12)**. Sin cambios funcionales (auditoría pura).