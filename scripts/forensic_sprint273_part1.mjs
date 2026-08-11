// SPRINT 273 — FORENSIC DIAGNOSTIC (PART 1) — NON-PRODUCTION — AUDIT ONLY.
// Reproduces the EXACT payload the Panel builds when the user presses
// GUARDAR in "Nueva alerta" mode and evaluates it with the REAL certified
// Mapper + Validation. Read-only (no DB, no writes). Everything is imported
// from src to guarantee it matches production code.
import {
  createEmptyFormState,
  mapFormStateToMetadata,
  mapFormStatesToCollection,
} from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js';
import { validateAlertConfiguration } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationValidation.js';

// Mirror of AlertConfigurationPanel.newAlertInitial() (line 116-127).
function newAlertInitial() {
  return {
    ...createEmptyFormState(),
    // getCurrentLocalDateTime defaults (fixed here for determinism)
    startDate: '2026-08-09',
    startTime: '10:30',
    name: '',
    description: '',
    enabled: true,
    automaticClose: true,
  };
}

const DEFAULT_DRAFT = newAlertInitial();

console.log('=== SPRINT 273 PART 1 — PAYLOAD/STATE AUDIT (REAL Mapper + Validation) ===\n');

console.log('--- draft producido por newAlertInitial() (clon fiel del Panel :116) ---');
console.log(JSON.stringify(DEFAULT_DRAFT, null, 2));

const singleMetadata = mapFormStateToMetadata(DEFAULT_DRAFT);
console.log('\n--- mapFormStateToMetadata(draft) [Nueva alerta sin programación seleccionada] ---');
console.log(JSON.stringify(singleMetadata, null, 2));

const v = validateAlertConfiguration(singleMetadata);
console.log('\nvalidateAlertConfiguration(metadata) → valid:', v.valid);
console.log('errors:', JSON.stringify(v.errors, null, 2));

// Scenario: existing collection of 1 (e.g. asdasd loaded) + new alert via draft.
// Simulates onSubmit NEW-ALERT branch (Panel :226-257): rows = [...alerts, next]
// and config = {...draft, name, description}.
function simulateNewAlertSubmit(existingFormStates, draftOverrides = {}) {
  const draft = { ...DEFAULT_DRAFT, ...draftOverrides };
  const rows = [...existingFormStates, draft];
  const formStates = rows.map((f) => f);
  const collection = mapFormStatesToCollection(formStates);
  const errors = {};
  for (let i = 0; i < collection.length; i += 1) {
    const r = validateAlertConfiguration(collection[i]);
    if (!r.valid) errors[i] = r.errors;
  }
  return {
    formStatesCount: formStates.length,
    collection,
    errorsIndexed: errors,
    valid: Object.keys(errors).length === 0,
  };
}

console.log('\n--- SIMULACIÓN onSubmit (nueva alerta): recurso SOLO CON UN DRAFT NUEVO ---');
const solo = simulateNewAlertSubmit([], { name: 'Alerta', description: 'x' });
console.log('formStates:', solo.formStatesCount, '| valid:', solo.valid);
console.log('errors[index]:', JSON.stringify(solo.errorsIndexed, null, 2));

console.log('\n--- SIMULACIÓN onSubmit (edición existente): formStates = alerts.map(configs[a.key]) ---');
const loadedFormState = {
  enabled: true,
  priority: 'high',
  name: 'Alerta Test Formulario',
  description: '',
  startDate: '',
  startTime: '',
  timezone: '',
  periodicityMode: 'recurring',
  periodicityAmount: 1,
  periodicityUnit: 'months',
  expiration: 'none',
  riskModel: 'relative',
  riskYellow: 0.5,
  riskRed: 0.25,
  notificationEnabled: false,
  notificationChannel: 'email',
  notificationRecipients: '',
  gracePeriodEnabled: false,
  gracePeriodAmount: 1,
  gracePeriodUnit: 'days',
  automaticClose: true,
  repeatPolicy: 'repeat',
};
const edit = simulateNewAlertSubmit([loadedFormState]);
console.log('formStates:', edit.formStatesCount, '| valid:', edit.valid);
console.log('errors[index]:', JSON.stringify(edit.errorsIndexed, null, 2));

console.log('\n--- El usuario SÍ selecciona "Diario" en Frecuencia (applyScheme diario) ---');
const withScheme = simulateNewAlertSubmit([], {
  name: 'Alerta',
  periodicityMode: 'recurring',
  periodicityAmount: 1,
  periodicityUnit: 'days',
  expiration: 'none',
  repeatPolicy: 'repeat',
});
console.log('valid:', withScheme.valid, '| errors:', JSON.stringify(withScheme.errorsIndexed));

console.log('\n--- El usuario SELECCIONA "Al vencimiento" (applyScheme vencimiento) ---');
const withExpiring = simulateNewAlertSubmit([], {
  name: 'Alerta',
  periodicityMode: 'none',
  expiration: 'recurring',
  repeatPolicy: 'once',
});
console.log('valid:', withExpiring.valid, '| errors:', JSON.stringify(withExpiring.errorsIndexed));

console.log('\n=== END PART 1 ===');