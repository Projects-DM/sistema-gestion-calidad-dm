/**
 * NavigationStateBoundary
 *
 * Sprint 190 — Dynamic Module One-Shot Navigation Consumption.
 *
 * The integrity guard for a single module mount. It enforces the
 * boundary guarantees of one-shot navigation consumption:
 *
 *   - never consume twice            (consume() returns null after first use)
 *   - never re-inject Router state   (no push, no state writes from here)
 *   - never produce loops            (consume + cleanup happen strictly once)
 *
 * It is a pure orchestration shell — it does not read the Router and does
 * not navigate; it coordinates a NavigationStateConsumer and a
 * NavigationStateLifecycle so the caller only interacts through one handle.
 */

import { createNavigationStateConsumer } from './NavigationStateConsumer.js';
import { createNavigationLifecycle } from './NavigationStateLifecycle.js';

export function createNavigationBoundary() {
  const consumer = createNavigationStateConsumer();
  const lifecycle = createNavigationLifecycle();

  return Object.freeze({
    /** Extract the navigation state from location.state ONCE (or null). */
    consume: (locationState) => consumer.consume(locationState),

    /** Whether this mount already consumed the navigation state. */
    consumed: () => consumer.consumed(),

    /** The snapshot extracted during the single consumption. */
    snapshot: () => consumer.snapshot(),

    /** Whether a given location.state carries any consumable navigation. */
    ready: (locationState) => consumer.ready(locationState),

    /**
     * Issue the single non-historical replace() that strips the state.
     * Returns { cleared, replaced, reasons } — never runs twice.
     */
    clear: ({ navigate, currentPath } = {}) => lifecycle.clear({ navigate, currentPath }),

    /**
     * Run the FULL one-shot pass: if there is consumable navigation,
     * consume it and immediately clear it. Returns the consumed snapshot
     * (or null) so the Shell can apply the tab/context.
     */
    consumeOnce({ navigate, currentPath, locationState } = {}) {
      if (consumer.consumed()) return { consumed: true, state: consumer.snapshot() };
      const state = consumer.consume(locationState);
      if (state && navigate) {
        lifecycle.clear({ navigate, currentPath });
      }
      return { consumed: !!state, state };
    },

    /** Reset for a fresh module mount (tests). */
    reset: () => {
      consumer.reset();
      lifecycle.reset();
    },
  });
}

export const NavigationStateBoundary = Object.freeze({
  create: createNavigationBoundary,
});

export default NavigationStateBoundary;