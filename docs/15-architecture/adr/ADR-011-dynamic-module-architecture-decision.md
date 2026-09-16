# DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1 (SSOT)

> **Tipo:** Arquitectura SSOT (Decisión Arquitectónica)
>
> **Propósito:** Certificar oficialmente el rol de `DynamicModule.jsx` dentro de la arquitectura del SGC-DM.
>
> **Evidencia permitida (SSOT):** exclusivamente la evidencia certificada de:
> - `MODULE_CONTRACT_v1` (Sprint 49A-ARCH / contrato base),
> - `BUSINESS_CAPABILITY_CONTRACT_v1` (Sprint 49A-R.5.1),
> - auditoría de `DynamicModule` como Shell reutilizable (Sprint 49A-R.5.2A),
> - inspección de código **ya auditado** por los sprints (solo para sustentar afirmaciones documentales).
>
> **Restricción:** este documento es **100% documental**. No modifica código ni contratos existentes.

---

## 0. Estado esperado

- **ARCHITECTURE STATUS:** `LEVEL 3 — CERTIFIED`
- **DOCUMENT:** `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`
- **STATUS:** `BASELINE CERTIFIED`

---

## 1. Contexto Arquitectónico (SSOT)

1) **`MODULE_CONTRACT_v1`** queda certificado como SSOT para módulos estándar.
2) **`BUSINESS_CAPABILITY_CONTRACT_v1`** define una extensión opcional para capacidades de negocio (0..N), complementarias a las *Standard Capabilities* del módulo.
3) Se ejecutó una auditoría arquitectónica (`DynamicModule` como posible Shell Oficial) que concluyó que, **con el diseño actual**, `DynamicModule.jsx` **no soporta** Business Capabilities (0..N) mediante extensión **sin modificar su lógica interna**.

---

## 2. Evidencia considerada

- `DynamicModule.jsx` implementa:
  - UI Shell con Header + Tabs fijas.
  - UI de Standard Capabilities (Diligenciar Registros / Historial y Consultas / Repositorio Documental).
  - Render condicional del contenido según tab.
- `DynamicModule.jsx` depende de contratos del Core para:
  - cargar metadata y formularios desde `dynamicService`.
  - renderizar historial/consultas mediante `DynamicRecordsView`.
  - renderizar visor documental mediante `ModuleDocumentViewer`.

> Nota SSOT: las afirmaciones sobre “no soporta Business Capabilities sin modificar lógica interna” se sustentan en el resultado de la auditoría 49A-R.5.2A (dictamen FAIL para extensibilidad 0..N).

---

## 3. FASE 1 — Auditoría del principio de responsabilidad única (SRP)

### 3.1 Clasificación de responsabilidades actuales de `DynamicModule`

- **Carga del módulo / metadata:** **Core / Orquestación (lectura de datos)**
- **Carga de formularios / filtrado por permisos (rol):** **Core / Orquestación**
- **Navegación interna (tabs → render condicional):** **UI Shell + Orquestación**
- **Tabs / Estados / loaders / render condicional:** **UI Shell**
- **Encadenamiento/consumo de vistas estándar:**
  - historial/consultas → `DynamicRecordsView` (**Core / Standard Capability UI**)
  - repositorio documental → `ModuleDocumentViewer` (**Core / Documental Extension UI**)
  - formularios → Links a `DynamicForm` (**UI shell / navegación**)

### 3.2 Conclusión SRP (SSOT)
`DynamicModule.jsx` es un **componente híbrido**: combina un **Shell UI** con **orquestación** del flujo estándar del módulo y con consumo de capacidades del Core.

---

## 4. FASE 2 — Auditoría de acoplamiento

Clasificación del nivel de dependencia respecto a elementos del sistema (SSOT):

- `dynamicService`: **HIGH** (lectura de metadata y formularios)
- Runtime: **MEDIUM** (no ejecuta runtime directamente, pero forma parte del flujo estándar que lo activa desde `DynamicForm`)
- Records (`DynamicRecordsView`): **HIGH**
- Repository (documental vía `ModuleDocumentViewer`): **MEDIUM** (condicionado por reglas hardcodeadas de habilitación)
- Forms (navegación hacia `DynamicForm`): **HIGH**
- Navigation/Router: **MEDIUM** (ruteo por `moduleSlug` y `form.slug`)
- Business Capabilities: **HIGH** (no soporta inyección/extensión 0..N sin alterar su lógica interna)

---

## 5. FASE 3 — Comparación de alternativas

### Opción A — DynamicModule como Shell Universal

**Ventajas**
- Reutilización potencial del shell existente.

**Desventajas**
- La auditoría 49A-R.5.2A identifica que **no soporta Business Capabilities (0..N)** sin modificar lógica interna.
- Riesgo de convertir el estándar en un punto único de variabilidad (drift).

**Riesgo**
- Alto (extensibilidad y compatibilidad con `BUSINESS_CAPABILITY_CONTRACT_v1`).

### Opción B — DynamicModule como Shell del Core Standard (NO universal)

**Ventajas**
- Preserva la separación SSOT entre:
  - *Standard Capabilities* (Core certificado + `DynamicModule` como shell de esas capacidades),
  - extensiones opcionales Business Capabilities (contenedor superior).
- Maximiza compatibilidad con:
  - `MODULE_CONTRACT_v1`
  - `BUSINESS_CAPABILITY_CONTRACT_v1`

**Desventajas**
- Requiere que la integración 0..N de Business Capabilities se haga mediante un contenedor superior especializado en el siguiente ciclo arquitectónico.

**Riesgo**
- Medio (dependencia de nueva evolución de contenedor superior, sin tocar este sprint).

---

## 6. FASE 4 — Evaluación contra SSOT

Comparación directa:

- **Compatibilidad con `MODULE_CONTRACT_v1`:**
  - Opción A: posible (DynamicModule implementa Standard Capabilities).
  - Opción B: posible (DynamicModule mantiene responsabilidad acotada a Standard Capabilities).

- **Compatibilidad con `BUSINESS_CAPABILITY_CONTRACT_v1`:**
  - Opción A: **no viable** con el diseño actual (auditoría 49A-R.5.2A).
  - Opción B: **viable** delegando Business Capabilities en un contenedor superior.

- **Identity Contract / Navigation Contract / Runtime Contract:**
  - Ambas opciones pueden mantener contracts para el estándar.
  - Solo Opción B preserva la extensibilidad 0..N sin alterar `DynamicModule`.

---

## 7. FASE 5 — Evaluación de escalabilidad

Con Business Capabilities (0..N):

- **Soporte requerido:** Business Capabilities deben poder coexistir sin alterar la lógica interna del shell estándar.
- Dado el resultado de auditoría 49A-R.5.2A, `DynamicModule` **no soporta** Business Capabilities (0..N) como extensión integrada.

Conclusión (SSOT):
- Opción A: **rompe** compatibilidad con el contrato de extensiones.
- Opción B: escala al modelo 0..N al mantener extensión por contenedor superior.

---

## 8. FASE 6 — Riesgos arquitectónicos

Clasificación de riesgos para la alternativa seleccionada (Opción B):

- **Acoplamiento:** MEDIUM
- **Mantenimiento:** LOW (se mantiene el shell acotado)
- **Extensión futura:** LOW-MEDIUM (la extensión se delega)
- **Performance:** LOW (no cambia comportamiento actual)
- **Duplicación:** MEDIUM (Business Capabilities vivirán en contenedores superiores)
- **Testing:** MEDIUM (se separa estándar vs extensión)

---

## 9. FASE 7 — Decisión Arquitectónica Oficial (SSOT)

### Dictamen certificado

**DynamicModule

STATUS:** `CORE STANDARD SHELL`

**NO** es el Shell universal del sistema.

---

## 10. Responsabilidades y límites (SSOT)

### 10.1 `DynamicModule` asume (solo estándar)
- Renderizar únicamente las *Standard Capabilities* certificadas por `MODULE_CONTRACT_v1`.
- Implementar el shell UI del flujo estándar del módulo (Header + Tabs estándar + contenido estándar).

### 10.2 `DynamicModule` NO asume
- Renderizar Business Capabilities (0..N) como extensión integrada del shell sin alterar su lógica interna.

### 10.3 Business Capabilities (0..N)
- Deben renderizarse mediante un **contenedor superior especializado** que preserva el estándar y delega la integración de Business Capabilities conforme a `BUSINESS_CAPABILITY_CONTRACT_v1`.

---

## 11. FASE 8 — Roadmap Arquitectónico

Como la decisión conserva `DynamicModule` como Core Standard Shell, el siguiente paso oficial (documental/plan estratégico) es:

- `TraceabilityContainer`
  - (y/o contenedor análogo por dominio)
  - `DynamicModule` (Standard Capabilities)
  - `BusinessCapabilityHost` (0..N)
  - `Despachos` (primer caso de aplicación futura)

> **Plan Estratégico / Decisión Arquitectónica:** `Trazabilidad → Despachos` se trata como el primer caso a integrar mediante el contenedor superior, en compatibilidad con `BUSINESS_CAPABILITY_CONTRACT_v1`.

---

## 12. FASE 9 — Documentación SSOT (cumplimiento)

Este documento incluye:
- contexto
- evidencia considerada (resultado de auditoría + rol de DynamicModule como estándar)
- alternativas y comparación
- decisión oficial
- impacto (delegación de extensiones)
- roadmap arquitectónico
- restricciones

---

## 13. Restricciones (obligatorias)

- No modificar código fuente.
- No modificar Runtime.
- No modificar DynamicModule.
- No modificar Traceability.
- No modificar servicios.
- No modificar contratos existentes.
- No implementar Business Capabilities en este sprint.
- No crear componentes.
- No modificar navegación.
- Solo certificar la decisión arquitectónica.

---

## 14. Criterios de aceptación

- Se determina oficialmente el rol de `DynamicModule`.
- Se comparan alternativas con evidencia.
- Se certifica una única arquitectura oficial.
- Se preserva `MODULE_CONTRACT_v1`.
- Se preserva `BUSINESS_CAPABILITY_CONTRACT_v1`.
- Se define el roadmap arquitectónico siguiente.
- No se modifica ninguna línea de código.

---

## 15. Certificación final

```text
ARCHITECTURE STATUS:
LEVEL 3 — CERTIFIED

DOCUMENT:
DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1

STATUS:
BASELINE CERTIFIED

Single Source of Truth (SSOT)
```

---

## 16. Fecha y versión

- **Versión:** v1
- **Fecha (documental):** 2026-07-10

