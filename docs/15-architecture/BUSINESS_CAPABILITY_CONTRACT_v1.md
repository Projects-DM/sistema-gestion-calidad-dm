# BUSINESS_CAPABILITY_CONTRACT_v1 (SSOT)

> **Tipo:** Arquitectura SSOT (Documentación únicamente)
>
> **Sprint:** 49A-R.5.1
>
> **Documento:** `BUSINESS_CAPABILITY_CONTRACT_v1`

---

## 0. Restricciones SSOT (obligatorias)

Este sprint es 100% arquitectónico y cumple:

- **No modificar** `MODULE_CONTRACT_v1.md`.
- **No modificar** ningún archivo de código.
- **No crear** componentes.
- **No crear** servicios.
- **No crear** tablas.
- **No crear** Runtime.
- **No crear** motores.
- **No introducir** implementación técnica.
- **Solo** crear este documento.

---

## 1. Objetivo del documento

Diseñar y certificar el **contrato arquitectónico oficial** que permitirá a un módulo incorporar **Business Capabilities** sin modificar el contrato estándar de módulos definido en **`MODULE_CONTRACT_v1`**.

Este contrato define la extensión como **capacidad arquitectónica opcional**, preservando compatibilidad total.

## No Objetivos

Este contrato NO define:

- Implementación técnica.
- Componentes React.
- Persistencia.
- Metadata.
- Runtime.
- Navegación.
- Renderizado.
- Gestión de permisos.
- Diseño visual.

Estos aspectos serán gobernados por contratos específicos en sprints posteriores.

---

## 2. Motivación (contexto certificado)

1) `MODULE_CONTRACT_v1` certifica que un **módulo estándar** está compuesto por:

- **Diligenciar Registros**
- **Historial y Consultas**
- **Repositorio Documental**

2) Durante auditorías del Sprint 49A se determinó un caso donde:

- existe lógica de negocio adicional en un módulo (evidenciado como “Despachos” en la UI de Trazabilidad),
- dicha lógica adicional **no corresponde** a ninguna de las tres capacidades estándar del módulo.

3) La decisión arquitectónica oficial es:

- **NO modificar** el contrato estándar (`MODULE_CONTRACT_v1`).
- Incorporar un mecanismo oficial de extensión denominado **Business Capability**.

> Evidencia (SSOT): la decisión “no modificar el contrato estándar” se formaliza como regla de diseño para esta extensión (Sprint 49A gobernanza/certificación).

---

## 3. Definición oficial de Business Capability

Una **Business Capability** es una **extensión opcional** del módulo que:

- **agrega** funcionalidades de lógica de negocio específicas del dominio,
- se organiza como un conjunto adicional a las **Standard Capabilities**,
- preserva el comportamiento interno del módulo estándar definido por `MODULE_CONTRACT_v1`.

### 3.1 Responsabilidad
- Introducir **capacidad de negocio adicional** sin reemplazar el estándar.

### 3.2 ¿Qué problemas resuelve?
- Evita romper el estándar cuando un módulo requiere pantallas/reglas/flujo adicional de dominio.
- Elimina la necesidad de “parchar” el módulo estándar mediante desviaciones arquitectónicas.

### 3.3 ¿Qué NO puede hacer?
- Una Business Capability **nunca reemplaza**:
  - Diligenciar Registros
  - Historial
  - Repositorio

> Regla SSOT: Business Capability es complementaria, no sustitutiva.

---

## 4. Modelo conceptual (arquitectónico)

Conceptualmente, el módulo queda modelado como:

```text
Module
├── Standard Capabilities
│   ├── Records
│   ├── History
│   └── Repository
└── Business Capabilities (0..N)
```

- **Standard Capabilities**: conjunto único y obligatorio del módulo estándar (definido por `MODULE_CONTRACT_v1`).
- **Business Capabilities**: extensión opcional (0..N) gobernada por este contrato.

---

## 5. Reglas arquitectónicas oficiales

### Regla 1 — Standard Capabilities (unicidad)
Todo módulo posee **exactamente un** conjunto de **Standard Capabilities**.

> Evidencia (SSOT): `MODULE_CONTRACT_v1` define el módulo estándar por sus capacidades.

### Regla 2 — Business Capabilities (opcional)
Business Capabilities son opcionales.

### Regla 3 — Cardinalidad
Puede existir:

- 0
- 1
- o N Business Capabilities.

### Regla 4 — No reemplazo de comportamiento interno
Las capacidades **no modifican** el comportamiento interno del módulo estándar.

### Regla 5 — Identidad de la Business Capability
Cada Business Capability debe poseer identidad propia.

- Conceptualmente:
  - `type`
  - `label`

> No se define implementación ni mapeo técnico en este sprint.

### Regla 6 — Restricción de sustituibilidad
Una Business Capability **nunca sustituye**:

- Records
- History
- Repository

---

## 6. Primer caso certificado (Trazabilidad → Despachos)

### Estado arquitectónico (contrato)
- **Business Capability Contract v1 certifica** que un módulo puede incluir Business Capabilities adicionales sin romper el estándar.

### Primer caso oficial para aplicación posterior
- La **Business Capability**:
  - Label: **Despachos**

se define como **Plan Estratégico / Decisión Arquitectónica** para el siguiente ciclo de implementación.

> Tratamiento SSOT de evidencia:
> - La relación “Trazabilidad → Despachos” se toma como **caso oficial de aplicación futura** para la implementación visual de la extensión.
> - Si la frase exacta no aparece textual en los Sprint certificados anteriores a este contrato, **NO** se presenta como hecho implementado; se presenta como **Decisión Arquitectónica / Plan Estratégico**.

---

## 7. Compatibilidad con `MODULE_CONTRACT_v1`

Se establece explícitamente la compatibilidad:

```text
MODULE_CONTRACT_v1
+
Business Capability Contract
=
Arquitectura oficial v1.1 (Extensión opcional)
```

### Compatibilidad garantizada
- `MODULE_CONTRACT_v1` queda intacto.
- Business Capabilities actúan como **complemento** y preservan estándar.

### No ruptura
Este documento certifica que el contrato de extensiones es un **mecanismo adicional**, no una modificación del contrato base.

---

## 8. Ejemplos de futuras Business Capabilities (no implementadas)

Ejemplos de capacidades de negocio adicionales que podrían extender módulos (como Plan Estratégico):

- Producción
- Auditorías
- Inventarios
- Laboratorio

> Evidencia/implementación: **no incluida** en este sprint. Solo se define como catálogo conceptual de ejemplos.

---

## 9. Consideraciones de escalabilidad (arquitectónicas)

- La extensión por Business Capability preserva el estándar y evita el crecimiento descontrolado de divergencias.
- El diseño 0..N permite ampliar capacidades con control de identidad y governance.
- La identidad propia (`type`, `label`) facilita la trazabilidad de extensiones en el tiempo (mecanismo conceptual).

---

## 10. Conclusiones

- Se define formalmente el concepto de **Business Capability** como extensión opcional del módulo.
- Se certifica que las Business Capabilities son complementarias y no sustituyen las Standard Capabilities de `MODULE_CONTRACT_v1`.
- Se identifica el primer caso arquitectónico (Plan Estratégico) para aplicación futura:
  - **Trazabilidad → Despachos**

---

## 11. Estado de certificación

> **ARCHITECTURE STATUS:** LEVEL 3 — CERTIFIED (SSOT)
>
> **DOCUMENT:** BUSINESS_CAPABILITY_CONTRACT_v1
>
> **STATUS:** BASELINE CERTIFIED (Extensión Contract v1.1)
>
> **SSOT:** Single Source of Truth

---

## 12. Criterios de aceptación (documentales)

1. El contrato no modifica `MODULE_CONTRACT_v1`.
2. Se define formalmente el concepto de Business Capability.
3. Se certifica que las capacidades son extensiones opcionales del módulo.
4. Se identifica **Trazabilidad → Despachos** como primer caso oficial de aplicación futura, documentado como **Plan Estratégico / Decisión Arquitectónica** si no existe evidencia textual previa.
5. No se modifica ninguna línea de código del proyecto.
6. La arquitectura queda preparada para el Sprint 49A-R.5.2 (implementación visual de la primera Business Capability).

## Governance

Este contrato solamente podrá modificarse mediante:

- Sprint arquitectónico certificado.
- Actualización del SSOT.
- Compatibilidad demostrada con MODULE_CONTRACT_v1.

No podrán introducirse Business Capabilities mediante modificaciones aisladas del código.

---

## 13. Fecha y versión del contrato

- **Versión:** v1
- **Fecha (documental):** 2026-07-10


