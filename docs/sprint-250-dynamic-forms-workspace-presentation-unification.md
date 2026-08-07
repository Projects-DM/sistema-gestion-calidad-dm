# Sprint 250 — Dynamic Forms Workspace Presentation Unification & Modal Reuse Certification

> Nivel 5 · Unificación del Workspace · Reutilización del modelo visual · Certificación de presentación

## Tipo
Presentation Layer · Workspace Presentation Unification · UI Consistency

**Impacto: exclusivamente Presentation Layer** (`Configuration.jsx`, `ModalShell.jsx` compartido,
`DocumentRepositoriesAdmin.jsx` — reutilización del contenedor). No modifica Runtime, Persistencia,
Metadata, Dynamic Runtime, Form Engine, Document Repository, Alert Engine, Notification Engine,
ModuleAdministrationApplicationService, Providers, Contracts ni el modelo de capacidades. Estado
esperado: **UNIFIED WORKSPACE PRESENTATION CERTIFIED**.

---

## 1. Objetivo

Unificar completamente la experiencia visual entre Formularios Dinámicos y Repositorios Documentales,
haciendo que ambos utilicen exactamente el mismo modelo de Workspace certificado. El objetivo **no**
es cambiar funcionalidades; el objetivo es que el usuario perciba ambos módulos como dos
implementaciones del mismo patrón de administración.

## 2. Principio arquitectónico

Toda operación administrativa compleja sobre un recurso debe abrirse dentro de un **Workspace
dedicado**. Nunca debe reemplazar el contenido principal de Configuration mediante **renders
condicionales**. El flujo certificado pasa a ser:

```
Configuration → Workspace → Lista de recursos → Acciones → Panel/Modal dedicado → Edición
```

y deja de ser:

```
Configuration → if(editing) return ...; if(alerts) return ...; if(fields) return ...
```

## 3. Cambio implementado

- **`src/shared/components/ModalShell.jsx` (nuevo, presentación):** contenedor de overlays
  centralizado, extraído del `ModalShell` que vivía dentro de `DocumentRepositoriesAdmin`. Proporciona
  overlay fijo con cierre por Escape *y* click sobre el fondo, cabecera (título + icono) y cuerpo
  scrolleable. No consume negocio.
- **`src/components/documentRepositories/DocumentRepositoriesAdmin.jsx` (presentación):** ahora
  importa `ModalShell` desde `shared` y elimina su definición local (reutilización, sin doplicado).
- **`src/docs/Configuration.jsx` (Formularios Dinámicos):** las operaciones de la pestaña ya NO
  sustituyen la página. Se eliminan los `early returns` (y los ternarios de reemplazo):
  `if (importBuilderData)`, `if (alertConfigTarget)`, `if (selectedForm)`, `isEditingForm`,
  `showImport`, `isCreatingForm`. Todas se abren ahora en un `ModalShell` dedicado:
  - **Editar metadatos** → `ModalShell` "Editando Formulario".
  - **Configurar campos** → `ModalShell` "Constructor Visual" → `<FormBuilder formDef={selectedForm} />`.
  - **Alertas** → `ModalShell` "Alertas" → `AlertConfigurationPanel` (reiniciado sin modificaciones).
  - **Nuevo Formulario** → `ModalShell` "Crear Nuevo Formulario".
  - **Importar Formulario** → `ModalShell` "Importar Formulario" (ImportAssistant) y su Builder.
  La lista de formularios y la cabecera permanecen siempre visibles; los paneles se superponen.

## 4. Reutilización certificada
Se reutiliza íntegramente `ModalShell`, `AlertConfigurationPanel`, `FormBuilder`,
`ImportAssistant`, `DocumentRepositoriesAdmin` como patrón visual, los Application Services, el
Runtime, la Persistencia, el Resolver y el Mapper. **No** se crean `DynamicFormsWorkspaceV2`,
`DynamicWorkspace`, `WorkspaceEngine`, `WorkspaceLayoutV2`, `ModalService`, `NavigationStore` ni
`UIProvider`.

## 5. Definition of Done
✅ Formularios Dinámicos reutiliza el mismo modelo visual certificado de Repositorios Documentales.
✅ Editar metadatos, Configurar campos y Alertas se presentan mediante paneles dedicados (`ModalShell`).
✅ Eliminada la navegación basada en early returns para operaciones de configuración.
✅ `ModalShell` reutilizado como contenedor estándar compartido (sin duplicado).
✅ `AlertConfigurationPanel` continúa reutilizándose sin modificaciones.
✅ La lógica de negocio permanece completamente intacta (handlers/submits/delete sin cambios).
✅ Runtime, Persistencia, Metadata, Dynamic Runtime, Alert Engine, Notification Engine, Resolver, Mapper y Contracts sin modificaciones.
✅ No se crean componentes V2, Wrappers, Stores, Providers ni nuevas capas arquitectónicas.
✅ Build PASS · Regression PASS · SSOT preservado.

## 6. Certificación WPU-1…WPU-18 → 18/18 PASS (suite dedicada)
Workspace visual unificado · Reutilización del patrón certificado · ModalShell reutilizado ·
Eliminación de navegación inline · Acciones desacopladas de la página principal · Consistencia entre
Formularios Dinámicos y Repositorios Documentales · Flujo de interacción unificado · Presentación
certificada · Reutilización de componentes existente · Sin nuevas capas arquitectónicas · Runtime
intacto · Persistencia intacta · Metadata intacta · Dynamic Runtime intacto · Resolver intacto ·
Mapper intacto · Alert Engine intacto · **UNIFIED WORKSPACE PRESENTATION CERTIFIED**.

## 7. Continuidad
Con el Sprint 250 ambos módulos administrativos comparten el mismo estándar visual de Workspace,
eliminando la inconsistencia de navegación entre ellos. A partir de esta base certificada, los
siguientes sprints pueden centrarse en refinamientos de experiencia de usuario (animaciones, densidad
visual, accesibilidad y productividad) sin volver a intervenir la arquitectura ni la lógica de negocio.