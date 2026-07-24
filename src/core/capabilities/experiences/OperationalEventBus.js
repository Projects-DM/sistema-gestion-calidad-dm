const listeners = new Map();

export const OperationalEventBus = {
  subscribe(eventType, handler) {
    if (!listeners.has(eventType)) listeners.set(eventType, []);
    listeners.get(eventType).push(handler);
    return () => {
      const arr = listeners.get(eventType);
      if (arr) {
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      }
    };
  },

  publish(eventType, payload) {
    const handlers = listeners.get(eventType);
    if (!handlers?.length) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`OperationalEventBus: error in handler for ${eventType}`, err);
      }
    }
  },

  clear() {
    listeners.clear();
  },
};
