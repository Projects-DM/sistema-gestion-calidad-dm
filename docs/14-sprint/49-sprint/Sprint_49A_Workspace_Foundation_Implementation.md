# Sprint 49A — Workspace Foundation Implementation (SSOT)

> Documento SSOT (Solo auditoría + blueprint de implementación)
>
> Este documento define exclusivamente la implementación del **Workspace administrativo** de la **Metadata Factory** para el Sprint 49A.
>
> **Freeze / Congelación:** El Sprint 49 queda congelado como SSOT. Este documento **no modifica** el Blueprint Maestro y solo traduce su parte “Workspace Foundation” en una guía implementable.

---

## 1. Objetivo

Definir, con precisión y de forma ejecutable, cómo implementar el **Workspace administrativo** para la Metadata Factory, reutilizando íntegramente el **Core certificado** y preservando la **Foundation Baseline**.

---

## 2. Alcance

### 2.1 Incluye

- Componentes/Capacidades para:
  - Cargar y mostrar el **workspace administrativo**.
  - Navegación interna del workspace hacia:
    - Module Manager
    - Form Manager
    - Field Manager
    - Validation Center
    - Publication Center
  - Visibilidad condicionada por el rol (si aplica en el Core certificado).
  - Flujo de navegación consistente con la máquina de estados administrativos definida para el Sprint 49.
  - Integración con:
    - **dynamicService** (lectura/escritura de metadata asociada al workspace cuando el Core lo requiera).
    - **Runtime certificado** (solo como handoff; el workspace **no ejecuta** runtime).
    - **persistencia existente** (tablas existentes del modelo certificado).

### 2.2 No incluye

- No implementar:
  - Runtime alternativo.
  - DynamicModule/DynamicForm/DynamicService nuevos.
  - Motores nuevos.
  - Tablas nuevas.
  - Servicios paralelos.
  - Lógica de negocio fuera del modelo gobernado por metadatos.

---

## 3. Arquitectura (Reglas de Compatibilidad)

**Restricciones obligatorias** (no excepciones):

- **No modificar** Runtime.
- **No modificar** DynamicModule.
- **No modificar** DynamicForm.
- **No modificar** DynamicService.
- **No crear** tablas nuevas.
- **No crear** servicios nuevos.
- **No crear** motores nuevos.
- **No romper** Foundation Baseline.
- **Reutilizar exclusivamente** el Core certificado.

**Responsabilidad del Workspace:**
- La Factory administra Metadata.
- El Runtime ejecuta lo operativo.

---

## 4. Componentes Reutilizados (Core certificado)

### 4.1 Reutilización obligatoria

- **Runtime certificado** (solo consumo/ejecución posterior; workspace no ejecuta runtime).
- **DynamicModule** (módulo operacional) como destino posterior de activación.
- **DynamicForm** (render de formularios) cuando el Core lo requiera.
- **DynamicService** (orquestación de operaciones de metadata/ejecución según contratos existentes).

### 4.2 Persistencia existente

- Persistencia y modelo EAV existentes administrados por el Core.

> Nota SSOT: Este documento no crea un proveedor nuevo; se asume el provider certificado ya existente.

---

## 5. Componentes Prohibidos

Durante Sprint 49A queda prohibido:

- Crear un runtime alternativo.
- Crear motores nuevos.
- Crear servicios paralelos.
- Crear componentes duplicados que reimplementen capacidades del Core.
- Crear tablas o repositorios nuevos.
- Cualquier lógica de negocio que contradiga el modelo de metadatos certificado.

---

## 6. Flujo del Workspace (Workspace Execution Flow)

Secuencia operativa del workspace administrativo:

1) **Ingreso al Workspace**
   - Validar acceso del usuario (si el Core aplica gate en rutas/componentes protegidos).

2) **Load inicial del Workspace**
   - Obtener (vía dynamicService, cuando aplique) la información necesaria para construir la navegación del workspace.

3) **Navegación hacia la sección seleccionada**
   - Module Manager
   - Form Manager
   - Field Manager
   - Validation Center
   - Publication Center

4) **Interacción administrativa**
   - El workspace administra metadatos (creación/edición/validación/configuración) únicamente mediante contratos del Core.

5) **Handoff hacia Runtime (posterior)**
   - Cuando aplique la publicación/activación, el control operacional pasa al Runtime certificado.
   - El workspace no ejecuta runtime; únicamente deja la Metadata en estado apto para que el Runtime la consuma.

---

## 7. Navegación (Workspace Navigation Map)

Navegación oficial del workspace:

- Workspace
  - Module Manager
  - Form Manager
  - Field Manager
  - Validation Center
  - Publication Center

Regla de coherencia:
- La navegación debe reflejar el avance del módulo en la **máquina de estados administrativos** del Sprint 49.

---

## 8. Integración con dynamicService

El Workspace debe integrarse con dynamicService exclusivamente para operaciones de metadata contempladas por contratos existentes.

Requisitos de integración:
- El workspace no debe llamar contratos inexistentes.
- El workspace no debe introducir lógica de negocio fuera de la gobernanza por metadatos.

---

## 9. Integración con la persistencia existente

- El workspace debe persistir metadata únicamente mediante el esquema y proveedor certificados.
- Prohibido:
  - tablas nuevas
  - duplicación de estructuras
  - duplicación de repositorios

---

## 10. Integración con el Runtime existente

Regla de handoff:
- Cuando el módulo esté publicado, el Runtime certificado consumirá automáticamente la Metadata.

Responsabilidad del Workspace:
- No ejecutar Runtime.
- No renderizar módulos operacionales como runtime; únicamente administrar metadatos.

---

## 11. Estados administrativos (Administrative State Model)

Máquina de estados administrativos (definición SSOT):

- **Draft**
  - Propósito: construir metadata base del módulo.
  - Acciones permitidas: creación/edición inicial de metadatos.
  - Acciones bloqueadas: publicación (no apta).
  - Transiciones válidas: Draft → In Progress.

- **In Progress**
  - Propósito: completar configuración y consistencia técnica.
  - Acciones permitidas: continuar construcción.
  - Acciones bloqueadas: publicación (no apta hasta validación).
  - Transiciones válidas: In Progress → Validated.

- **Validated**
  - Propósito: pasar checklist/validation administrative.
  - Acciones permitidas: ejecutar Publication Gate.
  - Acciones bloqueadas: uso operacional.
  - Transiciones válidas: Validated → Published.

- **Published**
  - Propósito: habilitar consumo por Runtime certificado.
  - Acciones permitidas: mantenimiento administrativo controlado (si el Core lo permite).
  - Acciones bloqueadas: volver a Draft sin ruta gobernada (si aplica en Core).
  - Transiciones válidas: Published → Archived.

- **Archived**
  - Propósito: cierre administrativo.
  - Acciones permitidas: solo lectura/consulta si el Core lo permite.
  - Acciones bloqueadas: cambios que afecten ejecución operacional.
  - Transiciones válidas: ninguna (cierre).

---

## 12. Acceptance Criteria (Workspace Foundation)

El Sprint 49A se considera completado si se cumplen, como mínimo, todos los criterios:

1) **Workspace carga correctamente**
2) **Navigation Map funciona** y alcanza todos los destinos: Module/Form/Field/Validation/Publication.
3) **Accesibilidad administrativa**: el workspace respeta el gating de roles del Core (si existe).
4) **Persistencia**: toda modificación administrativa ocurre vía contratos del Core (sin tablas nuevas).
5) **Handoff**: el workspace no ejecuta Runtime; solo deja la metadata en el estado correspondiente.
6) **Compatibilidad**: no existe regresión ni incompatibilidad con DynamicModule/DynamicForm/DynamicService.

---

## 13. Checklist de auditoría (obligatorio)

Verificaciones de reutilización (PASS):
- Workspace reutiliza exclusivamente el Core certificado.
- No se agregaron servicios paralelos.
- No se agregaron tablas nuevas.
- No se agregaron motores nuevos.
- No se creó un runtime alternativo.

Verificaciones de compatibilidad (PASS):
- No se rompe la Foundation Baseline.
- No se rompe el handoff hacia Runtime certificado.
- La navegación del workspace conserva consistencia con el ciclo de vida administrativo.

---

## 14. Regression Prevention (obligatorio)

El equipo debe verificar que el cambio no rompe:
- Runtime
- DynamicModule
- DynamicForm
- DynamicService
- Persistencia existente
- Modelo EAV
- Contratos certificados

---

## 15. Evidencias Requeridas

Para el cierre de Sprint 49A se requieren evidencias documentales:

- Capturas del Workspace:
  - carga inicial
  - navegación por secciones
  - estados administrativos (visibles/operables donde aplique)
- Evidencia de Build exitoso.
- Evidencia de auditoría PASS.
- Evidencia de que:
  - no se agregaron tablas nuevas
  - no se agregaron servicios nuevos
  - no se agregaron motores nuevos
  - no existe runtime alternativo

---

## 16. Definition of Done (Workspace Foundation)

Se considera Done cuando:

- El Workspace administrativo está implementado y operativo.
- La navegación hacia Module/Form/Field/Validation/Publication funciona.
- Todas las operaciones administrativas usan únicamente contratos/infra del Core certificado.
- No hay regresiones contra Foundation Baseline.
- Se ejecutó checklist de auditoría y está en PASS.
- Existen evidencias requeridas para gobernanza.

---

## 18. Implementation Mapping

### 18.1 Workspace Mapping

- **Responsabilidad:** Implementar exclusivamente el **Workspace administrativo** de la Metadata Factory, con navegación consistente y handoff al Runtime certificado.
- **Componentes reutilizados:** componentes/infra del Core certificado para administración y navegación del workspace (sin introducir componentes nuevos de negocio).
- **Servicios reutilizados:** `dynamicService` (contratos existentes del Core) para operaciones de metadata requeridas por el workspace.
- **Persistencia reutilizada:** persistencia y esquema certificado (tablas existentes del modelo EAV), accedida únicamente a través del Core certificado.
- **Runtime reutilizado:** Runtime certificado; el workspace **no ejecuta** runtime y solo deja la metadata lista para consumo posterior.

### 18.2 Managers Mapping

- **Module Manager**
  - **Responsabilidad:** administración del módulo (metadata del módulo) dentro del workspace.
  - **Qué administra:** metadatos del módulo (información general y estado administrativo relacionado).
  - **Qué reutiliza:** contratos/infra del Core certificados para metadata de módulos.
  - **Qué NO puede modificar:** Runtime, tablas nuevas, services paralelos, motores nuevos, contratos inexistentes.
  - **Dependencias certificadas:** Core + persistencia existente + dynamicService.

- **Form Manager**
  - **Responsabilidad:** administración de formularios del módulo.
  - **Qué administra:** metadatos de formularios (asociación a módulo y estado técnico/administrativo).
  - **Qué reutiliza:** contratos/infra del Core certificados para metadatos de formularios.
  - **Qué NO puede modificar:** Runtime, persistencia (estructuras nuevas), servicios paralelos, motores nuevos.
  - **Dependencias certificadas:** Core + persistencia existente + dynamicService.

- **Field Manager**
  - **Responsabilidad:** administración de campos dentro de un formulario.
  - **Qué administra:** metadatos de campos (tipos habilitados/estructura EAV) y estado administrativo.
  - **Qué reutiliza:** contratos/infra del Core certificados para metadatos de campos.
  - **Qué NO puede modificar:** Runtime, persistencia (estructuras nuevas), servicios paralelos, motores nuevos.
  - **Dependencias certificadas:** Core + persistencia existente + dynamicService.

- **Validation Center**
  - **Responsabilidad:** checklist/validation administrativa y elegibilidad del estado previo a publicación.
  - **Qué administra:** estado administrativo “Validated” y evidencias administrativas asociadas.
  - **Qué reutiliza:** lógica/gobernanza existente del Core certificado (sin duplicar contratos).
  - **Qué NO puede modificar:** Runtime, contratos nuevos, motores nuevos, persistencia paralela.
  - **Dependencias certificadas:** Core + persistencia existente + dynamicService.

- **Publication Center**
  - **Responsabilidad:** Publication Gate y publicación (hand-off a Runtime).
  - **Qué administra:** transición a “Published” y registro administrativo correspondiente.
  - **Qué reutiliza:** contratos/infra del Core certificados para publicación/activación.
  - **Qué NO puede modificar:** Runtime (no se duplica), persistencia paralela, motores nuevos.
  - **Dependencias certificadas:** Core + persistencia existente + dynamicService + Runtime (solo consumo posterior).

### 18.3 Implementation Order

| Fase | Resultado esperado |
|---|---|
| Workspace | Workspace carga correctamente y navega hacia managers |
| Module Manager | Módulo administrado en metadata con estado consistente |
| Form Manager | Formularios configurados y asociados al módulo |
| Field Manager | Campos configurados conforme a modelo EAV certificado |
| Validation Center | Estado Validated alcanzable y evidenciado |
| Publication Center | Estado Published persistido; runtime podrá consumir |

### 18.4 Final Verification

Checklist final (antes de cierre de implementación):

- Toda la implementación reutiliza exclusivamente el Core certificado.
- No existen componentes duplicados.
- No existen Runtime alternativos.
- No existen servicios paralelos.
- No existen tablas nuevas.
- No existen motores nuevos.
- Se preserva completamente la Foundation Baseline.

---

## 17. Criterio de Congelación / SSOT


Este documento no altera la arquitectura certificada. El objetivo es únicamente que el Workspace Foundation pueda implementarse de forma incremental y gobernada, reutilizando el Core certificado de punta a punta.

