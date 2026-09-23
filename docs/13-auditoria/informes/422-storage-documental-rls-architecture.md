# AUD-422 — Auditoría de arquitectura RLS del Storage del Repositorio Documental

## 1. Resumen ejecutivo

El fallo es un rechazo **Storage INSERT** (no tabla): `uploadRecord()` construye `{module}/{type}/...` cuyo primer segmento (`calidad-agua`) no coincide con ninguna política viva (`programs`, `evidencias`, `firmas`) → `WITH CHECK = FALSE` → `StorageApiError` en `documentsService.js:100`, antes de cualquier INSERT de tabla. Esto invalida y precisa Sprint 421 (su hipótesis tabla-RLS era consistente con su evidencia, pero la evidencia live posterior demuestra el rechazo anterior en Storage). Recomendación: **política genérica acotada por exclusión** (bucket + admin/calidad + activo + primer segmento `NOT IN ('firmas','evidencias','programs')`) — escalable sin políticas por módulo, sin tocar dominios gobernados. Modelos A (por módulo) y C (buckets separados) rechazados/diferidos con justificación. Nada implementado (READ-ONLY).

## 2. Alcance

READ-ONLY: código (`documentsService`, `DocumentModule`, `ModuleDocumentViewer`, `documentRepositoriesService`, `EvidenceUploader`, `SignaturePad`), SQL versionado (`docs/12-database`), evidencia live provista (policies Storage, RLS tablas, perfiles). Sin CREATE/ALTER/DROP, datos, Storage, código, config, commits funcionales.

## 3. Evidencia del incidente

`StorageApiError: new row violates row-level security policy` en `documentsService.js:100` (`POST .../storage/v1/object/documentos-sgc/... 400`), ruta `documentos-sgc/calidad-agua/FILTRO SANITARIO /1790123520039_CV-Esteban-Jimenez-Moreno.pdf`. Espacio final en `FILTRO SANITARIO `: hallazgo de higiene — irrelevante para RLS (decide el **primer** segmento), relevancia funcional potencial en matcheo exacto `type=category_key` (Sprint 56) y URLs; recomiendo sanitizar el segmento `type` en el sprint fix. Tablas con RLS on (`sgc_programs`, `sgc_records`) y roles consistentes (`administrador`/`calidad` verificados, UUID = auth.users) descartan la vía identidad.

## 4. Flujo real de carga

`handleUpload/handlePhotoUpload` → `uploadRecord(moduleSlug, categoryKey, file, user.id)` → `filePath = {module}/{type}/{ts}_{safe}` (segmentos module/type **sin sanitizar**; solo filename pasa `safeStorageName`) → `storage.upload()` → **RECHAZO AQUÍ** → nunca llega a `sgc_records`. Vía programas (`uploadProgram` → `programs/...`) sí satisface su política.

## 5. Inventario de rutas Storage

| Flujo | Bucket | Primer segmento | Roles (política viva) | Op |
|---|---|---|---|---|
| Programas | documentos-sgc | `programs` | admin/calidad+activo | INSERT ✓ |
| Registros (Repositorio) | documentos-sgc | **dinámico (`{module}`)** | **ninguna** | INSERT ✗ siempre |
| Evidencias | documentos-sgc | `evidencias` | admin/calidad/operativo+activo | INSERT ✓ |
| Firmas | documentos-sgc | `firmas` | cualquier authenticated | INSERT ✓ |

Único bucket en `src/`; `documentRepositoriesService` **no toca Storage** (solo catálogo); lecturas por `getPublicUrl` (bucket de facto público; sin `createSignedUrl` en código).

## 6. Inventario de políticas RLS

Vivas provistas (dashboard, **no versionadas**): 3 INSERT por prefijo + SELECT/DELETE admin(/calidad) referenciadas (estas últimas por evidencia provista, no re-verificadas aquí). Versionadas en repo: **cero** de Storage (`docs/12-database` solo tablas; fix 43.4 es table-level). Históricas vs actuales: sin versionado no hay linaje — deuda de trazabilidad (hallazgo).

## 7. Relación entre roles y políticas

Modelo efectivo: rol = `profiles.rol` + `activo=true` evaluado por subconsulta `EXISTS` por cada INSERT. Admin/calidad cubiertos en `programs`; operativo solo en `evidencias`; firmas sin rol. El dominio Repositorio Documental carece de fila en esta matriz → denegación por defecto (correcto como fail-closed, incorrecto como omisión de diseño).

## 8. Separación de dominios de Storage

`documentos-sgc` mezcla 4 dominios: `firmas/` (abierto), `evidencias/` (operativo incluido), `programs/` (admin/calidad), `{modulo}/` dinámico (sin regla). La mezcla es el hecho arquitectónico que la recomendación debe respetar.

## 9. Análisis de escalabilidad

Cualquier `moduleSlug` nuevo (ex.: `plagas/`, `residuos/`) repite el fallo sin tocar RLS. El conjunto de módulos es abierto (wizard `CreateModuleWizard`, `OperationalExperienceRegistry`), luego el modelo debe ser por **clase de path**, no por enumeración.

## 10. Riesgos de seguridad

P1: ¿admin+calidad en todo el bucket? NO — cubriría `firmas/` (dominio abierto: inocuo en la práctica pero semánticamente invasivo) y anticiparía cobertura sobre futuros prefijos restringidos. P2: distinción sin enumerar → **exclusión negativa** (`NOT IN`) sobre dominios gobernados. P3: ¿separar buckets? Limpio a largo plazo, pero exige migrar objetos + 4 sitios con `BUCKET_NAME` hardcodeado + backfill: desproporcionado para hotfix. P4: convención de prefijos estable SÍ existe de facto (`firmas/`, `evidencias/`, `programs/` + `{modulo}/`). P5: con exclusión, expansión residual ≈ nula (calidad ya incluida en evidencias; firmas ya abiertas).

## 11. Causa raíz confirmada

`foldername(name)[1] = 'calidad-agua' ≠ 'programs'` (ni otro prefijo gobernado) → ninguna `WITH CHECK` se satisface → rechazo determinista en **Storage INSERT**, para **todos** los roles y módulos del flujo records. Corrige y precisa a Sprint 421: su análisis tabla-RLS era válido con su evidencia, pero la evidencia live ubica el fallo un paso antes.

## 12. Alternativas arquitectónicas evaluadas

**A (política por módulo): rechazado** — O(n) policies, cada módulo nuevo exige DDL, viola §13. **B (genérica total): rechazado** — invade dominios gobernados y pre-autoriza futuros prefijos. **C (buckets separados): diferido** — ideal a largo plazo, costo migratorio injustificado ahora. **D (adoptado): B acotado por exclusión** — genérico donde debe serlo, ciego donde no.

## 13. Arquitectura recomendada

Evidencia: §5–§8. Problema: dominio dinámico sin regla + mezcla de dominios. Diseño objetivo: una sola política INSERT `documental-module-upload` (authenticated; bucket + admin/calidad + activo + `foldername[1] NOT IN ('firmas','evidencias','programs')`) + SELECT/DELETE espejo admin(/calidad) para el mismo ámbito + sanitización del segmento `type` en `uploadRecord` + versionado de las 3 políticas manuales existentes. Corrección (sprint siguiente, NO aquí): migración SQL versionada + cambio mínimo en `documentsService.js:96` + backfill documental.

## 14. Modelo objetivo de autorización

Tabla `storage.objects`: `firmas/` (abierto, intacto) · `evidencias/` (admin/calidad/operativo, intacto) · `programs/` (admin/calidad, intacto) · `{otro}/` (admin/calidad + **nueva política**) · resto igual. Tablas `sgc_programs`/`sgc_records`: pendientes de la propuesta Sprint 421 (segunda capa, tras desbloquear Storage).

## 15. Impacto sobre módulos futuros

Nuevo módulo → ruta `{slug}/...` → cubierto automáticamente (cero DDL). Sin riesgo para firmas/evidencias/programs (excluidos por diseño).

## 16. Migración propuesta

Archivo versionado nuevo (ex.: `docs/12-database/supabase/migrations/…_documental_storage_domain.sql`): `CREATE POLICY … FOR INSERT TO authenticated WITH CHECK (bucket + rol + activo + NOT IN…)` (+ espejos SELECT/DELETE acotados tras verificar publicidad del bucket) + `UPDATE` de código mínimo (sanitizar `type`) + versionado declarativo de las 3 policies manuales como documentación. Rollback: `DROP POLICY` inverso.

## 17. Matriz de pruebas

Casos 1–4 (admin/calidad × módulo actual/nuevo): permitido. 5–6 (operativo/consulta subir): rechazado. 7–10 (lecturas): según política (bucket público de facto; confirmar). 11–12 (admin eliminar; calidad según política espejo). 13–14 (operativo/consulta eliminar): rechazado. Más: `type` con espacios sanitizado; categorías con match exacto; regresión evidencias/firmas/programs.

## 18. Riesgos residuales

Allowlist implícita por exclusión (auditar ante nuevos prefijos); `getPublicUrl` público de facto (confirmar intención); policies manuales aún sin versionar hasta el fix; segunda capa tabla-RLS (Sprint 421) pendiente tras Storage.

## 19. Archivos analizados

`documentsService.js` (121 lin), `DocumentModule.jsx`, `ModuleDocumentViewer.jsx:230-309`, `documentRepositoriesService.js` (sin Storage), `EvidenceUploader.jsx:25-80`, `SignaturePad.jsx:85-109`, `docs/12-database/**` (cero policies Storage), evidencia live provista (§4–§5 spec), Sprint 421 (precisado, no contradicho en su evidencia).

## 20. Conclusión

**Pregunta §21: autorización por clase con exclusión negativa** — admin/calidad + bucket + activo + `NOT IN (firmas, evidencias, programs)`; escalable sin policies por módulo, dominios intactos, mínimo privilegio, versionable. Implementar exclusivamente en el siguiente sprint.
