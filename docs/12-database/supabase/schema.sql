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
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

create index if not exists despachos_created_at_idx on public.despachos (created_at desc);

-- Sprint 113: añadir temperatura y signature_estado a despachos
alter table public.despachos add column if not exists temperatura numeric;
alter table public.despachos add column if not exists signature_estado text not null default 'pending';
alter table public.despachos add column if not exists updated_at timestamptz default now();

-- Tabla productos (maestro de productos)
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null default '',
  nombre text not null default '',
  descripcion text default '',
  tipo text not null default '',
  categoria text default '',
  unidad_medida text not null default '',
  presentacion text default '',
  especificaciones_calidad text default '',
  proveedor text default '',
  precio numeric default 0,
  moneda text default 'COP',
  estado text not null default 'activo',
  observaciones text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists productos_codigo_idx on public.productos (codigo);
create index if not exists productos_tipo_idx on public.productos (tipo);
create index if not exists productos_estado_idx on public.productos (estado);
create index if not exists productos_created_at_idx on public.productos (created_at desc);

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
alter table public.productos enable row level security;
alter table public.documentos enable row level security;
alter table public.usuarios enable row level security;

-- MVP: permitir lectura/escritura anónima (solo desarrollo / intranet sin auth).
-- En producción: sustituir por auth.uid() y roles.
drop policy if exists "despachos_anon_all" on public.despachos;
create policy "despachos_anon_all" on public.despachos for all using (true) with check (true);

drop policy if exists "productos_anon_all" on public.productos;
create policy "productos_anon_all" on public.productos for all using (true) with check (true);

drop policy if exists "documentos_anon_all" on public.documentos;
create policy "documentos_anon_all" on public.documentos for all using (true) with check (true);

drop policy if exists "usuarios_anon_all" on public.usuarios;
create policy "usuarios_anon_all" on public.usuarios for all using (true) with check (true);

-- Storage: en Dashboard → Storage → New bucket → nombre: documentos-calidad
-- Marcar como público si necesitas URL pública en documentos.url.
-- Políticas de storage deben permitir INSERT/SELECT según tu modelo de seguridad.
