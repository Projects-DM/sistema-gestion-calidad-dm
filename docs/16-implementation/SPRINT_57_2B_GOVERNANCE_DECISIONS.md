# SPRINT 57.2B — Governance Decisions & Trade-offs

> **Tipo:** Documento complementario (SSOT)
>
> **Restricción:** Solo documentación. No modifica código/SQL/SSOT certificados.

---

## 0) Contexto

Este documento registra decisiones de gobernanza para convertir el Universal Capability Framework en un Framework Gobernado.

---

## 1) Decisión: Capability Contract como entidad independiente

### Motivo
Eliminar ambigüedad Definition vs Manifest vs “cómo se integra con Core”.

### Qué se gana
- Invariantes contractuales explícitas
- Integración predecible para Resolver y Runtime/UI

### Qué se paga
- Más documentación y esfuerzo de certificación

---

## 2) Decisión: Capability Interface estandarizada

### Motivo
Asegurar consistencia en cómo capacidades ejecutan acciones, exponen información y publican/consumen eventos.

### Trade-offs
- ✅ Escalabilidad conceptual y compatibilidad
- ❌ Necesidad de acordar semántica de comandos/queries/events

---

## 3) Decisión: Fronteras Infrastructure / Capability / Business

### Motivo
Reforzar la regla permanente de que la lógica de negocio no entra al Core.

### Trade-offs
- ✅ Evita “Core inflado” con lógica de dominio
- ❌ Requiere disciplina para categorizar cambios

---

## 4) Decisión: Capability Ownership

### Motivo
Asignar responsabilidades claras sobre evoluciones futuras.

### Trade-offs
- ✅ Evita drift y conflictos de gobierno
- ❌ Obliga a mantener dueños por dominio

---

## 5) Decisión: Governance First con pipeline Proposal→Availability

### Motivo
Asegurar certificación y publicación controlada.

### Trade-offs
- ✅ Consistencia de SSOT
- ❌ Más ciclos de revisión para nuevas capacidades

---

## 6) Decisión: Capability Compatibility Matrix conceptual

### Motivo
Prevenir incompatibilidades con evolución de Runtime/Metadata/Engine/Repository.

### Trade-offs
- ✅ Seguridad arquitectónica
- ❌ Complejidad de mantener la matriz

---

## 7) Decisión: clasificación de dependencias Hard/Soft/Optional

### Motivo
Permitir que ModuleCapabilityResolver normalice estados consistentes y optimice comportamientos.

### Trade-offs
- ✅ Control de consistencia (hard)
- ✅ Flexibilidad (soft/optional)
- ❌ Necesita definir reglas de normalización/validación

---

## 8) Riesgos y mitigaciones

1. **Riesgo:** “contratos demasiado vagos”
   - **Mitigación:** obligatoriedad de inputs/outputs/responsabilidades/invariantes en Contract.

2. **Riesgo:** semántica de eventos inconsistente
   - **Mitigación:** versión y compatibilidad conceptual en Certification.

3. **Riesgo:** clasificación incorrecta de dependencias
   - **Mitigación:** revisión de Architecture Review + reglas explícitas en Resolver.

---

## 9) Principios guía

- Capability First
- Contract First
- Composition over Modules
- Infrastructure & Business independence
- Governance First

---

# FIN — SPRINT 57.2B GOVERNANCE DECISIONS

