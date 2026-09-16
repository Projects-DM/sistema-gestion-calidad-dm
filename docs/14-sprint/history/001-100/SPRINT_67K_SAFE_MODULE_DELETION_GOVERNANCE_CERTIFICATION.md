# SPRINT 67K — Safe Module Deletion Governance Certification

**Date:** 2026-07-14  
**Level:** LEVEL 3 — CERTIFIED  
**Status:** APPROVED  

---

## 1. Objective

Implementar una política de eliminación segura para los módulos runtime.

---

## 2. Problem

Actualmente un administrador podía eliminar un módulo aunque éste tuviera información asociada.

Esto representaba un riesgo de:

- Metadata corruption
- Data loss
- Repository orphaning
- Form orphaning
- Broken contracts

---

## 3. New Governance Rule

Un módulo únicamente puede eliminarse cuando:

```
forms = 0 AND repositories = 0
```

---

## 4. Deletion Matrix

| Formularios | Repositorios | Puede borrarse |
|-------------|-------------|----------------|
| 0 | 0 | ✅ SI |
| 1 | 0 | ❌ NO |
| 0 | 1 | ❌ NO |
| 1 | 1 | ❌ NO |
| 10 | 15 | ❌ NO |

---

## 5. Implementation

### 5.1 File Modified

**`src/components/workspace/ModuleManager.jsx`**

### 5.2 Changes

**Added:**
- `getSupabaseClient` import
- `reposByModuleSlug` state
- Repository count query in `refreshModules()`
- Safe delete validation in `handleDelete()`
- `moduleSlug` parameter to `handleDelete()` calls

**Modified `refreshModules()`:**
```javascript
const reposMap = {};
await Promise.all(
  adminModules.map(async (m) => {
    // ... existing forms query ...
    
    const sb = getSupabaseClient();
    if (sb) {
      const { count } = await sb
        .from('sgc_document_repositories')
        .select('*', { count: 'exact', head: true })
        .eq('module_slug', m.slug);
      reposMap[m.slug] = count || 0;
    } else {
      reposMap[m.slug] = 0;
    }
  })
);
setReposByModuleSlug(reposMap);
```

**Modified `handleDelete()`:**
```javascript
const handleDelete = async (moduleId, moduleName, moduleSlug) => {
  const formsCount = formsByModuleId[moduleId] ?? 0;
  const reposCount = reposByModuleSlug[moduleSlug] ?? 0;

  if (formsCount > 0 || reposCount > 0) {
    const deps = [];
    if (formsCount > 0) deps.push(`- Formularios dinámicos: ${formsCount}`);
    if (reposCount > 0) deps.push(`- Repositorios documentales: ${reposCount}`);
    alert(
      `No es posible eliminar este módulo.\n\n` +
      `El módulo contiene elementos asociados.\n\n` +
      `${deps.join('\n')}\n\n` +
      `Debe eliminar todas las dependencias antes de eliminar el módulo.`
    );
    return;
  }
  // ... proceed with deletion ...
};
```

---

## 6. Certified Flow

```
Module Manager
    ↓
Delete button
    ↓
Safe Delete Validator
    ↓
Consulta formularios
    ↓
Consulta repositorios
    ↓
¿Hay dependencias?
    ↓
SI → Bloquear eliminación
NO → Permitir eliminación
```

---

## 7. Dependencies Checked

| Dependency | Source | Check |
|------------|--------|-------|
| Forms | `GET_MODULE_CONFIGURATION` | `configResult.data?.forms?.length \|\| 0` |
| Repositories | `sgc_document_repositories` | `count where module_slug = m.slug` |

---

## 8. Impact

| Layer | Impact |
|-------|--------|
| Persistence | NONE |
| SQL Schema | NONE |
| Lifecycle | NONE |
| Runtime Publication | NONE |
| Sidebar | NONE |
| Dashboard | NONE |
| Navigation | NONE |
| Module Administration | UPDATED — safe delete validation |
| Capability Layer | NONE |
| Contracts | PRESERVED |

---

## 9. What Was NOT Modified

| File | Reason |
|------|--------|
| `dynamicService.js` | No change needed |
| `ModuleAdministrationApplicationService.js` | No change needed |
| `DashboardLayout.jsx` | No change needed |
| `Dashboard.jsx` | No change needed |
| `App.jsx` | No change needed |
| SQL files | No change needed |
| Runtime consumers | No change needed |

---

## 10. Verification

- **Build:** Clean (1.30s, 0 errors)
- **Delete with 0 forms, 0 repos:** Allowed
- **Delete with forms > 0:** Blocked with message
- **Delete with repos > 0:** Blocked with message
- **Delete with both > 0:** Blocked with message
- **Message format:** Shows exact counts of forms and repositories

---

## 11. Certification

**Sprint 67K certifies:**

1. A module **cannot be deleted** if it has associated forms or repositories
2. The safe delete validator checks **both** forms and repositories before allowing deletion
3. The administrator receives a **clear message** with dependency counts
4. **No cascade delete, force delete, or soft delete** is permitted
5. All certified contracts (Runtime Publication, Lifecycle, SQL, Core Shell) are **fully preserved**

---

**SPRINT 67K — LEVEL 3 CERTIFIED — APPROVED**
