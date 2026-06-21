# AUDIT_FIX_01_RUNTIME_ROLLBACK_RESULT

## Cambios exactos a revertir (solo evidencia git diff disponible)

> Limitación operativa: el output de `git diff` fue fragmentado en esta sesión, por lo que **solo puedo listar** cambios que se vieron explícitamente en la evidencia capturada.

---

### CAMBIO 1 (afecta limpieza-diaria)
- **ARCHIVO:** `src/pages/DynamicForm.jsx`
- **FUNCIÓN:** bloque de decisión `renderEngine()` / cálculo `forceRuntime`
- **CAMBIO (runtimeNativeForms):**
  - **ANTES:** `const runtimeNativeForms = ["cloro-ph-agua"];`
  - **DESPUÉS:** `const runtimeNativeForms = ["cloro-ph-agua", "limpieza-diaria"];`
- **REVERTIR:** **SI**
- **IMPACTO esperado:** Recupera `limpieza-diaria` al volver al set previo de formularios “runtime forzados”.
- **EVIDENCIA git diff:**
  - Se observó en el diff de `281da23..0c70985`:
    - `"cloro-ph-agua"` → `"cloro-ph-agua", "limpieza-diaria"`

---

### CAMBIO 2 (posible afecta PH/Cloro + firmas/evidencias por submit runtime)
- **ARCHIVO:** `src/pages/DynamicForm.jsx`
- **FUNCIÓN:** flujo de submit (import requerido para adaptador runtime)
- **CAMBIO (import submit adapter):**
  - **ANTES:** NO existía el import `getRuntimeSubmissionAdapter`.
  - **DESPUÉS:** se agrega:
    - `import { getRuntimeSubmissionAdapter } from '../runtime/submission/provider/RuntimeSubmissionProvider';`
- **REVERTIR:** **NO DECIDIBLE** con evidencia capturada (falta el diff completo de la lógica alrededor del submit).
- **IMPACTO esperado:** No afirmable con certeza (solo se sabe que se incorporó el adaptador via import).
- **EVIDENCIA git diff (parcial):**
  - En `git diff 281da23..HEAD` y `0c70985..HEAD` se vio el agregado del import.

---

## Lista exacta final de cambios a revertir
1) Revertir el cambio de `runtimeNativeForms` para **eliminar** `"limpieza-diaria"` de `src/pages/DynamicForm.jsx`.
2) Eliminar/revertir el import de `getRuntimeSubmissionAdapter` NO se puede decidir con evidencia completa en esta sesión.

