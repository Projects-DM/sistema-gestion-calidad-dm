# SPRINT_45_12 — ARCHITECTURAL EVOLUTION RULES (SSOT)

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

Este documento **no** describe la arquitectura (ya documentada en los Sprint 45.9–45.11A). Define **reglas oficiales de evolución** del Módulo Estándar para garantizar que la SSOT se mantenga consistente durante el desarrollo.

---

## 0) Fuentes de evidencia (exclusivas)
- Sprint 45.9 — Standard Contract Map
- Sprint 45.10 — Standard Dependency Map
- Sprint 45.10A — Refinement
- Sprint 45.11 — Standard Core Architecture (SSOT Final)
- Sprint 45.11A — Architecture Certification Review

---

## 1) Invariantes arquitectónicos (no negociables)

### I1) Persistencia/pipeline de módulos (`dynamicService`)
- **Motivo:** es el único lugar observado que ejecuta el flujo de `submit`/`verify` y produce `__runtime_internal_event`.
- **Evidencia:** `dynamicService.submitFormResponse` escribe `sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs` y retorna `__runtime_internal_event`.
- **Impacto si cambia:** rompe submit/verify, rompe historial y/o rompe puente runtime.
- **Compatibilidad hacia atrás:** debe preservar estructura y semántica observada del retorno y escrituras.

### I2) Contrato del Runtime Bridge (`__runtime_internal_event` → `runtimeActivationLayer.activate`)
- **Motivo:** el bridge valida el contrato `event.type in {create, verify}` y requiere `responseId`, `actorId`, `correlationId`.
- **Evidencia:** `RuntimeActivationLayer.activate` valida `type`, `responseId`, `actorId`, `correlationId`.
- **Impacto si cambia:** runtime no se activa y el sistema pierde el efecto documentado del puente.
- **Compatibilidad hacia atrás:** mantener campos requeridos y tipos observados.

### I3) Estructura metadata mínima de ejecución
- **Motivo:** engines base y persistencia dependen de `sgc_forms` + `sgc_form_fields` para construir `values`/EAV.
- **Evidencia:** `DynamicForm` lee `sgc_forms.engine_type/roles_allowed` y `sgc_form_fields.field_type/required/options`.
- **Impacto si cambia:** rompe render, validación y mapeo EAV.

### I4) Pipeline end-to-end gobernado por SSOT
- **Motivo:** la SSOT define relaciones y orden documental observado (create→submit→persist→runtime→history/verify).
- **Evidencia:** Sprint 45.8 y 45.9/45.10.
- **Impacto si cambia:** rompe coherencia del SSOT.

---

## 2) Reglas oficiales para modificar componentes (Core)

> Clasificación: **Puede cambiar libremente / Puede extenderse / Puede reemplazarse / No debe modificarse / Debe mantener compatibilidad**.

### 2.1 `DynamicModule`
- Puede extenderse: lógica UI de catálogo/tab **sin** romper rutas/params observadas.
- Puede reemplazarse: si mantiene el contrato de entrada/salida documental (moduleSlug → catálogo de formSlug y gating por rol).
- No debe modificarse: comportamiento de descubrimiento y gating por `roles_allowed`.
- Debe mantenerse compatible: `DynamicModule` debe seguir consumiendo `dynamicService.getModuleBySlug` y `getFormsByModule`.

### 2.2 `DynamicForm`
- Puede cambiar libremente: presentación, orden UI, exportaciones si no afectan submit.
- Puede extenderse: validaciones UI derivadas de metadata.
- No debe modificarse: contrato de `dynamicService.submitFormResponse` + disparo de `runtimeActivationLayer.activate` usando `__runtime_internal_event`.
- Debe mantenerse compatible: props/contrato hacia engines base `{ fields, values, onChange }`.

### 2.3 `DynamicRecordsView`
- Puede extenderse: filtros/tabla UI.
- No debe modificarse: dependencias sobre `dynamicService.getModuleResponses`, `getAuditLogs`, `verify*`.
- Debe mantenerse compatible: uso de `runtimeActivationLayer.activate` en verify.

### 2.4 `Configuration`
- Puede cambiar libremente (UI admin).
- Debe mantenerse compatible: flujo que permite crear `sgc_forms` (y que habilita FormBuilder para `sgc_form_fields`).

### 2.5 `FormBuilder`
- Puede extenderse: controles UI de creación de campos.
- No debe modificarse: persistencia en `sgc_form_fields` (campos observados) y soporte de orden mediante `order_index`.

### 2.6 Engines base: `BaseGeneric`, `BaseChecklist`, `BaseMediciones`
- Puede extenderse: render por `field_type` existente (sin nuevos tipos) y presentación.
- Puede reemplazarse: solo manteniendo contrato props y comportamiento de `onChange(field.id,val)`.
- No debe modificarse: compatibilidad de `field_type` existentes y generación de valores esperada por `dynamicService` (typed values → EAV).

### 2.7 `runtimeActivationLayer`
- Debe mantenerse compatible: validación del contrato `event.type`, `responseId`, `actorId`, `correlationId`.
- No debe modificarse salvo revisión arquitectónica obligatoria (ver sección 10).

### 2.8 `dynamicService`
- No debe modificarse salvo revisión arquitectónica obligatoria (ver sección 10).
- Debe mantener compatibilidad: orden documental de escrituras, retorno con `__runtime_internal_event` y semántica de audit `create/verify`.

---

## 3) Reglas para evolución de metadata

> Clasificación de cambios:
- **Compatible** (no rompe)
- **Compatible con restricciones**
- **Breaking Change**

### 3.1 Agregar módulos
- **Compatible.** (si metadata `sgc_modules` y relaciones con `sgc_forms` respetan el modelo observado)

### 3.2 Agregar formularios
- **Compatible con restricciones:** debe existir `module_id`, `engine_type` soportado y `roles_allowed` consistente.

### 3.3 Agregar campos
- **Compatible con restricciones:** `sgc_form_fields.field_type` debe ser soportado por engines base; `options` debe seguir estructura observada (number: min/max/unit; select: choices).

### 3.4 Agregar `engine_type`
- **Breaking Change** si no se extiende el switch documental de DynamicForm (o se rompe compatibilidad de props hacia engines).
- Debe requerir revisión arquitectónica obligatoria.

### 3.5 Agregar `field_type`
- **Breaking Change** si no se implementa compatibilidad de render/validación/persistencia en cadena observada (engine → values → submit → EAV).

### 3.6 Modificar `options`
- **Compatible con restricciones:** mantener llaves esperadas por engines base (min/max/unit; choices).

### 3.7 Modificar `roles_allowed`
- **Compatible.** (gating UI depende de metadata)

### 3.8 Modificar `required`
- **Compatible.** (validación UI depende de metadata)

### 3.9 Modificar criticidad
- **Compatible con restricciones:** criticidad deriva de boolean false y number fuera de min/max.

### 3.10 Modificar evidencias
- **Compatible con restricciones:** evidence mapping depende de `dynamicService.submitFormResponse` y storage bucket/documentos.

---

## 4) Evolución de contratos (Major/Minor/Patch)

> Referencia: Sprint 45.9 (Contract Map).

### 4.1 Inmutables (Major)
- No eliminar propiedades del retorno `dynamicService.submitFormResponse` que contengan `__runtime_internal_event`.
- No cambiar el contrato requerido de `runtimeActivationLayer.activate`:
  - `event.type` ∈ {create, verify}
  - `responseId`, `actorId`, `correlationId` requeridos.

### 4.2 Extendibles (Minor)
- Se permite agregar propiedades a objetos retornados, **si no** eliminan ni cambian tipos de campos requeridos.

### 4.3 Correcciones (Patch)
- Cambios internos de forma que no alteren la firma/contrato observable.

---

## 5) Reglas para nuevos engines

Si aparece un nuevo `engine_type`:
- Debe respetar el contrato props observado por DynamicForm → Engine:
  - `fields`, `values`, `onChange`.
- Debe producir cambios con la misma semántica:
  - `onChange(field.id,val)` donde `val` sea compatible con `dynamicService.submitFormResponse` para EAV (number/boolean/object/string).
- Debe no romper:
  - validación requerida (`field.required`) y soporte de evidencia/firma cuando field_type lo exige.
- Nunca romper:
  - `DynamicForm` debe seguir pudiendo renderizar con switch documental o equivalencia observada.

---

## 6) Reglas para nuevos field_type

Si se incorpora `field_type` futuro (scanner, barcode, qr, gps, camera, audio, video, etc.):
- **Compatibilidad:** solo es compatible si:
  - existe engine base compatible o extensión equivalente que renderice,
  - produce un `val` que el submit puede mapear a `value_*` en EAV,
  - opcionalmente usa evidencia/firma solo si existe contrato de storage/props equivalente.
- Componentes consumidores probables:
  - Engines base
  - DynamicForm (init values + evidenciaRequired rules)
  - dynamicService (EAV mapping)
  - DynamicRecordsView (lectura y criticidad, si aplica)

---

## 7) Reglas de compatibilidad (definiciones)

- **Compatible:** el sistema sigue funcionando con el mismo flujo observado.
- **Compatible con migración:** requiere completar metadata existentes (p.ej. poblar options/roles_allowed) sin cambiar contrato.
- **Breaking Change:** rompe flujo observado de submit/verify/history o contrato de runtime bridge o EAV mapping.

Aplicar a:
- metadata
- UI
- services
- runtime
- storage
- contratos

---

## 8) Versionado arquitectónico (reglas documentales)

- **Major:** cambio de contrato, eliminación de propiedades requeridas, cambio de event contract, cambio de semántica de EAV mapping.
- **Minor:** agregar compatibilidad extendiendo opciones/propiedades sin romper requeridos; agregar engine_type soportado.
- **Patch:** ajustes internos sin afectar contratos observables.

---

## 9) Change Impact Rules (Core)

Regla documental (para revisión obligatoria):

- Si cambia `dynamicService` → revisar `DynamicForm`, `runtimeActivationLayer`, `DynamicRecordsView`, y SSOT Contracts.
- Si cambia `runtimeActivationLayer` → revisar `DynamicForm`, `DynamicRecordsView`.
- Si cambia engines base → revisar `DynamicForm` + criticidad/evidenceRequired en UI.
- Si cambia `sgc_forms` → revisar `DynamicModule`, `DynamicForm`.
- Si cambia `sgc_form_fields` → revisar `FormBuilder`, engines base, `DynamicRecordsView` (join para criticidad).
- Si cambia `roles_allowed` → revisar gating en `DynamicModule` y `DynamicForm`.
- Si cambia evidencia/firma storage → revisar `EvidenceUploader`, `SignaturePad`, `dynamicService.submitFormResponse`.
- Si cambia documental (`documentsService`/`documentRepositoriesService`) → revisar `DocumentModule`/`ModuleDocumentViewer`.

---

## 10) Architectural Review Rules (revisión obligatoria)

Requiere revisión arquitectónica obligatoria si ocurre cualquiera:
- nuevo servicio
- nuevo runtime
- nuevo engine
- nuevo contrato
- nuevo storage o cambios de bucket/ruta usadas
- nuevo modelo de metadata
- nuevo pipeline de persistencia

---

## 11) Extensibilidad (clasificación)

- metadata: **Alta** (agregar módulos/form/fields mientras se respete soporte de engine/field_type)
- engines: **Media** (requieren compatibilidad de props + EAV typing)
- field_type: **Media-Baja** (depende de soporte en chain engine→submit→EAV→render history)
- documental: **Media** (condicionado por tab habilitada)
- runtime: **Baja** (contrato puente debe mantenerse)
- services: **Media** (solo si no rompen contratos)
- UI: **Alta** (cosmética/filtros UI)

---

## 12) Riesgos de evolución

- duplicación de lógica (criticidad/required/evidenceRequired)
- acoplamiento accidental (UI→runtime/event contract)
- nuevos engines incompatibles con EAV typing
- metadata inconsistente (field_type u options faltantes)
- contratos divergentes (submit vs verify vs history)
- runtime paralelo o contrato no compatible
- servicios duplicados para persistencia/bridge

---

## 13) Reglas oficiales del SSOT (lista compacta)

- **Siempre** agregar nuevos formularios mediante metadata (`sgc_forms`).
- **Nunca** modificar `dynamicService` sin revisar Contracts y el contrato `__runtime_internal_event`.
- **Siempre** mantener compatibilidad de `__runtime_internal_event` con `runtimeActivationLayer.activate`.
- **Nunca** romper props del Engine Base (`fields`, `values`, `onChange`).
- **Siempre** preservar `field_type` existentes.
- **Nunca** eliminar propiedades públicas del contrato observable de submit (`submitFormResponse` + retorno con `__runtime_internal_event`).
- **Siempre** preservar semántica de audit `action_type` (`create`/`verify`) observada.

---

## 14) Checklist obligatorio antes de cambios arquitectónicos

- □ ¿Rompe contratos observados (Sprint 45.9)?
- □ ¿Rompe runtime bridge (`event.type/create|verify`, ids)?
- □ ¿Rompe metadata mínima (sgc_forms + sgc_form_fields)?
- □ ¿Rompe submit (`sgc_form_responses`, `sgc_response_values`, `sgc_evidences`, `sgc_audit_logs`)?
- □ ¿Rompe verify (update + insert audit)?
- □ ¿Rompe engines base compatibility (`onChange(field.id,val)`)?
- □ ¿Rompe mapping EAV (value_* por tipo)?
- □ ¿Requiere migración de metadata o datos?
- □ ¿Requiere versión Major/Minor/Patch documental?
- □ ¿Requiere actualización de SSOT docs (45.9–45.12)?

---

## 15) Dictamen final

- **Estabilidad:** Estable
- **Evolución:** compatible con metadata-driven growth
- **Extensión:** Alta en metadata; Media en engines/field_type
- **Mantenimiento:** Medio (alta dependencia de contratos de submit/verify/history)
- **Riesgo de regresión:** Medio (cualquier cambio en `dynamicService`/bridge rompe core)
- **Madurez del SSOT:** Congelable (condicionada a respetar invariantes I1–I4)

### Preguntas explícitas
- ¿La arquitectura está preparada para crecer mediante metadata sin modificar el Core?
  - **Sí**, mientras `engine_type` y `field_type` sean compatibles con engines base y el EAV mapping.
- ¿Qué partes deben permanecer congeladas?
  - `dynamicService` contract/retorno `__runtime_internal_event`, `runtimeActivationLayer.activate` contract, y estructura observada de `sgc_*` para submit/verify/history.
- ¿Qué partes están diseñadas para evolucionar?
  - `sgc_forms`, `sgc_form_fields` (metadata), UI admin/catálogos (sin romper contratos).
- ¿Existen riesgos arquitectónicos que impidan iniciar una etapa intensiva de desarrollo?
  - **No** impiden iniciar, pero cualquier cambio en contratos o bridge requiere revisión obligatoria.

</content>
