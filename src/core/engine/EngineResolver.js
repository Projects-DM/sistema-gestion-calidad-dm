// EngineResolver (Sprint 52) — adapter de resolución de engines
// No introduce lógica de negocio ni toca Core Runtime/Contracts.

import BaseChecklist from '../../components/engines/BaseChecklist';
import BaseMediciones from '../../components/engines/BaseMediciones';
import BaseGeneric from '../../components/engines/BaseGeneric';

const ENGINE_MAP = {
  BaseChecklist,
  BaseMediciones,
};

export function resolveEngineComponent(engineType) {
  return ENGINE_MAP[engineType] ?? BaseGeneric;
}

