-- ==========================================================================
-- SPRINT 43.2 — Motor Documental Dinámico (Base de datos)
-- Objetivo: Crear tablas de catálogo para repositorios y categorías.
-- Restricciones: NO modificar sgc_records, NO modificar Storage, NO tocar UI.
-- Ejecutar en Supabase SQL Editor.
-- ==========================================================================

-- A) Extensiones (por si hace falta para UUID)
create extension if not exists "pgcrypto";

-- B) Tabla: sgc_document_repositories
create table if not exists public.sgc_document_repositories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- inmutable (aplicación/operación)
  name text not null,
  description text,
  module_slug text not null,
  icon_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sgc_document_repositories_slug_non_empty
    check (length(trim(slug)) > 0)
);


-- Índices
create index if not exists sgc_document_repositories_module_slug_idx
  on public.sgc_document_repositories (module_slug);

create index if not exists sgc_document_repositories_is_active_idx
  on public.sgc_document_repositories (is_active);

-- C) Tabla: sgc_document_repository_categories
create table if not exists public.sgc_document_repository_categories (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.sgc_document_repositories(id) on delete cascade,
  category_key text not null, -- mapea a sgc_records.type
  name text not null,
  description text,
  icon_key text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sgc_document_repository_categories_category_key_non_empty
    check (length(trim(category_key)) > 0),
  constraint sgc_document_repository_categories_unique_key
    unique (repository_id, category_key)
);



-- Índices
create index if not exists sgc_document_repository_categories_repository_id_idx
  on public.sgc_document_repository_categories (repository_id);

create index if not exists sgc_document_repository_categories_is_active_idx
  on public.sgc_document_repository_categories (is_active);

create index if not exists sgc_document_repository_categories_sort_order_idx
  on public.sgc_document_repository_categories (repository_id, sort_order);

-- D) (Opcional conceptual) Recomendación para inmutabilidad
-- En PostgreSQL se puede aplicar con triggers/constraints, pero por sprint evitamos.
-- Se asume inmutabilidad por reglas de negocio del sistema.

