# Sprint 230 — Operational Read-Model Projection of the Alert Collection

> Nivel 5 · Colección de alertas · Read Model operacional · Proyección de presentación

## Tipo
Presentation (Rea-Layer) · Read-only projection

**Impacto:** proyección de PRESENTACIÓN de la colección persistida (Sprint 229) dentro de la
experiencia operacional (`AlertMonitoringExperience`) como **tarjetas independientes por
alerta**. No modifica Alert Engine, Notification Engine, Runtime, Evaluation Engine,
Persistence, Providers, Contracts ni Metadata. Es exclusivamente **lectura**.

---

## 1. Resumen

Sprint 229 dejó la colección `alertConfigurations[]` **persistida** en cada recurso. Hasta el
Sprint 230 esa colección solo era visible en el módulo **Configuración** (Panel). Este sprint
la proyecta al **módulo Operacional**: cada alerta configurada aparece como una tarjeta
independiente, junto a las tarjetas del Runtime existente.

Se hace con un **componente de proyección de solo lectura** que **consume** el Resolver
certificado. No se crean motores, servicios, providers, repositorios, contratos ni metadata
nueva; no se evalúa ni se persiste.

## 2. Modelo de proyección (read model)

```
Recurso ── extractResourceAlertCollection ──► alertConfigurations[] (raw persistido)
resolveResourceAlertCollection ──► [{ AlertConfiguration* }]   (Value Object inmutables)
OperationalAlertCollection.projectOperationalAlertCards(existing) ──► card[]
    { key, source, ownerName, schedule, priorityLabel, channelLabel, enabled }
```

- Una **tarjeta por alerta** persistida (`alertConfigurations[]`).
- `alertConfiguration` único (legacy) → colección de **1** → 1 tarjeta (retrocompatible).
- Recurso **nunca configurado** (`extractResourceAlertCollection` → null/[ ]) → **0 tarjetas**
  (se descarta; no se proyecta la alerta `default`).
- La tarjeta es de la **alerta** (programación · prioridad · canal · estado), no del
  formulario/repositorio.

## 3. Cambios implementados (presentación)

| Archivo | Cambio |
|--------|--------|
| `src/modules/experiences/OperationalAlertCollection.jsx` (nuevo) | +`projectOperationalAlertCards(resources)` y +`OperationalAlertCollectionCards({cards})`. Consume el Resolver certificado; describe programación/prioridad/canal/estado con etiquetas de presentación. |
| `src/modules/experiences/AlertMonitoringExperience.jsx` | Consume `existing` del puente `useAlertRuntime`, aplica `projectOperationalAlertCards` y monta `OperationalAlertCollectionCards` sobre las tarjetas del Runtime (configurable). Sigue siendo **consumidor**. |

## 4. Guardas de arquitectura (sin violaciones)

- **No evalúa:** la proyección nunca importa `AlertEvaluationEngine` ni `evaluateAlert`.
- **No persiste:** nunca importa `saveCollection`/`saveConfiguration` via Panel.
- **No administra:** no es `AlertConfigurationPanel` ni `DocumentRepositoriesAdmin`; solo proyecta.
- **No toca Runtime/Engine/Notification/Persistence/Contract/Metadata** (git status intacto).

## 5. Responsabilidades
- **OperationalAlertCollectionCards:** proyecta/lee la colección persistida. Nunca evalúa, nunca persiste.
- **AlertMonitoringExperience:** consumidor del puente `useAlertRuntime` + proyección de lectura.
- **Resolver:** única fuente para extraer/resolver la colección (owner de metadata).
- **Configuración (Panel/Form):** administra y persiste; no proyecta en operativo.

## 6. Compatibilidad
- Single `alertConfiguration` → 1 tarjeta (sin migración obligatoria).
- `alertConfigurations[]` → N tarjetas.
- Ausente → 0 tarjetas (no se inventan alertas).
- Los consumidores Runtime/Alarm del Alert Engine no se tocan.

## 7. Certificación OC1–OC16 → **16/16 PASS**
Reúso del Resolver (colección y extracción); proyección de solo lectura; 1 tarjeta por
alerta; retrocompatibilidad; gating de recursos no configurados; montaje en la experiencia;
cabecera "Alertas configuradas"; campos de tarjeta; sin engines/providers/repos/contratos
nuevos; Alert Engine y Notification Engine intactos; Runtime/Persistence/Contracts/Metadata
intactos; el Experience permanece consumidor del puente.

## 8. Continuidad
Con esto la colección persistida ya es visible en el operativo. Siguientes sprints
(estados visuales Activa · Próxima · Hoy · Vencida · Deshabilitada, Bell del Dashboard y
dashboard consolidado) consumirán únicamente el estado del Alert Engine, sin retroproyectar
en Runtime.