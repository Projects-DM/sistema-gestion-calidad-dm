SPRINT 42.2A - Corrección de persistencia documental en trazabilidad
🎯 Objetivo

Corregir inconsistencias en la visualización de documentos PDF y estabilizar el visor en el sistema documental.

🧱 Cambios realizados
🔹 1. Implementación de estado global de visor PDF

Se creó:

src/shared/state/viewer/pdfViewer.store.ts

Responsabilidades:

Control de documento activo (viewerDoc)
Apertura de visor (openViewer)
Cierre de visor (closeViewer)
🔹 2. Creación de componente reutilizable de visor
src/shared/components/viewers/PdfViewerModal.tsx

Características:

Render independiente del layout
Uso de portal (o fixed overlay según implementación final)
Reutilizable en múltiples módulos
🔹 3. Refactor del módulo documental
Eliminado estado local del visor (useState)
Integración con store global
Botón “Ver PDF” migrado a openViewer(record)
🧪 Resultado funcional
Visor PDF funcional desde repositorios documentales
Render correcto de documentos
Comportamiento estable del modal
Eliminación de bugs de estado local
⚠️ Alcance fuera del sprint
Módulo “Programas” no migrado completamente al nuevo visor
Pendiente de estandarización en sprint futuro