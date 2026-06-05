Sprint 38 — Documentación Oficial
Nombre

SPRINT 38 — Rule Registry Layer

Objetivo

Incorporar la capa de almacenamiento y resolución de reglas metadata-driven.

Antes de Sprint 38:

RuleContracts
      ↓
RulesEngine

Las reglas existían únicamente como contratos y evaluación.

No existía una infraestructura para registrar y resolver reglas desde metadata.

Después de Sprint 38:

RuleRegistry
      ↓
RuleRuntimeResolver
      ↓
RulesEngine
Archivos creados
1. RuleRegistry
src/runtime/rules/registry/RuleRegistry.ts

Responsabilidad:

Registrar reglas runtime.

FieldRule
    ↓
Map<string, FieldRule>

API:

register(rule)

get(ruleId)

has(ruleId)

getAll()
2. RuleRegistryProvider
src/runtime/rules/registry/RuleRegistryProvider.ts

Patrón Provider global.

API:

getRuleRegistry()

setRuleRegistry()
3. RuleRuntimeResolver
src/runtime/rules/runtime/RuleRuntimeResolver.ts

Responsabilidad:

ruleId
   ↓
FieldRule

API:

resolve(ruleId)

has(ruleId)

Sin transformación.

Sin lógica adicional.

Arquitectura después del Sprint 38
FormRegistry
       ↓

FormRuntimeResolver
       ↓

RuntimeBuilder
       ↓

FieldRegistry
       ↓

LayoutRegistry
       ↓

RuleRegistry
       ↓

RuleRuntimeResolver
       ↓

RulesEngine
Estado del Runtime

Actualmente tenemos:

Forms        ✅
Fields       ✅
Layouts      ✅
Rules        ✅

registrados y resolubles.