const STORAGE_KEY = 'dm_sgc_dispatches_defaults_v1';

const DEFAULTS = {
  placa: 'TRG786',
  conductor: 'Juan Gómez',
};

export function getDispatchesDefaults() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      placa: String(parsed?.placa || DEFAULTS.placa),
      conductor: String(parsed?.conductor || DEFAULTS.conductor),
    };
  } catch {
    return DEFAULTS;
  }
}

export function setDispatchesDefaults(next) {
  const toSave = {
    placa: String(next?.placa || DEFAULTS.placa),
    conductor: String(next?.conductor || DEFAULTS.conductor),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  return toSave;
}

export function withDispatchDefaults(record, defaults) {
  const placa = String(record?.placa || '').trim() || defaults?.placa || DEFAULTS.placa;
  const conductor = String(record?.conductor || '').trim() || defaults?.conductor || DEFAULTS.conductor;
  return { ...record, placa, conductor };
}

