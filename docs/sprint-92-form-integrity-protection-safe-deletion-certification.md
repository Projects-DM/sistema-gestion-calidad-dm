# Sprint 92 — Form Integrity Protection & Safe Deletion Workflow Certification

**Tipo:** Metadata Governance & Safe Deletion Architecture
**Estado:** LEVEL 3 — CERTIFIED
**Depende de:** Sprint 91 — Responsive Metadata Priority & Administrative UI Certification
**Branch:** `operativo-v1`
**Build:** 0 errores, 2701 módulos, 2.29s
**Archivos modificados:** 1

---

## Objetivo

Certificar que un formulario no puede ser eliminado mientras posea campos configurados asociados. La eliminación pasa a ser un proceso seguro y secuencial que protege la estructura operacional previamente configurada por los administradores.

## Problema identificado

Era posible eliminar un formulario accidentalmente con todos sus campos configurados, provocando pérdida inmediata de la configuración y del tiempo invertido en la construcción de estructuras documentales complejas.

## Filosofía oficial

```
SAFE DELETION FIRST
  → BUSINESS INTEGRITY FIRST
    → FIELDS FIRST
      → FORM LAST
```

Un formulario es considerado un **contenedor arquitectónico** de sus campos configurados. No puede desaparecer si todavía posee componentes hijos activos.

## Workflow implementado

```
Eliminar formulario
       ↓
contar campos en sgc_form_fields WHERE form_id = ?
       ↓
  ┌── count > 0 ──→ Bloquear con mensaje ──→ Cancelar
  └── count = 0 ──→ Confirmar ──→ DELETE sgc_forms ──→ OK
```

### Caso 1 — Formulario con campos

```
No es posible eliminar este formulario.

Este formulario posee campos configurados.

Por políticas de integridad del sistema debe eliminar previamente
todos los campos asociados antes de eliminar el formulario.
```

### Caso 2 — Formulario sin campos

Flujo normal: confirmación → eliminación → recarga.

## Reglas certificadas

| # | Regla | Estado |
|---|-------|--------|
| 1 | Formulario con uno o más campos no puede eliminarse | ✅ |
| 2 | Validación antes de ejecutar cualquier operación de eliminación | ✅ |
| 3 | El usuario debe eliminar manualmente los campos configurados | ✅ |
| 4 | Formulario sin campos puede eliminarse normalmente | ✅ |
| 5 | Prohibido eliminar campos automáticamente al eliminar formulario | ✅ |

## Cambio realizado

### `src/pages/Configuration.jsx` — Líneas 116-139

```js
const handleDeleteForm = async (formId) => {
    try {
      const supabase = (await import('../lib/supabase')).getSupabaseClient();
      const { count, error: countError } = await supabase
        .from('sgc_form_fields')
        .select('id', { count: 'exact', head: true })
        .eq('form_id', formId);
      if (countError) throw countError;
      if (count > 0) {
        alert(
          'No es posible eliminar este formulario.\n\n' +
          'Este formulario posee campos configurados.\n\n' +
          'Por políticas de integridad del sistema debe eliminar previamente ' +
          'todos los campos asociados antes de eliminar el formulario.'
        );
        return;
      }
      if (!window.confirm('¿Eliminar este formulario y todas sus respuestas?')) return;
      await supabase.from('sgc_forms').delete().eq('id', formId);
      await loadInitialData();
    } catch (error) {
      alert('Error eliminando: ' + error.message);
    }
  };
```

**Antes:** `confirm` → `delete` — sin validación previa, pérdida total de campos.

**Después:** `count fields` → `if count > 0 block` → `confirm` → `delete`.

## Arquitectura

```
Dynamic Forms (Configuration.jsx)
  ↓
Validation Layer (inline, antes del delete)
  ↓
¿Tiene campos? → Sí → Bloquear
              → No → Delete Service (sgc_forms DELETE)
  ↓
Persistencia existente (sin cambios)
```

## Principios arquitectónicos

| Principio | Aplicación |
|-----------|-----------|
| SAFE DELETION FIRST | Eliminación protegida con validación previa |
| BUSINESS INTEGRITY FIRST | Protección de configuraciones existentes |
| REUSE FIRST | Se reutiliza el cliente Supabase existente |
| ZERO DATA LOSS | Evita eliminaciones accidentales |
| HUMAN VALIDATION FIRST | El administrador elimina conscientemente los campos |
| ZERO NEW TABLES | Persistencia intacta |
| ZERO RUNTIME CHANGES | Runtime intacto |
| SCALABILITY FIRST | Política reutilizable para futuros recursos protegidos |

## Futuro de la política

Este mismo patrón de validación (`count children before delete`) puede aplicarse a:

- Módulos (ya implementado en ModuleManager)
- Repositorios documentales
- Motores dinámicos
- Cualquier recurso administrativo con dependencias hijas

## Criterios de certificación

| # | Criterio | Estado |
|---|----------|--------|
| 1 | Formularios con campos no pueden eliminarse | ✅ `count > 0` bloquea antes del confirm |
| 2 | Se valida existencia de campos antes de eliminar | ✅ `SELECT id ... count: 'exact'` antes del DELETE |
| 3 | Se informa claramente el motivo del bloqueo | ✅ alert con texto completo del bloqueo |
| 4 | No se eliminan campos automáticamente | ✅ Solo se aborta la operación, no hay DELETE en sgc_form_fields |
| 5 | Eliminación funciona cuando no existen campos | ✅ `count = 0` → confirm → delete normal |
| 6 | No se modifica la persistencia | ✅ Sin cambios en tablas, schemas ni migraciones |
| 7 | No se modifica el Runtime | ✅ Sin cambios en DynamicForm, engines ni renderizado |
| 8 | Política de integridad certificada | ✅ Safe Deletion Workflow oficial |
| 9 | Cero pérdida accidental de configuraciones | ✅ Bloqueo total si existen campos |
| 10 | Arquitectura preparada para recursos protegidos futuros | ✅ Patrón `count → block/allow` reusable |
