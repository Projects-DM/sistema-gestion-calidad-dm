/**
 * NavigationStateConsumer
 *
 * Sprint 190 — Dynamic Module One-Shot Navigation Consumption.
 *
 * The ONLY consumer of the Router's location.state within the Core Shell.
 *
 * Consumes the navigation state EXACTLY ONCE per mount. After the first
 * consumption the state is handed to the Shell and never re-read from the
 * Router. This removes the "sticky navigation" caused by re-reading
 * location.state on every render.
 *
 * Pure decision helper — the caller (the Shell) owns the router and its
 * imperative `navigate`; this consumer only decides WHAT to consume and
 * WHETHER it was already consumed.
 */

import { extractNavigationState } from './NavigationStateContract.js';

/**
 * createNavigationStateConsumer
 *
 * Returns a one-shot consumer with explicit lifecycle:
 *   - ready(): boolean        — is there navigation to consume?
 *   - consume()               — extract the certified navigation state ONCE
 *   - consumed()              — guard: has already been consumed?
 *   - reset()                 — allow a fresh consumption (new module mount)
 *
 * Boundary guarantees are enforced by the returned handle:
 *   - never consume twice (a second consume() returns null)
 *   - never re-inject state  (nothing here writes to the Router)
 *   - never produce loops    (consume runs a single time)
 */
export function createNavigationStateConsumer() {
  let done = false;
  let snapshot = null;

  function consume(locationState) {
    if (done) return null; // never consume twice
    done = true;
    snapshot = extractNavigationState(locationState) || null;
    return snapshot;
  }

  return {
    consume,
    consumed: () => done,
    snapshot: () => snapshot,
    ready: (locationState) => !!extractNavigationState(locationState),
    reset: () => {
      done = false;
      snapshot = null;
    },
  };
}

export const NavigationStateConsumer = Object.freeze({
  create: createNavigationStateConsumer,
  extract: extractNavigationState,
});

export default NavigationStateConsumer;