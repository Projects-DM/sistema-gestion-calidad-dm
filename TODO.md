# TODO - SPRINT 12.2 Memory Provider Bootstrap Integration

## Step 1: Bootstrap registration
- [x] Modify `src/runtime/persistence/provider-factory/bootstrap/RuntimePersistenceBootstrap.ts`
  - Register `MemoryPersistenceProvider` using existing `root.registration.registerProvider(...)` infrastructure.
  - Preserve deterministic registration order.


## Step 2: Active provider assignment verification
- [ ] Locate where `ActivePersistenceProviderManager.setActiveProvider(...)` is called (active-provider binding path).
- [ ] Verify whether provider-factory active provider wiring is used by runtime submit flow (not by direct adapter injection).


## Step 3: Runtime isolation verification
- [x] Memory is now registered during provider-factory bootstrap (Memory → Registration → Registry).
- [ ] Resolver/Factory/ActiveProviderManager/PersistenceExecutionRouter chain validation requires locating the call site that sets the active provider.



## Step 4: Build
- [x] Run `npm run build` and confirm it passes.

## Sprint 12.3 verification notes
- [x] Router binding uses activeProviderManager.getActiveProviderContract()
- [x] Active provider assignment call site not found (setActiveProvider never invoked in current codebase)

