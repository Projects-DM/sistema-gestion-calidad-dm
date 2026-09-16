CONTEXTO

Se identificó inconsistencia en la visualización de documentos PDF entre módulos del sistema de gestión de calidad:

Repositorio documental ✔
Programas ✔
Trazabilidad ⚠ (estructura legacy intencional)

El problema principal era la falta de un sistema único de visor PDF reutilizable, lo que generaba:

Diferencias en comportamiento entre módulos
Modales duplicados o embebidos
Problemas de z-index en ciertos layouts
Inconsistencias en UX (cerrar visor vs cerrar documento)
🎯 OBJETIVO DEL SPRINT

Unificar el sistema de visualización de documentos PDF para que:

✔ funcione desde cualquier módulo
✔ sea independiente del layout
✔ no dependa del contenedor padre
✔ sea reutilizable en todo el sistema

🧱 ARQUITECTURA FINAL IMPLEMENTADA
🔹 1. Estado global del visor
src/shared/state/viewer/pdfViewer.store.ts

Responsabilidad:

almacenar documento actual
abrir visor (openViewer)
cerrar visor (closeViewer)
🔹 2. Componente único de visor PDF
src/shared/components/viewers/PdfViewerModal.tsx

Mejoras clave:

Uso de React Portal (document.body)
Eliminación de dependencias de layout padre
z-index global estable (z-[9999])
UI consistente en todos los módulos
soporte para iframe PDF estándar
🔹 3. Migración de módulos principales
✔ Repositorio documental
Migrado a visor global
Eliminado estado local de viewer
Uso de openViewer(record)
✔ Programas
Eliminado modal legacy
Migrado a visor global
Funciona en cualquier contexto de navegación
✔ Trazabilidad
Se mantiene estructura legacy intencional
No requiere migración por diseño de negocio actual
🔍 PROBLEMAS RESUELTOS

✔ Visor quedaba detrás de componentes en ciertos módulos
✔ Diferencias entre “Cerrar”, “Cerrar visor”, “Cerrar documento”
✔ Duplicación de lógica de modales
✔ Inconsistencia entre módulos
✔ Dependencia del layout padre

🧠 DECISIÓN ARQUITECTÓNICA TOMADA

El visor PDF ahora es un sistema global desacoplado del DOM del módulo.

Esto convierte el sistema en:

reutilizable
escalable
consistente
preparado para crecimiento tipo ERP (SAP-like)
⚠️ EXCEPCIÓN CONTROLADA

El módulo de Trazabilidad mantiene su estructura original debido a:

lógica de negocio específica
diseño histórico del sistema
no dependiente del nuevo estándar documental
🚀 RESULTADO FINAL

✔ 2 módulos completamente unificados (Repositorio + Programas)
✔ 1 visor global único
✔ arquitectura desacoplada del layout
✔ comportamiento consistente en toda la aplicación

📌 ESTADO DEL SPRINT

🟢 ESTABLE - LISTO PARA PRODUCCIÓN