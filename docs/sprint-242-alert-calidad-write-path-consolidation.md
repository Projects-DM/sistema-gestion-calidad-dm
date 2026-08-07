# Sprint 242 — Alert Collection Write Path Consolidation & Single Persistence Certification

> Nivel 5 · Consolidación del Write Path · Eliminación del flujo legacy de escritura única ·
> Certificación SSOT de persistencia

## Tipo
Architecture Consolidation · Application Layer & Persistence Hardening

**Impacto:** únicamente en la Application Layer y el Write Path de `AlertConfiguration`.
No modifica Alert Engine, Notification Engine, Runtime, Evaluation, Operational ViewModel,
Presentation, Providers, Contracts ni la estructura de Metadata.
Estado: **SINGLE COLLECTION WRITE PATH CERTIFIED**.

---

## 1. Objetivo

Eliminar definitivamente la posibilidad de que una alerta individual sobrescriba la colección
existente (causa raíz **CI-02** auditada en el Sprint 241). Existe un único flujo de escritura:

```
Panel
  ↓
saveCollection({ resource, formStates })
  ↓
Application Service → mapFormStatesToCollection
  ↓
Persistencia Port → { alertConfigurations: [...] }
  ↓
alert_config
```

Nunca más un `write` que persista una sola `alertConfiguration` desde la UI.

## 2. Problema certificado (Sprint 241)

Dos estrategias coexistían:
- **Ruta moderna** `saveCollection()` → escribe `{ alertConfigurations: [...] }` — **correcta**.
- **Ruta legacy** `save()` single → **escribe la metadata canónica suelta, SIN envelope** en
  `alert_config`, colapsando la colección a 1 (verificado: lectura devuelve 1 ítem).

Eso explicaba: recurso con alerta A → crear B → Guardar → solo quedaba B.
No es del Panel ni del Resolver ni del Runtime: es la **coexistencia de Write Paths**.

## 3. Punto de aplicación (hardening mínimo)

En el **único** adaptador oficial (`AlertConfigurationPersistenceAdapter.js`), la operación de
puerto `saveConfiguration` ahora **exige el envelope `{ alertConfigurations: [...] }`** y **rechaza**
cualquier metadata suelta **antes de** resolver el handler y de escribir la columna. Así, ningún
caller puede clobberear la colección con una alerta simple a través del puerto oficial.

El flujo legacy de escritura única (`alertConfigurationPersistence.js` y
`AlertConfigurationApplicationService.save`) se marca explícitamente **LEGACY (compatibilidad
únicamente, nunca desde la UI)** y se blinda ante llegar a la UI.

## 4. Correspondencia con la auditoría del Sprint 241

| CI-02 (241) causa raíz | Acción 242 |
|------------------------|------------|
| Write single sin envelope reemplaza la colección | Envelope requerido en el puerto; bare → rechazado. |
| Coexistencia de Write Paths | UI consolidada en `saveCollection`; legacy aislado como LEGACY. |
| Adaptadores legacy accesibles | Marcados LEGACY; ambos consumidores usan el adaptador oficial. |

Sin nuevos motores/servicios/repositorios/providers/contratos — la infraestructura ya existía.

## 5. Definición de Done

✅ Existe un único Write Path certificado (`saveCollection`).
✅ Ninguna operación desde Configuración puede sobrescribir la colección existente.
✅ La creación de una nueva alerta conserva todas las anteriores.
✅ La edición modifica únicamente la alerta correspondiente (reescribe el set íntegro).
✅ La eliminación afecta únicamente al set (re-persistencia por colección).
✅ Configuración y Operativo muestran el mismo número de alertas.
✅ La retrocompatibilidad de lectura con `alertConfiguration` (colección de 1) se mantiene.
✅ No se modifican Runtime, Alert Engine, Notification Engine, Providers, Contracts ni Metadata.
✅ SSOT preservado.

## 6. Certificación CW-1…CW-16 → 16/16 PASS (suite dedicada)

Write Path único certificado · guard del envelope certificado · edición/creación/eliminación de
colección · correspondencia Config ↔ Operativo · retrocompatibilidad de lectura · sin nuevas capas ·
legacy aislado · métricas y motores intactos · mecanismos contractos y metadata intactos ·
**SINGLE COLLECTION WRITE PATH CERTIFIED**.

## 7. Continuidad

Sprint 243 puede abordar, si se requiriera, un **merge de lectura-escritura** opcional (leer la
colección existente y añadir la nueva alerta) para inmunidad total ante concurrencia; hoy el guard
del puerto y la consolidación de `saveCollection` ya impiden el colapso observado.