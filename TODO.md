# TODO - SPRINT 43.1 (43.1 — Motor de Exportación Reutilizable para Registros Dinámicos)

## Plan de implementación
- [ ] Auditar DynamicRecordsView: verificar estados (records, filteredRecords, selectedIds) y placeholder de botón Exportar.
- [ ] Crear capas de exportación:
  - [ ] src/shared/services/exportService.js
  - [ ] src/shared/utils/exportDataNormalizer.js
  - [ ] src/shared/utils/excelExporter.js
  - [ ] src/shared/utils/exportFileNameBuilder.js
- [ ] Normalizador: devolver estructura independiente de Excel (sheetName/columns/rows), respetando orden de campos del formulario.
- [ ] ExcelExporter: generar múltiples hojas (una por formulario) y columnas obligatorias + dinámicas.
- [ ] Firmas y evidencias: exportar como hipervínculos descriptivos ("Ver Firma", "Ver Evidencia 1", etc.).
- [x] Conectar botón Exportar en DynamicRecordsView con onClick:
  - [x] Usar únicamente registros seleccionados (selectedIds)
  - [x] Si no hay selección: notificación reutilizada del proyecto (alert existente en el componente).
- [x] Verificar que no haya consultas adicionales a Supabase para exportar.

- [ ] Verificación final: Desktop/Tablet/Mobile + `npm run build`.

