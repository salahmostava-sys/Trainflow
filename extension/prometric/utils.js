// utils.js - Shared utilities for Prometric Extension
/* exported escapeHtml, isValidEmail, generateCredentials, pruneStoredPasswords, purgeStoredPasswords, CREDENTIAL_RETENTION */
const DEFAULT_PASSWORD_PATTERN = '{F}@{f}#$1970';

// How long plaintext passwords stay in chrome.storage.local.
const CREDENTIAL_RETENTION = Object.freeze({
  historyPasswordMs: 7 * 24 * 60 * 60 * 1000,   // history entries keep their password for 7 days
  savedCredsMs:      30 * 24 * 60 * 60 * 1000   // the "last registration" panel expires after 30 days
});

/**
 * Pure helper: strip passwords from old history entries and expire savedCreds.
 * Returns { history, savedCreds, changed } where savedCreds === null means "remove".
 * Legacy savedCreds without a timestamp are stamped now (not deleted) so they expire later.
 */
function pruneStoredPasswords({ history, savedCreds } = {}, now = Date.now(), retention = CREDENTIAL_RETENTION) {
  let changed = false;
  let nextHistory = history;
  if (Array.isArray(history)) {
    nextHistory = history.map(entry => {
      if (!entry || !entry.password) return entry;
      const at = Date.parse(entry.date || '');
      // saveToHistory always stamps a date; entries without one cannot be aged, so leave them.
      if (!Number.isFinite(at) || now - at <= retention.historyPasswordMs) return entry;
      changed = true;
      return { ...entry, password: '', passwordExpired: true };
    });
  }
  let nextSaved = savedCreds;
  if (savedCreds && typeof savedCreds === 'object') {
    const at = Number(savedCreds.savedAt);
    if (!Number.isFinite(at) || at <= 0) { nextSaved = { ...savedCreds, savedAt: now }; changed = true; }
    else if (now - at > retention.savedCredsMs) { nextSaved = null; changed = true; }
  }
  return { history: nextHistory, savedCreds: nextSaved, changed };
}

/** Pure helper for the "purge saved passwords" button: drops every stored password. */
function purgeStoredPasswords({ history } = {}) {
  const nextHistory = Array.isArray(history)
    ? history.map(entry => (entry && entry.password ? { ...entry, password: '', passwordExpired: true } : entry))
    : history;
  return { history: nextHistory, savedCreds: null, copiedCreds: null };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function isValidEmail(email) {
  // Safe email regex avoiding super-linear runtime
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
}

/**
 * Generate credentials based on the full name and a password pattern.
 * Does not depend on Chrome API (pattern must be passed in).
 */
function generateCredentials(name, passPattern = DEFAULT_PASSWORD_PATTERN) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 1) return null;

  // Clean parts to keep only alphabetical letters for the username
  const cleanedParts = parts.map(p => p.replace(/[^A-Za-z]/g, '')).filter(Boolean);
  const uPart1 = cleanedParts[0] || 'USER';
  const uPart2 = cleanedParts[1] || uPart1;
  const username = (uPart1 + uPart2).toUpperCase();

  const F = parts[0][0].toUpperCase();
  const f = F.toLowerCase();
  const L = parts[parts.length-1][0].toUpperCase();
  const l = L.toLowerCase();

  const pattern = passPattern || DEFAULT_PASSWORD_PATTERN;
  const password = pattern
    .replace(/{random}/g, () => randomPassword())
    .replace(/{F}/g, F)
    .replace(/{f}/g, f)
    .replace(/{L}/g, L)
    .replace(/{l}/g, l);

  let firstName = parts[0];
  let idx = 1;
  // Fill first name greedily, leaving exactly one last word for last name
  while (idx < parts.length - 1) {
    firstName += ' ' + parts[idx];
    idx++;
  }

  const lastName = parts.slice(idx).join(' ');

  // Zero truncation! Both names remain 100% complete.
  const needsBypass = (firstName.length > 20 || lastName.length > 20);

  return { username, password, firstName, lastName, needsBypass };
}

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = new Uint8Array(20);
  // Reject biased byte values while keeping every accepted character unpredictable.
  let password = 'Aa1!';
  while (password.length < 20) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < 256 - (256 % alphabet.length) && password.length < 20) password += alphabet[byte % alphabet.length];
    }
  }
  return password;
}

// ─── Test Exports (Node.js / Jest only) ──────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_PASSWORD_PATTERN,
    CREDENTIAL_RETENTION,
    pruneStoredPasswords,
    purgeStoredPasswords,
    escapeHtml,
    isValidEmail,
    generateCredentials
  };
}
