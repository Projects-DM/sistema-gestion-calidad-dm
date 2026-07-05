# TODO - Sprint 43.3 (UX/UI Repositorios Documentales)

- [ ] Ajustar UI de `DocumentRepositoriesAdmin.jsx`:
  - [ ] Modales: cierre con X / Cancelar / ESC / click fuera, sin quedar bloqueados
  - [ ] Feedback visual: Guardando/Actualizando/Eliminando y deshabilitar botones mientras haya operación en curso
  - [ ] Estados vacíos con mensajes empresariales y CTA
  - [ ] Eliminar textos técnicos (ej. “prepara Sprint…”, “CRUD…”)
  - [ ] Selector visual de `module_slug` (opciones fijas), sin input libre
  - [ ] Selector de iconos: icono visual + nombre + preview
  - [ ] Consistencia visual con el estilo de “Formularios Dinámicos” (tarjetas, tipografías, espaciados)
- [x] Ejecutar `npm run build`
- [x] Corregir errores si aparecen
- [ ] Verificar manualmente:
  - [ ] `Configuration` renderiza
  - [ ] pestaña “Repositorios Documentales” funciona
  - [ ] modales funcionan (cierre por ESC y click fuera)

# Sprint 43.1 – Motor de Exportación Reutilizable para Registros Dinámicos

## Objetivo

Implementar un sistema de exportación desacoplado para los módulos dinámicos del SGC, permitiendo exportar únicamente los registros seleccionados a archivos Excel estructurados, reutilizando los datos ya cargados en memoria y sin generar consultas adicionales a Supabase.

---

## Arquitectura implementada

DynamicRecordsView
        │
        ▼
ExportService
        │
        ▼
ExportDataNormalizer
        │
        ▼
ExcelExporter
        │
        ▼
SheetJS (xlsx)

---

## Componentes creados

### exportService

Orquesta todo el flujo de exportación.

Responsabilidades:

- recibir registros seleccionados
- normalizar datos
- delegar al exportador correspondiente

---

### exportDataNormalizer

Transformación pura de datos.

Convierte la estructura relacional proveniente de Supabase en tablas planas listas para exportar.

Incluye:

- metadatos del registro
- autor
- estado
- verificador
- comentarios
- campos dinámicos
- firmas
- evidencias

---

### excelExporter

Genera archivos Excel mediante SheetJS.

Características:

- múltiples hojas
- una hoja por formulario
- columnas dinámicas
- metadatos
- hipervínculos a firmas
- hipervínculos a evidencias

---

### exportFileNameBuilder

Generación centralizada de nombres de archivo.

---

### excelSheetNameBuilder

Nuevo utilitario reutilizable.

Responsabilidades:

- nombres válidos para Excel
- máximo 31 caracteres
- eliminación de caracteres inválidos
- resolución automática de colisiones (_2, _3...)

---

## DynamicRecordsView

Se implementó el botón Exportar.

Ahora:

- exporta únicamente registros seleccionados
- reutiliza records ya cargados
- no realiza consultas adicionales
- mantiene el comportamiento existente cuando no hay selección

---

## Problemas resueltos

### Runtime

Se corrigió el error:

ReferenceError: Cannot access 'moduleId' before initialization

originado por una variable local que ocultaba la prop del componente.

---

### Exportación múltiple

Se corrigió el fallo:

Error:
Sheet names cannot exceed 31 chars

mediante la incorporación del utilitario excelSheetNameBuilder.

---

## Resultado

✔ Exportación inmediata

✔ Excelente rendimiento

✔ Sin consultas adicionales

✔ Arquitectura desacoplada

✔ Compatible con futuras exportaciones PDF

✔ Base preparada para reportes avanzados

✔ Compatible con indicadores y BI

---

## Estado del Sprint

✅ Completado

✅ Validado funcionalmente

✅ Listo para producción