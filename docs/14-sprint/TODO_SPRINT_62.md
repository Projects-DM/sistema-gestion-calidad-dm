# TODO — SPRINT 62 — Capability-Driven Module Administration (Fase 1)

## Fase 1 — Identidad estable (moduleId)
- [ ] Inspeccionar y modificar `src/App.jsx` para añadir ruta estable por `moduleId` (opción A).
- [ ] Añadir `dynamicService.getModuleById(moduleId)`.
- [ ] Implementar wrapper `DynamicModuleById` (o adaptar `DynamicModule`) para cargar `modInfo` y `moduleId` usando `moduleId` como identidad permanente.
- [ ] Mantener compatibilidad total: la ruta legacy `/:moduleSlug` debe seguir funcionando y redirigir/resolver internamente a `moduleId`.

## Fase 1 — Administrador de módulos
- [ ] Habilitar el botón “+ Nuevo módulo” en `src/components/workspace/ModuleManager.jsx`.
- [ ] Implementar UI mínimo de creación `ModuleCreatePanel` con campos: Nombre, Slug, Descripción, Icono, Orden, Estado.
- [ ] Integrar selección inicial de capacidades desde `Capability Registry` (sin persistencia real todavía; preparado para Siguiente Sprint).

## Validación
- [ ] Ejecutar `npm run build`.
- [ ] Checklist manual:
  - [ ] Cambiar `slug` de un módulo existente no rompe acceso al módulo (legacy slug y ruta estable).
  - [ ] Trazabilidad no presenta regresiones.
  - [ ] “Nuevo módulo” está habilitado y no rompe el listado/edición.

