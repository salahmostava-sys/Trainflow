// prom-channel.js - private bridge <-> content channel (ISOLATED world only).
// Replaces the old window CustomEvents ('__prom_*'), which page scripts on the
// Prometric origin could observe (pending password) and forge (stepDone).
// The EventTarget lives only in the extension's isolated world, so page scripts
// cannot reach it; every event also carries a per-load random nonce and events
// without it are ignored.
/* exported PromChannel */
var PromChannel = globalThis.PromChannel || (() => {
  const target = new EventTarget();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const handlers = new Map();
  const emit = (type, detail) => { target.dispatchEvent(new CustomEvent(type, { detail: { nonce, data: detail } })); };
  const on = (type, fn, options) => {
    const wrapped = e => { if (e?.detail?.nonce === nonce) fn({ detail: e.detail.data }); };
    if (!handlers.has(type)) handlers.set(type, new Map());
    handlers.get(type).set(fn, wrapped);
    target.addEventListener(type, wrapped, options);
    return wrapped;
  };
  const off = (type, fn) => {
    const wrapped = handlers.get(type)?.get(fn);
    if (wrapped) { target.removeEventListener(type, wrapped); handlers.get(type).delete(fn); }
  };
  return Object.freeze({ emit, on, off });
})();
