/**
 * CapabilityMaturityModel
 *
 * Sprint 166 — Declares the maturity levels of the capability model
 * and the current certified state.
 *
 * Maturity declaration only.
 */

export const CAPABILITY_MATURITY_MODEL = Object.freeze({
  levels: Object.freeze({
    LEVEL_1: 'Capability Definition',
    LEVEL_2: 'Capability Contracts',
    LEVEL_3: 'Governed Capability',
    LEVEL_4: 'Operational Capability',
    LEVEL_5: 'Enterprise Capability',
  }),
  current: Object.freeze({
    level: 'LEVEL_3',
    status: 'CERTIFIED',
    runtimeEnabled: false,
    operationalEnabled: false,
  }),
});

export default CAPABILITY_MATURITY_MODEL;
