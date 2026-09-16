# Deployment Overview — Sistema de Gestión de Calidad (SGC-DM)

**Version:** 1.0 (Sprint 383)  
**Classification:** PROFESSIONAL PRESENTATION  
**Branch:** `release/stable-sprint79`  
**Baseline:** `c7d9547`

---

## 1. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT PIPELINE                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  DEVELOPER                                                               │
│       │                                                                  │
│       ▼                                                                  │
│  git push origin release/stable-sprint79                                │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    GITHUB ACTIONS WORKFLOW                       │    │
│  │  .github/workflows/deploy-pages.yml                              │    │
│  │                                                                   │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ BUILD JOB (ubuntu-latest)                               │    │    │
│  │  │   environment:                                           │    │    │
│  │  │     name: github-pages          ◄── CRITICAL             │    │    │
│  │  │                                                                │    │    │
│  │  │   Steps:                                                    │    │    │
│  │  │   1. actions/checkout@v4                                   │    │    │
│  │  │   2. actions/setup-node@v4 (Node 20, npm cache)           │    │    │
│  │  │   3. npm ci                                                │    │    │
│  │  │   4. Build with Supabase env vars                         │    │    │
│  │  │      env:                                                  │    │    │
│  │  │        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }} │    │    │
│  │  │        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} │    │
│  │  │      run: |                                                │    │    │
│  │  │        test -n "$VITE_SUPABASE_URL" && echo "PRESENT"     │    │    │
│  │  │          || echo "WARNING_UNSET"                          │    │    │
│  │  │        test -n "$VITE_SUPABASE_ANON_KEY" && echo "PRESENT"│    │    │
│  │  │          || echo "WARNING_UNSET"                          │    │    │
│  │  │        npm run build                                      │    │    │
│  │  │   5. actions/upload-pages-artifact@v3                     │    │    │
│  │  │      with: { path: ./dist }                               │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  │                              │                                  │    │
│  │                              ▼                                  │    │
│  │  ┌─────────────────────────────────────────────────────────┐    │    │
│  │  │ DEPLOY JOB (ubuntu-latest)                              │    │    │
│  │  │   needs: build                                          │    │    │
│  │  │   environment:                                          │    │    │
│  │  │     name: github-pages          ◄── CRITICAL            │    │    │
│  │  │     url: ${{ steps.deployment.outputs.page_url }}       │    │    │
│  │  │                                                              │    │    │
│  │  │   Steps:                                                  │    │    │
│  │  │   1. actions/deploy-pages@v4                              │    │    │
│  │  └─────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    GITHUB PAGES (CDN)                           │    │
│  │  Source: GitHub Actions (NOT "Deploy from branch")              │    │
│  │  URL: https://projects-dm.github.io/sistema-gestion-calidad-dm/ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Deployment Pipeline Details

### 2.1 Workflow Configuration (`.github/workflows/deploy-pages.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [release/stable-sprint79]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    environment:
      name: github-pages          # CRITICAL: Enables Environment Secrets
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Build with Supabase environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && echo "VITE_SUPABASE_URL=PRESENT" || echo "WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "VITE_SUPABASE_ANON_KEY=PRESENT" || echo "WARNING_UNSET"
          npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

### Critical Configuration Invariants

| Invariant | Verification |
|-----------|--------------|
| **ENV-SCOPE** | Build job declares `environment: github-pages` |
| **SECRETS-SCOPE** | Secrets in Environment `github-pages` (not Repository Secrets) |
| **PAGES-SOURCE** | Pages Source = "GitHub Actions" (NOT "Deploy from branch") |
| **BUILD-VERIFICATION** | Logs show `VITE_SUPABASE_URL=PRESENT` |
| **ARTIFACT-VALIDATION** | Deployed bundle contains Supabase URL |

---

## 3. Required GitHub Configuration

### 3.1 GitHub Environment (`github-pages`)

**Settings → Environments → github-pages**

| Setting | Value |
|---------|-------|
| **Environment name** | `github-pages` |
| **Protection rules** | None required (or required reviewers) |
| **Environment secrets** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

**Required Secrets:**
| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | `https://ruxomcnxsnhlfqlefsrc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti` |

### 3.2 GitHub Pages Configuration

**Settings → Pages → Build and deployment → Source**

| Setting | Value |
|---------|-------|
| **Source** | **GitHub Actions** (NOT "Deploy from a branch") |

> **Critical:** If set to "Deploy from a branch" (`gh-pages`), the `actions/deploy-pages@v4` step will fail with HTTP 403/404.

### 3.3 Repository Secrets (Not Used)

| Secret | Status |
|--------|--------|
| Repository Secrets `VITE_SUPABASE_URL` | NOT USED (Environment Secrets take precedence) |
| Repository Secrets `VITE_SUPABASE_ANON_KEY` | NOT USED |

---

## 3. Build Process

### Build Command
```bash
npm run build
# Internally: vite build
```

### Build Output
```
dist/
├── index.html                          1.45 kB
├── assets/
│   ├── index-<hash>.js                 2.3 MB  (main bundle)
│   ├── supabase-<hash>.js              195 KB  (Supabase chunk)
│   ├── index-<hash>.css                73 KB
│   └── ... (19 total assets)
```

### Build Verification (CI Logs)

```
VITE_SUPABASE_URL=PRESENT
VITE_SUPABASE_ANON_KEY=PRESENT
✓ built in 7.75s
```

---

## 4. Environment Variables

### 3.1 Required Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | GitHub Environment Secret | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | GitHub Environment Secret | Supabase anon/public key |

### Local Development (`.env.production`)

```env
VITE_SUPABASE_URL=https://ruxomcnxsnhlfqlefsrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti
```

### Build-Time Injection

Vite replaces `import.meta.env.VITE_*` at compile time:

```javascript
// src/lib/supabase.js
const url = import.meta.env.VITE_SUPABASE_URL;      // → "https://..."
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;  // → "sb_publishable_..."
```

**If missing at build time:**
- Vite replaces with `undefined`
- `getSupabaseClient()` returns `null`
- AuthContext null guards activate → controlled error message

---

## 4. Legacy Deployment (Deprecated)

### Legacy Mechanism (`npm run deploy`)

```json
// package.json
"scripts": {
  "deploy": "gh-pages -d dist"
}
```

| Aspect | Status |
|--------|--------|
| **Mechanism** | `gh-pages -d dist` → pushes `dist/` to `gh-pages` branch |
| **Branch** | `gh-pages` (stale since 2026-07-15) |
| **Status** | **DEPRECATED** — Not used in production |
| **Risk** | If Pages Source = "Deploy from branch", serves stale artifact |

> **Do not use** `npm run deploy` for production. GitHub Actions is the sole deployment mechanism.

---

## 5. Rollback Procedures

### Immediate Rollback (Pages Source Issue)

1. **Settings → Pages → Source** → Change to "Deploy from a branch"
2. Select branch: `gh-pages` / root
2. Save → Pages serves stale but functional artifact

### Full Rollback (Code Regression)

```bash
# 1. Checkout known good baseline
git checkout 54951b7

# 2. Deploy via legacy mechanism
npm run deploy

# 3. Verify production
# https://projects-dm.github.io/sistema-gestion-calidad-dm/
```

| Rollback Type | Trigger | Time | Data Loss |
|---------------|---------|------|-----------|
| **Pages Source Switch** | Deployment failure | ~2 min | None |
| **GitHub Actions Re-run** | Build failure | ~5 min | None |
| **Full Code Rollback** | Critical regression | ~10 min | None (code only) |

---

## 5. Monitoring & Verification

### 5.1 Post-Deployment Verification Checklist

| Check | Method | Expected |
|-------|--------|----------|
| **Pages Status** | Settings → Pages | "Your site is live" |
| **HTTP Status** | `curl -I https://...` | `HTTP 200` |
| **Supabase URL in Bundle** | DevTools → Network → `supabase-*.js` | Contains `ruxomcnxsnhlfqlefsrc.supabase.co` |
| **Build Logs** | Actions → Build job | `VITE_SUPABASE_URL=PRESENT` |
| **Auth Flow** | Browser → Login → Dashboard | Login → Dashboard → Logout → Re-login |
| **Cross-Browser** | Chrome / Firefox / Safari / Mobile | Consistent behavior |

### Production Health Checks

| Check | Frequency | Tool |
|-------|-----------|------|
| **Uptime** | Continuous | GitHub Pages status |
| **Auth API** | Per session | Browser DevTools Network |
| **Supabase Connectivity** | Per session | Network tab → `/auth/v1/token` |
| **Storage Access** | Per upload | Network tab → `storage/v1/object` |

---

## 5. Rollback Reference

| Scenario | Action | Time |
|----------|--------|------|
| **Failed Deployment** | Actions → Re-run previous successful run | ~5 min |
| **Pages Source Wrong** | Settings → Pages → Source = GitHub Actions | ~2 min |
| **Secrets Missing** | Settings → Environments → github-pages | ~5 min |
| **Critical Regression** | `git checkout 54951b7 && npm run deploy` | ~10 min |

---

## 6. Legacy Deployment Reference (Do Not Use)

| Mechanism | Command | Status |
|-----------|---------|--------|
| Legacy CLI | `npm run deploy` | **DEPRECATED** |
| Legacy Branch | `gh-pages` branch | **STALE** (2026-07-15) |

> **Do not use** for production deployments. GitHub Actions is the sole authorized mechanism.

---

## 6. Monitoring & Alerting (Future)

| Metric | Target | Alert |
|--------|--------|-------|
| Deployment Success Rate | 100% | Alert on failure |
| Build Time | < 10 min | Alert if > 15 min |
| Artifact Size | < 5 MB gzipped | Alert if > 10 MB |
| Supabase URL in Artifact | Present | Alert if missing |
| Production HTTP | 200 OK | Alert if != 200 |

---

## 7. Rollback Reference

| Type | Reference | Method |
|------|-----------|--------|
| **Immediate** | `gh-pages` branch @ `6c8f866` (2026-07-15) | Switch Pages source to branch |
| **Full** | `54951b7` (Sprint 348 certified) | `git checkout 54951b7 && npm run deploy` |

---

*Document generated as part of Sprint 383 — Professional Project Presentation & Portfolio Readiness*  
*Deployment baseline: Sprint 361/369 certified | Current workflow: `deploy-pages.yml` (ee25971 corrected)*