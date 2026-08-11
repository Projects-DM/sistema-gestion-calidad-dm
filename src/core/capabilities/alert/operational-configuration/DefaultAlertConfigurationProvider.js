/**
 * DefaultAlertConfigurationProvider
 *
 * Sprint 197 — The SINGLE default configuration for any resource that was
 * never configured. The whole platform obtains exactly the same default,
 * regardless of form, repository, module or capability.
 *
 * Provider ONLY. Never executes, never evaluates dates or risk.
 */

export const DEFAULT_ALERT_CONFIGURATION = Object.freeze({
  enabled: true,
  periodicity: Object.freeze({
    amount: 1,
    unit: 'days',
  }),
  expiration: 'none',
  risk: Object.freeze({
    model: 'relative',
    thresholds: Object.freeze({
      yellow: 0.5,
      red: 0.25,
    }),
  }),
  priority: 'medium',
  notification: null,
  gracePeriod: null,
  automaticClose: true,
  repeatPolicy: 'repeat',
});

export function provideDefaultAlertConfiguration() {
  return DEFAULT_ALERT_CONFIGURATION;
}

export default provideDefaultAlertConfiguration;
