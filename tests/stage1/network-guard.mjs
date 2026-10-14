// Loaded before SDKs. No external TCP connection is permitted in test workers.
import net from 'node:net';
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const first = normalized[0];
  const host = typeof first === 'object' ? first.host : typeof normalized[1] === 'string' ? normalized[1] : 'localhost';
  if (typeof first === 'object' && first.path || typeof first === 'string' && first.startsWith('/')) {
    throw new Error('Isolation refused: unexpected Unix socket.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(host || 'localhost')) {
    throw new Error('Isolation refused: external network connection.');
  }
  return original.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Isolation refused: external fetch.');
  return originalFetch(input, init);
};
