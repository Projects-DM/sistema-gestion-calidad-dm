# SGC EXECUTION FLOW

UI Layer
  ↓
dynamicService
  ↓
__runtime_internal_event
  ↓
RuntimeActivationLayer
  ↓
BusinessEventTranslationLayer
  ↓
PersistenceExecutionRouter
  ↓
EventSafetyLayer
  ↓
RuntimeExecutionAuditRecorder
  ↓
RuntimeExecutionAuditRegistry
  ↓
RuntimeProviderAnalyticsEngine
  ↓
RuntimeProviderAnalyticsRegistry
  ↓
ScoringEngine