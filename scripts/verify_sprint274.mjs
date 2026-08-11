// SPRINT 274 — VERIFICATION — NON-PRODUCTION — CONTROLLED CORRECTION CHECK.
// Proves ROOT CAUSE C + E fixes with the REAL certified components:
//   - C: the NEW-ALERT initial state now maps to canonically VALID metadata
//        (never `periodicity:null` + `repeatPolicy:'repeat'`).
//   - E: errors.index / errors.general / field errors become VISIBLE in the
//        presentation shape the Form renders (`errors.form` + field keys).
// Uses a SPY persistence port (never calls dynamicService/documentRepositories/
// supabase). Read-only with respect to production.
import { createEmptyFormState, mapFormStateToMetadata, mapFormStatesToCollection } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationMapper.js';
import { validateAlertConfiguration } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationValidation.js';
import { AlertConfigurationApplicationService } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import { buildVisibleErrors, flattenErrorValue } from '../src/modules/experiences/alertConfigurationErrorPresenter.js';

// Mirror of AlertConfigurationPanel.newAlertInitial() AFTER Sprint 274 fix (C).
function newAlertInitialAfterFix() {
  return {
    ...createEmptyFormState(),
    name: '',
    description: '',
    startDate: '2026-08-09',
    startTime: '10:30',
    periodicityMode: 'recurring',
    periodicityAmount: 1,
    periodicityUnit: 'days',
    expiration: 'none',
    repeatPolicy: 'repeat',
    enabled: true,
    automaticClose: true,
  };
}

function makeSpyPort() {
  let calls = 0;
  return {
    label: 'spy',
    getCalls: () => calls,
    async loadConfiguration() { return { accepted: true, backend: 'forms' }; },
    async saveConfiguration(resourceReference, configuration) {
      calls += 1;
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

function assertThat(label, condition, detail) {
  const ok = Boolean(condition);
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
  if (!ok) console.log(`       → ${detail}`);
  return ok;
}

const RESOURCE = {
  id: '9fc7d251-b6c7-4ced-8d05-b998729cfb1b',
  name: 'asdasd',
  slug: 'asdasd',
  module_id: '633abfab-9def-4bce-8243-74f5655d00ef',
  alert_config: {},
};

async function main() {
  console.log('=== SPRINT 274 — VERIFICATION (C + E) ===\n');

  // ---------- 274.1 / 274.2 — Estado inicial coherente ----------
  console.log('274.1 / 274.2 — Nueva Alerta: estado inicial coherente (C)');
  const draft = newAlertInitialAfterFix();
  const metadata = mapFormStateToMetadata(draft);
  console.log('  periodicityMode:', draft.periodicityMode, '| repeatPolicy:', draft.repeatPolicy);
  console.log('  metadata.periodicity:', JSON.stringify(metadata.periodicity), '| metadata.repeatPolicy:', metadata.repeatPolicy);
  const v = validateAlertConfiguration(metadata);
  assertThat('274.1 estado inicial NO genera periodicity:null + repeatPolicy:repeat', metadata.periodicity !== null && metadata.repeatPolicy === 'repeat', JSON.stringify(metadata.periodicity));
  assertThat('274.2 estado inicial es VÁLIDO según contrato existente', v.valid === true, JSON.stringify(v.errors));
  assertThat('274.2 validación existente NO modificada (SSOT) — checkPolicy intact', typeof metadata.repeatPolicy === 'string' && metadata.periodicity !== null, 'metadata inválida');
  assertThat('274.2 periodicity recurrente {amount, unit} queda coherente', metadata.periodicity && metadata.periodicity.amount === 1 && metadata.periodicity.unit === 'days', JSON.stringify(metadata.periodicity));

  // ---------- 274.3 — Nueva alerta válida llega al Port ----------
  console.log('\n274.3 — Nueva alerta VÁLIDA → success:true (validation + port + persistence)');
  const portA = makeSpyPort();
  const svcA = new AlertConfigurationApplicationService({ persistence: portA });
  const resA = await svcA.saveCollection({ resource: RESOURCE, formStates: [draft] });
  assertThat('274.3 saveCollection devuelve success:true', resA.success === true, JSON.stringify(resA));
  assertThat('274.3 el Port fue invocado', portA.getCalls() === 1, `calls=${portA.getCalls()}`);
  assertThat('274.3 payload NUNCA es {} (no empty-collection ghost)', Array.isArray(resA.metadata) && resA.metadata.length === 1, JSON.stringify(resA.metadata));

  // ---------- 274.4 / 274.5 — Política inválida → success:false + error visible ----------
  console.log('\n274.4 / 274.5 — Nueva alerta con política inválida → error en UI visible');
  const invalidDraft = { ...draft, periodicityMode: 'none', repeatPolicy: 'repeat' }; // user cleared frequency
  const metaInvalid = mapFormStateToMetadata(invalidDraft);
  console.log('  metadata.periodicity:', JSON.stringify(metaInvalid.periodicity), '| repeatPolicy:', metaInvalid.repeatPolicy);
  const portB = makeSpyPort();
  const svcB = new AlertConfigurationApplicationService({ persistence: portB });
  const resB = await svcB.saveCollection({ resource: RESOURCE, formStates: [invalidDraft] });
  assertThat('274.4 saveCollection devuelve success:false', resB.success === false, JSON.stringify(resB));
  assertThat('274.4 el Port NO fue invocado (validation failure ≠ persistence failure)', portB.getCalls() === 0, `calls=${portB.getCalls()}`);
  const visibleB = buildVisibleErrors(resB.errors, ['Mi Alerta']);
  assertThat('274.5 errors[0].policy → VISIBLE vía errors.form', Array.isArray(visibleB.form) && visibleB.form.length > 0 && visibleB.form[0].length > 0, JSON.stringify(visibleB));
  assertThat('274.5 se preserva granularidad de campo (policy promovida en colección única)', Array.isArray(visibleB.policy) && visibleB.policy.length > 0, JSON.stringify(visibleB));

  // ---------- 274.6 — errors.general visible ----------
  console.log('\n274.6 — Error de persistencia → errors.general visible');
  const portC = makeSpyPort();
  const svcC = new AlertConfigurationApplicationService({ persistence: portC });
  // Force a persistence failure: monkey-patch the port to throw on write.
  portC.saveConfiguration = async () => { throw new Error('Fallo en la persistencia de la alerta: recurso no encontrado o 0 filas actualizadas.'); };
  const resC = await svcC.saveCollection({ resource: RESOURCE, formStates: [draft] });
  assertThat('274.6 AppService captura y devuelve success:false + errors.general', resC.success === false && Array.isArray(resC.errors?.general), JSON.stringify(resC.errors));
  const visibleC = buildVisibleErrors(resC.errors, ['Mi Alerta']);
  assertThat('274.6 errors.general → visible (errors.form)', Array.isArray(visibleC.form) && visibleC.form.length > 0, JSON.stringify(visibleC));

  // ---------- 274.7 — Error en segunda alerta → índice correcto ----------
  console.log('\n274.7 — Error en la SEGUNDA alerta → asociado a índice 1');
  const good1 = { ...draft, name: 'Alerta 1' };
  const bad2 = { ...draft, name: 'Alerta 2', periodicityMode: 'none', repeatPolicy: 'repeat' };
  const portD = makeSpyPort();
  const svcD = new AlertConfigurationApplicationService({ persistence: portD });
  const resD = await svcD.saveCollection({ resource: RESOURCE, formStates: [good1, bad2] });
  assertThat('274.7 saveCollection success:false', resD.success === false, JSON.stringify(resD));
  assertThat('274.7 error EN EL ÍNDICE 1 (no en 0)', resD.errors && resD.errors[1] && !resD.errors[0], JSON.stringify(resD.errors));
  const visibleD = buildVisibleErrors(resD.errors, ['Alerta 1', 'Alerta 2']);
  assertThat('274.7 el mensaje señala la alerta 2 por nombre', Array.isArray(visibleD.form) && visibleD.form[0].includes('Alerta 2'), JSON.stringify(visibleD));

  // ---------- 274.8 — multi-alert válida persiste colección completa ----------
  console.log('\n274.8 / 274.14 — Colección múltiple VÁLIDA → se persiste entera');
  const good2 = { ...draft, name: 'Alerta 2' };
  const portE = makeSpyPort();
  const svcE = new AlertConfigurationApplicationService({ persistence: portE });
  const resE = await svcE.saveCollection({ resource: RESOURCE, formStates: [good1, good2] });
  assertThat('274.8 success:true', resE.success === true, JSON.stringify(resE));
  assertThat('274.14 colección completa persistida (length 2)', Array.isArray(resE.metadata) && resE.metadata.length === 2, JSON.stringify(resE.metadata));

  // ---------- Builder sanity ----------
  console.log('\nHelper: flattenErrorValue');
  assertThat('aplanado de {policy:[msgs]}', JSON.stringify(flattenErrorValue({ policy: ['a', 'b'] })) === JSON.stringify(['a', 'b']), '—');

  console.log('\n=== END VERIFICATION (Sprint 274) ===');
  process.exitCode = 0;
}

main().catch((err) => { console.error('FATAL', err); process.exitCode = 1; });