# SPRINT_45_11 — STANDARD CORE ARCHITECTURE (SSOT FINAL)

> Documento SSOT (Solo auditoría documental).
>
> NO implementar código.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.
>
> Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**

---

## 0) Fuentes de evidencia (exclusivo)
Se utiliza únicamente evidencia observada en:
- `src/pages`
- `src/components`
- `src/services`
- `src/runtime`
- `src/context`
- `src/modules`
- documentación SSOT previa:
  - Sprint 45.9 (Contract Map)
  - Sprint 45.10 (Dependency Map)
  - Sprint 45.10A (Refinement)

---

## 1) Definición del Core Arquitectónico

> Clasificación “Core estructural” = no puede eliminarse sin romper el SSOT estándar.

### 1.1 `dynamicService`
- **Responsabilidad:** Proveer operaciones CRUD/submit/verify y obtener payloads enriquecidos para historial y auditoría.
- **Propósito:** Ser la fuente única de persistencia del “módulo estándar” (sgc_*), y el productor del objeto `__runtime_internal_event`.
- **Por qué pertenece al Core:** Su salida (`__runtime_internal_event`) es consumida por la capa puente hacia runtime.
- **Subsistema:** Persistencia + Runtime Bridge (a través del retorno interno).
- **¿Puede eliminarse?:** No.
- **¿Puede reemplazarse?:** Reemplazable solo manteniendo el contrato observada en Sprint 45.9 (submit/verify/response/audit/internal_event).

### 1.2 `runtimeActivationLayer.activate()`
- **Responsabilidad:** Ejecutar la activación del runtime usando el contrato `__runtime_internal_event`.
- **Propósito:** Puente extremo a runtime a partir del evento generado por `dynamicService`.
- **Por qué pertenece al Core:** Sin este paso no se completa el flujo observado create/verify → runtime.
- **Subsistema:** Runtime.
- **¿Puede eliminarse?:** No si se requiere el flujo end-to-end observado.
- **¿Puede reemplazarse?:** Reemplazable solo manteniendo contrato mínimo (event.type create/verify + responseId/actorId/correlationId).

### 1.3 `DynamicModule`
- **Responsabilidad:** Descubrir módulo por `moduleSlug`, listar `sgc_forms` del módulo y controlar el catálogo visible.
- **Propósito:** Ser el contenedor de navegación del módulo estándar.
- **Por qué pertenece al Core:** Es el entry-point UI estándar para cargar metadata de módulo y forms.
- **Subsistema:** Presentación + Metadata discovery.
- **¿Puede eliminarse?:** No para el flujo de navegación end-to-end observado.
- **¿Puede reemplazarse?:** Reemplazable con contrato de navegación equivalente (moduleSlug → catálogo de formSlug + gating por rol).

### 1.4 `DynamicForm`
- **Responsabilidad:** Cargar form metadata y campos; renderizar engine base; capturar values/evidencias; ejecutar submit y activar runtime.
- **Propósito:** Ser el componente de ejecución del “módulo estándar”.
- **Por qué pertenece al Core:** Orquesta la persistencia vía `dynamicService` y el puente runtime.
- **Subsistema:** Ejecución.
- **¿Puede eliminarse?:** No.
- **¿Puede reemplazarse?:** Reemplazable solo manteniendo el contrato observable: `dynamicService.submitFormResponse` y activación runtime con `__runtime_internal_event`.

### 1.5 Engines base (`BaseGeneric`, `BaseChecklist`, `BaseMediciones`)
- **Responsabilidad:** Renderizar UI de campos desde `fields` y producir cambios en `values` vía `onChange`.
- **Propósito:** Interpretar metadata `field_type/required/options` para capturar el modelo de values.
- **Por qué pertenece al Core:** `DynamicForm` depende de `engine_type` y del contrato de props `{fields, values, onChange}`.
- **Subsistema:** Ejecución.
- **¿Puede eliminarse?:** No si se requiere compatibilidad con `engine_type` soportados.
- **¿Puede reemplazarse?:** Reemplazable manteniendo contrato de entrada/salida hacia `DynamicForm`.

### 1.6 `DynamicRecordsView`
- **Responsabilidad:** Listar respuestas de un módulo, calcular criticidad y permitir verificación (verify) con auditoría.
- **Propósito:** Brindar historial/consultas y verificación end-to-end con `dynamicService`.
- **Por qué pertenece al Core:** Es el consumidor de `dynamicService.getModuleResponses` y la UI de verify.
- **Subsistema:** Ejecución + Persistencia (lectura/verificación).
- **¿Puede eliminarse?:** No.
- **¿Puede reemplazarse?:** Reemplazable solo con contrato equivalentes de lectura/verify y modelo de payload esperado.

---

## 2) Delimitación oficial de subsistemas

### 2.1 Presentación
- **Componentes incluidos:** `DynamicModule`, `DynamicForm`, `DynamicRecordsView`, `FormBuilder` (UI admin), `DocumentModule`, `ModuleDocumentViewer` (UI documental).
- **Responsabilidades:** Render de catálogos, formularios dinámicos, historial/modales, evidencia/firmas y UI documental.
- **Límites:** No escribe directamente en sgc_* (salvo Configuration/FormBuilder con Supabase en config), no traduce eventos runtime.
- **Dependencias externas:** React, Router (params/routes), Auth via `useAuth()`.

### 2.2 Metadata
- **Componentes incluidos:** No hay componente “metadata” dedicado; la metadata existe en DB y es consumida por servicios.
- **Responsabilidades:** Gobernar `sgc_modules/sgc_forms/sgc_form_fields` y su uso en render/validación.
- **Límites:** Datos solo; el comportamiento se observa como derivado de metadata.

### 2.3 Ejecución
- **Componentes incluidos:** `DynamicForm`, Engines base.
- **Responsabilidades:** Renderizar UI de campos, construir `values`, orquestar submit y disparar puente runtime.
- **Límites:** No decide persistencia; la persistencia es del `dynamicService`.

### 2.4 Persistencia
- **Componentes incluidos:** `dynamicService` (sgc_*), `documentsService` (sgc_programs/sgc_records), y services documentales (sgc_document_repositories/categories).
- **Responsabilidades:** Consultar y escribir en DB según flujos submit/verify/history.
- **Límites:** No controla UI.

### 2.5 Runtime
- **Componentes incluidos:** `runtimeActivationLayer.activate()` y su cadena interna (no documentada aquí).
- **Responsabilidades:** Ejecutar traducción/submit hacia runtime.
- **Límites:** Consume contrato del puente (`__runtime_internal_event`).

### 2.6 Documental
- **Componentes incluidos:** `ModuleDocumentViewer`, `DocumentModule`.
- **Responsabilidades:** Cargar/mostrar repositorios/categorías/programa/archivos y permitir upload/delete documental.
- **Límites:** No gobierna el flujo de submit/verify estándar (sgc_forms/sgc_form_fields). Es una extensión documental.

### 2.7 Infraestructura
- **Componentes incluidos:** `usePdfViewerStore` (store global de visor), Supabase client/storage.
- **Responsabilidades:** Proveer infraestructura para visor y almacenamiento documental/firmas/evidencias.

### 2.8 Administración (presentación admin)
- **Componentes incluidos:** `Configuration`, `FormBuilder`.
- **Responsabilidades:** Crear metadata de forms y fields (en evidencia de config).

---

## 3) Ownership Architecture

> Un único owner por responsabilidad cuando sea posible (según evidencia).

- **Catálogo (módulos/forms):** `DynamicModule` (UI) + `dynamicService` (fuente de datos).
- **Submit (create response):** `DynamicForm` orquesta, propiedad de persistencia en `dynamicService.submitFormResponse`.
- **Persistencia sgc_*:** `dynamicService`.
- **Runtime bridge/activación:** `runtimeActivationLayer.activate()` (bridge consumidor) + `dynamicService` (productor de `__runtime_internal_event`).
- **Evidencias:** `EvidenceUploader` (produce Evidence[] en UI) + `dynamicService.submitFormResponse` (escritura `sgc_evidences`).
- **Firmas:** `SignaturePad` (produce URL) + `dynamicService.submitFormResponse` (persiste como value en EAV vía `values`).
- **Documentos (Programa/Repositorio documental):** `DocumentModule` y `ModuleDocumentViewer` con propiedad de persistencia en `documentsService/documentRepositoriesService`.

---

## 4) Architectural Boundaries (límites y cruces)

- **UI → Servicios:**
  - UI llama métodos de `dynamicService` y de `documentsService/documentRepositoriesService`.

- **Servicios → Persistencia (DB/Storage):**
  - `dynamicService` escribe `sgc_*`.
  - `EvidenceUploader/SignaturePad` escriben storage.

- **Servicios → Runtime:**
  - `dynamicService` retorna `__runtime_internal_event`.

- **Runtime bridge → UI:**
  - UI espera el retorno/side-effect del `runtimeActivationLayer.activate`.

- **Storage → UI:**
  - `EvidenceUploader/SignaturePad` devuelven URLs hacia el UI para incluir en `values`/evidences.

---

## 5) Componentes estructurales (clasificación)

- **Core estructural (no eliminables):**
  - `dynamicService`
  - `runtimeActivationLayer.activate`
  - `DynamicModule`
  - `DynamicForm`
  - Engines base (`BaseGeneric`, `BaseChecklist`, `BaseMediciones`)
  - `DynamicRecordsView`

- **Infraestructura:**
  - Supabase client/storage (vía `getSupabaseClient`)
  - `usePdfViewerStore` (store de visor)

- **Extensiones:**
  - `ModuleDocumentViewer`, `DocumentModule` (documental)
  - `documentsService`, `documentRepositoriesService`

- **Reemplazables (manteniendo contratos observados):**
  - `Engines base` (manteniendo contrato props)
  - UI componentes admin `Configuration`, `FormBuilder` (si mantienen creación metadata)
  - `Export` (si aparece; `exportService`)

- **Cosméticos:**
  - badges, paneles/estilos (no afectan contratos).

---

## 6) Stability Index (según evidencia observable)

- **Muy estable:**
  - `dynamicService` (centraliza persistencia y retorna `__runtime_internal_event`)
  - `RuntimeActivationLayer.activate` (contrato validado por event.type/responseId/actorId/correlationId)

- **Estable:**
  - `DynamicModule`
  - `DynamicForm`
  - `DynamicRecordsView`
  - Engines base (soportan field_type)

- **Evolutivo:**
  - `ModuleDocumentViewer`, `DocumentModule` (documental condicionado)
  - `FormBuilder` (motor de administración; cambia si cambia modelo de field creation)

- **Cambiantes:**
  - `Configuration` (admin UI; contiene gating y flujo específico admin)

---

## 7) Change Impact Matrix (documental)

Si cambia una entidad, componentes afectados (observado en dependencia directa):

| Cambia… | Componentes afectados |
|---|---|
| `sgc_forms` (campos: engine_type, roles_allowed, id) | `DynamicModule`, `DynamicForm`, `Configuration`, `dynamicService` |
| `sgc_form_fields` (field_type, required, options, order_index, label/name) | `FormBuilder`, Engines base, `DynamicForm`, `DynamicRecordsView`, `dynamicService.getModuleResponses` |
| `dynamicService` | `DynamicModule`, `DynamicForm`, `DynamicRecordsView`, `Configuration`, `runtime bridge` |
| `runtimeActivationLayer` | `DynamicForm` (submit) y `DynamicRecordsView` (verify) |
| Engines base* | `DynamicForm` (render por engine_type + field_type), impacta criticidad y valores producidos |
| `roles_allowed` | `DynamicModule` (filtro catálogo), `DynamicForm` (gating) |
| `engine_type` | `DynamicForm` (switch engine) |
| `field_type` | Engines base, `DynamicRecordsView` (criticidad por field_type), `DynamicForm` (init valores) |
| `documentsService` | `DocumentModule`, `ModuleDocumentViewer` |

---

## 8) Flujo oficial extremo a extremo del Módulo Estándar (observado)

- **Configuration**
  ↓
- **FormBuilder**
  ↓
- **DynamicModule**
  ↓
- **DynamicForm**
  ↓
- **dynamicService**
  ↓
- **Persistencia** (DB sgc_* via dynamicService + storage evidences/signatures)
  ↓
- **RuntimeActivationLayer**
  ↓
- **DynamicRecordsView**

> No se describe lógica interna: solo relaciones observadas.

---

## 9) Arquitectura por capas observada (ubicación única)

- **Presentación:** `DynamicModule`, `DynamicForm`, `DynamicRecordsView`, `FormBuilder` (UI), `Configuration`, `ModuleDocumentViewer`, `DocumentModule`
- **Aplicación (orquestación UI):** `DynamicForm` (orquesta submit + bridge), `DynamicRecordsView` (orquesta verify + modal)
- **Servicios:** `dynamicService`, `documentsService`, `documentRepositoriesService`, `exportService` (si aplica)
- **Persistencia:** escritura/lectura DB en `dynamicService`, DB en `documentsService` y `documentRepositoriesService`, storage en Evidence/Signature/Documental.
- **Runtime:** `runtimeActivationLayer.activate()`
- **Infraestructura:** `usePdfViewerStore`, `getSupabaseClient` (cliente), storage bucket wiring
- **Storage:** bucket `documentos-sgc`

---

## 10) Dependency Ownership (quién usa/depende de quién)

- **DynamicModule**
  - Utiliza: `dynamicService`, `DocumentModule`, `DynamicRecordsView`, `ModuleDocumentViewer`
  - Dependen de él: navegación vía router
  - Puede existir aislado: no en el flujo estándar.

- **DynamicForm**
  - Utiliza: `dynamicService`, engines base, `EvidenceUploader`, `runtimeActivationLayer`
  - Depende de: metadata en `sgc_forms` y `sgc_form_fields`

- **dynamicService**
  - Utiliza: Supabase client
  - Es consumido por: Configuration/FormBuilder/DynamicModule/DynamicForm/DynamicRecordsView

- **runtimeActivationLayer**
  - Utiliza: BusinessEventTranslationLayer (interno), router (interno)
  - Consumido por: `DynamicForm`, `DynamicRecordsView` (puente)

- **EvidenceUploader / SignaturePad**
  - Utilizan: Supabase storage
  - Consumidos por: Engines (signature) y DynamicForm (evidence callback).

---

## 11) Núcleo mínimo reutilizable

Conjunto mínimo necesario para construir un nuevo módulo basado solo en metadata (sin crear nuevos componentes), según flujo observado:
- `DynamicModule`
- `DynamicForm`
- `dynamicService`
- Engines base (`BaseGeneric`, `BaseChecklist`, `BaseMediciones`)
- `DynamicRecordsView`
- `runtimeActivationLayer` (bridge)
- Metadata estándar en DB (`sgc_modules`, `sgc_forms`, `sgc_form_fields`) para que esos componentes puedan funcionar.

---

## 12) Componentes reemplazables

- **UI:** `Configuration` y `FormBuilder` son reemplazables si mantienen creación equivalente de `sgc_forms`/`sgc_form_fields`.
- **Engines base:** reemplazables manteniendo contrato props `{ fields, values, onChange }` y soporte de `field_type`.
- **Documental UI/Persistencia:** `ModuleDocumentViewer`, `DocumentModule` reemplazables si mantienen el flujo documental observado (no afecta el flujo estándar de submit/verify).
- **Viewer PDF:** reemplazable manteniendo el contrato store-prop `PdfViewerModal doc` y `onClose`.

---

## 13) Componentes no reemplazables (identidad arquitectónica)

- `dynamicService`
- `runtimeActivationLayer.activate`
- Flujo submit/verify/history gobernado por `sgc_*` + `__runtime_internal_event`

---

## 14) Diagrama maestro de arquitectura (ASCII, sin lógica)

```text
[Presentación]
Configuration ───────┐
FormBuilder ────────┐ │
DynamicModule ───────┴─┤
DynamicForm ───────────┤──▶ (Servicios)
DynamicRecordsView ────┤    dynamicService
Engines Base* ──────────┘    documentsService (documental)
                            documentRepositoriesService (documental)

[Runtime Bridge]
dynamicService ──returns──▶ __runtime_internal_event
                              │
                              ▼
                      runtimeActivationLayer.activate

[Persistencia/Storage]
DB: sgc_* + profiles
Storage: documentos-sgc (evidences, firmas, programas/documental)

[Documental (extensión)]
DocumentModule / ModuleDocumentViewer ⇄ documentos/documentRepositories + PdfViewerModal
```

---

## 15) Conclusión

- **Core oficial:** `dynamicService`, `runtimeActivationLayer.activate`, `DynamicModule`, `DynamicForm`, Engines base y `DynamicRecordsView`.
- **Arquitectura base:** flujo submit/verify/history gobernado por `sgc_*` y retorno `__runtime_internal_event`.
- **Infraestructura:** Supabase client/storage y store `usePdfViewerStore`.
- **Extensiones:** módulo documental vía `documentsService/documentRepositoriesService`.
- **Reemplazables:** motores base compatibles, UI admin, documental UI.
- **Nunca modificar sin evaluación arquitectónica:** `dynamicService` y `runtimeActivationLayer` (por contrato y flujo runtime).
- **Desacoplamiento de Trazabilidad:** El Módulo Estándar se define y se audita con evidencia de módulos estándar reutilizables (no se usa Trazabilidad como estándar).

---


