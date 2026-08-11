import { createClient } from '@supabase/supabase-js';
import { alertConfigurationPersistence } from '../src/modules/experiences/AlertConfigurationPersistenceAdapter.js';
import { AlertConfigurationApplicationService } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationApplicationService.js';
import { extractResourceAlertCollection, resolveResourceAlertCollection } from '../src/core/capabilities/alert/operational-configuration/AlertConfigurationResolver.js';

const sb = createClient('https://ruzomcnxsnhlfqlefsrc.supabase.co', 'sb_publishable_o40lOGgR7huC64vY7pIUdg_MqRY5Cti');
const alertService = new AlertConfigurationApplicationService({ persistence: alertConfigurationPersistence });

async function runVerification() {
  console.log('=== SPRINT 271 VERIFICATION RUN ===\n');

  // TEST 1: Form Alert Configuration Write & Read-After-Write
  console.log('--- TEST 271.1: Form Alert Configuration Write ---');
  const { data: forms } = await sb.from('sgc_forms').select('*').limit(1);
  if (!forms || forms.length === 0) {
    console.error('FAIL: No forms found in database for testing.');
    return;
  }
  const testForm = forms[0];
  console.log(`Target Form: ${testForm.name} (id: ${testForm.id})`);

  const formDraftState = [
    {
      name: 'Alerta Test Formulario',
      description: 'Verificación Sprint 271 Form',
      enabled: true,
      periodicityMode: 'recurring',
      periodicityAmount: 1,
      periodicityUnit: 'months',
      expiration: 'none',
      riskModel: 'relative',
      riskYellow: 0.5,
      riskRed: 0.25,
      priority: 'high',
      notificationEnabled: false,
      notificationChannel: 'email',
      notificationRecipients: '',
      gracePeriodEnabled: false,
      gracePeriodAmount: 1,
      gracePeriodUnit: 'days',
      automaticClose: true,
      repeatPolicy: 'repeat',
    }
  ];

  const formSaveResult = await alertService.saveCollection({
    resource: testForm,
    formStates: formDraftState,
  });

  if (!formSaveResult.success) {
    console.error('FAIL: Form alert save failed:', formSaveResult.errors);
  } else {
    console.log('PASS: Form alert save success!');
    // Read-after-write check from DB
    const { data: updatedForm } = await sb.from('sgc_forms').select('*').eq('id', testForm.id).single();
    const resolvedCol = resolveResourceAlertCollection(updatedForm);
    console.log('Read-After-Write Resolution Source:', resolvedCol.source);
    console.log('Persisted alert_config collection length:', resolvedCol.collection.length);
    if (resolvedCol.source === 'metadata' && resolvedCol.collection.length > 0) {
      console.log('PASS: Read-After-Write verified for Form!\n');
    } else {
      console.error('FAIL: Read-After-Write mismatch for Form!\n');
    }
  }

  // TEST 2: Repository Alert Configuration Write & Read-After-Write
  console.log('--- TEST 271.2: Repository Alert Configuration Write ---');
  const { data: repos } = await sb.from('sgc_document_repositories').select('*').limit(1);
  if (repos && repos.length > 0) {
    const testRepo = repos[0];
    console.log(`Target Repo: ${testRepo.name} (id: ${testRepo.id})`);

    const repoDraftState = [
      {
        name: 'Alerta Test Repositorio',
        description: 'Verificación Sprint 271 Repo',
        enabled: true,
        periodicityMode: 'recurring',
        periodicityAmount: 1,
        periodicityUnit: 'weeks',
        expiration: 'none',
        riskModel: 'relative',
        riskYellow: 0.5,
        riskRed: 0.25,
        priority: 'medium',
        notificationEnabled: false,
        notificationChannel: 'email',
        notificationRecipients: '',
        gracePeriodEnabled: false,
        gracePeriodAmount: 1,
        gracePeriodUnit: 'days',
        automaticClose: true,
        repeatPolicy: 'repeat',
      }
    ];

    const repoSaveResult = await alertService.saveCollection({
      resource: testRepo,
      formStates: repoDraftState,
    });

    if (!repoSaveResult.success) {
      console.error('FAIL: Repository alert save failed:', repoSaveResult.errors);
    } else {
      console.log('PASS: Repository alert save success!');
      const { data: updatedRepo } = await sb.from('sgc_document_repositories').select('*').eq('id', testRepo.id).single();
      const resolvedRepoCol = resolveResourceAlertCollection(updatedRepo);
      console.log('Read-After-Write Resolution Source:', resolvedRepoCol.source);
      if (resolvedRepoCol.source === 'metadata') {
        console.log('PASS: Read-After-Write verified for Repository!\n');
      } else {
        console.error('FAIL: Read-After-Write mismatch for Repository!\n');
      }
    }
  } else {
    console.log('SKIP: No document repositories in database to test repo write.\n');
  }

  // TEST 3: Invalid / Non-existent Resource ID Failure
  console.log('--- TEST 271.6 & 271.7: Invalid Resource ID Deterministic Failure ---');
  const invalidResource = { id: '00000000-0000-0000-0000-000000000000', module_id: 'dummy-mod' };
  const invalidSaveResult = await alertService.saveCollection({
    resource: invalidResource,
    formStates: formDraftState,
  });

  if (!invalidSaveResult.success) {
    console.log('PASS: Non-existent resource ID failed deterministically:', invalidSaveResult.errors);
  } else {
    console.error('FAIL: Non-existent resource ID returned success (Silent write failure!)\n');
  }

  const nullIdResource = { id: null, module_id: 'dummy-mod' };
  const nullSaveResult = await alertService.saveCollection({
    resource: nullIdResource,
    formStates: formDraftState,
  });

  if (!nullSaveResult.success) {
    console.log('PASS: Null resource ID failed deterministically:', nullSaveResult.errors, '\n');
  } else {
    console.error('FAIL: Null resource ID returned success!\n');
  }

  // TEST 4: Default vs Explicit Source
  console.log('--- TEST 271.8: Default vs Explicit Source Verification ---');
  const unconfiguredResource = { id: 'test-unconfig-id', name: 'Unconfigured Form' };
  const unconfigCol = resolveResourceAlertCollection(unconfiguredResource);
  console.log('Unconfigured resource source:', unconfigCol.source);
  if (unconfigCol.source === 'default') {
    console.log('PASS: Unconfigured resource returns source = "default"!\n');
  } else {
    console.error('FAIL: Unconfigured resource did not return default source!\n');
  }

  console.log('=== ALL SPRINT 271 TESTS COMPLETED ===');
}

runVerification();
