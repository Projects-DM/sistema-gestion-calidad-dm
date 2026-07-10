# SPRINT_45_16 — ARCHITECTURE GOVERNANCE FRAMEWORK (SSOT)

> Documento SSOT (Solo auditoría documental).
>
> NO implementar código.
> NO modificar componentes.
> NO modificar runtime.
> NO modificar base de datos.
> NO refactorizar.
>
> Objetivo: definir el proceso oficial de gobierno para evolucionar la arquitectura sin romper el SSOT.

Exclusión obligatoria:
> **Trazabilidad NO constituye referencia arquitectónica.**

---

## 0) Objetivo y enfoque
Este sprint **no audita** componentes, contratos ni runtime.

Este sprint audita **únicamente** el proceso de gobierno arquitectónico, usando como evidencia exclusiva los SSOT de:
- Sprint 45.9
- Sprint 45.10
- Sprint 45.10A
- Sprint 45.11
- Sprint 45.11A
- Sprint 45.12
- Sprint 45.13
- Sprint 45.13A
- Sprint 45.14
- Sprint 45.14A
- Sprint 45.15
- Sprint 45.15A

---

## 1) Architecture Review Process (cómo nace una modificación arquitectónica)
Una modificación arquitectónica nace cuando ocurre cualquiera de los siguientes eventos documentales:

1. Nueva necesidad funcional soportada por metadata
- Requiere evaluar si la arquitectura core permite el crecimiento sin romper invariantes SSOT.

2. Cambio propuesto que impacta invariantes
- Ejemplo: impacto potencial sobre Contracts, Runtime Bridge, metadata mínima, ownership, o pipelines.

3. Observación de riesgo
- Un riesgo del Risk Register (45.14/45.14A) se activa o requiere ajuste documental por evolución.

4. Propuesta ADR
- Se registra una decisión arquitectónica potencial en el ADR repository (45.13/45.13A), bajo ciclo de vida.

**Regla SSOT:** cualquier modificación que afecte invariantes definidas en 45.12 se considera “modificación arquitectónica” y debe seguir el flujo de revisión.

---

## 2) Architecture Approval Process (quién aprueba Major / Minor / Patch)
Clasificación de solicitud:
- **Major**: requiere aprobación cuando existe posible ruptura de invariantes/contratos/bridge/event contract.
- **Minor**: extiende compatibilidad sin romper invariantes.
- **Patch**: corrección documental mínima sin impacto de contratos/invariantes.

> Nota documental: este sprint define el proceso; la figura de “quién” se expresa como roles arquitectónicos (no personas).

Aprobación por tipo:
- **Major:** Architecture Owner + Compliance Owner + Contract Owner + Risk Owner
- **Minor:** Architecture Owner + Compliance Owner + Risk Owner
- **Patch:** Architecture Owner (notificación al Compliance Owner)

---

## 3) ADR Lifecycle (ciclo de vida completo)
Los estados oficiales del ADR repository:
- **Proposed**
- **Accepted**
- **Rejected**
- **Superseded**
- **Deprecated**

Regla de trazabilidad documental:
- Un ADR Accepted solo puede basarse en evidencias SSOT (45.9–45.15A) o en un conjunto de evidencias aprobado por el proceso de revisión.

---

## 4) Change Management (qué cambios requieren qué revisiones)
Tipos de cambio (documentales):

### 4.1 Cambios que requieren ADR
- Cambios en invariantes, ownership, fronteras Core/Extension.
- Cambios en semántica de contrapartes (submit/verify/bridge) aunque no se modifique código.

### 4.2 Cambios que requieren Risk Review
- Todo cambio que incremente probabilidad/impacto de riesgos del Risk Register.

### 4.3 Cambios que requieren Compliance Review
- Todo cambio que afecte cualquier checklist del Compliance Framework (45.15/45.15A), particularmente:
  - Contracts compliance
  - Dependencies compliance
  - Runtime compliance
  - Metadata compliance
  - Governance compliance
  - Risk Register compliance

### 4.4 Cambios que requieren Certification
- Todo cambio que aspire a alterar el estatus “Congelable/Congelado” del SSOT o que modifique el dictamen del cumplimiento.

---

## 5) SSOT Update Process (cómo se modifica oficialmente el SSOT)
El SSOT se actualiza exclusivamente mediante:
1. Generación de un ADR (o conjunto de ADR) que formalice la decisión.
2. Actualización del Risk Register cuando aplique.
3. Actualización documental de contratos/dependencias/evolución únicamente cuando el SSOT de referencia lo exija.
4. Re-ejecución del Compliance Framework (45.15/45.15A) para emitir dictamen.

Regla de consistencia:
- Un cambio documental del SSOT nunca contradice los invariantes de 45.12.

---

## 6) Architecture Freeze Rules (significado de estados de freeze)
Estados oficiales del SSOT/arquitectura:

- **Congelable**
  - El SSOT puede declararse como estable para iniciar fase de ejecución.
  - Puede coexistir con observaciones documentales menores.

- **Congelado**
  - El SSOT está listo para crecer por metadata con garantías de invariantes.
  - Cambios core requerirán revisión Major.

- **En revisión**
  - Existe cambio propuesto que impacta invariantes o contratos; el SSOT no debe certificarse para Release.

- **En evolución**
  - Se está actualizando formalmente el SSOT (ADR Accepted/actualizaciones) sin certificar aún como Congelado.

---

## 7) Review Gates (checklist obligatorio antes de aceptar un cambio)
Antes de aceptar un cambio arquitectónico del core, se verifica el checklist del Compliance Framework:

□ Contracts
□ Dependencies
□ Runtime
□ Metadata
□ Risk
□ ADR
□ Compliance
□ Core Boundaries
□ Compatibility

Regla adicional:
- Si el cambio puede afectar runtime bridge o contratos públicos, se requiere revisión Major y certificación antes de cualquier declaración “Congelado”.

---

## 8) Architecture Decision Workflow (flujo oficial de decisión)
Nueva necesidad
↓
Architecture Review
↓
ADR
↓
Risk Review
↓
Compliance
↓
Certification
↓
Implementación

> Este flujo define solo gobernanza documental. La implementación queda fuera del alcance de este sprint.

---

## 9) Governance Roles (roles arquitectónicos)
Responsables documentales (roles, no personas):
- Architecture Owner
- Contract Owner
- Runtime Owner
- Metadata Owner
- Risk Owner
- Compliance Owner

Propiedad documental (por alineación con 45.11/45.12/45.13A):
- Architecture Owner: dueño del SSOT core y de la consistencia de la constitución arquitectónica
- Contract Owner: dueño del contrato observable (submit/verify/bridge)
- Runtime Owner: dueño de la consistencia del contrato bridge
- Metadata Owner: dueño de invariantes metadata-driven (sgc_*)
- Risk Owner: dueño del Risk Register y su evolución
- Compliance Owner: dueño del Compliance Framework y sus dictámenes

---

## 10) Governance Matrix (área → owner → documento → proceso)

| Área | Owner | Documento | Proceso |
|---|---|---|---|
| Contracts | Contract Owner | Sprint 45.9 | Contract Compliance (45.15) |
| Dependencies | Risk Owner/Compliance Owner | Sprint 45.10/45.10A | Dependency Compliance (45.15) |
| Core Architecture | Architecture Owner | Sprint 45.11/45.11A | Certification (45.11A/45.15) |
| Runtime Bridge | Runtime Owner | Sprint 45.9/45.11/45.12 | Runtime Compliance (45.15) |
| Metadata SSOT | Metadata Owner | Sprint 45.13A/45.12 | Metadata Compliance (45.15) |
| ADR Governance | Compliance Owner | Sprint 45.13/45.13A | ADR Lifecycle (45.13A/45.16) |
| Risk Register | Risk Owner | Sprint 45.14/45.14A | Risk Compliance (45.14A/45.15) |
| Evolution Rules | Architecture Owner/Compliance Owner | Sprint 45.12 | Evolution Compliance (45.15) |
| Freeze/Certification | Compliance Owner | Sprint 45.15/45.15A | Certification gates |

---

## 11) Architecture Audit Frequency (frecuencia documental de auditorías)
Auditoría/revisión documental debe repetirse:
- Antes de un cambio **Major**
- Antes de congelar un Release (cuando el estado actual sea Congelable)
- Antes de modificar Contracts
- Antes de crear nuevos Engines (si ocurre via ADR y compatibilidad)
- Antes de modificar Runtime

---

## 12) Certification (estatus de gobernanza)
Emisión de gobernanza:
- Nivel de Gobernanza: derivado del proceso de review + compliance + certification.
- Nivel de Madurez: derivado del dictamen SSOT (45.15/45.15A).
- Nivel de Mantenibilidad: derivado de claridad de contratos/dependencias/ADR (45.9–45.14A).
- Nivel de Evolución: derivado de Evolution Rules (45.12).
- Nivel de Control Arquitectónico: derivado de Core boundaries (45.11/45.11A) y invariantes (45.12).

Estado final recomendado por defecto (sin nuevas evidencias):
- **Congelable**

---

## Estado final
Este sprint define el **proceso oficial** de evolución documental del SSOT sin alterar el SSOT existente ni agregar nuevas reglas funcionales.

