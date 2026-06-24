Modelo de Datos Recomendado (Sprint 43.1A) — Motor Documental Dinámico (auditoría, sin código)

Tablas nuevas (recomendadas)
1.1 sgc_document_repositories

propósito: catálogo de “repositorios documentales” (certificados, fichas, hojas de seguridad, etc.).
columnas:
id UUID PK
slug TEXT UNIQUE NOT NULL (identificador estable para rutas/lookup; no depende de name)
name TEXT NOT NULL
description TEXT
module_slug TEXT NOT NULL (asignación del repositorio al módulo SGC; usado para poblar sgc_records.module)
icon_key TEXT (clave de icono para UI; ver riesgos)
is_active BOOLEAN NOT NULL DEFAULT true
is_deleted BOOLEAN NOT NULL DEFAULT false (opcional, si tu estrategia de borrado lógico es preferida)
created_by UUID (opcional si ya existe auth; si no, dejarlo nullable o eliminar)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
índices recomendados:
unique(slug)
index(module_slug)
index(is_active)
1.2 sgc_document_repository_categories

propósito: categorías configurables por repositorio; se mapean 1:1 al campo “type” de sgc_records (contrato actual).
columnas:
id UUID PK
repository_id UUID NOT NULL FK → sgc_document_repositories(id) ON DELETE CASCADE
category_key TEXT NOT NULL (clave técnica estable; ES el valor que se guarda como sgc_records.type)
name TEXT NOT NULL
description TEXT (opcional)
icon_key TEXT (opcional)
sort_order INTEGER NOT NULL DEFAULT 0
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
restricciones recomendadas:
unique(repository_id, category_key)
opcional: unique(repository_id, name) si deseas evitar duplicados
índices recomendados:
index(repository_id)
unique(repository_id, category_key)
index(is_active)
index(sort_order)
1.3 (Opcional, recomendado para Sprint 44+) sgc_document_repository_settings

propósito: flags de capacidad (upload/delete/view), requerimiento de metadatos, enable_versions, etc.
no bloquea el diseño; evita inflar tablas principales.
Compatibilidad con sgc_records
2.1 Contrato actual existente

sgc_records ya soporta:
módulo (sgc_records.module)
categoría (sgc_records.type)
metadatos mínimos: name, file_url, storage_path, created_by, created_at
el UI agrupa por r.type === categoryId.
2.2 Cómo relacionar repositorios y categorías con sgc_records (sin romper nada)

al cargar un repositorio dinámico:
repository.module_slug → se consulta sgc_records.module
category.category_key → se agrupa/filtra sgc_records.type
al subir un PDF:
se INSERTA en sgc_records igual que hoy:
module := repository.module_slug
type := category_key
name/file_url/storage_path/created_by se mantienen
2.3 ¿Se requieren columnas nuevas en sgc_records?

No es estrictamente necesario para el motor mínimo (Sprint 43).
Se mantiene el contrato:
usar module y type como llaves de dominio.
2.4 ¿Cuándo conviene metadata JSONB?

Para compatibilidad futura con búsqueda/IA/OCR/versiones/vencimientos.
Recomendación:
si ya deseas preparar el terreno sin migración en Sprint 43, puedes posponer.
si se permite (en futuro), crear tabla auxiliar:
sgc_record_metadata (record_id PK/FK → sgc_records.id, metadata JSONB)
evita modificar sgc_records en el Sprint 43.
Escalabilidad
3.1 Miles de documentos

Problemas típicos:
consultas por module/type y orden por created_at
listar con paginación
mitigación en el diseño:
índices en sgc_records ya existentes/esperados (module, type, created_at).
en tablas nuevas, índices sobre module_slug, repository_id, category_key.
3.2 Múltiples empresas / multi-sede

si el producto será multi-tenant:
extender modelo con tenant scope es clave.
opción de diseño:
agregar company_id (UUID) y sede_id (UUID o TEXT) en repositorios y categorías
y/o en sgc_records (pero eso sí implicaría cambios y/o RLS sobre existing).
como Sprint 43 no modifica sgc_records, el escalado multi-empresa puede quedar para Sprint 44+:
alternativa: row-level security por org mediante políticas que filtren por created_by/perfil.
3.3 Control documental

el catálogo de repositorios/categorías ya habilita control (estado activo, orden, categorías).
para “control documental” real necesitas:
vencimientos
aprobaciones
versiones
trazabilidad de cambios
esos componentes se pueden modelar en tablas auxiliares sin tocar sgc_records.
3.4 IA, búsqueda semántica, embeddings, OCR

recomendación arquitectónica para futuro (sin implementarlo aquí):
sgc_record_text_index: record_id, extracted_text, embeddings vector (o JSON/TS)
sgc_record_ocr_status: record_id, status, last_attempt_at, error_message
esto vive por fuera de sgc_records para no romper contrato.
Versionamiento
Sprint 43: excluirlo (como piden) para no complicar el contrato actual.
pero el diseño debería contemplar compatibilidad futura:
opcional: añadir en tablas nuevas un flag enable_versions.
futura estrategia:
sgc_document_versions: version_id, repository_id, category_key, storage_path, file_url, version_number, created_at
el front mostraría “latest”.
Conclusión de versionamiento:

Recomendado para Sprint 44+.
Sprint 43 solo soporta “reemplazo” por nuevo storage_path (como hoy).
Seguridad (RLS futuras)
5.1 Principios

acceso por roles ya existe (rol en auth/profile).
para repositorios, RLS debe filtrar:
repositorios/categories por tenant (si existe)
sgc_records por module (y/o por permisos de rol)
5.2 Recomendación de políticas (a nivel conceptual)

sgc_document_repositories
SELECT: permitido si rol tiene acceso y/o pertenece al tenant.
sgc_document_repository_categories
SELECT por repository_id con mismas reglas.
sgc_records
SELECT: por módulo (module) y rol.
INSERT/DELETE: solo si rol (admin/calidad) y creado por (o rol específico) según política.
5.3 Riesgo clave: Storage

aunque el diseño de DB esté bien, Storage requiere políticas equivalentes:
permitir lectura pública vs privada.
hoy el sistema usa getPublicUrl; si en futuro se migra a URLs firmadas, el diseño debe contemplarlo.
Riesgos arquitectónicos

Dependencia fuerte de sgc_records.type

si en el futuro “type” deja de ser categoría_key, rompe agrupación y UI.
mitigación: documentar contrato y fijar category_key como inmutable.
Iconos parametrizables
guardar icon_key como texto y mapearlo a componentes requiere whitelist.
mitigación: diccionario controlado en front y fallback.
Multi-tenant tardío
añadir company_id luego es difícil si ya está todo modelado sin tenant scope.
mitigación: diseñar columnas de tenant en repositorios/categorías desde ya (si el roadmap lo requiere), o documentar el plan.
Búsqueda semántica/embeddings
si no se decide desde el inicio el enfoque de almacenamiento de embeddings, puede generar deuda técnica.
mitigación: usar tablas auxiliares dedicadas y mantener el pipeline desacoplado.
Control documental real (aprobaciones/vencimientos)
puede requerir flujos de estado.
mitigación: hacerlo como máquinas de estado en tablas auxiliares; no en sgc_records.
Recomendación final (qué implementar en 43.1 vs posponer)
7.1 Qué implementar en Sprint 43.1 (mínimo viable de datos)

Crear tablas:
sgc_document_repositories
sgc_document_repository_categories
Sin modificar:
sgc_records
Storage bucket/path
Contrato:
category_key ↔ sgc_records.type
module_slug ↔ sgc_records.module
7.2 Qué posponer para Sprint 44+

metadata JSONB (tabla auxiliar)
versiones (tabla sgc_document_versions)
vencimientos y control documental (tablas de status/expiración)
OCR/extracción de texto + embeddings + búsqueda semántica
multi-tenant completo si aún no está definido
Resultado: un modelo de datos estable que “ancle” el motor documental al contrato ya existente (sgc_records.module/type) y permita que el UI actual se reutilice alimentándolo con configuración.