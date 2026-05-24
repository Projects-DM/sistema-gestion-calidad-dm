# 📁 PROJECT STRUCTURE BLUEPRINT — SGC-DM (React + Runtime + Persistence)
## Sistema de Gestión de Calidad (SGC-DM) — Blueprint de Estructura de Proyecto
**Autor:** Principal Enterprise Software Architect  
**Versión:** 1.0 (Project Structure Blueprint)  
**Estatus:** BORRADOR PARA REVISIÓN DOCUMENTAL  
**Clasificación:** Confidencial / Propiedad Técnica Integradora  

---

## 0. Propósito

Definir una **estructura real** de carpetas dentro de `src/` para implementar la arquitectura enterprise existente (metadata-driven, runtime-oriented, contract-based, audit-ready, offline-first, event-driven) en una base React + Supabase.

> [!IMPORTANT]
> Este documento **no exige cambios de código ahora**. Define el “cómo” debería estar organizado el proyecto para evitar acoplamientos y duplicaciones.

---

## 1. Principios de organización (enterprise)

1. **Ownership por capa**: cada carpeta representa responsabilidad y contratos claros.
2. **Ports & adapters**: las dependencias físicas (Supabase DB/Storage) quedan en `adapters/` (y providers).
3. **Runtime vs UI**: UI es presentacional; runtime orchestration vive en `runtime/` y `services/` de orchestration.
4. **Audit-ready por diseño**: `audit/` define el contrato documental de registro inmutable y correlación.
5. **Offline-first como flujo documental**:
   - `offline/` contiene contratos, colas y estados de borrador (draft snapshot).
6. **Event-driven sin acoplar**:
   - `events/` y `eventBus/` no conocen DB ni UI concreta.

---

## 2. Estructura propuesta (target state)

```txt
src/
  core/
    domain/                 // tipos conceptuales: payloads, contratos (sin lógica de DB)
    contracts/              // interfaces/contratos (IRuntimePersistenceLayer, error contracts, etc.)
    constants/              // enums de estados workflow, action_type audit, etc.
    ids/                    // generadores conceptuales (no ejecutables; solo convención)
    errors/                 // Error contract semántico (retryable/no)

  runtime/
    engine/                 // Dynamic Runtime Engine (interpretación metadata)
    state/                  // runtime_state slices (formSlice/workflowSlice/uploadQueue/draftSnapshot)
    execution/              // TransactionService orchestración (solo coordinación)
    validation/             // hooks/pipelines de validación runtime
    workflow/               // workflow orchestration (transiciones, permisos contextuales)

  rendering/
    layout/                 // componentes de layout reutilizables
    fields/                 // renderers de campos atómicos
    engines/                // BaseChecklist/BaseMediciones/etc como motores de layout

  persistence/
    orchestrator/           // PersistenceOrchestrator: implementa el port conceptual
    mapping/                // mapping EAV ↔ sgc_response_values (documental)
    retry/                  // retry/backoff contract wrappers (documental)
    saga/                   // compensación SAGA (documental)

  adapters/
    db/
      supabaseAdapter/     // SupabaseAdapter (DB)
      sqlAdapter/          // futuro
    storage/
      supabaseStorage/     // StorageProvider Supabase
      storageProvider/     // contrato StorageProvider
    auth/
      supabaseAuth/        // futuro si se abstrae auth

  events/
    bus/                    // Event Bus contrato + implementación in-process
    types/                  // catálogo de eventos (SGCEventType)
    subscribers/           // audit/analytics/alerta suscriptores (orquestados)

  audit/
    engine/                 // Audit Engine contractual: correlación y acción audit-ready
    log/                    // mapeo de action_type → sgc_audit_logs conceptualmente

  analytics/
    hooks/                  // analytics hooks post-commit (contractual)
    pipeline/               // ETL readiness (sin lógica ejecutable)

  offline/
    draft/
      draftSnapshot/       // modelo y TTL documental
    upload/
      uploadQueue/         // cola y estados documentales
    sync/
      syncPolicy/          // reglas de sincronización offline-first (documentales)

  ui/
    pages/
      DynamicModulePage.jsx // page container (presentational, delega a runtime)
      DynamicFormPage.jsx
      TraceabilityPage.jsx
    components/
      DocumentManager.jsx
      EvidenceUploader.jsx
      SignaturePad.jsx
    stateAdapters/
      runtimeAdapters/     // adaptaciones de store/prop drilling a UI

  services/
    orchestration/
      transactionService/  // TransactionService facade
      workflowService/     // workflow orchestración
      validationService/   // validation orchestration facade

  registry/
    formRegistry/           // acceso a metadata contracts (cache policy)
    componentRegistry/      // mapping engineType → renderer
```

---

## 3. Cómo mapear la estructura actual (src/*) a la propuesta

Estado actual relevante:
- `src/services/dynamicService.js` (alto acoplamiento a Supabase y tablas)
- `src/lib/supabase.js` (cliente singleton)
- `src/pages/*` y `src/components/*`

Recomendación blueprint:
- mover responsabilidad “DB queries directas” hacia `adapters/` conceptualmente
- usar `services/orchestration/transactionService` como facade
- el runtime debe llamar a un port `IRuntimePersistenceLayer` (contract), no a Supabase

> [!WARNING]
> No se propone “reescribir ya”; se documenta el target structure para cuando se realice el refactor.

---

## 4. Reglas de dependencias (permitidas/prohibidas)

### 4.1 Permitidas
- `runtime/*` depende de `core/contracts/*` y de `persistence/orchestrator/*` (port conceptual).
- `persistence/*` depende de `adapters/*`.
- `events/*` depende solo de `core/` y contratos de subscribers (no DB).

### 4.2 Prohibidas (para evitar vendor lock y duplicación)
- `ui/pages/*` no debe depender de `@supabase/supabase-js`.
- `services/*` no debe ejecutar SQL directo (debe delegar en adapters).
- `events/*` no debe depender de `supabase` ni de `sgc_*` tables directamente.

---

## 5. Ownership arquitectónico por carpeta

- **core/**: contratos, tipos, enums, semántica documental
- **runtime/**: orchestration runtime (payload build, state lifecycle conceptual)
- **persistence/**: orquestación y SAGA documental
- **adapters/**: proveedor físico (Supabase/Storage)
- **events/**: side-effects desacoplados con catálogo de eventos
- **audit/**: audit-ready engine conceptual y correlación
- **offline/**: draft snapshot, uploadQueue, syncPolicy documental
- **ui/**: presentational + integración con store runtime (sin DB directas)
- **analytics/**: post-commit hooks/eventual ETL readiness

---

## 6. Riesgos mitigados por esta estructura

- Vendor lock tecnológico (Supabase)
- duplicación de mapping EAV en múltiples services
- auditoría incompleta por mezclas de responsabilidades
- retry inconsistente (offline-first)
- overlaps de responsabilidades entre runtime, validation y persistence

---

**Fin del documento.**
