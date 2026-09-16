-- Sprint 131.7 — Optional Lot Persistence Contract Certification
-- El lote es un atributo exclusivo de productos trazables.
-- Productos no trazables (SALSA BBQ, TOCINETA, RIPIO, etc.) deben permitir lote = null.

alter table public.despachos
  alter column lote drop not null,
  alter column lote drop default;
