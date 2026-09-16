# SPRINT 51 — FIRST CORE IMPLEMENTATION
Capability Driven Core — First Capability Consumption

**Tipo:** Arquitectura Aplicada (Implementación)

**Nivel esperado:** LEVEL 3 — IMPLEMENTATION

**Estado esperado:** FIRST CAPABILITY CONSUMED

---

## Objetivo
Eliminar el primer hardcode arquitectónico (B1) en **DynamicModule** que habilita el tab **“Repositorio Documental”** por lista de `moduleSlug` (whitelist), y reemplazar esa decisión por consumo de la **señal data-driven existente** de disponibilidad del repositorio documental.

La fuente de verdad debe venir de la infraestructura ya existente y data-driven:
- `documentRepositoriesService.getRepositories({ moduleSlug })`

Se preserva:
- comportamiento funcional
- UX
- contratos SSOT
- pipeline del Core
- runtime bridge

---

## Diagnóstico inicial (Fase 0A)
- **Hardcode B1 (brecha):**
  - `src/pages/DynamicModule.jsx`
  - whitelist `isDocumentEnabled(slug)` decide si el tab “Repositorio Documental” se habilita.

- **Señal data-driven existente:**
  - `src/modules/documentViewer/ModuleDocumentViewer.jsx`
  - obtiene repositorios vía `documentRepositoriesService.getRepositories({ moduleSlug })`.

- `DynamicModule` aún estaba tomando una decisión por slug (whitelist), lo cual rompe la autoridad “capability driven” del primer paso.

---

## Capacidad consumida (definición operacional)
**Document Repository Availability (existente, data-driven):**
- definida por existencia de repositorios retornados por `documentRepositoriesService.getRepositories({ moduleSlug })`
- con criterio de disponibilidad:
  - `is_active !== false`

> Nota: Sprint 51 **no crea** nuevos contratos ni capacidades nuevas. Consume la señal ya implementada.

---

## Cambios (implementación realizada)
### Qué se cambió
**Archivo modificado:**
- `src/pages/DynamicModule.jsx`

**Cambios clave:**
1) Eliminada la whitelist `isDocumentEnabled(slug)`.
2) Añadida resolución de disponibilidad mediante consulta data-driven:
   - `documentRepositoriesService.getRepositories({ moduleSlug })`
3) Se mantiene la misma UX/UX contract:
   - Si no hay repositorio disponible, si el usuario estaba en el tab “repositorio”, se fuerza a `forms`.
   - El tab “Repositorio Documental” queda deshabilitado usando el estado de disponibilidad.

### Archivos modificados
- ✅ `src/pages/DynamicModule.jsx`

---

## Arquitectura (validación respecto a SSOT)
- **Capability Driven:** DynamicModule ya no decide por whitelist.
- **Core First / Contract First:**
  - no se modificaron contratos, SSOT o pipeline conceptual.
- **Metadata Driven (operacional):**
  - la decisión se deriva de datos ya modelados por infraestructura existente (repositorios configurados).
- **Business Agnostic / Reusable by Design:**
  - la decisión de disponibilidad no está atada a slugs hardcodeados.
- **Runtime Desacoplado:**
  - no se tocó Runtime, Resolver, Composition Engine, Registry, ni Standard Shell.

---

## Beneficios
- El sistema inicia la transición a **Capability Driven Core** eliminando B1.
- La autoridad de “disponibilidad documental” queda alineada con el mecanismo data-driven existente.
- Se reduce la necesidad de cambios de código ante nuevos módulos con repositorios configurados.

---

## Riesgos
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Capability no detectada por fallo de consulta | El tab podría quedar deshabilitado | Fallback a `available: false` y forzado a `forms` ya preserva UX. Además se loguea error. |
| Regresión funcional (habilitar/deshabilitar tab) | Usuario percibe comportamiento distinto | Se preservó el comportamiento anterior: si no hay repositorio habilitado, se fuerza el tab estándar. |
| Lógica duplicada | Drift entre DynamicModule y ModuleDocumentViewer | Mitigación práctica: ambos se basan en el mismo servicio `documentRepositoriesService.getRepositories`. |
| Cambios futuros en definición de disponibilidad | Repetición de cambios | Se encapsula la decisión de disponibilidad en DynamicModule a través de la señal data-driven; en Sprint 52 puede abstraerse a Availability layer sin volver a tocar DynamicModule. |

---

## Validación funcional (protocolo)
Validar manualmente / localmente en runtime:
1) Módulos con repositorios documentales activos:
   - el tab “Repositorio Documental” debe habilitarse
   - `ModuleDocumentViewer` debe renderizar repositorios y categorías
2) Módulos sin repositorios documentales activos:
   - el tab debe quedar deshabilitado
   - si el estado estaba en “repositorio”, se debe forzar a `forms`
3) Formularios/Registros/Documentos:
   - sin cambios de UX/routing/permisos
4) Runtime Bridge:
   - no se modifica; submit/verify sigue invocando runtime bridge igual que antes

---

## Validación arquitectónica (criterios)
- ✓ First Capability Consumed
- ✓ First Architectural Hardcode Removed
- ✓ DynamicModule refactored: remueve slug-driven authority
- ✓ Capability Driven
- ✓ Core First
- ✓ Contract First
- ✓ Metadata Driven
- ✓ Business Agnostic
- ✓ Reusable by Design
- ✓ Runtime Compatible
- ✓ Backward Compatible
- ✓ Forward Compatible

---

## Pruebas
- `vite build` ejecutado con éxito tras el cambio (compilación OK).

---

## Conclusión / Resultado
- Se eliminó el hardcode arquitectónico B1 en `DynamicModule`.
- La disponibilidad del repositorio documental ahora se gobierna por una señal data-driven existente (repositorios configurados) consumida desde `documentRepositoriesService`.
- DynamicModule deja de decidir por `moduleSlug`.
- Sprint 51 queda completado con el primer paso oficial hacia **Capability Driven Core** sin modificar SSOT certificados ni runtime.

