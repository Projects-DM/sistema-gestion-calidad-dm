# ADR-005: GitHub Actions + GitHub Pages Production Deployment

**Status:** ACCEPTED  
**Date:** 2026-08-27 (Sprint 351), 2026-08-28 (Sprint 361 correction), 2026-09-03 (consolidated)  
**Deciders:** Architecture Team  
**Sprint References:** Sprint 351 (introduction), Sprint 360 (failure audit), Sprint 361 (correction), Sprint 369 (certification)

---

## Context

The SGC-DM system originally deployed via `npm run deploy` → `gh-pages -d dist` pushing to the `gh-pages` branch. This worked but had limitations:

- **Manual trigger**: Required local `npm run deploy` execution
- **No environment isolation**: Local `.env.production` used for all deployments
- **No secret management**: Supabase credentials in local `.env.production` (not ideal for team)
- **No audit trail**: No deployment history, rollback difficult
- **Branch divergence**: `gh-pages` branch could diverge from `release/stable-sprint79`

In Sprint 351, GitHub Actions workflow was introduced but **misconfigured**:
- Build job lacked `environment: github-pages` → Environment Secrets not resolved
- GitHub Pages source still set to "Deploy from branch" (gh-pages)
- Repository Secrets not configured → `VITE_SUPABASE_URL` = `undefined` at build time

This caused the authentication regression (`ERR_NAME_NOT_RESOLVED` → `TypeError: Cannot read properties of null`) documented in Sprints 355-370.

## Decision

Adopt **GitHub Actions + GitHub Pages** as the **sole production deployment mechanism** with proper configuration:

### Corrected Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GITHUB ACTIONS PIPELINE                    │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────────┐   │
│  │   Push to   │───►│   Build     │───►│  Upload Artifact │   │
│  │ release/    │    │  (npm run   │    │  (gha-pages.tar) │   │
│  │ stable-...  │    │   build)    │    │                  │   │
│  └─────────────┘    └──────┬──────┘    └────────┬─────────┘   │
│                            │                       │             │
│                     ┌──────▼──────┐    ┌──────────▼────────┐   │
│                     │ Environment │    │  Deploy to      │   │
│                     │  Secrets    │    │  GitHub Pages   │   │
│                     │  (github-   │    │  (actions/      │   │
│                     │  pages)     │    │  deploy-pages)  │   │
│                     └─────────────┘    └────────┬────────┘   │
│                                                │             │
│                                                ▼             │
│                                     ┌─────────────────────┐ │
│                                     │  GitHub Pages       │ │
│                                     │  projects-dm.       │ │
│                                     │  github.io/...      │ │
│                                     └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Required Configuration

#### 1. Workflow (`.github/workflows/deploy-pages.yml`)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    environment:          # CRITICAL - enables Environment Secrets
      name: github-pages
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && echo "PRESENT" || echo "WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "PRESENT" || echo "WARNING_UNSET"
          npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

#### 2. GitHub Environment Configuration

**Settings → Environments → github-pages**
- Must exist and be configured
- **Environment Secrets** (not Repository Secrets):
  - `VITE_SUPABASE_URL` = `https://ruxomcnxsnhlfqlefsrc.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti`

#### 3. GitHub Pages Source

**Settings → Pages → Build and deployment → Source**
- **Must be**: `GitHub Actions` (NOT "Deploy from a branch")

### Critical Invariants

| Invariant | Verification |
|-----------|--------------|
| **ENV-SCOPE** | Build job MUST declare `environment: github-pages` |
| **SECRETS-SCOPE** | Secrets MUST be in Environment `github-pages`, not Repository Secrets |
| **PAGES-SOURCE** | GitHub Pages Source = "GitHub Actions" |
| **BUILD-VERIFICATION** | Build logs must show `VITE_SUPABASE_URL=PRESENT` |
| **ARTIFACT-VALIDATION** | Deployed artifact must contain Supabase URL |

### Deployment Invariants (Sprint 369 Certified)

| Layer | Verified State |
|-------|---------------|
| **Git Branch** | `release/stable-sprint79` |
| **Workflow File** | `.github/workflows/deploy-pages.yml` (READ ONLY) |
| **Build Environment** | `environment: name: github-pages` |
| **Secrets Resolution** | `${{ secrets.VITE_SUPABASE_URL }}` & `VITE_SUPABASE_ANON_KEY` → **PRESENT** |
| **Vite Compilation** | `npm run build` → **PASS** |
| **GitHub Pages Site** | `https://projects-dm.github.io/...` → **HTTP 200** |
| **Supabase Client** | Singleton initialized (`supabase !== null`) |
| **AuthContext Guards** | Defensive null guards active |
| **Login Flow** | `POST /auth/v1/token?grant_type=password` → **HTTP 200** |
| **Login/Logout/Re-login** | **SUCCESS** |

## Consequences

### Positive
- **Fully automated**: Push to `release/stable-sprint79` → automatic deploy
- **Secret isolation**: Supabase credentials in GitHub Environment, not code
- **Audit trail**: Every deployment logged in Actions tab with artifact hash
- **Rollback**: Re-run previous workflow run for instant rollback
- **Environment isolation**: Environment secrets scoped to `github-pages`

### Negative
- **GitHub dependency**: Deployment tied to GitHub infrastructure
- **Actions minutes**: Consumes GitHub Actions minutes (free tier sufficient for now)
- **Configuration complexity**: Multiple settings across GitHub UI (Environment, Pages, Secrets)

## Implementation Evidence

- **Workflow**: `.github/workflows/deploy-pages.yml` (Sprint 351 + Sprint 361 corrections)
- **Sprint 351**: Initial workflow introduction (misconfigured)
- **Sprint 360**: Failure forensic audit (identified misconfiguration)
- **Sprint 361**: Correction (added `environment: github-pages` to build job)
- **Sprint 369**: Final certification (all 30 DoD criteria PASS)
- **Certified artifact**: `dist/assets/supabase-*.js` contains valid Supabase URL

## Related ADRs
- ADR-004: Supabase as Remote Persistence Backend (secrets source)
- ADR-007: Authentication Client Initialization Contract (build-time env injection)
- ADR-006: Tenant-Scoped Persistence (deployment must include tenant env)

---

**Supersedes**: Manual `npm run deploy` → `gh-pages` branch (Sprints 1-350)  
**Next Review**: 2026-12-01