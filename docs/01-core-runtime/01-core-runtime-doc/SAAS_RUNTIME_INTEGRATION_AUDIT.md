# SAAS_RUNTIME_INTEGRATION_AUDIT.md

IMPORTANTE

- NO IMPLEMENTAR CAMBIOS.
- NO MODIFICAR CÓDIGO.
- NO CREAR ARCHIVOS NUEVOS.
- NO REFACTORIZAR.
- SOLO INSPECCIÓN PROFUNDA + DOCUMENTACIÓN.

> Alcance ejecutado en esta corrida: **evidencia del SaaS existente** (no provider-factory) usando lectura puntual de archivos visibles y sus dependencias directas.

---

## CONTEXTO

Runtime Engine (provider-factory) ya está auditado. El SaaS existente (UI + servicios Supabase + servicios de trazabilidad/datos dinámicos) será evaluado para:

1) Estado real de módulos
2) Nivel de acoplamiento
3) Calidad de identidad de datos
4) Escalabilidad
5) Compatibilidad con capas Runtime Engine (Audit/Analytics/Scoring/Decision/Selection)
6) Riesgos de integración
7) Plan de adaptación futuro

---

## FASE 1 — INVENTARIO GLOBAL DEL SISTEMA (SaaS UI + Services)

### Módulos identificados por rutas en App.jsx

1) **Login**
- Ruta: `/login`
- Implementación: `src/pages/Login.jsx`
- Estado estimado: **~70%**
- Evidencia: App.jsx enruta a Login; Auth se gestiona en `AuthContext.jsx`.

2) **Dashboard**
- Ruta: `/dashboard`
- Página: `src/pages/Dashboard.jsx`
- Estado estimado: **~60%**

3) **Trazabilidad (Módulo 10 UI container)**
- Ruta: `/trazabilidad`
- Container: `src/pages/Traceability.jsx`
- Estado estimado: **~85%** (UI de navegación y acceso a submódulos)

4) **Despachos / Historial / Reportes / Búsqueda (submódulos UI)**
- Ruta base: `/trazabilidad/despachos` (mismo componente `Dispatches.jsx`)
- Página: `src/pages/Dispatches.jsx`
- Estado estimado: **~80%**

5) **Certificados**
- Ruta: `/trazabilidad/certificados`
- Página: `src/pages/Certificates.jsx`
- Estado estimado: **~40-60%**
- Evidencia: usa `DocumentManager` (no auditado aquí a detalle).

6) **Fichas técnicas**
- Ruta: `/trazabilidad/fichas-tecnicas`
- Página: (según App) `DynamicModule` con `moduleSlug`.

7) **Configuración**
- Ruta: `/configuracion`
- Página: `src/pages/Configuration.jsx`
- Estado estimado: **~60%**

8) **Usuarios**
- Ruta: `/usuarios`
- Página: `src/pages/Users.jsx`
- Estado estimado: **~60%**

9) **Módulos/Formularios dinámicos**
- Rutas:
  - `/:moduleSlug` → `src/pages/DynamicModule.jsx`
  - `/modulo/:moduleSlug/:formSlug` → `src/pages/DynamicForm.jsx`
- Estado estimado: **~85%** (por existencia de `dynamicService.js`)

10) **Runtime Playground**
- Ruta: `/runtime-playground`
- Página: `src/runtime/playground/RuntimePlaygroundSandbox.tsx`
- Estado: **~40%** (no evaluado a detalle; es sandbox)

---

## FASE 2 — IDENTITY MODEL AUDIT (calidad de identidad)

### Fuentes de identidad observadas (evidencia de archivos inspeccionados)

1) **Usuarios / Roles**
- Identidad: `session.user.id` (Supabase Auth)
- Perfil: tabla `profiles` via `AuthContext.jsx`
- Rol: `profile.rol` y mapeos derivados en el contexto.
- Riesgo: mapeo de rol a string; no hay contrato explícito a runtime.

2) **Respuestas / Evidencias / Formularios dinámicos**
- Evidencia: `dynamicService.js`
- Entidad principal: `sgc_form_responses`
- Evidencias: `sgc_evidences`
- Audit: `sgc_audit_logs` por acción.
- Valores EAV: `sgc_response_values` con campos `value_text/value_number/value_boolean/value_json`.

3) **Despachos**
- Entidad principal (evidencia): tabla `despachos`
- Identity UI:
  - `record.id` (se asume UUID)
  - `displayId()` solo “visual” (`DESP-${short}`)

### Hallazgos de consistencia/escala

- **IDs no escalables** (riesgo de acoplamiento UI/visual):
  - `displayId` es derivación visual; no es identidad semántica.
- **IDs no unificados tipo Runtime Engine**:
  - Runtime Engine requiere `correlationId/transactionId/recoveryId` (conceptual).
  - SaaS usa PKs de Supabase (`id` de tablas) y estados (`status`, `estado`).
  - No se observa un `correlationId` unificado a través de operaciones.

Conclusión de identidad: **PARTIAL** (funcional, pero no alineada a contratos runtime para replay/analytics deterministas).

---

## FASE 3 — AUDITABILITY REPORT (quién hizo qué / reconstrucción histórica)

### 3.1 Módulo Formularios dinámicos (dynamicService)
Evidencia de audit:
- `submitFormResponse()` inserta `sgc_audit_logs` con `action_type: 'create'`.
- `verifyFormResponse()` inserta `sgc_audit_logs` con `action_type: 'verify'`.
- `getAuditLogs(responseId)` consulta audit logs y trae `profiles:modified_by`.

Clasificación auditabilidad para formularios: **READY/PARTIAL (dependiendo de correlación)**
- READY: existe tabla audit por evento.
- PARTIAL: falta mapeo determinista de correlación/eventId/cadena completa para runtime.

### 3.2 Módulo Trazabilidad/Despachos (Dispatches + despachosService)
- Se detecta que `despachosService.js` **no** incluye escritura audit por despacho.
- En `Dispatches.jsx` se gestiona estado “Completado” y se realiza CRUD sobre `despachos`.

Clasificación auditabilidad para despachos: **NOT_READY** como fuente de Audit Layer runtime (no hay “who/when/how” audit por operación).

---

## FASE 4 — EVENT MODEL REPORT (eventos reales)

Eventos reales observados:
- Para formularios dinámicos:
  - `FORM_CREATED` (aprox: `sgc_audit_logs.action_type='create'`)
  - `FORM_VERIFIED` (aprox: `action_type='verify'`)
- Para despachos:
  - Eventos “implícitos” por CRUD (create/update/delete), pero no se evidencia tabla de eventos/audit.

Conclusión: **PARTIAL** global. Formularios: parcial listo. Despachos: faltan eventos.

---

## FASE 5 — SCALABILITY REPORT

### 5.1 Despachos
Evidencia:
- `fetchDespachos()` → `sb.from('despachos').select('*').order('created_at', { ascending: false })`
- UI filtra en memoria.

Riesgo para 10k/100k/1M:
- **ALTO**: select completo + sin paginación; probable degradación.

### 5.2 Formularios dinámicos
Evidencia: `dynamicService.getModuleResponses(moduleId)` usa select con joins (sgc_response_values, evidencias, perfiles, etc.).

Riesgo:
- **MEDIO-ALTO** por joins y sin paginación visible.

---

## FASE 6 — SERVICE LAYER AUDIT (DB + lógica)

### Evidencia servicios inspeccionados

1) `src/services/dynamicService.js`
- Mezcla responsabilidades:
  - construcción payloads (EAV mapping)
  - persistencia (Supabase inserts/updates)
  - audit (insert en `sgc_audit_logs`)
  - validaciones ligeras (inputs/estado)

Clasificación: **HIGH COUPLING**.

2) `src/services/despachosService.js`
- Similar acoplamiento:
  - transformación (payload mapping)
  - persistencia direct Supabase.
- No hay audit por despacho.

Clasificación: **HIGH COUPLING**.

---

## FASE 7 — RUNTIME COMPATIBILITY AUDIT (capas)

> Clasificar usando READY/PARTIAL/REQUIRES_REFACTOR/CRITICAL.

### 7.1 Formulario dinámico (sgc_form_responses + sgc_audit_logs)
- Audit Layer: **PARTIAL**
- Analytics Layer: **REQUIRES REFACTOR** (falta pipeline consistente para determinismo runtime)
- Scoring Layer: **REQUIRES REFACTOR**
- Decision Layer: **REQUIRES REFACTOR**
- Selection Layer: **REQUIRES REFACTOR**

### 7.2 Trazabilidad/Despachos (despachos)
- Audit Layer: **CRITICAL** (sin audit/event contract)
- Analytics Layer: **CRITICAL**
- Scoring Layer: **CRITICAL**
- Decision Layer: **NOT READY**
- Selection Layer: **NOT READY**

---

## FASE 8 — INTEGRATION RISK REPORT

Principales riesgos:
1) **Falta de event contract determinista** en despachos
2) **Acoplamiento Supabase** en servicios que mezclan audit/persist/transform
3) **Identidad no unificada** (no se observan correlationId/transactionId/recoveryId)
4) **Escalabilidad** deficiente en despachos (select completo + sin paginación)
5) **Atomicidad transaccional** no garantizada en varios flujos (múltiples inserts secuenciales)

---

## FASE 9 — PRIORITY MATRIX (sin proponer cambios; solo ranking futuro)

P0 (obligatorio antes de Sprint 23.0)
- Definir event contract unificado para operaciones que alimentan Audit Layer
- Identidad/correlación unificada para mapear eventos a runtime
- Paginación/filtros en endpoints de alto volumen (despachos)

P1
- Adapter layer para desacoplar Supabase en servicios críticos
- Normalización de métricas derivables para Analytics/Scoring

P2
- Formalización de workflows como máquina contractual (Decision/Selection)

---

## FASE 10 — FINAL EXECUTIVE REPORT

### A) Estado actual del SaaS
- Funcional para operación UI con Supabase y módulos dinámicos.
- Audit existe para formularios dinámicos.
- Trazabilidad/Despachos: faltan eventos/audit por registro.

### B) Fortalezas
- Modelo EAV en `sgc_response_values` permite flexibilidad de formularios.
- `sgc_audit_logs` existe para formularios (create/verify).
- Integración UI para ver evidencias y auditoría.

### C) Debilidades
- Acoplamiento alto services↔DB.
- Identidad no unificada a runtime contract.
- Despachos: falta auditoría/eventos.
- Escalabilidad: select completo en `despachos`.

### D) Bloqueantes para Runtime
- **CRITICAL/NOT READY** en despachos por falta de audit/event model.
- **REQUIRES REFACTOR** en analytics/scoring/decision/selection por ausencia de pipeline determinista.

### E) Módulos integrables inmediatamente
- Formularios dinámicos: **PARTIAL** (posible vía Audit Layer con adaptación de contratos/events).

### F) Módulos que requieren refactor
- Trazabilidad/Despachos: **CRITICAL**
- Analytics/Scoring/Decision/Selection mapping: **REQUIRES REFACTOR** (runtime expects normalized inputs)

### G) Porcentaje global de preparación
- Estimación global: **~35%**
  - 15-20% por audit/formularios
  - 0-5% por despachos
  - resto por incompatibilidad con runtime capas de inteligencia

### H) Veredicto final
- **NOT READY** para integración directa total del SaaS al Runtime Engine.

---

## Clasificación por módulo (sumario)
- Usuarios: PARTIAL
- Formularios dinámicos: PARTIAL
- Trazabilidad/Despachos: CRITICAL
- Dashboard/Reportes: REQUIRES REFACTOR


