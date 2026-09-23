# Sprint 423 — Implementación de arquitectura Storage (informe técnico)

## Problema / causa raíz
Rechazo Storage INSERT en `uploadRecord()` (`documentsService.js:100`): primer segmento dinámico `{module}/` sin política (AUD-422).

## Solución
Namespace positivo `repositorio/{module}/{type}/{file}` + policies por dominio + segmentos sanitizados. Sin `NOT IN`, sin bucket genérico, sin policies por módulo.

## Archivos modificados (commit 107d036, sin push)
- `src/services/documentsService.js` (+29/−3): `REPOSITORIO_NAMESPACE`, `sanitizePathSegment()` (rechaza `/`, `\`, `..`, vacíos; trim de espacios), `buildRepositoryPath()`; `uploadRecord()` migra a la nueva ruta. `uploadProgram()` intacto (`programs/`). Valores BD intactos.
- `docs/12-database/supabase/migrations/sprint-423-repositorio-storage-domain.sql` (nuevo): INSERT/SELECT/DELETE `storage.objects` para admin+calidad activos sobre `foldername[1]='repositorio'` (patrón 43.4, aditivas, con rollback documentado).
- `docs/04-infrastructure/storage_architecture.md` (+6, §8): dominio documentado + corrección AUD-422 (`getPublicUrl` ≠ prueba de bucket público).

## Políticas creadas
`repositorio_module_{upload,select,delete}_admin_calidad` (pendientes de aplicar en Supabase; archivo versionado, no aplicado aquí).

## Pruebas realizadas
- Lógica sanitizador (node aislado): `FILTRO SANITARIO `→trim OK; `modulo-prueba` OK; 6 casos ataque/vacío rechazan OK.
- `npm run build`: PASS 2.47s (warning chunks conocido).
- Lectores verificados DB-driven (compatibilidad histórica sin migración de objetos).
- Sin tests unitarios afectados (0 referencias en `*.test.*`).

## Resultados / riesgos pendientes
Implementación estática validada. **Pendiente validación viva** (casos A–F §12-spec + tabla `sgc_records` segunda capa Sprint 421): requiere credenciales Supabase + uploads reales como admin/calidad/operativo/consulta. Push retenido a propósito (dispararía deploy productivo). Riesgo: SELECT si el bucket resultara privado-restrictivo (mitigado: policies aditivas + getPublicUrl en uso).
