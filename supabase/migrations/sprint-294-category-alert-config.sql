-- Sprint 294 — Category Alert Configuration Enablement
-- Adds the `alert_config` jsonb column to `sgc_document_repository_categories`
-- mirroring the repository/forms columns so a category can carry its OWN
-- canonical Alert Configuration metadata (same envelope, no new table).

ALTER TABLE public.sgc_document_repository_categories
  ADD COLUMN IF NOT EXISTS alert_config jsonb;

-- RLS: the existing admin update policy already covers the row; no new policy
-- is required. This migration is schema-only and additive.
