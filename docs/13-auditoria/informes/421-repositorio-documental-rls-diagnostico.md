# Sprint 421 — Diagnóstico RLS del Repositorio Documental

## 1. Identificación del sprint

SPRINT 421 · Auditoría técnica/diagnóstico · READ-ONLY · rama `operativo` · sin cambios funcionales (verificado §20).

## 2. Fecha

2026-09-22 (ventana de auditoría; solo lectura + este informe).

## 3. Rama auditada

`operativo` (lectura del árbol de trabajo; sin `switch`, sin commits, sin pushes).

## 4. Objetivo

Determinar con evidencia por qué la carga documental falla con "new row violates row-level security policy" y definir la corrección mínima para un sprint posterior, preservando el modelo admin/calidad.

## 5. Síntoma reportado

```text
Error al subir documento: new row violates row-level security policy
```

Emitido por `alert()` en `DocumentModule.jsx:74` y `ModuleDocumentViewer.jsx:291` con `error.message` de Supabase (error de tabla, no de Storage).

## 6. Flujo auditado

Usuario autenticado → Repositorio Documental → selección PDF/imagen → `uploadProgram`/`uploadRecord` → **Storage `documentos-sgc` OK** → `getPublicUrl` → **INSERT `sgc_programs`/`sgc_records` → RECHAZO RLS**. El Storage acepta (el error es posterior, con mensaje de tabla).

## 7. Código involucrado

- `src/components/DocumentModule.jsx:59-79,106` → `documentsService.uploadProgram(module, file, user.id)`.
- `src/modules/documentViewer/ModuleDocumentViewer.jsx:277-295` → `documentsService.uploadRecord(moduleSlug, categoryKey, file, user.id)`.
- `src/services/documentsService.js:29-63` (programas: Storage → `getPublicUrl` → UPDATE-or-INSERT `sgc_programs` con `{module,name,file_url,storage_path,created_by}`) y `:93-113` (registros: INSERT `sgc_records` con `{module,type,name,file_url,storage_path,created_by}`).
- Rol: `useAuth()` → `profiles.rol` (literales `administrador/calidad/...`, idénticos al enum DB; sin gating UI adicional en el admin — el control es DB).
- Vía admin nueva (`documentRepositoriesService.js`) → `sgc_document_repositories/categories` (NO genera este error; tiene policies 43.4).

## 8. Tabla involucrada

`sgc_programs` y `sgc_records` (legacy; `1-inventario-maestro.md:81` las declara legacy intactas). Payload real: `{module[,type],name,file_url,storage_path,created_by=user.id}`. Sin DDL versionado en el repo (creadas fuera de control de versiones).

## 9. Storage involucrado

Bucket `documentos-sgc`; upload OK previo al fallo; `getPublicUrl` (sin signed URLs). Sin policies de Storage versionadas (solo comentario de dashboard en `schema.sql:96-98`). **Descartado como origen**: el mensaje es de RLS de tabla, posterior al upload.

## 10. Policies RLS relevantes

Búsqueda exhaustiva en `docs/12-database` (único SQL versionado): **cero policies para `sgc_programs`/`sgc_records`**. Cobertura versionada existente: `profiles`, `sgc_forms/fields`, `sgc_document_repositories/categories` (fix 43.4, patrón `EXISTS profiles admin/calidad`), `despachos/productos/documentos/usuarios`. Conclusión: la vía de escritura que la UI usa para subir documentos **carece de definición RLS versionada**.

## 11. Modelo de autorización

Frontend `profiles.rol` ⇄ DB `user_role ENUM ('administrador','calidad','operativo','consulta','conductor')` ⇄ policies `p.rol IN (...)`: **sin discrepancia de nomenclatura** (minúsculas exactas). `created_by = user.id` de sesión = `auth.uid()` esperado. Default `rol='consulta'` (usuarios nuevos quedan fuera de admin/calidad hasta asignación — operativo, no defecto).

## 12. Evidencia encontrada

1. Error string → INSERT/UPDATE `sgc_programs`/`sgc_records` (líneas exactas §7). 2. Storage acepta antes (orden del código). 3. Vacío total de policies versionadas para esas tablas. 4. Fix 43.4 cubrió solo tablas nuevas que el flujo de subida NO usa. 5. Roles/created_by consistentes (descarta mismatch de identidad/nombre).

## 13. Causa raíz

**Gobernanza RLS incompleta sobre la vía legacy de escritura documental.** El INSERT/UPDATE de `sgc_programs`/`sgc_records` llega a una tabla con RLS habilitado pero **sin política WITH CHECK versionada que lo ampare** (o con una cuya condición no se satisface), mientras la corrección 43.4 aseguró solo las tablas nuevas. Clasificación: *policy RLS ausente/insuficiente + condición WITH CHECK no satisfecha en tablas legacy*. **Incertidumbre residual explícita**: el DDL/policies vivos de esas tablas están fuera del repo (dashboard/migración antigua); la condición exacta bloqueante (ausencia total vs WITH CHECK fallido) debe confirmarse contra Supabase vivo (`pg_policies`, flag RLS) en el sprint de corrección. No se inventa más.

## 14. Impacto

Afectados: Administrador y Calidad (misma vía, sin distinción en `documentsService`); también Operativo/Consulta si lo intentan (bloqueo correcto por defecto, pero por ausencia de policy, no por diseño). Operaciones: creación (INSERT) y reemplazo (UPDATE en `uploadProgram`) de documentos; lectura/descarga no evidencian fallo (SELECT parece pasar); Storage y resto de módulos (`sgc_evidences`, occurrence ledger) no afectados.

## 15. Propuesta de corrección (NO implementar aquí)

1. Confirmar en vivo: `SELECT policyname,cmd,roles,qual,with_check FROM pg_policies WHERE tablename IN ('sgc_programs','sgc_records')` + flag RLS. 2. Migración versionada (`docs/12-database/supabase/migrations/`, patrón 43.4): `ENABLE ROW LEVEL SECURITY` si falta; INSERT `WITH CHECK (EXISTS profiles admin/calidad)`; UPDATE USING+WITH CHECK admin/calidad (vía replace); DELETE admin; SELECT sin cambios (la lectura funciona). 3. Prohibido: `USING/WITH CHECK (true)`, desactivar RLS. 4. Riesgos: usuarios `consulta` por defecto seguirán bloqueados hasta asignación (operativo); sin cambios en Storage/RLS ajenos. 5. Si en vivo RLS estuviera desactivado: re-diagnosticar (FK/trigger), no asumir.

## 16. Matriz de pruebas futuras

| Rol | Subir documento | Resultado esperado |
|-----|-----------------|-------------------|
| Administrador | Sí | Permitido |
| Calidad | Sí | Permitido |
| Operativo | Según permisos actuales | Bloqueado (sin policy que lo ampare) |
| Consulta | Según permisos actuales | Bloqueado |

Más: reemplazo de programa existente (UPDATE), lectura/descarga intactas, categorías admin, sin regresión en evidencias/occurrence.

## 17. Riesgos/consideraciones

Corrección en tablas legacy sin DDL versionado: auditar primero el vivo; migración solo aditiva de policies; mínimo privilegio preservado (admin/calidad); ventana controlada con rollback (DROP POLICY inverso versionado).

## 18. Archivos revisados

`DocumentModule.jsx`, `ModuleDocumentViewer.jsx:230-309`, `documentsService.js` (121 lin), `documentRepositoriesService.js` (targets), `rls_sgc_document_repositories_fix.sql`, `SQL_SPRINT_43_2_*.sql`, `roles_setup.sql`, `schema.sql` (storage), `AuthContext` (vía AUD-416), `1-inventario-maestro.md:81`, audits Sprint 324/326/327/45-10 (corroboran modelo).

## 19. Conclusión

Causa raíz determinada con evidencia: **vía de escritura legacy sin cobertura RLS versionada mientras el fix 43.4 aseguró solo tablas nuevas**; condición exacta pendiente de confirmación viva. Propuesta mínima lista para sprint separado.

## 20. Confirmación de que NO se realizaron cambios funcionales

`git status`: únicamente `?? 421-repositorio-documental-rls-diagnostico.md`. Cero modificaciones en código, SQL, policies, Storage, config, ramas, remotos. Sin commits/pushes.
