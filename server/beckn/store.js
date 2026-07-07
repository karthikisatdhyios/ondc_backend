// In-memory correlation store for asynchronous Beckn callbacks.
// Beckn is request/callback: we POST search/select/... and the matching
// on_search/on_select/... arrive later on our callback routes. We key everything
// by message_id and let the caller await the collected responses.

const store = new Map(); // message_id -> { responses: [], createdAt }

const TTL_MS = 60_000;

function sweep() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(id);
  }
}

export function register(messageId) {
  if (!store.has(messageId)) {
    store.set(messageId, { responses: [], createdAt: Date.now() });
  }
  sweep();
}

// Called by the callback routes when an on_* message arrives.
export function ingest(messageId, payload) {
  if (!store.has(messageId)) register(messageId);
  store.get(messageId).responses.push(payload);
}

export function peek(messageId) {
  return store.get(messageId)?.responses ?? [];
}

// Wait for callbacks: resolve early once `min` responses have arrived (after a
// short grace so co-arriving sellers aren't dropped), otherwise at timeoutMs.
export function collect(messageId, { timeoutMs = 4000, min = 1, minWaitMs = 400 } = {}) {
  register(messageId);
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const entry = store.get(messageId);
      const responses = entry ? entry.responses : [];
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) return resolve(responses.slice());
      if (responses.length >= min && elapsed >= minWaitMs) return resolve(responses.slice());
      setTimeout(tick, 100);
    };
    tick();
  });
}
