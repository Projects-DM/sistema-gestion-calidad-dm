import { ModuleAdministrationApplicationService } from '../src/core/applicationLayer/moduleAdministration/ModuleAdministrationApplicationService.js';
import { ModuleCapabilityPersistenceAdapter } from '../src/core/applicationLayer/moduleAdministration/adapters/ModuleCapabilityPersistenceAdapter.js';
import { createApplicationRequest } from '../src/core/applicationLayer/common/contracts/ApplicationRequest.js';
import { createApplicationContext } from '../src/core/applicationLayer/common/contracts/ApplicationContext.js';

const persistenceProvider = new ModuleCapabilityPersistenceAdapter();
const appService = new ModuleAdministrationApplicationService({ persistenceProvider });

async function testAssign() {
  const moduleId = "9c583316-1c69-4ce4-83b9-63689549e1d2";
  const appContext = createApplicationContext({
    actorId: 'test-user',
    source: 'test-script',
    actorRole: 'admin',
  });

  const assignments = [
    {
      assignmentId: `assign:${moduleId}:forms`,
      moduleId,
      packageId: 'pkg:standard:forms',
      state: 'active',
      owner: 'system',
      version: 'v1',
      orderIndex: 0,
    },
    {
      assignmentId: `assign:${moduleId}:records`,
      moduleId,
      packageId: 'pkg:standard:records',
      state: 'active',
      owner: 'system',
      version: 'v1',
      orderIndex: 1,
    },
  ];

  console.log('Executing ASSIGN_CAPABILITIES via appService...');
  try {
    const result = await appService.execute(
      createApplicationRequest({
        operation: 'ASSIGN_CAPABILITIES',
        target: moduleId,
        payload: { assignments },
        actor: { id: 'test-user', role: 'admin' },
      }),
      appContext
    );
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('THROWN ERROR:', err);
    console.error('Cause:', err.cause);
    console.error('Metadata:', err.metadata);
  }
}

testAssign();
