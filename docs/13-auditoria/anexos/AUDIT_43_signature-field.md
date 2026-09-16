Sprint 43 — Auditoría arquitectónica para “Motor Documental Dinámico” (solo auditoría, sin implementación)
0) Punto de partida (núcleo existente ya funcional)
El sistema ya tiene un motor documental “operativo” para PDFs dentro de Trazabilidad, compuesto por:

UI: src/components/DocumentManager.jsx (categorías → subida/borrado/visor/listado)
Servicio: src/services/documentsService.js
Storage bucket: documentos-sgc
path: records/${module}/${type}/${Date.now()}_${file.name}
DB: sgc_records con campos { module, type, name, file_url, storage_path, created_by }
Persistencia: sgc_records (multi-registro) + publicUrl para render en iframe
Actualmente lo único “no dinámico” es: catálogo de repositorios/categorías y ruteo/páginas (Certificados/Fichas están hardcodeados).

1) Modelo de datos necesario para repositorios documentales dinámicos
1.1 No modificar (obligatorio)
Tabla sgc_records (ya almacena documentos y el agrupamiento por “categoría” vía type)
Bucket documentos-sgc y convención de paths (ya funciona)
1.2 Sí crear (catálogo/configuración)
Para volver dinámico “lo que hoy es hardcodeado”, necesitas un capa de metadatos (catálogo) para definir:

repositorios
categorías
mapeo “categoría → value que se guarda en sgc_records.type”
asignación a módulos y control de iconos/orden
Entidades recomendadas (tablas nuevas)
sgc_document_repositories
id (uuid pk)
slug (unique) (para rutas internas)
name (string)
description (string)
module_slug (string) (módulo destino, ej. trazabilidad, medicion-control, etc.)
icon (string) (identificador de icono; ver “riesgos” por compatibilidad)
created_at
sgc_document_repository_categories
id (uuid pk)
repository_id (FK → sgc_document_repositories)
category_key (string, unique por repositorio)
Clave técnica que se guardará como sgc_records.type (contrato actual).
name (string)
icon (string opcional)
color / bg / style_variant (opcional; si no, lo renderiza el front con presets)
sort_order (int)
created_at
Con esto logras que el UI pueda renderizar categorías configurables y que el “grouping” siga usando r.type === category_key.

(Opcional pero muy recomendado para futuro) sgc_document_repository_settings
flags: allow_upload, allow_delete, require_metadata, allow_versions, etc.
conserva compatibilidad futura con IA/búsqueda/versiones.
2) Relaciones exactas entre módulos, repositorios y categorías
2.1 Conceptos
Módulo (ya existe como sgc_modules del motor dinámico)
Repositorio documental: se asigna a un módulo mediante module_slug
Categorías: pertenecen a un repositorio y se “materializan” en sgc_records.type
2.2 Mapeo técnico (contractual)
Al subir un PDF en un repositorio:
se insertará igual que hoy en sgc_records:
module = repository.module_slug
type = repositoryCategory.category_key
Al leer:
se consulta sgc_records filtrando por module
y se agrupa por r.type contra category_key
Esto permite que el contrato actual de sgc_records siga siendo el “motor de ejecución” (durabilidad).

3) Reutilización de DocumentManager.jsx sin duplicar código
3.1 Qué ya es genérico
DocumentManager ya resuelve:

navegación “back” por props
categorías render (botones + tarjetas)
subida PDF
visor PDF (iframe)
borrado
búsqueda por record.name
3.2 Qué debe parametrizarse (sin duplicar)
Para convertirlo en genérico “por repositorio”, basta con alimentar props desde una capa superior:

module = repository.module_slug
title/subtitle = repository.name/description
backPath/backLabel = según el flujo de navegación
categories = repository_categories[] (cada una con id o category_key + icon/color)
Importante: el valor que usa el UI para filtrar es record.type === categoryId. Por eso:

categories[].id (o campo equivalente) debe corresponder exactamente a category_key guardado en sgc_records.type.
Resultado: DocumentManager pasa de “template hardcodeado” a “componente base” alimentado por un loader de repositorio/categorías.

4) Navegación dinámica sin romper Traceability.jsx, DynamicModule.jsx y App.jsx
4.1 Problema actual
App.jsx enruta:
/trazabilidad/certificados → Certificates.jsx
/trazabilidad/fichas-tecnicas → TechnicalSheets.jsx
Traceability.jsx también define tarjetas de acceso a esas rutas.
Certificates.jsx/TechnicalSheets.jsx definen CATEGORIES hardcodeadas.
4.2 Arquitectura de ruteo propuesta (mínimo riesgo)
Sin destruir nada existente, la forma “segura” es:

Crear un solo template de página dinámica:
DocumentRepositoryPage (no implementado aquí; solo arquitectura)
Sustituir en futuro el ruteo hardcodeado por:
/documentos/:repositorySlug → DocumentRepositoryPage
En paralelo, mantener compatibilidad:
Seguir soportando las rutas actuales /trazabilidad/certificados y /trazabilidad/fichas-tecnicas como “aliases” hacia repositorySlug existentes.
4.3 Integración con Traceability.jsx
Ideal: Traceability.jsx lista submódulos/document repositories activos filtrados por module_slug.
Si no quieres tocar esa UI todavía, se puede usar un enfoque híbrido:
primero solo se reemplazan páginas (Certificates/TechnicalSheets) por “instancias” de DocumentRepositoryPage (mismo slug, mismas categorías ya existentes en DB)
luego se hace la UI dinámica del listado.
4.4 Integración con DynamicModule.jsx
DynamicModule ya sabe renderizar:
“Diligenciar Registros”
“Historial y Consultas”
Para motor documental dinámico:
añadir una tercera pestaña “Documentos” (o un slot) cuando existan repositorios activos para ese moduleSlug.
5) Compatibilidad futura (IA, búsqueda avanzada, versiones, vencimientos, metadatos)
5.1 Búsqueda documental avanzada / IA
Actualmente el sistema guarda name y file_url. Para IA/búsqueda semántica necesitarás un índice textual:

Opciones futuras (sin romper):

Guardar metadatos de documentos en una tabla separada:
sgc_document_metadata (document_id/record_id → JSONB)
Guardar un campo de “texto extraído”:
sgc_document_text_index (record_id → text / embeddings / tokens)
Esto no requiere modificar sgc_records, solo enlazar por sgc_records.id.
5.2 Control de versiones
Recomendación:

mantener sgc_records como “registro actual” o “versión insertada”
o introducir:
sgc_document_versions que apunte a repository_id, storage_path, file_url, version_number, created_by
El front seguiría mostrando “latest” por query.
5.3 Vencimientos documentales
añadir tabla sgc_document_expirations o campos en sgc_document_metadata
sin cambiar el bucket ni sgc_records
5.4 Metadatos personalizados
usar JSONB con esquema flexible:
metadata JSONB NOT NULL DEFAULT '{}'
6) Riesgos técnicos y mitigaciones
Iconos parametrizables
Hoy se usan imports directos de lucide-react en hardcode.
Si el icono se vuelve “string”, debes mapearlo a componentes (front) con un whitelist.
Riesgo: icono no existente → UI rota.
Mitigación: diccionario { iconKey: LucideIcon } con fallback.
Contrato sgc_records.type
type es clave técnica de categoría.
Si cambias el significado, rompes agrupación y filtros.
Mitigación: usar category_key estable e inmutable (no “name”).
Ruteo/aliases
Cambiar rutas podría romper enlaces.
Mitigación: alias temporal (rutas antiguas → repositorySlug nuevo).
RLS / permisos Storage/DB
Si la seguridad cambia, el UI se queda “vacío” (como el bug anterior de lectura filtrada).
Mitigación: auditoría de RLS para:
lectura por module
inserción con created_by
acceso a bucket para el front
Búsqueda semántica/IA
No está preparada aún para extracción de texto.
Mitigación: primero agregar “metadata y texto extraído” como pipeline posterior.
7) Plan de implementación por fases (solo propuesta)
Fase 1 — Catálogo mínimo
Crear tablas:
sgc_document_repositories
sgc_document_repository_categories
Seed inicial:
Repositorios existentes: Certificados y Fichas
Categorías existentes: quimicos/empaque/materia_prima/insumos/equipos
Mantener sgc_records tal cual.
Fase 2 — Página template reutilizando DocumentManager
Crear página DocumentRepositoryPage(repositorySlug)
Loader:
lee repository + categorías desde DB
alimenta DocumentManager con props
Sin tocar UI/visores existentes.
Fase 3 — Ruteo dinámico con compatibilidad
Añadir ruta genérica /documentos/:repositorySlug
Conservar rutas antiguas como alias:
/trazabilidad/certificados → repositorySlug=certificados-calidad
/trazabilidad/fichas-tecnicas → repositorySlug=fichas-tecnicas
Fase 4 — Configuración desde Configuration
Agregar panel:
crear repositorios (name/description/module/icon/slug)
gestionar categorías (category_key + name + icon)
No implementar búsqueda/IA todavía.
Fase 5 — Extensiones futuras
metadata JSONB
versiones
vencimientos
extracción de texto + índice para IA/búsqueda avanzada
8) Diagrama de arquitectura (texto)

[UI: DocumentManager]
  props: module, categories[], title, backPath...
        |
        v
[documentsService]
  - Storage (documentos-sgc)
    upload/remove
  - DB (sgc_records)
    insert/select/delete
        |
        v
[DB: sgc_records]  <-- (module, type=category_key, file_url, storage_path...)
        ^
        |
[Catálogo: nuevas tablas]
sgc_document_repositories --(1..N)--> sgc_document_repository_categories
        |
        v
[Resolver/Loader: DocumentRepositoryPage]
  repositorySlug/moduleSlug -> fetch config -> props -> DocumentManager
Flujo completo UI → Storage → DB → Render (en el motor dinámico)
UI carga repositorySlug
DocumentRepositoryPage consulta catálogo:
repository.module_slug
categorías → category_key
UI renderiza DocumentManager
Subida:
DocumentManager sube a documentsService.uploadRecord(module, category_key, file, user.id)
Storage:
records/${module}/${category_key}/...
DB:
INSERT sgc_records (module, type=category_key, file_url, storage_path, created_by)
Render:
al abrir el repositorio:
query select por module
agrupar por record.type === category_key
tarjetas + visor iframe
Cierre
La conversión a “Motor Documental Dinámico” es viable sin romper el núcleo actual porque:

sgc_records ya actúa como motor de ejecución (durabilidad)
el “motor configurador” falta en forma de catálogo y ruteo dinámico
DocumentManager.jsx es reutilizable al 90% si le das props desde una página loader por slug.
Si necesitas, puedo producir una versión de este informe como “especificación técnica formal” lista para convertir en backlog/epics (sin código).


Task Completed
Sprint 43 — Auditoría arquitectónica del Motor Documental Dinámico (SOLO auditoría, sin implementar ni modificar código).

Entregables incluidos:

Modelo de datos recomendado (tablas nuevas: sgc_document_repositories, sgc_document_repository_categories; NO modificar sgc_records ni bucket/documentos-sgc)
Relaciones módulo ↔ repositorio ↔ categorías (module_slug en repositorio; category_key mapea directamente a sgc_records.type)
Reutilización de DocumentManager.jsx (parametrizable vía props desde un loader de repositorio; sin duplicar UI)
Navegación dinámica sin romper App.jsx/Traceability.jsx/DynamicModule.jsx (ruta genérica por repositorySlug + aliases para rutas actuales)
Compatibilidad futura con IA/búsqueda, versiones, vencimientos, metadatos (recomendaciones con tablas/estrategias aisladas)
Riesgos técnicos y mitigaciones (iconos parametrizables, contrato type, RLS, alias de ruteo)
Diagrama textual de arquitectura
Flujo completo UI → Storage → DB → Render en el motor dinámico
Plan de implementación por fases (catálogo → template page → ruteo/compat → configuración → extensiones)