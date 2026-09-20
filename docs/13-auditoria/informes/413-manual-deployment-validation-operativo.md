# Sprint 413 — Validación Manual de Despliegue sobre `operativo`

## 1. Objetivo

Dejar evidencia formal y verificable de que `operativo` ejecuta correctamente el pipeline `deploy-pages.yml` hacia GitHub Pages, sin cambiar codigo, workflow ni produccion. Auditoria/documentacion: `AUDIT → DOCUMENT → VALIDATE`.

## 2. Contexto

Validacion pendiente del Sprint 412 (sin mecanismo de dispatch entonces). Secuencia 411→412→**413**→414(cutover)→415(smoke)→416(certificacion). Ejecucion manual realizada por el operador desde GitHub Actions; este Sprint solo la documenta y corrobora.

## 3. Alcance y restricciones

Solo se crea este informe. Verificado sin modificar: workflow, codigo, Supabase, secrets, branches, rulesets, Pages, Vercel; sin builds locales ni comandos de red con escritura. Contexto local intacto: HEAD=`fd2f263`, `origin/operativo`=`fd2f263`, tree solo con informes pendientes, cero diff en workflow/`src`.

## 4. Workflow validado

```text
Workflow: Deploy to GitHub Pages
Archivo: .github/workflows/deploy-pages.yml
Evento utilizado: workflow_dispatch
Rama validada: operativo
```

Trigger automatico vigente (inalterado):

```yaml
on:
  push:
    branches: [release/stable-sprint79]
  workflow_dispatch:
```

```text
workflow_dispatch ≠ cambio del trigger automático
```

## 5. Estado previo

Baseline `fd2f263` triple (HEAD/origin/tag); `operativo` en baseline; allowlist con `operativo`; rulesets activos; ultimo deploy previo = baseline Sep-19.

## 6. Ejecución manual

Operador: Projects-DM, 2026-09-20T11:45Z, Actions → `deploy-pages.yml` → Run workflow → Branch `operativo` (SHA `fd2f263`). Sin tocar trigger, ramas ni configuracion.

## 7. Evidencia de ejecución

### 7.1 Run

```text
Run ID: 35508710504 (run #19, event workflow_dispatch, branch operativo,
SHA fd2f263, actor Projects-DM, status completed, conclusion success)
```

Corroborado por API publica (coincide exacto con datos del operador).

### 7.2 Build

```text
Build Job ID: 106072768403 → SUCCESS
```

Etapas: Checkout → Setup Node.js → Install dependencies → Build with Supabase environment variables → Upload artifact (segun operador; IDs preservados verbatim).

### 7.3 Deploy

```text
Deploy Job ID: 106072810466 → SUCCESS
```

Con `deploy: needs: build` como evidencia de dependencia build→deploy.

## 8. Validación de GitHub Pages

Deployment servido y abierto desde el enlace de Pages por el operador. Estado registrado:

```text
GitHub Pages deployment: FUNCIONAL
```

## 9. Validación funcional de SGC-DM

```text
Aplicación SGC-DM: FUNCIONAL
Acceso mediante enlace de Pages: CONFIRMADO
```

Alcance declarado: disponibilidad/carga correcta post-despliegue. No se afirman pruebas exhaustivas por modulo.

## 10. Warnings y notices

2 warnings + 2 notices, clasificados como **mantenimiento futuro, no bloqueantes** (build/deploy SUCCESS): Node.js 20 deprecated en runners (checkout/setup-node/upload-artifact/deploy-pages → Node 24); `ubuntu-latest` → Ubuntu 26 desde 2026-10-19. Alcance 413 congelado a proposito: sin actualizar Node/Actions/ubuntu/workflow para no invalidar la prueba (Sprint de mantenimiento posterior si se requiere).

## 11. Cambios realizados

Infra/config/app/workflow: **Ninguno**. Unico evento: ejecucion manual `workflow_dispatch` sobre `operativo`.

## 12. Cambios no realizados

Trigger, `release/stable-sprint79`, rulesets, environment, Vercel, Supabase, arquitectura: intactos. Produccion automatica: `release/stable-sprint79`. Validacion manual: `operativo`. Distincion preservada (no es cutover).

## 13. Checkpoint CP3

```text
CP3 — Manual Dispatch Validation: PASS
Run 35508710504 → SUCCESS · Build 106072768403 → SUCCESS
Deploy 106072810466 → SUCCESS · Pages → FUNCIONAL · SGC-DM → CARGA CORRECTA
```

## 14. Resultado

```text
PASS — MANUAL DEPLOYMENT VALIDATED
```

Evidenciado 1–8 (operativo ejecuta workflow; build/artifact/deploy OK; Pages sirve; app carga; produccion y trigger inalterados).

## 15. Criterios de salida

Objetivo, contexto, workflow, rama, evento, baseline, Run/Build/Deploy IDs, resultados, validacion funcional, warnings, cambios realizados/no realizados, conclusion y siguiente paso: presentes.

## 16. Decisión

La evidencia habilita evaluar el cutover controlado (Sprint 414). No se declara cutover ni produccion automatica de `operativo`.

## 17. Siguiente Sprint

```text
Sprint 414 — Production Cutover (cambio de trigger release → operativo)
```

No ejecutado aqui. La validacion manual es su evidencia de entrada.

## 18. Evidencias y referencias

IDs operador (verbatim §7/§19-spec) + corroboracion API run 35508710504 (branch/SHA/evento/actor/conclusion) + contexto Git local (baseline, workflow intacto) + Sprints 411/412 (diseno y bloqueo previo). Clave conservada:

```text
Run ID 35508710504 · Build 106072768403 · Deploy 106072810466
Baseline fd2f263 · Branch operativo · Event workflow_dispatch
Build SUCCESS · Deploy SUCCESS · Pages FUNCIONAL
```

```text
VALIDACIÓN MANUAL COMPLETADA (≠ PRODUCTION CUTOVER)
```
