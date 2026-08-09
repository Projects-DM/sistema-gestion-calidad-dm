# SPRINT 270 — Capability Persistence Recovery & Assignment Path Correction

> **Tipo:** Targeted Architecture Correction / Persistence Recovery  
> **Nivel:** LEVEL 5 — CONTROLLED CORRECTION  
> **Estado:** READY FOR IMPLEMENTATION / PLANNING COMPLETED  
> **Branch:** `release/stable-sprint79`  
> **Precedente:** Sprint 269 — Operational Experience & Capability Assignment Integrity Audit  
> **Objetivo:** Recuperar el write-path de `ASSIGN_CAPABILITIES` sin modificar la arquitectura existente.

---

## 1. OBJETIVO

Corregir exclusivamente las causas identificadas en el **Sprint 269** que impiden la persistencia correcta de las capacidades durante la creación de módulos.

El objetivo funcional es conseguir que el flujo completo opere de forma consistente:

```text
Create Module
      ↓
CREATE_MODULE
      ↓
ASSIGN_CAPABILITIES
      ↓
Capability Persistence
      ↓
CHANGE_MODULE_STATE
      ↓
Module = configurable
```

funcione correctamente cuando el administrador seleccione:
* Diligenciar registros;
* Historial y consulta;
* Repositorio documental;
* Experiencias Operacionales;
* múltiples capacidades;
* todas las capacidades.

---

## 2. PRINCIPIO ARQUITECTÓNICO

> **RESTORE EXISTING CONTRACTS — DO NOT CREATE NEW ARCHITECTURE**

La solución debe reutilizar la arquitectura actualmente existente. Queda estrictamente prohibido introducir una nueva arquitectura para solucionar un defecto de implementación.

---

## 3. RESTRICCIONES ABSOLUTAS Y SCOPE

### 3.1 Restricciones
- **No cambiar la arquitectura:** Se conservan intactos `ModuleAdministrationApplicationService`, `CapabilityAssignmentService`, `AssignmentValidationEngine`, `AssignmentTransactionManager`, `ModuleCapabilityPersistenceAdapter`, `ModuleCapabilityResolver` y `CapabilityPublicSetAdapter`.
- **No cambiar el modelo de dominio:** Cero cambios en dominios de Alertas, Despachos u otras Experiencias Operacionales.
- **No cambiar desacoplamiento:** El Core se mantiene agnóstico a la BD. No se introducen consultas directas a Supabase dentro del Core o Dominio.
- **No hacer refactorización:** No se renombran, limpian ni reestructuran componentes no relacionados.

### 3.2 Scope Permitido
```text
A. Verificación de columna capabilities JSONB en sgc_modules.
B. Asignación de capacidades en ASSIGN_CAPABILITIES write-path.
C. Preservación y propagación de errores técnicos originales en ApplicationError.
D. Integridad de validación en AssignmentValidationEngine usando CapabilityPackageRegistry.
E. Corrección del comportamiento de Fallback en CapabilityPublicSetAdapter.
F. Filtrado de módulos en estado draft en getRuntimeModules().
```

---

## 4. PLAN DE CAMBIOS TÉCNICOS

### 4.1 Componente A — Validación de Paquetes (`AssignmentValidationEngine.js`)
* Validar que cada `assignment.packageId` (formato `pkg:standard:<key>`) corresponda a un paquete registrado en `CapabilityPackageRegistry`.
* Rechazar solicitudes con `packageId` desconocido devolviendo un error determinístico de validación.

### 4.2 Componente B — Propagación de Errores (`AssignmentTransactionManager.js` & `ModuleAdministrationApplicationService.js`)
* En `AssignmentTransactionManager.js`, asegurar que la excepción original de persistencia quede capturada y adjunta en `error.cause`.
* En `ModuleAdministrationApplicationService.js`, extraer recursivamente el mensaje de error raíz de `error.cause` e incluirlo en `originalMessage` y en los registros de diagnóstico, manteniendo el contrato limpio hacia la UI.

### 4.3 Componente C — Corrección de Fallback (`CapabilityPublicSetAdapter.js`)
* Ajustar el camino de *fallback* para módulos sin capacidades persistidas (`capabilities` igual a `null` o `[]`):
  - Mantener fallback para paquetes legacy de core (`forms`, `records`).
  - Para `operational-experiences`, establecer `enabledExperiences` como array vacío `[]`, evitando la concesión universal no autorizada de todas las experiencias operacionales.

### 4.4 Componente D — Filtrado de Módulos Runtime (`dynamicService.js`)
* En `getRuntimeModules()`, añadir condición para excluir módulos en estado `draft` (`state != 'draft'`), evitando la fuga de módulos incompletos al Dashboard o Sidebar.

---

## 5. PLAN DE VERIFICACIÓN Y PRUEBAS

### Matriz de Pruebas Obligatorias:
* **TEST 270.1 (Sin capacidades):** Crear módulo sin capacidades → Estado `draft`, sin capacidades no autorizadas.
* **TEST 270.2 (Diligenciar registros):** Crear módulo con `forms` → Persistencia y resolución correcta.
* **TEST 270.3 (Historial):** Crear módulo con `records` → Persistencia y resolución correcta.
* **TEST 270.4 (Repositorio):** Crear módulo con `repository` → Comportamiento conservado.
* **TEST 270.5 (Despachos):** Crear módulo con `operational-experiences` (`dispatches`) → Persistencia exacta de `enabledExperiences`.
* **TEST 270.6 (Alertas):** Crear módulo con `operational-experiences` (`alertas`) → Persistencia y resolución correcta.
* **TEST 270.7 (Todas las capacidades):** Seleccionar todas las capacidades → Verificación de `SELECCIONADO = PERSISTIDO = RESUELTO`.

### Regresión Crítica:
* Confirmar funcionamiento continuo e inalterado de los *control positives*: **Diligenciar registros** e **Historial y consulta**.

---

## 6. DEFINICIÓN DE DONE

El sprint se considerará **CERTIFICADO** cuando:
1. `ASSIGN_CAPABILITIES` se ejecute sin excepciones para 1, múltiples o todas las capacidades.
2. `CAPABILITIES PERSISTENCE` refleje exactamente en la base de datos las capacidades seleccionadas en la UI.
3. `ENABLED EXPERIENCES PERSISTENCE` persista únicamente las experiencias operacionales elegidas.
4. `RUNTIME RESOLUTION` resuelva la interfaz del módulo basándose en la persistencia real sin activar fallbacks universales.
5. Las pruebas de regresión se completen con resultado **PASS**.

---
*SPRINT 270 — PLANIFICACIÓN Y CORRECCIÓN CONTROLADA*
