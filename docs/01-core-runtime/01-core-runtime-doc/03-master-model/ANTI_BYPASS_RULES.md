# ANTI-BYPASS RULES

## RULE 1
No UI can write directly to Supabase for business events.

## RULE 2
All events MUST pass through RuntimeActivationLayer.

## RULE 3
dynamicService is NOT a runtime executor.

## RULE 4
No analytics or scoring logic is allowed in UI or service layer.

## RULE 5
Audit is mandatory for all state transitions.

## RULE 6
EventSafetyLayer is mandatory for all runtime events.

## FINAL RULE
If Runtime is bypassed → system is INVALID.