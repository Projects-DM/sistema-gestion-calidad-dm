-- ==========================================================================
-- SPRINT 43.2 — Validación + seed (solo backend; no modifica sgc_records ni Storage)
-- Ejecutar en Supabase SQL Editor DESPUÉS de SQL_SPRINT_43_2_DOCUMENTAL_MIGRATION.sql
-- ==========================================================================

-- 1) Validación: existencia de tablas
select 'sgc_document_repositories' as table_name,
       to_regclass('public.sgc_document_repositories') as exists
union all
select 'sgc_document_repository_categories' as table_name,
       to_regclass('public.sgc_document_repository_categories') as exists;

-- 2) Validación: índices
select
  t.relname as table_name,
  i.relname as index_name
from pg_class t
join pg_index ix on t.oid = ix.indrelid
join pg_class i on i.oid = ix.indexrelid
join pg_namespace ns on ns.oid = t.relnamespace
where ns.nspname = 'public'
  and t.relname in ('sgc_document_repositories','sgc_document_repository_categories')
order by table_name, index_name;

-- 3) Validación: FK (repository_id -> sgc_document_repositories.id)
select
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
  and ccu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'sgc_document_repository_categories'
  and tc.constraint_type = 'FOREIGN KEY';

-- 4) Validación: UNIQUE (repository_id, category_key)
select
  tc.constraint_name,
  tc.table_name
from information_schema.table_constraints tc
where tc.table_schema = 'public'
  and tc.table_name = 'sgc_document_repository_categories'
  and tc.constraint_type = 'UNIQUE'
order by tc.constraint_name;

-- 5) Validación: CHECK constraints (slug non-empty, category_key non-empty)
select
  conname as constraint_name,
  conrelid::regclass as table_name
from pg_constraint
where connamespace = 'public'::regnamespace
  and contype = 'c'
  and conrelid::regclass::text in ('public.sgc_document_repositories','public.sgc_document_repository_categories')
order by table_name, constraint_name;

-- 6) Seed de datos de prueba
-- Repo: Certificados de Calidad
-- Categorías: productos_quimicos, materia_prima, material_empaque, insumos

do $$
declare
  repo_id uuid;
begin
  insert into public.sgc_document_repositories (slug, name, description, module_slug, icon_key, is_active)
  values (
    'certificados-calidad',
    'Certificados de Calidad',
    'Repositorio de certificados de calidad por categorías.',
    'trazabilidad',
    'ShieldCheck',
    true
  )
  on conflict (slug) do update
    set
      name = excluded.name,
      description = excluded.description,
      module_slug = excluded.module_slug,
      icon_key = excluded.icon_key,
      is_active = excluded.is_active;

  select id into repo_id from public.sgc_document_repositories where slug = 'certificados-calidad' limit 1;

  insert into public.sgc_document_repository_categories (repository_id, category_key, name, description, icon_key, sort_order, is_active)
  values
    (repo_id, 'productos_quimicos', 'Productos Químicos', null, 'Beaker', 1, true),
    (repo_id, 'materia_prima', 'Materia Prima', null, 'Factory', 2, true),
    (repo_id, 'material_empaque', 'Material de Empaque', null, 'Package', 3, true),
    (repo_id, 'insumos', 'Insumos', null, 'Briefcase', 4, true)
  on conflict (repository_id, category_key) do update
    set
      name = excluded.name,
      description = excluded.description,
      icon_key = excluded.icon_key,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active;
end $$;

-- 7) Validación final: mostrar seeded repository + categorías
select * from public.sgc_document_repositories where slug = 'certificados-calidad';
select * from public.sgc_document_repository_categories
where repository_id = (select id from public.sgc_document_repositories where slug = 'certificados-calidad');

