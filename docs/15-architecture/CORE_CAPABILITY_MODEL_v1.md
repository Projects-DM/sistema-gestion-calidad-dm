# CORE_CAPABILITY_MODEL_v1 (SSOT)

> **Tipo:** Arquitectura SSOT (Contrato permanente)
>
> **Nivel:** CORE ARCHITECTURE (LEVEL 3 — CERTIFIED)
>
> **Documento:** `CORE_CAPABILITY_MODEL_v1`
>
> **Estado:** BASELINE CERTIFIED
>
> **Single Source of Truth (SSOT)**

---

## 0. Estado de certificación

```text
ARCHITECTURE STATUS
LEVEL 3 — CERTIFIED

DOCUMENT
CORE_CAPABILITY_MODEL_v1

STATUS
BASELINE CERTIFIED
```

---

## 1. Contexto Arquitectónico

### 1.1 Relación con `MODULE_CONTRACT_v1`

**Evidencia certificada (observado en contrato):**
- `MODULE_CONTRACT_v1` define que un **módulo** integra un conjunto de **capacidades estándar** (GENERAL) con capacidades del módulo, bajo gobernanza de metadata y con handoff al Core certificado y Runtime vía bridge.

**Efecto contractual sobre este modelo:**
- Este **Capability Model** define cómo se conceptualiza “capacidad” para extender módulos sin romper el estándar certificado de `MODULE_CONTRACT_v1`.

### 1.2 Relación con `BUSINESS_CAPABILITY_CONTRACT_v1`

**Evidencia certificada (observado en contrato):**
- `BUSINESS_CAPABILITY_CONTRACT_v1` define una **Business Capability** como **extensión opcional** del módulo.
- Business Capabilities **agregan** lógica de negocio específica de dominio como complemento al conjunto de **Standard Capabilities**.
- Business Capabilities **no reemplazan** Records, History ni Repository.

**Efecto contractual sobre este modelo:**
- Este Capability Model adopta la semántica formal de “capacidad” y sus límites (complementaria vs sustitutiva) desde el contrato de Business Capabilities.

### 1.3 Relación con `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`

**Evidencia certificada (observado en contrato):**
- Se certifica el rol de `DynamicModule.jsx` como **CORE STANDARD SHELL**.
- Se concluye que `DynamicModule` **no es el Shell universal** del sistema.
- El diseño actual no soporta Business Capabilities (0..N) como extensión integrada sin alterar lógica interna.

**Efecto contractual sobre este modelo:**
- Este modelo define el dominio de conocimiento: la shell estándar conoce Standard Capabilities; las extensiones se integran como “otro nivel” gobernado por el contrato de Business Capabilities.

---

## 2. Definición oficial de Capability

### 2.1 Definición arquitectónica

Una **Capability** dentro del Core Standard del SGC-DM es:

> Un **componente conceptual** de funcionalidad definida por su **responsabilidad** dentro de la arquitectura de un módulo, que se organiza como **Standard Capability** (obligatoria y estándar) o como extensión **Business Capability** (opcional y complementaria), preservando el comportamiento interno del módulo estándar definido por `MODULE_CONTRACT_v1`.

### 2.2 Objetivo

- Establecer una definición oficial que permita evolucionar capacidades del Core Standard.
- Preservar **compatibilidad** con el estándar de módulos certificado.
- Evitar **hardcodes** y drift arquitectónico mediante un modelo conceptual estable (sin detallar implementación).

### 2.3 Alcance

Incluye:
- Standard Capabilities (componente obligatorio del módulo estándar).
- Business Capabilities (extensiones opcionales 0..N).

No incluye (definición explícita por contratos):
- Persistencia, Runtime, metadata y navegación como implementación; esas fronteras quedan gobernadas por contratos específicos y sus límites.

### 2.4 Responsabilidad

- Standard Capability:
  - Define capacidades estándar obligatorias del módulo (según `MODULE_CONTRACT_v1`).
- Business Capability:
  - Agrega lógica de negocio específica del dominio como extensión opcional.
  - Mantiene el módulo estándar, sin reemplazar Records/History/Repository.

---

## 3. Principios del modelo

Todos los principios de este modelo se sostienen en los contratos certificados: `MODULE_CONTRACT_v1`, `BUSINESS_CAPABILITY_CONTRACT_v1`, `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1` y la evidencia de `SPRINT_49A_R6_CORE_STANDARD_EVOLUTION_AUDIT.md`.

1. **Declaratividad (Metadata First)**
   - Los contratos certifican que los módulos estándar se gobiernan por metadata en el modelo `sgc_*`.

2. **Reutilización**
   - El Core Standard reutiliza vistas estándar (historial/consultas y repository) como partes del estándar.

3. **Independencia (Complementariedad)**
   - Business Capabilities son complementarias y no sustitutivas del comportamiento estándar.

4. **Composición (Standard + 0..N Extensions)**
   - La estructura conceptual del módulo compone Standard Capabilities con 0..N Business Capabilities.

5. **Compatibilidad**
   - `BUSINESS_CAPABILITY_CONTRACT_v1` certifica la extensión sin modificar `MODULE_CONTRACT_v1`.

6. **Extensibilidad**
   - La extensión se formula como 0..N Business Capabilities bajo límites explícitos.

7. **SRP (Single Responsibility)**
   - La evidencia certificada establece que `DynamicModule` es una shell estándar (no universal) y que su extensión integrada no aplica en el diseño actual.

8. **SRP de fronteras (Standard Shell vs Extensión)**
   - Se separa conceptualmente el rol de shell estándar (Standard Capabilities) del rol de integración de extensiones (Business Capabilities mediante otro contenedor conceptual).

---

## 4. Modelo conceptual

### 4.1 Conceptos

- **Module**
  - Unidad gobernada por metadata y conectada al Core/Runtime certificado vía bridge (según `MODULE_CONTRACT_v1`).

- **Capability**
  - Responsabilidad funcional definida dentro del módulo como parte estándar u opcional complementaria.

- **Standard Capability**
  - Conjunto único y obligatorio de capacidades estándar del módulo estándar (derivado de `MODULE_CONTRACT_v1`).

- **Business Capability**
  - Extensión opcional 0..N que agrega lógica de negocio sin reemplazar Records/History/Repository (según `BUSINESS_CAPABILITY_CONTRACT_v1`).

### 4.2 Límites

- Una **Business Capability**:
  - **Puede agregar** funcionalidad de dominio.
  - **No puede reemplazar**:
    - Diligenciar Registros (como parte estándar del flujo estándar)
    - Historial y Consultas
    - Repositorio Documental
  - Evidencia certificada: regla de no reemplazo en `BUSINESS_CAPABILITY_CONTRACT_v1`.

### 4.3 Identidad

- Identidad formalmente definida para Business Capability (en contrato):
  - `type`
  - `label`

> Nota de alcance: el contrato define identidad conceptual; no se certifica en estos documentos el esquema técnico completo de identidad más allá de esos atributos.

### 4.4 Dependencias

- Dependencia con `MODULE_CONTRACT_v1`
  - Standard Capabilities y fronteras del módulo estándar.

- Dependencia con `BUSINESS_CAPABILITY_CONTRACT_v1`
  - Semántica de extension opcional (0..N) y no reemplazo.

- Dependencia con `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`
  - Rol de `DynamicModule` como shell estándar.

- Dependencias con Runtime/Metadata/Authorization/Repository/Records/Forms/Navigation:
  - No se certifican contratos adicionales en este sprint; se asume únicamente lo que aparece en los contratos permitidos.
  - Cualquier relación adicional sería **Pendiente de Verificación** si no aparece literalmente en las fuentes permitidas.

### 4.5 Ciclo de vida (conceptual)

Este Capability Model formaliza un ciclo de vida **arquitectónico conceptual**, derivado del contrato y sus principios:

1. **Registro (en metadata gobernada)**
2. **Resolución (asignación a un módulo)**
3. **Habilitación (de estándar + extensiones opcionales)**
4. **Render (como parte de Standard Shell o capa de extensión)**
5. **Ejecución (dentro de responsabilidades gobernadas por el Core/contratos)**
6. **Persistencia (por el contrato estándar del módulo)**
7. **Finalización / cierre del alcance de la capacidad**

> **Pendiente de Verificación:** el detalle de etapas 4–7 con nombre y orden exacto no aparece literalmente en los contratos permitidos. Se declara como **modelo conceptual** sustentado por estructura Standard+Extensions y fronteras, pero el orden operativo es **Hipótesis Arquitectónica** si se requiere exactitud.

---

## 5. Clasificación oficial

> Solo se certifican categorías que aparecen soportadas por evidencia en los contratos permitidos.

1. **Standard Capability**
   - Certificada por `MODULE_CONTRACT_v1` como conjunto obligatorio del módulo.

2. **Business Capability**
   - Certificada por `BUSINESS_CAPABILITY_CONTRACT_v1`.

3. **Infrastructure / Technical Capability**
   - **Pendiente de Verificación** en las fuentes permitidas: no se certifica en los documentos leídos una clasificación explícita con esas etiquetas dentro del mismo contrato SSOT.

---

## 6. Relaciones arquitectónicas

Relaciones directas (conceptuales) certificadas:

- **Module ↔ Standard Capabilities**
  - `MODULE_CONTRACT_v1` define capacidades estándar obligatorias.

- **Module ↔ Business Capabilities (0..N)**
  - `BUSINESS_CAPABILITY_CONTRACT_v1` define extensión opcional.

- **DynamicModule ↔ Standard Capabilities**
  - `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1` certifica `DynamicModule` como CORE STANDARD SHELL.

- **Business Capabilities ↔ (capa de contenedor superior)**
  - `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1` certifica que Business Capabilities deben integrarse mediante un contenedor superior especializado, no integrado en `DynamicModule` sin alterar lógica interna.

Relaciones indirectas:
- Dependencias a Repository/Records/Forms/Navegación/Authorization/Runtime:
  - **Solo** se certifica su papel como límites (no reemplazo) y como parte del estándar del módulo; cualquier dependencia operativa exacta queda **Pendiente de Verificación** si no está explícita en los documentos permitidos.

---

## 7. Responsabilidades (ownership)

> Se define responsabilidad en términos arquitectónicos (sin implementación).

### 7.1 Responsabilidades del Module

- Poseer:
  - Standard Capabilities obligatorias.
  - 0..N Business Capabilities como extensiones opcionales.
- Gobernar su configuración mediante metadata persistida (contrato de módulo).

### 7.2 Responsabilidades de la Capability

- Standard Capability:
  - Ser parte del estándar obligatorio del módulo.

- Business Capability:
  - Agregar lógica de negocio adicional de dominio.
  - Mantener compatibilidad: no reemplaza Records/History/Repository.

### 7.3 Responsabilidades del Core (conceptual)

- Proveer el Standard Shell (certificado como `DynamicModule` para standard).
- Mantener fronteras con Runtime mediante bridge observado (según `MODULE_CONTRACT_v1` y evidencia de la auditoría ya certificada).

> Nota: detalles de responsabilidades internas del Core más allá de “shell estándar” y “handoff/bridge” quedan **Pendiente de Verificación** si no están explicitadas en los documentos permitidos.

---

## 8. Restricciones

Una Capability (según el conjunto de contratos certificados) nunca podrá:

1. **Sustituir** el estándar
   - Business Capability nunca reemplaza Records, History ni Repository.

2. **Romper compatibilidad con contratos SSOT**
   - No modificar `MODULE_CONTRACT_v1`.

3. **Integrarse como extensión 0..N dentro del shell estándar actual**
   - Según `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`, no se integra Business Capabilities dentro de `DynamicModule` sin alterar lógica interna.

Una Capability tampoco debería conocer:
- Detalles de implementación (React components concretos para la extensión).
- Detalles técnicos de runtime/persistencia.

> Los documentos certificados establecen No Objetivos en el contrato de Business Capability, por lo que cualquier excepción requeriría evidencia adicional (Pendiente de Verificación).

---

## 9. Compatibilidad con contratos existentes

Este documento (CORE_CAPABILITY_MODEL_v1) es compatible con:

- `MODULE_CONTRACT_v1`
- `BUSINESS_CAPABILITY_CONTRACT_v1`
- `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`

**Evidencia certificada:**
- `BUSINESS_CAPABILITY_CONTRACT_v1` establece explícitamente compatibilidad preservando `MODULE_CONTRACT_v1` intacto.

---

## 10. Roadmap Arquitectónico habilitado por este SSOT

Este Capability Model habilita exclusivamente (sin implementación) los siguientes niveles evolutivos del Core Standard:

1. **Capability Policy**
2. **Module Orchestrator**
3. **Standard Module Shell**
4. **Business Module Framework**

> **Sin describir implementación:** los contratos permitidos certifican el propósito de preparar la evolución posterior.

---

## 11. Glosario oficial

- **Capability:** responsabilidad funcional dentro del módulo que compone estándar u opcionalmente extiende lógica de negocio bajo límites.
- **Standard Capability:** capacidad obligatoria del módulo estándar; define el comportamiento base.
- **Business Capability:** extensión opcional (0..N) que agrega lógica de negocio específica de dominio como complemento al estándar.
- **Module:** unidad funcional gobernada por metadata; integra capacidades y se conecta al Core/Runtime certificado.
- **CORE STANDARD SHELL:** rol asignado a `DynamicModule.jsx` para el estándar.
- **SSOT:** Single Source of Truth; fuente certificada única.

---

## 12. Criterios de aceptación (documentales)

1. **Compatibilidad**
   - No contradice `MODULE_CONTRACT_v1`.
   - No contradice `BUSINESS_CAPABILITY_CONTRACT_v1`.
   - No contradice `DYNAMIC_MODULE_ARCHITECTURE_DECISION_v1`.

2. **Coherencia**
   - Standard vs Business Capability conservan semántica complementaria y no reemplazo.

3. **No contradicción**
   - Business Capability no sustituye Records/History/Repository.

4. **Alineación SSOT**
   - Definiciones provienen de contratos certificados y evidencia ya certificada.

---

## 13. Certificación final

- **ARCHITECTURE STATUS:** LEVEL 3 — CERTIFIED
- **DOCUMENT:** CORE_CAPABILITY_MODEL_v1
- **STATUS:** BASELINE CERTIFIED

---

## 14. Estado documental y gobernanza

- Este documento es un **contrato arquitectónico permanente**.
- Cualquier cambio requiere un sprint arquitectónico certificado que actualice el SSOT.

