# Deployment Architecture — SGC-DM Production Deployment

**Version:** 2.0 (Sprint 380 Consolidated)  
**Status:** PRODUCTION CERTIFIED (Sprint 369)  
**Branch:** release/stable-sprint79  
**Last Updated:** 2026-09-03  

---

## Deployment Overview

The SGC-DM production deployment uses **GitHub Actions + GitHub Pages** as the sole deployment mechanism, replacing the legacy manual `npm run deploy` to `gh-pages` branch approach.

---

## Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION DEPLOYMENT PIPELINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEVELOPER                                                                 │
│       │                                                                     │
│       ▼                                                                    │
│  git push origin release/stable-sprint79                                   │
│       │                                                                     │
│       ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GITHUB ACTIONS WORKFLOW                          │   │
│  │  .github/workflows/deploy-pages.yml                                 │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ BUILD JOB (ubuntu-latest)                                   │   │   │
│  │  │   environment:                                              │   │   │
│  │  │     name: github-pages          ◄── CRITICAL                │   │   │
│  │  │                                                             │   │   │
│  │  │   Steps:                                                    │   │   │
│  │  │   1. actions/checkout@v4                                    │   │   │
│  │  │   2. actions/setup-node@v4 (Node 20, npm cache)            │   │   │
│  │  │   3. npm ci                                                 │   │   │
│  │  │   4. Build with Supabase env vars                          │   │   │
│  │  │      env:                                                   │   │   │
│  │  │        VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}  │   │   │
│  │  │        VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }} │   │
│  │  │      run: |                                                 │   │   │
│  │  │        test -n "$VITE_SUPABASE_URL" && echo "PRESENT"      │   │   │
│  │  │          || echo "WARNING_UNSET"                            │   │   │
│  │  │        test -n "$VITE_SUPABASE_ANON_KEY" && echo "PRESENT" │   │   │
│  │  │          || echo "WARNING_UNSET"                            │   │   │
│  │  │        npm run build                                        │   │   │
│  │  │   5. actions/upload-pages-artifact@v3                       │   │   │
│  │  │      with: { path: ./dist }                                 │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                              │                                  │   │
│  │                              ▼                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │ DEPLOY JOB (ubuntu-latest)                              │   │   │
│  │  │   needs: build                                          │   │   │
│  │  │   environment:                                          │   │   │
│  │  │     name: github-pages          ◄── CRITICAL            │   │   │
│  │  │     url: ${{ steps.deployment.outputs.page_url }}       │   │   │
│  │  │                                                             │   │   │
│  │  │   Steps:                                                  │   │   │
│  │  │   1. actions/deploy-pages@v4                              │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    GITHUB PAGES (CDN)                               │   │
│  │  Source: GitHub Actions (NOT "Deploy from branch")                  │   │
│  │  URL: https://projects-dm.github.io/sistema-gestion-calidad-dm/     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Required Configuration

### 1. GitHub Environment (github-pages)

**Settings → Environments → github-pages**

| Setting | Value |
|---------|-------|
| Environment name | github-pages |
| Protection rules | None required (or required reviewers) |
| Environment secrets | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |

**Secrets:**
| Secret | Value |
|--------|-------|
| VITE_SUPABASE_URL | https://ruxomcnxsnhlfqlefsrc.supabase.co |
| VITE_SUPABASE_ANON_KEY | sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti |

### 2. GitHub Pages Source

**Settings → Pages → Build and deployment → Source**

| Setting | Value |
|---------|-------|
| Source | **GitHub Actions** (NOT "Deploy from a branch") |

> **Critical**: If set to "Deploy from branch" (gh-pages), the actions/deploy-pages@v4 step will fail with HTTP 403/404.

### 3. Workflow File (.github/workflows/deploy-pages.yml)

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
          test -n "$VITE_SUPABASE_URL" && echo "VITE_SUPABASE_URL=PRESENT" || echo "VITE_SUPABASE_URL=WARNING_UNSET"
          test -n "$VITE_SUPABASE_ANON_KEY" && echo "VITE_SUPABASE_ANON_KEY=PRESENT" || echo "VITE_SUPABASE_ANON_KEY=WARNING_UNSET"
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

---

## Critical Invariants

| Invariant | Verification | Sprint |
|-----------|--------------|--------|
| ENV-SCOPE | Build job declares environment: github-pages | Sprint 361 |
| SECRETS-SCOPE | Secrets in Environment github-pages (not Repository Secrets) | Sprint 361 |
| PAGES-SOURCE | Pages Source = GitHub Actions | Sprint 361 |
| BUILD-VERIFICATION | Logs show VITE_SUPABASE_URL=PRESENT | Sprint 361 |
| ARTIFACT-VALIDATION | Deployed bundle contains Supabase URL | Sprint 369 |

---

## Deployment Verification Checklist

| Check | Command/Location | Expected |
|-------|------------------|----------|
| Pages Source | Settings → Pages → Source | GitHub Actions |
| Environment | Settings → Environments → github-pages | Exists with secrets |
| Secrets | Environment → Secrets | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY |
| Workflow | Actions tab → deploy-pages.yml | Green on push |
| Build Logs | Actions → build job logs | VITE_SUPABASE_URL=PRESENT |
| Deploy Logs | Actions → deploy job | actions/deploy-pages@v4 PASS |
| Production URL | https://projects-dm.github.io/... | HTTP 200 |
| Artifact | Remote supabase-*.js chunk | Contains Supabase URL |
| Runtime | Browser console | No null.auth, no ERR_NAME_NOT_RESOLVED |

---

## Legacy Deployment (Deprecated)

| Mechanism | Command | Status |
|-----------|---------|--------|
| Legacy | npm run deploy → gh-pages -d dist | DEPRECATED |
| Branch | gh-pages branch | STALE (2026-07-15) |

> **Do not use** npm run deploy for production. The gh-pages branch is stale (last update 2026-07-15) and will serve outdated artifacts.

---

## Rollback Procedure

| Scenario | Action |
|----------|---------|
| Failed deployment | Re-run previous successful workflow run (Actions → Re-run) |
| Pages source issue | Settings → Pages → Source → GitHub Actions |
| Secrets missing | Settings → Environments → github-pages → Add secrets |
| Full rollback | git checkout 54951b7 && npm run deploy (uses legacy gh-pages branch) |

---

## Rollback Reference

| Type | Reference | Method |
|------|-----------|--------|
| Immediate | gh-pages branch @ 6c8f866 (2026-07-15) | Switch Pages source to branch |
| Full | 54951b7 (Sprint 348 certified) | git checkout 54951b7 && npm run deploy |

---

## Historical Deployment Failures (Resolved)

| Sprint | Issue | Resolution |
|--------|-------|------------|
| 351 | Workflow introduced without environment: github-pages on build job | Sprint 361 added env scope |
| 355-358 | ERR_NAME_NOT_RESOLVED — missing env vars | Sprint 361 configured Environment secrets |
| 360 | actions/deploy-pages@v4 failed (403/404) | Sprint 361 set Pages Source = GitHub Actions |
| 362 | TypeError: Cannot read properties of null | Sprint 363 added null guards |
| 369 | Final certification — all resolved | All PASS |

---

## Rollback Reference

| Type | Reference | Method |
|------|-----------|--------|
| Immediate | gh-pages branch @ 6c8f866 (2026-07-15) | Switch Pages source to branch |
| Full | 54951b7 (Sprint 348 certified) | git checkout 54951b7 && npm run deploy |

---

## Monitoring & Alerting (Future)

| Metric | Target | Alert |
|--------|--------|-------|
| Deployment success rate | 100% | Alert on failure |
| Build time | < 10 min | Alert if > 15 min |
| Artifact size | < 5 MB gzipped | Alert if > 10 MB |
| Supabase URL in artifact | Present | Alert if missing |
| Production HTTP | 200 OK | Alert if != 200 |

---

**Document Maintained by**: DevOps / Architecture Team  
**Last Updated**: 2026-09-03 (Sprint 380)  
**Next Review**: 2026-12-01