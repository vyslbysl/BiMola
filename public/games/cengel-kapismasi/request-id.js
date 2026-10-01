let sequence = 0;

// This is an idempotency key, not a credential. HTTP/LAN pages may lack randomUUID.
export function createRequestId(cryptoApi = globalThis.crypto) {
  try {
    if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  } catch {}
  sequence = (sequence + 1) % Number.MAX_SAFE_INTEGER;
  return `${Date.now().toString(36)}-${sequence.toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
