# Sprint 254 — ModalShell React API Normalization & Presentation Layer Hardening

> Nivel 5 · Refinamiento técnico · Normalización de React Hooks · Hardening del contenedor compartido

## Tipo
Presentation Layer Refinement · React Modernization · Shared Component Hardening

**Impacto: exclusivamente `src/shared/components/ModalShell.jsx`.** No modifica Runtime, Persistencia,
Metadata, Dynamic Runtime, Form Engine, Alert Engine, Notification Engine, Resolver, Mapper,
Providers, Contracts ni Application Services. Estado esperado: **MODALSHELL MODERN REACT CERTIFIED**.

---

## 1. Objetivo

Normalizar completamente el componente compartido `ModalShell` para utilizar una única convención de
React, eliminando la mezcla entre `import { useEffect } from 'react'` y `React.useEffect(...)` que
provoca `ReferenceError: React is not defined`.

## 2. Causa raíz

Durante la extracción de `ModalShell` desde `DocumentRepositoriesAdmin` quedó una mezcla de dos
estilos: el hook se importaba de forma moderna (`import { useEffect } from 'react'`) pero se invocaba
de forma clásica (`React.useEffect(...)`) sin haber importado `React` — con el runtime moderno de JSX
no hay global `React`.

## 3. Cambio aplicado

`React.useEffect(() => {` → **`useEffect(() => {`** (hook importado usado directamente). No se agrega
`import React from 'react'`.

## 4. Verificación adicional

Se auditó que no exista ningún otro acceso `React.*` (`React.useMemo`, `React.useState`,
`React.useCallback`, `React.memo`, `React.Fragment`, `React.Children`, `React.cloneElement`). El
archivo quedó totalmente consistente con la convención moderna.

## 5. Restricciones respetadas

No se modificaron: API de `ModalShell`, props, overlay, estilos, animaciones, Escape, backdrop,
cierre, scroll, layout, `children` ni consumidores. **No** se crean `ModalShellV2`, `ModalProvider`,
`OverlayProvider`, `ReactWrapper` ni Hooks nuevos. `Configuration` y `DocumentRepositoriesAdmin`
siguen reutilizando el mismo `ModalShell`.

## 6. Definition of Done
✅ Eliminado todo uso de `React.useEffect`.
✅ Uso exclusivo del hook importado `useEffect(...)`.
✅ Sin importar `React` innecesariamente.
✅ Sin referencias `React.*` residuales.
✅ Build PASS.
✅ ModalShell compartido intacto (API/overlay/Escape/scroll/backdrop).
✅ `Configuration` vuelve a cargar normalmente.
✅ Repositorios Documentales siguen reutilizando el mismo `ModalShell`.
✅ SSOT preservado.

## 7. Certificación MRN-1…MRN-12 → 12/12 PASS
Normalización de Hooks certificada · React moderno unificado · Shared Component endurecido · API
consistente · Sin cambios funcionales · Sin nuevas capas · Runtime intacto · Persistencia intacta ·
Metadata intacta · Resolver intacto · Mapper intacto · **MODALSHELL MODERN REACT CERTIFIED**.