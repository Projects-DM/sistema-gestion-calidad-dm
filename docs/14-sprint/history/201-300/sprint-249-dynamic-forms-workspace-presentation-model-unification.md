# Sprint 249 — Dynamic Forms Workspace Layout Audit & Presentation Model Unification

> Nivel 5 · Auditoría de consistencia visual · Unificación del Workspace · Certificación del modelo de presentación

## Tipo
Architecture Audit · Presentation Layer Validation · Workspace Consistency Audit

**Impacto: auditoría exclusiva — no modifica ningún archivo de implementación.** No altera Runtime,
Persistencia, Metadata, Dynamic Runtime, Form Engine, Document Repository, Alert Engine, Notification
Engine, DynamicModule, ModuleManager, ModuleAdministrationApplicationService, Providers, Contracts ni
el modelo de capacidades. Estado esperado: **WORKSPACE PRESENTATION CERTIFIED**.

---

## 1. Objetivo

Auditar la diferencia arquitectónica entre el **Workspace de Formularios Dinámicos** y el **Workspace
de Repositorios Documentales** dentro de `Configuration`, identificando por qué ambos exponen
operaciones de configuración sobre un recurso mediante **dos modelos visuales distintos**. Se localiza
el punto exacto donde Formularios Dinámicos deja de reutilizar el modelo visual certificado y se define
la estrategia de **unificación** a ejecutar en el Sprint 250 **sin modificar lógica de negocio ni
comportamiento funcional**.

## 2. Entradas auditadas

| Entrada | Ruta |
|---|---|
| Configuration (pestañas) | `src/pages/Configuration.jsx` |
| Workspace Repositorios Documentales | `src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` |
| Workspace Módulos (panel dedicado) | `src/components/workspace/ModuleManager.jsx`, `ModuleDetailPanel.jsx` |
| Contenedor certificado de colecciones | `src/modules/experiences/AlertConfigurationPanel.jsx` |

## 3. Hallazgos (evidencia fuente)

**Modelo actual — Formularios Dinámicos (`Configuration.jsx`, pestaña `formularios`, L324–L577).**
Las acciones se renderizan **embebidas inline** dentro del flujo principal. La tabla de formularios
posee una columna `Acciones` (Bell/Configuración de alertas, Settings/Editar metadatos, Edit/Configurar
campos, Trash/Eliminar) que mutan el estado de la página (`setAlertConfigTarget`, `handleStartEditForm`,
`setSelectedForm`, `handleDeleteForm`). Cada acción cambia la vista principal mediante **early-returns
de página completa** (`if (alertConfigTarget)`, `if (selectedForm)`, `isEditingForm`) dentro del mismo
contenedor `Configuration`. No existe un componente Workspace dedicado para el formulario: el flujo
edición/creación/campos se mantiene embebido en la página.

**Modelo actual — Repositorios Documentales (`DocumentRepositoriesAdmin.jsx`).**
Componente Workspace **autocontenido y delimitado**:
- Cabecera propia (título + subtítulo + acción primaria "Nuevo Repositorio Documental").
- Layout composite **master/detail** de dos paneles (`lg:grid-cols-3` → `lg:col-span-1` lista de
  repositorios + `lg:col-span-2` panel de categorías del repositorio seleccionado).
- Cada acción (editar repositorio, nueva/editar categoría, **alertas**) abre un **panel dedicado** en
  satélite (`ModalShell` local reutilizado L68-L119, con Escape, overlay y bóveda).
- La acción **Alertas** delega en `AlertConfigurationPanel` dentro de un `ModalShell` (L812-L843).

**Contenedor certificado compartido.**
Ambos módulos reutilizan `AlertConfigurationPanel` para la acción **Alertas** — el contenedor de
colecciones certificado (Sprints 201/222/227/229/243/247/248) — con los mismos props
(`resource`, `resourceKind`, `persistence={alertConfigurationPersistence}`). Esto demuestra que la
plataforma YA dispone de un modelo de panel independiente reutilizable.

## 4. Evaluación de hipótesis (WU-01…WU-06)

- **WU-01 — ¿Reutilizan el mismo contenedor?** NO. Formularios queda embebido en `Configuration`; 
  Repositorios es un componente Workspace autónomo (`<DocumentRepositoriesAdmin />`).
- **WU-02 — ¿Inline vs panel dedicado?** Sí. Formularios renderiza acciones nativas en una tabla y
  conmutadores de vista principal; Repositorios encapsula cada acción en un `ModalShell`.
- **WU-03 — ¿Diferencia exclusiva de presentación?** Sí. Ambas hacen las mismas operaciones CRUD de
  configuración sobre un recurso (editar metadatos, configurar campos/alertas, eliminar) usando la
  misma capa de servicios y el mismo contenedor de alertas; únicamente cambia el **contenedor visual**.
- **WU-04 — ¿Reutilizan componentes de navegación/acción?** Parcial. Comparten
  `AlertConfigurationPanel`, `alertConfigurationPersistence` y el Application Service; pero Formularios
  no reutiliza el `ModalShell`/`master-detail` que sí usa Repositorios.
- **WU-05 — ¿Lógica idéntica con distinta representación?** Sí. La lógica de negocio es la misma;
  diverge solo la representación.
- **WU-06 — ¿Punto exacto de divergencia?** El pestaña `formularios` de `Configuration.jsx`
  (acciones inline + early-returns) deja de reutilizar el patrón de Workspace certificado que
  `DocumentRepositoriesAdmin.jsx` implementa (componente propio + `ModalShell` + master/detail).

## 5. Modelo visual certificado

El **estándar visual de la plataforma** es el **Workspace dedicado autocontenido**: cabecera de
workspace, doble panel master/detail, y cada acción abierta en un **panel/modal propio**, delegando
operaciones complejas a contenedores certificados (`AlertConfigurationPanel`). Este es el patrón
implementado por `DocumentRepositoriesAdmin` y por `ModuleManager/ModuleDetailPanel`. **Formularios
Dinámicos es la excepción**, al mantener el flujo de configuración inline dentro de la página.

## 6. Estrategia de unificación (Sprint 250 — sin ejecutar aquí)

Formularios Dinámicos debe quedar representado por un **Workspace dedicado** (componente autocontenido
+ cabecera + `ModalShell` + reutilización de `AlertConfigurationPanel`), alineándolo al modelo
certificado de Repositorios. Sin nuevos componentes V2 ni Wrappers globales — reutilizando los
compartidos existentes. **Ninguna modificación de esta estrategia se ejecuta en el Sprint 249.**

## 7. Restricciones cumplidas (auditoría)

No se crean componentes, `DynamicWorkspaceV2`, `RepositoryWorkspaceV2`, layouts ni wrappers; no se
modifica Runtime, Persistencia, Metadata, Alert Engine, Notification Engine, Dynamic Runtime,
Providers ni Contracts. La auditoría **solo documenta** la arquitectura existente.

## 8. Definition of Done

✅ Comparación completa entre ambos Workspaces realizada.
✅ Modelo visual certificado identificado (Workspace dedicado + `ModalShell` + master/detail).
✅ Punto exacto de divergencia localizado (pestaña `formularios` de `Configuration.jsx`).
✅ Contenedores reutilizables identificados (`AlertConfigurationPanel`, `ModalShell`).
✅ Flujo de navegación auditado (selección → panel vs selección → vista inline).
✅ Diferencias de Layout documentadas (master/detail + overlay vs tabla inline).
✅ Confirmada la separación entre lógica y presentación (misma lógica, distinta representación).
✅ Runtime, Persistencia, Metadata, Engines y Contracts intactos.
✅ SSOT preservado.
✅ WORKSPACE PRESENTATION CERTIFIED (auditoría, sin cambios funcionales).

## 9. Certificación WU-1…WU-16 → 16/16 PASS (c/)
Comparativa de Workspaces certificada · Layout auditado · Contenedores reutilizables identificados ·
Flujo de navegación validado · Modelo visual certificado · Divergencia localizada · Componentes
reutilizables auditados · Separación Presentación/Lógica confirmada · Sin cambios funcionales · Runtime
intacto · Persistencia intacta · Metadata intacta · Dynamic Runtime intacto · Alert Engine intacto ·
Notification Engine intacto · **WORKSPACE PRESENTATION CERTIFIED».

## 10. Continuidad al Sprint 250

El Sprint 250 implementará exclusivamente la **unificación visual** del Workspace de Formularios
Dinámicos reutilizando el mismo modelo de presentación certificado de Repositorios Documentales
(componente Workspace autónomo + panel/páginas dedicadas + reutilización de `AlertConfigurationPanel`),
sin introducir nuevos componentes ni modificar la lógica de negocio, manteniendo intacta toda la
infraestructura certificada.