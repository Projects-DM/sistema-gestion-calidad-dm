# ADR-004: Supabase as Remote Persistence Backend

**Status:** ACCEPTED  
**Date:** 2026-07-16 (original - Sprint 70), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 70, Sprint 341, Sprint 346-351, Sprint 356-369

---

## Context

The SGC-DM system required a backend that could provide:

- **PostgreSQL database** with RLS for multi-tenant isolation
- **Authentication** with JWT + social/email providers
- **Storage** for evidence photos, signatures, documents
- **Real-time subscriptions** for cross-user collaboration
- **Edge Functions** for future transactional workflows
- **Zero operational overhead** (no server management)

Options evaluated:
| Option | Pros | Cons |
|--------|------|------|
| **Supabase** | BaaS, PostgreSQL, Auth, Storage, Realtime, Edge Functions, generous free tier | Vendor lock-in, RLS learning curve |
| **Custom Node.js + PostgreSQL** | Full control, no vendor lock-in | Operational overhead, auth implementation |
| **Firebase** | Realtime, Auth, Hosting | NoSQL, limited SQL, vendor lock-in |
| **Custom API + Railway/Render** | Standard stack | Operational overhead, auth from scratch |

## Decision

Adopt **Supabase as the complete Backend-as-a-Service (BaaS)** platform for the SGC-DM system.

### Supabase Components Used

| Component | Purpose | Tables/Buckets |
|-----------|---------|----------------|
| **PostgreSQL 15+** | Primary database | `sgc_*` (50+ tables), `profiles`, `sgc_audit_logs` |
| **PostgREST** | Auto-generated REST API | All tables exposed via REST |
| **GoTrue Auth** | Authentication + JWT | `auth.users`, `auth.sessions` |
| **Row Level Security** | Multi-tenant isolation | All `sgc_*` tables |
| **Storage** | Evidence, signatures, documents | Bucket: `documentos-sgc` |
| **Edge Functions** | Future: transactions, webhooks | Planned for Q4 2026 |

### Architecture Integration

```
┌────────────────────────────────────────────────────┐
│                  SUPABASE                          │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  PostgreSQL 15+ (Base de Datos)             │   │
│  │  ├── Tablas EAV (sgc_*)                    │   │
│  │  ├── Tablas de negocio (despachos, docs)   │   │
│  │  ├── Índices y constraints                 │   │
│  │  ├── Row Level Security (RLS)              │   │
│  │  └── Extensiones (pgcrypto)                │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Authentication (GoTrue)                    │   │
│  │  ├── JWT Tokens                            │   │
│  │  ├── Manejo de sesiones                    │   │
│  │  └── Integración con RLS                   │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Storage (S3-compatible)                   │   │
│  │  ├── Evidencias fotográficas               │   │
│  │  ├── Firmas digitales (PNG)                │   │
│  │  ├── Documentos PDF                        │   │
│  │  └── Bucket: documentos-sgc               │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │  PostgREST (API Automática)                │   │
│  │  ├── Endpoints REST desde tablas           │   │
│  │  ├── Filtros, paginación, joins           │   │
│  │  └── Cliente JavaScript (@supabase/supabase-js) │
│  └────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Singleton Supabase Client** | `src/lib/supabase.js` exports `getSupabaseClient()` singleton |
| **Null Guard** | `getSupabaseClient()` returns `null` if env vars missing — prevents invalid `createClient()` |
| **Single `createClient`** | Only ONE `createClient()` call in entire codebase (in `src/lib/supabase.js`) |
| **Environment Variables** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` injected at build time |
| **RLS as Primary Security** | All multi-tenant isolation via PostgreSQL RLS policies |
| **Singleton Pattern** | `let cached` in `src/lib/supabase.js` prevents duplicate clients |

### Client Initialization Contract

```javascript
// src/lib/supabase.js
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;  // NULL GUARD - critical

  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}
```

### Environment Variable Injection

- **Local**: `.env` / `.env.production` with actual values
- **CI/CD**: GitHub Actions workflow injects `${{ secrets.VITE_SUPABASE_URL }}` + `${{ secrets.VITE_SUPABASE_ANON_KEY }}`
- **Build-time injection**: Vite replaces `import.meta.env.VITE_*` at compile time

## Consequences

### Positive
- **Zero backend ops**: No server management, patching, scaling
- **Integrated auth + DB + storage**: Single vendor, unified API
- **RLS = native multi-tenancy**: Row-level security at database level
- **Generous free tier**: Suitable for development and staging
- **Real-time ready**: Subscriptions available for future collaboration features

### Negative
- **Vendor lock-in**: Migration would require significant rework
- **RLS complexity**: Policy debugging requires Supabase Dashboard expertise
- **Edge Function limits**: Cold starts, execution time limits
- **Pricing at scale**: Pro plan required for production workloads

## Implementation Evidence

- **Client**: `src/lib/supabase.js` (singleton, null guard, env injection)
- **Auth**: `src/context/AuthContext.jsx` (uses `getSupabaseClient()`)
- **Service layer**: `src/services/dynamicService.js` (all DB ops via Supabase client)
- **Persistence**: `src/core/capabilities/alert/occurrence/persistence/OccurrenceLedgerPersistencePort.js`
- **CI/CD**: `.github/workflows/deploy-pages.yml` injects secrets at build time
- **Sprints**: 70 (certification), 341 (temporal), 346-351 (tenant persistence), 356-369 (auth recovery)

## Related ADRs
- ADR-005: GitHub Actions + GitHub Pages Production Deployment (CI/CD integration)
- ADR-006: Tenant-Scoped Persistence (extends Supabase with tenant isolation)
- ADR-007: Authentication Client Initialization Contract (null guards)
- ADR-009: Document Storage and RLS Security Model

---

**Supersedes**: Initial Firebase evaluation (Sprint 1-6)  
**Next Review**: 2026-12-01