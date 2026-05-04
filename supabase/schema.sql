-- DM Distribuciones · Esquema inicial Supabase (PostgreSQL)
-- Ejecutar en: SQL Editor del proyecto Supabase

create extension if not exists "pgcrypto";

-- Tabla despachos (trazabilidad)
create table if not exists public.despachos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora text not null default '',
  cliente text not null default '',
  producto text not null default '',
  lote text not null default '',
  cantidad_bolsas numeric,
  peso numeric,
  destino text not null default '',
  placa text not null default 'TRG786',
  conductor text not null default 'Juan Gómez',
  observaciones text,
  estado text not null default 'Completado',
  created_at timestamptz not null default now()
);

create index if not exists despachos_created_at_idx on public.despachos (created_at desc);

-- Tabla documentos (metadatos; archivos en Storage)
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  nombre text not null,
  url text not null,
  tipo text not null,
  fecha date not null default (timezone('utc', now()))::date
);

create index if not exists documentos_modulo_idx on public.documentos (modulo);

-- Tabla usuarios (login futuro; sin FK a auth.users por simplicidad MVP)
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  rol text not null default 'usuario'
);

-- Row Level Security (ajusta políticas para producción)
alter table public.despachos enable row level security;
alter table public.documentos enable row level security;
alter table public.usuarios enable row level security;

-- MVP: permitir lectura/escritura anónima (solo desarrollo / intranet sin auth).
-- En producción: sustituir por auth.uid() y roles.
drop policy if exists "despachos_anon_all" on public.despachos;
create policy "despachos_anon_all" on public.despachos for all using (true) with check (true);

drop policy if exists "documentos_anon_all" on public.documentos;
create policy "documentos_anon_all" on public.documentos for all using (true) with check (true);

drop policy if exists "usuarios_anon_all" on public.usuarios;
create policy "usuarios_anon_all" on public.usuarios for all using (true) with check (true);

-- Storage: en Dashboard → Storage → New bucket → nombre: documentos-calidad
-- Marcar como público si necesitas URL pública en documentos.url.
-- Políticas de storage deben permitir INSERT/SELECT según tu modelo de seguridad.
