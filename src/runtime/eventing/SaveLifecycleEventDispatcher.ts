import type { SaveLifecycleEvent } from "../transaction/contracts/transactionContracts";

export type SaveLifecycleEventSubscriber = (events: SaveLifecycleEvent[]) => void | Promise<void>;

export interface SaveLifecycleEventDispatcher {
  dispatch(events: SaveLifecycleEvent[]): void | Promise<void>;
  subscribe(subscriber: SaveLifecycleEventSubscriber): () => void;
}

/**
 * In-memory, runtime-only event dispatcher (no persistence).
 * Designed for audit-ready correlation in the next evolution step.
 */
export class InMemorySaveLifecycleEventDispatcher implements SaveLifecycleEventDispatcher {
  private subscribers = new Set<SaveLifecycleEventSubscriber>();

  dispatch(events: SaveLifecycleEvent[]): void | Promise<void> {
    const calls = Array.from(this.subscribers).map((s) => s(events));
    // best-effort fan-out; allow async subscribers
    return Promise.all(calls).then(() => undefined);
  }

  subscribe(subscriber: SaveLifecycleEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }
}
