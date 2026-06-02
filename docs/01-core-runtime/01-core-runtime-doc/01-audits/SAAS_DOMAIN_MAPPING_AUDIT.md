# SAAS_DOMAIN_MAPPING_AUDIT.md

IMPORTANTE

* NO IMPLEMENTAR CAMBIOS
* NO MODIFICAR CÓDIGO
* NO CREAR TABLAS
* NO CREAR MIGRACIONES
* NO REFACTORIZAR

SOLO INSPECCIÓN Y DOCUMENTACIÓN

---

## OBJETIVO
Construir el mapa arquitectónico completo del SaaS actual. El Runtime Engine NO es el foco principal de esta auditoría.

**Base de evidencia (esta corrida):**
- Estructura de rutas en `src/App.jsx`
- Contexto y autenticación `src/context/AuthContext.jsx`
- Servicio dinámico `src/services/dynamicService.js`
- Servicio de despachos `src/services/despachosService.js`
- UI de trazabilidad/despachos `src/pages/Traceability.jsx`, `src/pages/Dispatches.jsx`
- Conversión/parseo Excel `src/utils/dispatchesExcel.js`
- Export PDF `src/utils/dispatchesPdf.js`
- Config `src/config/dispatchesConfig.js`

---

## FASE 1 — DOMAIN DISCOVERY

A continuación se listan dominios funcionales detectados (UI/service/DB-backing) en el SaaS.

### 1) Usuarios (Auth + Perfil)
- **Responsabilidad:** autenticación, resolución de rol, flags de UI.
- **Componentes UI:**
  - `src/pages/Login.jsx`
  - `src/context/AuthContext.jsx` (perfil + rol)
  - `ProtectedRoute`, `RoleGate` (no inspeccionados en esta corrida, pero usados en rutas)
- **Services asociados:** `getSupabaseClient()`.
- **Tablas utilizadas (evidencia):** `profiles`
- **Dependencias:** Supabase Auth + RLS/tabla profiles.

### 2) Formularios dinámicos (Configuración + ejecución dinámica)
- **Responsabilidad:** render de módulos y formularios; submit y verificación.
- **Componentes UI:**
  - `src/pages/DynamicModule.jsx`
  - `src/pages/DynamicForm.jsx`
  - `src/components/FormBuilder.jsx`
  - `src/components/DynamicRecordsView.jsx` (historial/verificación de formularios)
- **Services asociados:** `src/services/dynamicService.js`.
- **Tablas utilizadas:**
  - `sgc_modules`
  - `sgc_forms`
  - `sgc_form_fields`
  - `sgc_form_responses`
  - `sgc_response_values`
  - `sgc_evidences`
  - `sgc_audit_logs`
  - `profiles` (joins para verificación/audit)
- **Dependencias:** modelo EAV, Supabase.

### 3) Trazabilidad / Despachos
- **Responsabilidad:** registro, edición, importación masiva y exportación de despachos.
- **Componentes UI:**
  - `src/pages/Traceability.jsx` (navegación)
  - `src/pages/Dispatches.jsx` (CRUD + import Excel + export PDF)
  - `src/components/ExcelUploadModal.jsx` (entrada Excel; no auditado a detalle)
- **Services asociados:** `src/services/despachosService.js`.
- **Tablas utilizadas (evidencia):** `despachos`
- **Dependencias:** Supabase + parsers Excel + PDF.

### 4) Certificados (gestión documental)
- **Responsabilidad:** contenedor de documentos/categorías.
- **Componentes UI:** `src/pages/Certificates.jsx`, `src/components/DocumentManager.jsx`.
- **Services asociados:** no inspeccionados.
- **Tablas utilizadas:** no inspeccionadas en esta corrida.
- **Dependencias:** DocumentModule/DocumentManager.

### 5) Fichas técnicas
- **Responsabilidad:** repositorio/documentación técnica.
- **Componentes UI:** ruta en `App.jsx` → `TechnicalSheets.jsx`.
- **Services asociados:** no inspeccionados en esta corrida.
- **Tablas utilizadas:** no inspeccionadas.

### 6) Configuración
- **Responsabilidad:** configuración del sistema.
- **Componentes UI:** `src/pages/Configuration.jsx`.
- **Services asociados:** no inspeccionados.
- **Tablas utilizadas:** no inspeccionadas.

### 7) Usuarios (administración)
- **Responsabilidad:** gestión de usuarios/roles.
- **Componentes UI:** `src/pages/Users.jsx`.
- **Services asociados:** no inspeccionados.
- **Tablas utilizadas:** probablemente `profiles` (no confirmado en esta corrida).

### 8) Dashboard y estadísticas
- **Responsabilidad:** KPIs y vistas generales.
- **Componentes UI:** `src/pages/Dashboard.jsx`.
- **Services asociados:** `dynamicService.getDashboardStats()` es evidencia probable.
- **Tablas utilizadas (probable):** `sgc_form_responses`.
- **Dependencias:** joins/contadores.

---

## FASE 2 — ENTITY INVENTORY

Inventario (tabla → propósito → ownership domain) con evidencia.

| Tabla | Propósito (según uso) | PK (observado) | FK (observado) | Owner Domain |
|---|---|---|---|---|
| `profiles` | identidad de usuario + rol | `id` (inferred) | — | Usuarios |
| `sgc_modules` | módulos para construir formularios | `id` (inferred) | — | Formularios dinámicos |
| `sgc_forms` | formularios por módulo | `id` (inferred) | `module_id` | Formularios dinámicos |
| `sgc_form_fields` | campos EAV por formulario | `id` (inferred) | `form_id` | Formularios dinámicos |
| `sgc_form_responses` | instancias de respuesta por formulario | `id` (inferred) | `form_id`, `created_by` | Formularios dinámicos |
| `sgc_response_values` | valores EAV por respuesta/field | — (likely `id`) | `response_id`, `field_id` | Formularios dinámicos |
| `sgc_evidences` | evidencias asociadas a respuestas | `id` (inferred) | `response_id` | Formularios dinámicos |
| `sgc_audit_logs` | auditoría operativa de create/verify | `id` (inferred) | `response_id`, `modified_by` | Formularios dinámicos (Auditoría) |
| `despachos` | registro de despachos (uno por fila) | `id` (UUID, inferred) | — (no joins observados) | Trazabilidad |

> Nota: otras tablas relacionadas (p.ej. `sgc_modules`/`sgc_forms`) no tienen PK/FK explícitas en la evidencia leída aquí (solo inferidas por queries `.eq('module_id', ...)`).

---

## FASE 3 — OWNERSHIP MAP

- **profiles → Usuarios**
  - Owned by Auth/Profile domain.
- **sgc_modules, sgc_forms, sgc_form_fields → Formularios dinámicos / Configuración de formularios**
- **sgc_form_responses → Formularios dinámicos (ejecución)**
- **sgc_response_values → Formularios dinámicos (valores EAV)**
- **sgc_evidences → Formularios dinámicos (evidencias)**
- **sgc_audit_logs → Auditoría (operativa) dentro del dominio de formularios**
  - ownership es de la misma área (dynamicService escribe audit).
- **despachos → Trazabilidad**

**Ownership ambiguo detectado (hallazgos):**
- Auditoría existe de forma clara para formularios (sgc_audit_logs), pero **no** se observa equivalencia para despachos.
- “Verificación” existe para formularios (status/verified_at), pero no para despachos (estado fijo “Completado”).

---

## FASE 4 — DEPENDENCY MAP (mapa de dependencias)

### Formularios dinámicos
- DynamicModule/Form → sgc_modules → sgc_forms → sgc_form_fields
- Submit/verify → sgc_form_responses → sgc_response_values → sgc_evidences
- Create/verify → sgc_audit_logs
- Visualización de historial → sgc_form_responses + joins a sgc_response_values/evidences + sgc_audit_logs

### Trazabilidad / Despachos
- Dispatches UI → despachosService (CRUD) → `despachos`
- Import Excel → dispatchesExcel.js → insertDespachosBatch → `despachos`
- Export PDF → dispatchesPdf.js → usa `records` (no DB)

### Usuarios
- AuthContext → profiles → UI gates

---

## FASE 5 — EVENT DISCOVERY (eventos naturales observados)

A partir de la evidencia en servicios/queries:

### Formularios dinámicos (eventos explícitos por `sgc_audit_logs.action_type`)
- `create` (registrado como `action_type: 'create'`)
  - Evento lógico: **FORM_CREATED**
- `verify` (registrado como `action_type: 'verify'`)
  - Evento lógico: **FORM_VERIFIED**

### Despachos (eventos implícitos)
- No se observa `dispatch_audit_logs`.
- Los cambios son CRUD sobre `despachos`:
  - creación: insert
  - actualización: update
  - eliminación: delete

Eventos lógicos inferidos:
- **DISPATCH_IMPORTED** (import Excel → insert batch)
- **DISPATCH_UPDATED** (update)
- **DISPATCH_DELETED** (delete)

### Otros
- No se detectaron eventos explícitos adicionales en evidencia leída.

---

## FASE 6 — DOMAIN HEALTH REPORT

Clasificación por dominio (solo evidencia de esta corrida):

- **Usuarios:** PARTIAL
- **Formularios dinámicos:** READY (audit/event exists para create/verify)
- **Trazabilidad/Despachos:** CRITICAL (falta event/audit por despacho)
- **Dashboard:** PARTIAL (posible por stats, se observan mocks en otros puntos)
- **Certificados:** REQUIRES REFACTOR (no inspeccionado suficiente)
- **Fichas técnicas:** REQUIRES REFACTOR (no inspeccionado suficiente)
- **Configuración:** REQUIRES REFACTOR (no inspeccionado suficiente)

---

## FASE 7 — EXECUTIVE REPORT

### A) Domain Map
- Usuarios, Formularios dinámicos, Trazabilidad/Despachos, Certificados, Fichas técnicas, Configuración, Dashboard.

### B) Entity Map
- Tabla listada en Fase 2 (profiles/sgc_* / despachos).

### C) Ownership Map
- Un dominio dueño claro para formularios/audit y uno para despachos.

### D) Dependency Map
- Formularios dependen de EAV + audit.
- Despachos dependen de CRUD simple sin audit.

### E) Event Map
- Formularios: create/verify (explícitos).
- Despachos: eventos implícitos (CRUD sin audit).

### F) Domain Health Report
- Ver Fase 6.

### G) Final Verdict
- Producto SaaS está construido para operación UI con Supabase.
- Para integración Runtime determinista, el punto crítico es **Trazabilidad/Despachos** por falta de modelo de eventos/audit consistente.

