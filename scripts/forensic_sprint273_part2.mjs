// SPRINT 273 — FORENSIC DIAGNOSTIC (PART 2) — NON-PRODUCTION — AUDIT ONLY.
// Proves the Application→Port boundary WITHOUT writing to the DB:
// a SPY port (wrapping the OFFICIAL PersistencePort contract shape) captures
// resource + payload exactly as the Panel's onSubmit passes them and validates
// the same envelope/identity the real Adapter enforces, returning a fake row.
// Read-only with respect to production (never calls dynamicService / supabase).
import { AlertConfigurationApplicationService } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';

// Resource received by the saveCollection invocation. Mirrors the real DB row
// that Configuration.jsx obtains via dynamicService.getFormsByModule (id +
// module_id + alert_config included). We prove identity against the DB in
// Part 3; here we show the exact object the UI hands the service.
const FORM_RESOURCE = {
  id: '9fc7d251-b6c7-4ced-8d05-b998729cfb1b', // asdasd (exists in sgc_forms)
  name: 'Alerta Test Formulario fixture',      // presentation identity only
  slug: 'asdasd',
  module_id: '633abfab-9def-4bce-8243-74f5655d00ef',
  engine_type: 'BaseGeneric',
  alert_config: { alertConfigurations: [] },
};

// A formState the user WOULD produce after selecting "Diario" (valid).
function validDraft() {
  return {
    enabled: true,
    priority: 'medium',
    name: 'Alerta diaria',
    description: 'Fixture valida',
    startDate: '2026-08-09',
    startTime: '10:30',
    timezone: '',
    periodicityMode: 'recurring',
    periodicityAmount: 1,
    periodicityUnit: 'days',
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
}

// DEFAULT-draft (no scheme selected) reproduces the exact invalid payload.
function defaultDraft() {
  return {
    enabled: true,
    priority: 'medium',
    name: 'Mi alerta',
    description: '',
    startDate: '2026-08-09',
    startTime: '10:30',
    timezone: '',
    periodicityMode: 'none',
    periodicityAmount: 1,
    periodicityUnit: 'days',
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
}

// SPY: implements the PersistencePort load/save contract. Saves never reach
// production infra; the spy fingerprints the exact arguments and returns a
// fake row { id } iff the envelope + reference are well-formed (mirroring the
// real Adapter's checks in AlertConfigurationPersistenceAdapter).
function makeSpyPort(label) {
  const calls = [];
  return {
    label,
    calls,
    async loadConfiguration() {
      return { accepted: true, backend: 'forms' };
    },
    async saveConfiguration(resourceReference, configuration) {
      calls.push({ resourceReference: JSON.parse(JSON.stringify(resourceReference)), configuration: JSON.parse(JSON.stringify(configuration)) });
      const reference = resourceReference && typeof resourceReference === 'object'
        ? { ...resourceReference }
        : { id: resourceReference };
      if (!reference || (!reference.id && reference.id !== 0)) {
        throw new Error('AlertConfigurationPersistenceAdapter: resourceId es obligatorio y debe ser válido.');
      }
      if (!configuration || !Array.isArray(configuration.alertConfigurations)) {
        throw new Error('AlertConfigurationPersistenceAdapter: el Write Path oficial exige el envelope { alertConfigurations: [...] }.');
      }
      return { reference, configuration, backend: 'forms', row: { id: reference.id } };
    },
  };
}

async function runCase(label, resource, formStates) {
  const port = makeSpyPort(label);
  const service = new AlertConfigurationApplicationService({ persistence: port });
  const result = await service.saveCollection({ resource, formStates });
  const last = port.calls[port.calls.length - 1] || null;
  console.log(`\n--- ${label} ---`);
  console.log('result.success:', result.success);
  console.log('result.errors:', result.errors ? JSON.stringify(result.errors) : null);
  console.log('result.persisted:', result.persisted ? JSON.stringify(result.persisted) : null);
  if (last) {
    console.log('resourceReference recibido por el port (id):', last.resourceReference.id, '| module_id:', last.resourceReference.module_id);
    console.log('configuration.alertConfigurations.length:', last.configuration.alertConfigurations.length);
    console.log('configuration.alertConfigurations[0].name:', last.configuration.alertConfigurations[0]?.name);
    console.log('configuration.alertConfigurations[0].enabled:', last.configuration.alertConfigurations[0]?.enabled);
    console.log('configuration.alertConfigurations[0].periodicity:', JSON.stringify(last.configuration.alertConfigurations[0]?.periodicity));
    console.log('configuration.alertConfigurations[0].repeatPolicy:', last.configuration.alertConfigurations[0]?.repeatPolicy);
  }
  return result;
}

async function main() {
  console.log('=== SPRINT 273 PART 2 — EVENT → APPLICATION SERVICE BOUNDARY (SPY port, no DB write) ===\n');

  // Case A: valid collection replaces/sets config (like real S271 write).
  await runCase('A: formStates VÁLIDO (diario) → ¿llega al Port y retorna success:true?', FORM_RESOURCE, [validDraft()]);

  // Case B: NEW ALERT defaults WITHOUT scheme → exactly what Panel onSubmit produces.
  await runCase('B: formStates DEFAULT (sin esquema) → ¿cumple validación o frena en AppService?', FORM_RESOURCE, [defaultDraft()]);

  // Case C: editing existing collection + a new default draft (rows.map branch).
  await runCase('C: [existente válido, nuevo DEFAULT] → errors indexados como devuelve saveCollection?', FORM_RESOURCE, [validDraft(), defaultDraft()]);

  // Case D: expects the falsy resource guard path.
  const portD = makeSpyPort('D');
  const serviceD = new AlertConfigurationApplicationService({ persistence: portD });
  const resultD = await serviceD.saveCollection({ resource: FORM_RESOURCE, formStates: [] });
  console.log('\n--- D: formStates [] (colección vacía en edición existente) ---');
  console.log('result.success:', resultD.success, '| metadata:', JSON.stringify(resultD.metadata), '| errors:', JSON.stringify(resultD.errors));

  console.log('\n=== END PART 2 ===');
}

main().catch((err) => { console.error('FATAL', err); process.exitCode = 1; });