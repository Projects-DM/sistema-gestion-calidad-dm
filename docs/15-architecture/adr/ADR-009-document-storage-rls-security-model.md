# ADR-009: Document Storage and RLS Security Model

**Status:** ACCEPTED  
**Date:** 2026-07-16 (Sprint 70), 2026-08-22 (Sprint 344), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 70 (certification), Sprint 344 (document storage audit), Sprint 346-348 (tenant integration), Sprint 369 (certification)

---

## Context

The SGC-DM system handles three categories of documents with different security requirements:

| Document Type | Examples | Retention | Access |
|---------------|----------|-----------|--------|
| **Evidencias** | Photos of inspections, temperature readings | 5 years (INVIMA) | Tenant-scoped, uploader + verifiers |
| **Firmas** | Digital signatures (Canvas to PNG) | 5 years (legal) | Signer + verifiers + admin |
| **Documentos** | PDF manuals, procedures, certificates | Indefinite | Role-based (admin/calidad) |

Security requirements:
- **Tenant isolation**: `dmdistribuciones.com` cannot access `polloscalenos.com` documents
- **Role-based access**: `operativo` uploads, `calidad` verifies, `administrador` manages
- **Audit trail**: Every upload/download/access logged in `sgc_audit_logs`
- **INVIMA compliance**: 5-year retention, tamper-evident storage
- **No public access**: All documents require authentication

## Decision

Adopt **Supabase Storage with RLS-enforced tenant isolation** as the document storage backend.

### Storage Architecture

```
Bucket: documentos-sgc
  evidencias/
    {tenantId}/
      {responseId}/
        {timestamp}_{random}.jpg
        {timestamp}_{random}.webp
  firmas/
    {tenantId}/
      {responseId}.png
  documentos/
    {tenantId}/
      {moduleId}/
        {documentId}.pdf
```

### RLS Security Model

```sql
-- Bucket: documentos-sgc (private, not public)

-- Policy: Users can only access their tenant's folder
CREATE POLICY "tenant_folder_access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'documentos-sgc' AND
    (storage.foldername(name))[1] = get_current_tenant()
  );

-- Helper function for current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'tenant_id';
$$;
```

### Upload Flow

```javascript
async function uploadEvidence(file, responseId) {
  const tenantId = getCurrentTenantId();
  const fileName = `${Date.now()}_${randomId()}.webp`;
  const path = `evidencias/${tenantId}/${responseId}/${fileName}`;
  
  const compressed = await compress(file, { maxSizeMB: 2, format: 'webp' });
  
  const { data, error } = await supabase.storage
    .from('documentos-sgc')
    .upload(path, compressed, { contentType: 'image/webp', upsert: false });
  
  const { data: { signedUrl } } = await supabase.storage
    .from('documentos-sgc')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  
  return { path, signedUrl };
}
```

### RLS Policy Matrix

| Operation | Evidencias | Firmas | Documentos |
|-----------|------------|--------|------------|
| **Upload** | `operativo`, `calidad`, `administrador` | `operativo`, `calidad`, `administrador` | `administrador`, `calidad` |
| **Download** | Same tenant + uploader/verifier | Same tenant + signer/verifier | Same tenant + role |
| **Delete** | `administrador` only | `administrador` only | `administrador` only |
| **List** | Tenant-scoped | Tenant-scoped | Role-scoped |

## Consequences

### Positive
- Native tenant isolation via RLS at storage layer
- Scalable: Supabase Storage handles CDN, signed URLs
- Audit trail: Every operation logged automatically
- Cost-effective: Pay for storage used, CDN included

### Negative
- RLS complexity: Storage policies harder to debug than table RLS
- Migration risk: Moving providers requires re-uploading all documents

## Implementation Evidence

| Sprint | Artifact |
|--------|----------|
| Sprint 70 | Production certification (Storage certified) |
| Sprint 344 | Document storage role/path/RLS forensic audit |
| Sprint 346-348 | Tenant integration (tenantId in paths) |
| Sprint 369 | Final certification (Storage PRESERVED) |

## Related ADRs
- ADR-004: Supabase as Remote Persistence Backend (Storage component)
- ADR-006: Tenant-Scoped Persistence (tenantId in paths)
- ADR-003: Capability-Driven Authorization (role-based upload/download)

---

**Supersedes**: Local filesystem / base64 in database (Sprints 1-69)  
**Next Review**: 2026-12-01