// popup.js - Handles the extension popup UI and Google Sheet parsing

// -- Init ---
const { version } = chrome.runtime.getManifest();
const versionBadge = document.getElementById('versionBadge');
if (versionBadge) versionBadge.textContent = 'v' + version;

const DEFAULT_SETTINGS = {
  pageDelay: 1,
  userDelay: 2,
  autoSubmit: true,
  autoRetry: true,
  stabilityMode: false,
  backgroundMode: true,
  desktopNotifications: true,
  defAddress: 'Al-Alameya',
  defCity: 'JEDDAH',
  defState: 'JEDDAH',
  defPostal: '00000',
  defCountry: 'Saudi Arabia',
  defAnswer: 'a',
  passPattern: '{F}@{f}#$1970',
  sheetUrl: ''
};

// ═══ Pop-out Dedicated Window ═══
const isStandalone = window.location.search.includes('mode=standalone');
const popoutBtn = document.getElementById('popoutBtn');
if (isStandalone) {
  if (popoutBtn) popoutBtn.style.display = 'none';
  document.body.style.width = '100%';
  document.body.style.minHeight = '100vh';
} else {
  popoutBtn?.addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?mode=standalone'),
      type: 'popup',
      width: 580,
      height: 750
    });
    window.close();
  });
}

// ═══ Status Pill ═══
function updateStatusPill(state) {
  const pill = document.getElementById('statusPill');
  const text = document.getElementById('statusPillText');
  if (!pill || !text) return;
  const map = {
    running: { cls: 'running', label: 'Running' },
    paused:  { cls: 'paused',  label: 'Paused'  },
    single:  { cls: 'single',  label: 'Active'  },
    idle:    { cls: 'idle',    label: 'Idle'    }
  };
  const m = map[state] || map.idle;
  pill.className = `status-pill ${m.cls}`;
  text.textContent = m.label;
}

// ═══ Live Credential Preview (Single Tab) ═══
function calcPasswordStrength(pass) {
  if (!pass || pass.length < 4) return { score: 0, label: 'Weak', color: '#ff7b72' };
  let score = 0;
  if (pass.length >= 8)  score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[a-z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  if (score <= 2) return { score: Math.round(score / 6 * 100), label: 'Weak',   color: '#ff7b72' };
  if (score <= 4) return { score: Math.round(score / 6 * 100), label: 'Medium', color: '#d29922' };
  return           { score: Math.round(score / 6 * 100), label: 'Strong', color: '#3fb950' };
}

function renderCredentialPreview(name) {
  const card    = document.getElementById('sPreviewCard');
  const userEl  = document.getElementById('sPreviewUser');
  const passEl  = document.getElementById('sPreviewPass');
  const barEl   = document.getElementById('sStrengthBar');
  const lblEl   = document.getElementById('sStrengthLabel');
  if (!card) return;

  const patternInput = document.getElementById('passPattern');
  const pattern = patternInput ? patternInput.value : '{F}@{f}#$1970';
  const creds = generateCredentials(name, pattern);

  if (!creds) { card.classList.remove('show'); return; }

  card.classList.add('show');
  if (userEl) userEl.textContent = creds.username;
  if (passEl) passEl.textContent = creds.password;

  const { score, label, color } = calcPasswordStrength(creds.password);
  if (barEl) { barEl.style.width = score + '%'; barEl.style.background = color; }
  if (lblEl) { lblEl.textContent = label; lblEl.style.color = color; }
}

// ═══ Progress Bar + Stats Cards ═══
function updateProgressAndStats(queue, isRunning = false, batchSource = 'excel') {
  const isSheet = batchSource === 'sheet';
  const wrap      = document.getElementById(isSheet ? 'sheetStatsWrap' : 'batchStatsWrap');
  const fillEl    = document.getElementById(isSheet ? 'sheetProgressBarFill' : 'progressBarFill');
  const pctEl     = document.getElementById(isSheet ? 'sheetProgressPct' : 'progressPct');
  const labelEl   = document.getElementById(isSheet ? 'sheetProgressLabel' : 'progressLabel');
  const doneEl    = document.getElementById(isSheet ? 'sheetStatDone' : 'statDone');
  const failedEl  = document.getElementById(isSheet ? 'sheetStatFailed' : 'statFailed');
  const runningEl = document.getElementById(isSheet ? 'sheetStatRunning' : 'statRunning');
  const pendingEl = document.getElementById(isSheet ? 'sheetStatPending' : 'statPending');

  const otherWrap = document.getElementById(isSheet ? 'batchStatsWrap' : 'sheetStatsWrap');
  if (otherWrap) otherWrap.style.display = 'none';

  if (!wrap || !queue || !queue.length) {
    if (wrap) wrap.style.display = 'none';
    return;
  }

  const done    = queue.filter(i => i.status === 'done').length;
  const failed  = queue.filter(i => i.status === 'failed').length;
  const running = isRunning ? 1 : 0;
  const pending = queue.filter(i => i.status === 'pending').length;
  const finished = done + failed;
  const pct = Math.round((finished / queue.length) * 100);

  wrap.style.display = 'block';
  if (fillEl)    fillEl.style.width = pct + '%';
  if (pctEl)     pctEl.textContent  = pct + '%';
  if (labelEl)   labelEl.textContent = `${finished} / ${queue.length} completed (${done} Done, ${failed} Failed)`;
  if (doneEl)    doneEl.textContent   = done;
  if (failedEl)  failedEl.textContent = failed;
  if (runningEl) runningEl.textContent = running;
  if (pendingEl) pendingEl.textContent = pending;
}

// ═══ Enhanced Queue Render ═══
function renderEnhancedQueueItem(item, i) {
  const hasCreds   = item.status === 'done' && (item.finalUsername || item.username);
  const hasFailed  = item.status === 'failed';
  const statusMap  = { pending: 'Waiting', running: 'Running', done: 'Done', failed: 'Failed' };

  const div = document.createElement('div');
  div.className = 'queue-item';
  div.id = `qi-${i}`;

  // Top row
  const top = document.createElement('div');
  top.className = 'queue-item-top';
  top.innerHTML = `
    <div class="q-dot ${item.status}" id="qd-${i}"></div>
    <div style="flex:1;min-width:0">
      <div class="q-name">${escapeHtml(item.name || '')}</div>
      <div class="q-email">${escapeHtml(hasFailed ? (item.failureReason || item.email || '') : (item.email || ''))}</div>
    </div>
    <div class="q-status ${item.status}" id="qs-${i}">${statusMap[item.status] || item.status}</div>
  `;
  div.appendChild(top);

  // Credentials row (shown when done)
  if (hasCreds) {
    const credsRow = document.createElement('div');
    credsRow.className = 'queue-item-creds visible';
    const user = item.finalUsername || item.username || '';
    const pass = item.password || '';
    credsRow.innerHTML = `
      <span class="q-cred-val user" title="${escapeHtml(user)}">${escapeHtml(user)}</span>
      <span class="q-cred-val pass" title="${escapeHtml(pass)}">${escapeHtml(pass)}</span>
      <button class="q-copy q-cred-copy" data-user="${escapeHtml(user)}" data-pass="${escapeHtml(pass)}" title="Copy credentials">
        <svg class="pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    `;
    div.appendChild(credsRow);
  }

  // Per-item retry (shown when failed)
  if (hasFailed) {
    const retryWrap = document.createElement('div');
    retryWrap.style.cssText = 'margin-top:5px;text-align:right';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'q-retry-btn';
    retryBtn.dataset.index = i;
    retryBtn.textContent = '↺ Retry';
    retryWrap.appendChild(retryBtn);
    div.appendChild(retryWrap);
  }

  return div;
}

// -- Theme Toggle ---
async function applyTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    document.getElementById('themeToggle').textContent = 'Dark';
  } else {
    document.body.classList.remove('light-mode');
    document.getElementById('themeToggle').textContent = 'Light';
  }
}

document.getElementById('themeToggle')?.addEventListener('click', async () => {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  await chrome.storage.local.set({ lightMode: isLight });
});

chrome.storage.local.get(['lightMode'], ({ lightMode }) => {
  if (lightMode !== undefined) applyTheme(lightMode);
});

// -- Speed Toggle ---
async function applySpeedMode(isTurbo) {
  const btn = document.getElementById('speedToggle');
  if (!btn) return;
  if (isTurbo) {
    btn.textContent = 'Turbo';
    btn.style.color = 'var(--yellow)';
    btn.style.borderColor = 'var(--yellow)';
    const pD = document.getElementById('pageDelay');
    const uD = document.getElementById('userDelay');
    if (pD) pD.value = 0.2;
    if (uD) uD.value = 0.5;
  } else {
    btn.textContent = 'Safe';
    btn.style.color = 'var(--green)';
    btn.style.borderColor = 'var(--green)';
    const pD = document.getElementById('pageDelay');
    const uD = document.getElementById('userDelay');
    if (pD) pD.value = 2.5;
    if (uD) uD.value = 6;
  }
}

document.getElementById('speedToggle')?.addEventListener('click', async () => {
  const { speedMode } = await chrome.storage.local.get(['speedMode']);
  const newTurbo = speedMode === 'safe'; // if it was safe, make it turbo (default is turbo)

  applySpeedMode(newTurbo);
  await chrome.storage.local.set({
    speedMode: newTurbo ? 'turbo' : 'safe',
    pageDelay: newTurbo ? 0.2 : 2.5,
    userDelay: newTurbo ? 0.5 : 6
  });
});

chrome.storage.local.get(['speedMode'], ({ speedMode }) => {
  applySpeedMode(speedMode !== 'safe'); // default to turbo
});

// -- Copy helper: works even when popup is closing ---
function fallbackCopyPopup(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch(e) { console.warn(e); }
  ta.remove();
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

// -- Utilities ---

function showMessage(el, type, text) {
  if (!el) return;
  el.className = `msg ${type}`;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
}

function validateBatchItems(items) {
  const seenNames = new Set();
  const seenEmails = new Set();
  const seenExact = new Set();
  const stats = {
    total: items.length,
    valid: 0,
    missingEmail: 0,
    invalidEmail: 0,
    duplicateNames: 0,
    duplicateEmails: 0,
    exactDuplicates: 0,
    longNames: 0
  };

  items.forEach(item => {
    const name = String(item.name || '').trim();
    const email = String(item.email || '').trim();
    const nameKey = name.toLowerCase();
    const emailKey = email.toLowerCase();
    const exactKey = `${nameKey}|${emailKey}`;
    let ok = !!name;

    if (!email) {
      stats.missingEmail++;
      ok = false;
    } else if (!isValidEmail(email)) {
      stats.invalidEmail++;
      ok = false;
    }

    if (name.length > 40) stats.longNames++;
    if (nameKey && seenNames.has(nameKey)) stats.duplicateNames++;
    if (emailKey && seenEmails.has(emailKey)) stats.duplicateEmails++;
    if (nameKey && emailKey && seenExact.has(exactKey)) stats.exactDuplicates++;
    if (nameKey) seenNames.add(nameKey);
    if (emailKey) seenEmails.add(emailKey);
    if (nameKey && emailKey) seenExact.add(exactKey);
    if (ok) stats.valid++;
  });

  stats.hasBlockingIssues = stats.total === 0 || stats.missingEmail > 0 || stats.invalidEmail > 0;
  return stats;
}

function renderValidationRow(label, value, cls) {
  const div = document.createElement('div');
  div.className = `validation-row ${cls || ''}`.trim();
  const span = document.createElement('span');
  span.textContent = String(label);
  const strong = document.createElement('strong');
  strong.textContent = String(value);
  div.appendChild(span);
  div.appendChild(strong);
  return div;
}

function renderValidation(panel, body, statusEl, stats) {
  if (!panel || !body || !statusEl) return;
  panel.classList.add('show');
  statusEl.textContent = stats.hasBlockingIssues ? 'Needs review' : 'Ready';
  body.textContent = '';
  const rows = [
    ['Total rows', stats.total],
    ['Valid rows', stats.valid],
    ['Missing email', stats.missingEmail, stats.missingEmail ? 'errline' : ''],
    ['Invalid email', stats.invalidEmail, stats.invalidEmail ? 'errline' : ''],
    ['Duplicate names', stats.duplicateNames, stats.duplicateNames ? 'warn' : ''],
    ['Duplicate emails', stats.duplicateEmails, stats.duplicateEmails ? 'warn' : ''],
    ['Exact duplicates removed', stats.exactDuplicates, stats.exactDuplicates ? 'warn' : ''],
    ['Long names', stats.longNames, stats.longNames ? 'warn' : '']
  ];
  for (const [label, value, cls] of rows) {
    body.appendChild(renderValidationRow(label, value, cls));
  }
}

/** Wait before retrying a message to a sleeping service worker (MV3). */
const SW_WAKE_RETRY_MS = 300;

// -- sendMsg: retry once if service worker was sleeping (MV3) ---
// Returns { success: false, error } if both attempts fail, so callers can react.
async function sendMsg(payload) {
  try {
    return await chrome.runtime.sendMessage(payload);
  } catch (e) {
    if (e?.message?.includes('Receiving end does not exist')) {
      // Service worker was asleep — wait briefly and retry once
      await new Promise(r => setTimeout(r, SW_WAKE_RETRY_MS));
      try {
        return await chrome.runtime.sendMessage(payload);
      } catch (retryErr) {
        console.warn('[sendMsg] Both attempts failed:', retryErr);
        return { success: false, error: retryErr?.message || 'Unknown error' };
      }
    }
    console.warn('[sendMsg] Unexpected error:', e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
}

async function confirmReplaceRunning(feedback) {
  const { isRunning, singleRunning, queue = [] } = await chrome.storage.local.get(['isRunning', 'singleRunning', 'queue']);
  if (!isRunning && !singleRunning) return true;
  const isBatch = isRunning && queue.length > 1;
  const msg = isBatch
    ? `A batch is already running with ${queue.length} queued item(s). Stop it and start a new one?`
    : 'A single registration is already running. Stop it and start a new one?';
  if (!confirm(msg)) return false;
  return sendCommand({ action: 'clearSession' }, feedback);
}

async function sendCommand(payload, feedback) {
  const response = await sendMsg(payload);
  if (response?.ok === true) return true;
  const message = response?.error === 'IBTA_JOB_PENDING'
    ? 'Save or review the pending TrainFlow results before starting another registration.'
    : 'Operation failed: ' + (response?.error || 'Extension did not respond.');
  showMessage(feedback, 'err', message);
  return false;
}

function wipeSinglePane() {
  const sNameEl = document.getElementById('sName');
  const sEmailEl = document.getElementById('sEmail');
  const sStartEl = document.getElementById('sStart');
  const sMsgEl = document.getElementById('sMsg');
  const card = document.getElementById('sPreviewCard');
  const userEl = document.getElementById('sPreviewUser');
  const passEl = document.getElementById('sPreviewPass');
  const barEl = document.getElementById('sStrengthBar');
  const lblEl = document.getElementById('sStrengthLabel');
  const pnl = document.getElementById('savedCredsPanel');
  const scNameEl = document.getElementById('scName');
  const scUserEl = document.getElementById('scUser');
  const scPassEl = document.getElementById('scPass');

  if (sNameEl) sNameEl.value = '';
  if (sEmailEl) sEmailEl.value = '';
  const sEmailHintEl = document.getElementById('sEmailHint');
  if (sEmailHintEl) { sEmailHintEl.textContent = ''; sEmailHintEl.style.display = 'none'; }
  if (card) card.classList.remove('show');
  if (userEl) userEl.textContent = '—';
  if (passEl) passEl.textContent = '—';
  if (barEl) barEl.style.width = '0%';
  if (lblEl) lblEl.textContent = '—';
  if (sStartEl) { sStartEl.disabled = true; sStartEl.style.display = 'block'; }
  if (sMsgEl) { sMsgEl.textContent = ''; sMsgEl.style.display = 'none'; }
  if (pnl) pnl.style.display = 'none';
  if (scNameEl) scNameEl.textContent = '-';
  if (scUserEl) scUserEl.textContent = '-';
  if (scPassEl) scPassEl.textContent = '-';
}

function wipeExcelPane() {
  batchItems = [];
  const fi = document.getElementById('fileInput');
  const ql = document.getElementById('queueList');
  const qc = document.getElementById('qCount');
  const qw = document.getElementById('queueWrap');
  const bv = document.getElementById('batchValidation');
  const bvb = document.getElementById('batchValidationBody');
  const bvs = document.getElementById('batchValidationStatus');
  const bsw = document.getElementById('batchStatsWrap');
  const blp = document.getElementById('batchLogPanel');
  const fillEl = document.getElementById('progressBarFill');
  const pctEl = document.getElementById('progressPct');
  const labelEl = document.getElementById('progressLabel');
  const doneEl = document.getElementById('statDone');
  const failedEl = document.getElementById('statFailed');
  const runningEl = document.getElementById('statRunning');
  const pendingEl = document.getElementById('statPending');
  const bs = document.getElementById('bStart');
  const rf = document.getElementById('retryFailed');
  const cs = document.getElementById('clearSession');
  const bm = document.getElementById('bMsg');

  if (fi) fi.value = '';
  if (ql) ql.textContent = '';
  if (qc) qc.textContent = '0 people';
  if (qw) qw.style.display = 'none';
  if (bv) bv.classList.remove('show');
  if (bvb) bvb.textContent = '';
  if (bvs) bvs.textContent = 'Ready';
  if (bsw) bsw.style.display = 'none';
  if (blp) { blp.classList.remove('show'); blp.style.display = 'none'; }
  if (fillEl) fillEl.style.width = '0%';
  if (pctEl) pctEl.textContent = '0%';
  if (labelEl) labelEl.textContent = 'Progress';
  if (doneEl) doneEl.textContent = '0';
  if (failedEl) failedEl.textContent = '0';
  if (runningEl) runningEl.textContent = '0';
  if (pendingEl) pendingEl.textContent = '0';
  if (bs) { bs.disabled = true; bs.style.display = 'block'; }
  if (rf) rf.style.display = 'none';
  if (cs) cs.style.display = 'none';
  if (bm) { bm.textContent = ''; bm.style.display = 'none'; }
}

function wipeSheetPane() {
  if (typeof sheetData !== 'undefined') sheetData = [];
  if (typeof excludedSheetRows !== 'undefined' && excludedSheetRows.clear) excludedSheetRows.clear();
  if (typeof uncheckedSheetRows !== 'undefined' && uncheckedSheetRows.clear) uncheckedSheetRows.clear();
  const cols = document.getElementById('sheetCols');
  const previewWrap = document.getElementById('sheetPreviewWrap');
  const previewList = document.getElementById('sheetPreviewList');
  const previewCount = document.getElementById('sheetPreviewCount');
  const sheetStartBtn = document.getElementById('sheetStart');
  const sheetRetryBtn = document.getElementById('sheetRetryFailed');
  const sheetClearBtn = document.getElementById('sheetClearSession');
  const sheetStatsWrap = document.getElementById('sheetStatsWrap');
  const sheetLogPanel = document.getElementById('sheetLogPanel');
  const sheetMsgEl = document.getElementById('sheetMsg');
  const sheetNameCol = document.getElementById('sheetNameCol');
  const sheetEmailCol = document.getElementById('sheetEmailCol');
  const sheetDayCol = document.getElementById('sheetDayCol');
  const sheetCertCol = document.getElementById('sheetCertCol');
  const sheetDayFilter = document.getElementById('sheetDayFilter');
  const sheetDayBadges = document.getElementById('sheetDayBadges');
  const sheetCertFilter = document.getElementById('sheetCertFilter');
  const dayMultiMenu = document.getElementById('dayMultiMenu');
  const dayMultiWrap = document.getElementById('dayMultiSelectWrap');
  const dayMultiOptionsList = document.getElementById('dayMultiOptionsList');
  const dayMultiTriggerText = document.getElementById('dayMultiTriggerText');
  const certMultiMenu = document.getElementById('certMultiMenu');
  const certMultiWrap = document.getElementById('certMultiSelectWrap');
  const certMultiOptionsList = document.getElementById('certMultiOptionsList');
  const certMultiTriggerText = document.getElementById('certMultiTriggerText');

  if (cols) cols.style.display = 'none';
  if (previewWrap) previewWrap.style.display = 'none';
  if (previewList) previewList.textContent = '';
  if (previewCount) previewCount.textContent = '0 people';
  if (sheetStartBtn) { sheetStartBtn.disabled = true; sheetStartBtn.style.display = 'block'; }
  if (sheetRetryBtn) sheetRetryBtn.style.display = 'none';
  if (sheetClearBtn) sheetClearBtn.style.display = 'none';
  if (sheetStatsWrap) sheetStatsWrap.style.display = 'none';
  if (sheetLogPanel) { sheetLogPanel.classList.remove('show'); sheetLogPanel.style.display = 'none'; }
  if (sheetMsgEl) { sheetMsgEl.textContent = ''; sheetMsgEl.style.display = 'none'; }
  if (sheetNameCol) sheetNameCol.innerHTML = '';
  if (sheetEmailCol) sheetEmailCol.innerHTML = '';
  if (sheetDayCol) sheetDayCol.innerHTML = '<option value="-1">- None -</option>';
  if (sheetCertCol) sheetCertCol.innerHTML = '<option value="-1">- None -</option>';
  if (sheetDayFilter) sheetDayFilter.style.display = 'none';
  if (sheetDayBadges) sheetDayBadges.innerHTML = '';
  if (dayMultiMenu) dayMultiMenu.style.display = 'none';
  if (dayMultiWrap) dayMultiWrap.classList.remove('open');
  if (dayMultiOptionsList) dayMultiOptionsList.innerHTML = '';
  if (dayMultiTriggerText) dayMultiTriggerText.textContent = '-- جميع الأيام (All Days) --';
  const daySelectAllBtn = document.getElementById('daySelectAllBtn');
  if (daySelectAllBtn) daySelectAllBtn.textContent = 'تحديد الكل (Select All)';
  if (sheetCertFilter) sheetCertFilter.style.display = 'none';
  if (certMultiMenu) certMultiMenu.style.display = 'none';
  if (certMultiWrap) certMultiWrap.classList.remove('open');
  if (certMultiOptionsList) certMultiOptionsList.innerHTML = '';
  if (certMultiTriggerText) certMultiTriggerText.textContent = '-- جميع الشهادات (All Certificates) --';
  const certSelectAllBtn = document.getElementById('certSelectAllBtn');
  if (certSelectAllBtn) certSelectAllBtn.textContent = 'تحديد الكل (Select All)';
}

async function clearCurrentSession() {
  if (!confirm('Clear the current session only? History and settings will be kept.')) return;
  if (!await sendCommand({ action: 'clearSession' }, document.getElementById('bMsg'))) return;
  wipeSinglePane();
  wipeExcelPane();
  wipeSheetPane();
  if (typeof renderLogs === 'function') renderLogs([]);
  setBatchControlsState('idle');
  showMessage(document.getElementById('bMsg'), 'ok', 'Session cleared successfully.');
}

// Reads the password pattern from the current DOM input so callers don't
// need to pass it explicitly. Use generateCredentials() directly when the
// pattern is already known (e.g. in background.js).
function generateCredsFromCurrentPattern(name) {
  const patternInput = document.getElementById('passPattern');
  const pattern = patternInput ? patternInput.value : '{F}@{f}#$1970';
  return generateCredentials(name, pattern);
}

// -- Tabs ---
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('pane-' + tab.dataset.tab).classList.add('active');
  });
});

// -- Settings ---
const SETTINGS_KEYS = ['pageDelay', 'userDelay', 'autoSubmit', 'defAddress', 'defCity', 'defState', 'defPostal', 'defCountry', 'defAnswer', 'passPattern', 'sheetUrl', 'desktopNotifications', 'autoRetry', 'stabilityMode', 'backgroundMode'];

async function loadSettings() {
  const settings = await chrome.storage.local.get(SETTINGS_KEYS);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    const value = val ?? DEFAULT_SETTINGS[id] ?? '';
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value;
  };

  setVal('pageDelay', settings.pageDelay);
  setVal('userDelay', settings.userDelay);
  setVal('autoSubmit', settings.autoSubmit);
  setVal('autoRetry', settings.autoRetry);
  setVal('stabilityMode', settings.stabilityMode);
  setVal('backgroundMode', settings.backgroundMode);
  setVal('desktopNotifications', settings.desktopNotifications);
  setVal('defAddress', settings.defAddress);
  setVal('defCity', settings.defCity);
  setVal('defState', settings.defState);
  setVal('defPostal', settings.defPostal);
  setVal('defCountry', settings.defCountry);
  setVal('defAnswer', settings.defAnswer);
  setVal('passPattern', settings.passPattern);
  setVal('sheetUrl', settings.sheetUrl);
}

// -- Settings Actions ---
document.getElementById('saveSettings')?.addEventListener('click', async () => {
  const btn = document.getElementById('saveSettings');
  const data = {};
  SETTINGS_KEYS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    data[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  await chrome.storage.local.set(data);
  updateSinglePreview();

  const oldText = btn.textContent;
  btn.textContent = 'OK Saved!';
  btn.style.background = 'var(--green2)';
  setTimeout(() => { btn.textContent = oldText; btn.style.background = ''; }, 2000);
});

document.getElementById('cancelSettings')?.addEventListener('click', () => {
  loadSettings();
  // Switch back to single tab
  const singleTab = document.querySelector('.tab[data-tab="single"]');
  if (singleTab) singleTab.click();
});

document.getElementById('resetSettings')?.addEventListener('click', async () => {
  if (!confirm('Reset all settings to defaults?')) return;
  await chrome.storage.local.set(DEFAULT_SETTINGS);
  await loadSettings();
  updateSinglePreview();
  alert('Settings reset to defaults.');
});

// -- Settings Backup & Restore ---
document.getElementById('exportSettingsBtn')?.addEventListener('click', async () => {
  const backupMsgEl = document.getElementById('settingsBackupMsg');
  showMessage(backupMsgEl, '', '');
  try {
    const settings = await chrome.storage.local.get(SETTINGS_KEYS);
    const fullSettings = {};
    SETTINGS_KEYS.forEach(key => {
      fullSettings[key] = settings[key] !== undefined ? settings[key] : DEFAULT_SETTINGS[key];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `prometric_settings_backup_${dateStr}.json`;
    const jsonContent = JSON.stringify(fullSettings, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);

    showMessage(backupMsgEl, 'ok', 'Settings exported successfully!');
    setTimeout(() => showMessage(backupMsgEl, '', ''), 3000);
  } catch (err) {
    console.error(err);
    showMessage(backupMsgEl, 'err', 'Failed to export settings.');
  }
});

document.getElementById('importSettingsBtn')?.addEventListener('click', () => {
  document.getElementById('importSettingsFile')?.click();
});

document.getElementById('importSettingsFile')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const backupMsgEl = document.getElementById('settingsBackupMsg');
  showMessage(backupMsgEl, '', '');

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON format.');
      }

      const importedKeys = Object.keys(parsed);
      const validKeys = importedKeys.filter(k => SETTINGS_KEYS.includes(k));

      if (validKeys.length === 0) {
        throw new Error('No valid settings keys found in JSON.');
      }

      const dataToSave = {};
      SETTINGS_KEYS.forEach(key => {
        if (parsed[key] !== undefined) {
          const defaultType = typeof DEFAULT_SETTINGS[key];
          let val = parsed[key];

          if (defaultType === 'number') {
            val = Number(val);
            if (Number.isNaN(val)) return;
          } else if (defaultType === 'boolean') {
            val = Boolean(val);
          } else if (defaultType === 'string') {
            val = String(val);
          }
          dataToSave[key] = val;
        }
      });

      if (Object.keys(dataToSave).length === 0) {
        throw new Error('Settings keys contain invalid values.');
      }

      await chrome.storage.local.set(dataToSave);
      await loadSettings();
      if (typeof updateSinglePreview === 'function') {
        updateSinglePreview();
      }

      showMessage(backupMsgEl, 'ok', 'Settings imported successfully!');
      setTimeout(() => showMessage(backupMsgEl, '', ''), 3000);
    } catch (err) {
      console.error(err);
      showMessage(backupMsgEl, 'err', 'Import failed: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  reader.onerror = () => {
    showMessage(backupMsgEl, 'err', 'Failed to read file.');
    e.target.value = '';
  };

  reader.readAsText(file);
});

document.getElementById('clearAllData')?.addEventListener('click', async () => {
  if (!confirm('Warning Are you sure? This will delete History and Active Queues, but KEEP your Settings.')) return;
  if (!await sendCommand({ action: 'clearSession' }, backupMsgEl)) return;
  await chrome.storage.local.remove('history');
  location.reload();
});

// -- SINGLE MODE ---
const sName        = document.getElementById('sName');
const sEmail       = document.getElementById('sEmail');
const sStart       = document.getElementById('sStart');
const sMsg         = document.getElementById('sMsg');

const scNamePanel = document.getElementById('scName');
const scUserPanel = document.getElementById('scUser');
const scPassPanel = document.getElementById('scPass');
const savedCredsPanel = document.getElementById('savedCredsPanel');

function updateSinglePreview() {
  const nameEl = document.getElementById('sName') || sName;
  const emailEl = document.getElementById('sEmail') || sEmail;
  const startEl = document.getElementById('sStart') || sStart;
  const credsPanel = document.getElementById('savedCredsPanel') || savedCredsPanel;
  const patternInput = document.getElementById('passPattern');
  const pattern = patternInput ? patternInput.value : '{F}@{f}#$1970';
  const nameVal = nameEl ? nameEl.value.trim() : '';
  const emailVal = emailEl ? emailEl.value.trim() : '';
  const c = generateCredentials(nameVal, pattern);
  const emailOk = typeof isValidEmail === 'function' ? isValidEmail(emailVal) : emailVal.length > 0;

  if (startEl) startEl.disabled = !(c && emailOk);

  const emailHint = document.getElementById('sEmailHint');
  if (emailHint) {
    if (emailVal.length > 0 && !emailOk) {
      emailHint.textContent = 'Please enter a valid email address (e.g. name@domain.com)';
      emailHint.className = 'field-hint err';
      emailHint.style.display = 'block';
    } else {
      emailHint.textContent = '';
      emailHint.style.display = 'none';
    }
  }

  if (nameVal) renderCredentialPreview(nameVal);
  if (nameVal.length > 0 && credsPanel) {
    credsPanel.style.display = 'none';
  }
}
sName.addEventListener('input', updateSinglePreview);
sEmail.addEventListener('input', updateSinglePreview);

sStart.addEventListener('click', async () => {
  const patternInput = document.getElementById('passPattern');
  const pattern = patternInput ? patternInput.value : '{F}@{f}#$1970';
  const c = generateCredentials(sName.value, pattern);
  if (!c) return;
  if (!(await confirmReplaceRunning(sMsg))) return;
  if (savedCredsPanel) savedCredsPanel.style.display = 'none';
  await chrome.storage.local.remove(['savedCreds']);
  // Do NOT pre-save savedCreds here — the panel should only appear once
  // registration fully completes. background.js saves the real finalUsername
  // via stepDone, which is the only moment we want the panel to show.
  const { defAddress, defCity, defState, defPostal, defCountry } = await chrome.storage.local.get(['defAddress', 'defCity', 'defState', 'defPostal', 'defCountry']);

  if (!await sendCommand({
    action: 'startSingle',
    source: 'single',
    item: {
      name: sName.value.trim(),
      email: sEmail.value.trim(),
      mailingAddress: defAddress || 'Al-Alameya',
      city: defCity || 'JEDDAH',
      state: defState || 'JEDDAH',
      postalCode: defPostal || '00000',
      country: defCountry || 'Saudi Arabia'
    }
  }, sMsg)) return;

  sMsg.className = 'msg ok';
  sMsg.textContent = 'OK Opened! Filling in progress...';
  sMsg.style.display = 'block';

  sStart.style.display = 'none';
});

// -- BATCH MODE - CSV/Excel parser ---
let batchItems = [];

// File parsing logic has been moved to parsers.js

const fileInput     = document.getElementById('fileInput');
const uploadArea    = document.getElementById('uploadArea');
const queueWrap     = document.getElementById('queueWrap');
const queueList     = document.getElementById('queueList');
const qCount        = document.getElementById('qCount');
const exportQueueBtn = document.getElementById('exportQueue');
const bStart         = document.getElementById('bStart');
const pauseBatchBtn  = document.getElementById('globalPauseBatch');
const resumeBatchBtn = document.getElementById('globalResumeBatch');
const cancelBatchBtn = document.getElementById('globalStopBatch');
const bMsg          = document.getElementById('bMsg');
const batchBanner   = document.getElementById('globalBatchBanner');
const batchSpinner  = document.getElementById('globalBatchSpinner');
const batchProgress = document.getElementById('globalBatchProgress');
const retryFailedBtn = document.getElementById('retryFailed');
const clearSessionBtn = document.getElementById('clearSession');
const batchValidation = document.getElementById('batchValidation');
const batchValidationBody = document.getElementById('batchValidationBody');
const batchValidationStatus = document.getElementById('batchValidationStatus');
const batchLogPanel = document.getElementById('batchLogPanel');
const batchLogs = document.getElementById('batchLogs');

function setBatchControlsState(state) {
  if (bStart) bStart.style.display = state === 'idle' ? 'block' : 'none';
  if (pauseBatchBtn) pauseBatchBtn.style.display = state === 'running' ? 'block' : 'none';
  if (resumeBatchBtn) resumeBatchBtn.style.display = state === 'paused' ? 'block' : 'none';
  if (cancelBatchBtn) cancelBatchBtn.style.display = (state === 'running' || state === 'paused') ? 'block' : 'none';
  if (batchSpinner) batchSpinner.style.display = state === 'running' ? 'block' : 'none';
  if (batchBanner && state === 'idle') batchBanner.classList.remove('show');
}

uploadArea.addEventListener('dragover',  e => { e.preventDefault(); uploadArea.classList.add('drag'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop',      e => { e.preventDefault(); uploadArea.classList.remove('drag'); handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change',     () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

// ── Paste Names Modal ─────────────────────────────────────────────────────────
const pasteModal       = document.getElementById('pasteModal');
const pasteNamesArea   = document.getElementById('pasteNamesArea');
const pasteEmailDomain = document.getElementById('pasteEmailDomain');
const pasteNamesCount  = document.getElementById('pasteNamesCount');
const pastePreviewBox  = document.getElementById('pastePreviewBox');
const pastePreviewItems= document.getElementById('pastePreviewItems');
const pasteLoadBtn     = document.getElementById('pasteLoadBtn');

// Restore last used domain
pasteEmailDomain.value = localStorage.getItem('pasteEmailDomain') || '';

function openPasteModal() {
  pasteModal.style.display = 'flex';
  pasteNamesArea.value = '';
  pasteNamesCount.textContent = '';
  pastePreviewBox.style.display = 'none';
  pasteLoadBtn.disabled = true;
  setTimeout(() => pasteNamesArea.focus(), 50);
}
function closePasteModal() { pasteModal.style.display = 'none'; }

document.getElementById('pasteNamesBtn')?.addEventListener('click', openPasteModal);
document.getElementById('pasteModalClose')?.addEventListener('click', closePasteModal);
document.getElementById('pasteCancelBtn')?.addEventListener('click', closePasteModal);
pasteModal?.addEventListener('click', e => { if (e.target === pasteModal) closePasteModal(); });

// Generate email from name + domain: "Ahmed Ali Hassan" → "Ahmed.Ali.Hassan@domain"
function nameToEmail(fullName, domain) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('.') + '@' + domain.trim().toLowerCase();
}

// Parse textarea and update preview + count in real time
function updatePastePreview() {
  const domain = pasteEmailDomain.value.trim();
  const lines  = pasteNamesArea.value.split('\n').map(l => l.trim()).filter(Boolean);
  const valid  = lines.filter(l => l.length > 1);

  pasteNamesCount.textContent = valid.length ? `(${valid.length})` : '';
  pasteLoadBtn.disabled = valid.length === 0;

  if (!valid.length) { pastePreviewBox.style.display = 'none'; return; }

  pastePreviewBox.style.display = 'block';
  const preview = valid.slice(0, 3);
  pastePreviewItems.innerHTML = preview.map(name => {
    const email = domain ? nameToEmail(name, domain) : '<span style="color:var(--yellow)">⚠ no domain set</span>';
    return `<div class="paste-preview-row">
      <span class="paste-preview-name">${escapeHtml(name)}</span>
      <span class="paste-preview-email">${typeof email === 'string' && domain ? escapeHtml(email) : email}</span>
    </div>`;
  }).join('');
  if (valid.length > 3) {
    pastePreviewItems.innerHTML += `<div style="font-size:10px;color:var(--muted);margin-top:4px">+${valid.length - 3} more...</div>`;
  }
}

pasteNamesArea?.addEventListener('input',   updatePastePreview);
pasteEmailDomain?.addEventListener('input', () => {
  localStorage.setItem('pasteEmailDomain', pasteEmailDomain.value.trim());
  updatePastePreview();
});

pasteLoadBtn?.addEventListener('click', async () => {
  const domain = pasteEmailDomain.value.trim();
  const lines  = pasteNamesArea.value.split('\n').map(l => l.trim()).filter(l => l.length > 1);
  if (!lines.length) return;

  const rows = lines.map(name => [name, domain ? nameToEmail(name, domain) : '']);
  const settings = await chrome.storage.local.get(['defAddress', 'defCity', 'defState', 'defPostal', 'defCountry']);
  const newItems = processLoadedRows(rows, settings);

  batchItems = newItems;
  const stats = validateBatchItems(batchItems);
  renderValidation(batchValidation, batchValidationBody, batchValidationStatus, stats);
  renderQueue();
  queueWrap.style.display = 'block';
  updateProgressAndStats(null);
  bStart.disabled = batchItems.length === 0 || stats.hasBlockingIssues;
  if (stats.hasBlockingIssues) {
    showMessage(bMsg, 'err', 'Fix missing or invalid emails before starting the batch.');
  }
  setBatchControlsState('idle');
  closePasteModal();
  showMessage(bMsg, 'ok', `✓ Loaded ${newItems.length} name${newItems.length !== 1 ? 's' : ''} from paste.`);
});


async function parseFileToRows(file) {
  const fname = file.name.toLowerCase();
  if (fname.endsWith('.csv')) {
    return parseCSV(await file.text());
  }
  if (fname.endsWith('.xlsx')) {
    return parseXLSX(await file.arrayBuffer());
  }
  if (fname.endsWith('.xls')) {
    throw new Error('Legacy .xls format is not supported. Please save your file as .xlsx or .csv and try again.');
  }
  throw new Error('Unsupported file type. Use .csv or .xlsx');
}

function processLoadedRows(rows, settings) {
  const { defAddress, defCity, defState, defPostal, defCountry } = settings;
  return rows.map(r => ({
    name:           (r[0] || '').trim(),
    email:          (r[1] || '').trim(),
    status:         'pending',
    mailingAddress: defAddress || 'Al-Alameya',
    city:           defCity    || 'JEDDAH',
    state:          defState   || 'JEDDAH',
    postalCode:     defPostal  || '00000',
    country:        defCountry || 'Saudi Arabia'
  })).filter(i => i.name);
}

async function handleFile(file) {
  if (!file) return;
  bMsg.style.display = 'none';
  let rows = [];

  try {
    rows = await parseFileToRows(file);
  } catch (err) {
    showMessage(bMsg, 'err', err.message);
    return;
  }

  if (!rows || !rows.length) {
    showMessage(bMsg, 'err', 'Error No data found. Check your file format.');
    return;
  }

  const settings = await chrome.storage.local.get(['defAddress', 'defCity', 'defState', 'defPostal', 'defCountry']);
  batchItems = processLoadedRows(rows, settings);

  const stats = validateBatchItems(batchItems);
  renderValidation(batchValidation, batchValidationBody, batchValidationStatus, stats);
  renderQueue();
  queueWrap.style.display = 'block';
  updateProgressAndStats(null);
  bStart.disabled = batchItems.length === 0 || stats.hasBlockingIssues;
  if (stats.hasBlockingIssues) {
    showMessage(bMsg, 'err', 'Fix missing or invalid emails before starting the batch.');
  }

  setBatchControlsState('idle');
}

function renderQueue() {
  qCount.textContent = `${batchItems.length} people`;
  queueList.textContent = '';
  for (let i = 0; i < batchItems.length; i++) {
    queueList.appendChild(renderEnhancedQueueItem(batchItems[i], i));
  }
}

function statusLabel(s) {
  return { pending: 'Waiting', running: 'Running', done: 'Done', failed: 'Failed' }[s] || s;
}

function downloadRowsAsCSV(rows, filename) {
  const csvContent = rows.map(row =>
    row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

document.getElementById('clearQueue')?.addEventListener('click', async () => {
  if (!await sendCommand({ action: 'clearSession' }, document.getElementById('bMsg'))) return;
  wipeExcelPane();
  setBatchControlsState('idle');
});

exportQueueBtn?.addEventListener('click', async () => {
  const { queue = [] } = await chrome.storage.local.get(['queue']);
  const source = queue.length ? queue : batchItems;
  if (!source.length) return;

  const rows = [
    ['Name', 'Email', 'Username', 'Password', 'Status', 'Reason', 'Failure Kind', 'Retryable', 'URL', 'Step', 'Snippet'],
    ...source.map(item => {
      const creds = generateCredsFromCurrentPattern(item.name || '');
      return [
        item.name || '',
        item.email || '',
        item.finalUsername || creds?.username || '',
        creds?.password || '',
        item.status || 'pending',
        item.failureReason || '',
        item.failureKind || '',
        item.retryable ?? '',
        item.failureUrl || '',
        item.failureStep || '',
        item.pageSnippet || ''
      ];
    })
  ];
  downloadRowsAsCSV(rows, `prometric_queue_${Date.now()}.csv`);
});

// ── Duplicate Guard: warn if any batch items were already registered ──────────
async function checkHistoryDuplicates(items) {
  const { history = [] } = await chrome.storage.local.get(['history']);
  const successfulKeys = new Set(
    history
      .filter(h => h.status === 'done')
      .map(h => `${(h.name || '').trim().toLowerCase().replace(/\s+/g, ' ')}|${(h.email || '').trim().toLowerCase()}`)
  );

  const dupes = items.filter(item => {
    const name  = String(item.name  || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const email = String(item.email || '').trim().toLowerCase();
    return successfulKeys.has(`${name}|${email}`);
  });

  if (!dupes.length) return true;

  const names = dupes.slice(0, 5).map(d => d.name).join(', ');
  const extra = dupes.length > 5 ? ` and ${dupes.length - 5} more` : '';
  return confirm(
    `⚠️ Duplicate Warning\n\n${dupes.length} item(s) in this batch were already registered successfully in your history:\n\n${names}${extra}\n\nContinue anyway?`
  );
}

bStart.addEventListener('click', async () => {
  if (!(await confirmReplaceRunning(bMsg))) return;
  const stats = validateBatchItems(batchItems);
  renderValidation(batchValidation, batchValidationBody, batchValidationStatus, stats);
  if (stats.hasBlockingIssues) {
    showMessage(bMsg, 'err', 'Batch has missing or invalid emails. Fix the file first.');
    return;
  }
  // ── Duplicate guard ───────────────────────────────────────────────────────
  if (!(await checkHistoryDuplicates(batchItems))) return;

  const { defAddress, defCity, defState, defPostal, defCountry } = await chrome.storage.local.get(['defAddress', 'defCity', 'defState', 'defPostal', 'defCountry']);
  const items = batchItems.map(i => ({
    ...i,
    mailingAddress: defAddress || 'Al-Alameya',
    city:           defCity    || 'JEDDAH',
    state:          defState   || 'JEDDAH',
    postalCode:     defPostal  || '00000',
    country:        defCountry || 'Saudi Arabia'
  }));
  if (!await sendCommand({ action: 'startQueue', items, source: 'excel' }, bMsg)) return;
  batchBanner.classList.add('show');

  setBatchControlsState('running');

  showMessage(bMsg, 'ok', `Started ${batchItems.length} registrations.`);
  if (stats.exactDuplicates) {
    showMessage(bMsg, 'ok', `Started ${batchItems.length - stats.exactDuplicates} registrations. Removed ${stats.exactDuplicates} exact duplicate row(s).`);
  }
});


pauseBatchBtn?.addEventListener('click', async () => {
  // pauseQueue: only sets isRunning=false, queue is preserved for resume.
  if (!await sendCommand({ action: 'pauseQueue' }, bMsg)) return;
  setBatchControlsState('paused');
  showMessage(bMsg, 'ok', 'Batch paused. Click Resume to continue.');
});

resumeBatchBtn?.addEventListener('click', async () => {
  if (!await sendCommand({ action: 'resumeQueue' }, bMsg)) return;
  setBatchControlsState('running');
  showMessage(bMsg, 'ok', 'Resuming batch registration.');
});

cancelBatchBtn?.addEventListener('click', async () => {
  if (!await sendCommand({ action: 'clearSession' }, bMsg)) return;
  setBatchControlsState('idle');
  if (sStart) sStart.style.display = 'block';
  showMessage(bMsg, 'err', 'Execution stopped and queue cleared.');
});

retryFailedBtn?.addEventListener('click', async () => {
  if (!(await confirmReplaceRunning(bMsg))) return;
  if (!await sendCommand({ action: 'retryFailed' }, bMsg)) return;
  showMessage(bMsg, 'ok', 'Retrying failed registrations.');
});

clearSessionBtn?.addEventListener('click', clearCurrentSession);
document.getElementById('clearCurrentSessionSettings')?.addEventListener('click', clearCurrentSession);
document.getElementById('sheetClearSession')?.addEventListener('click', clearCurrentSession);

document.getElementById('sheetRetryFailed')?.addEventListener('click', async () => {
  const sheetMsg = document.getElementById('sheetMsg');
  if (!(await confirmReplaceRunning(sheetMsg))) return;
  if (!await sendCommand({ action: 'retryFailed' }, sheetMsg)) return;
  if (sheetMsg) showMessage(sheetMsg, 'ok', 'Retrying failed registrations.');
});

document.getElementById('clearLogs')?.addEventListener('click', async () => {
  await chrome.storage.local.set({ runLogs: [] });
  renderLogs([], 'excel');
});

document.getElementById('clearSheetLogs')?.addEventListener('click', async () => {
  await chrome.storage.local.set({ runLogs: [] });
  renderLogs([], 'sheet');
});

function renderLogs(logs = null, batchSource = 'excel') {
  const isSheet = batchSource === 'sheet';
  const panel = isSheet ? document.getElementById('sheetLogPanel') : batchLogPanel;
  const list = isSheet ? document.getElementById('sheetLogs') : batchLogs;
  const otherPanel = isSheet ? batchLogPanel : document.getElementById('sheetLogPanel');

  if (otherPanel) {
    otherPanel.classList.remove('show');
    otherPanel.style.display = 'none';
  }

  if (!panel || !list) return;
  if (!logs || logs.length === 0) {
    panel.classList.remove('show');
    panel.style.display = 'none';
    list.textContent = '';
    return;
  }
  panel.classList.add('show');
  panel.style.display = 'block';
  list.textContent = '';
  const items = logs.slice(0, 50);
  for (const log of items) {
    const t = log.date ? new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const itemDiv = document.createElement('div');
    itemDiv.className = 'log-item';
    const timeDiv = document.createElement('div');
    timeDiv.className = 'log-time';
    timeDiv.textContent = t;
    itemDiv.appendChild(timeDiv);
    const textDiv = document.createElement('div');
    textDiv.className = 'log-text';
    textDiv.title = log.message || '';
    textDiv.textContent = log.message || '';
    itemDiv.appendChild(textDiv);
    list.appendChild(itemDiv);
  }
}

// -- Poll status ---
function updateStatusBanner(config) {
  const { show, bg, border, title, titleColor, progText, progColor } = config;
  const titleEl = document.getElementById('globalBatchTitle');
  if (batchBanner) {
    batchBanner.style.display = show ? 'flex' : 'none';
    if (show) {
      if (bg) batchBanner.style.background = bg;
      if (border) batchBanner.style.borderColor = border;
    }
  }
  if (titleEl && title) {
    titleEl.textContent = title;
    if (titleColor) titleEl.style.color = titleColor;
  }
  if (batchProgress && progText) {
    batchProgress.textContent = progText;
    if (progColor) batchProgress.style.color = progColor;
  }
}

function updateSingleModeUI(singleRunning) {
  if (singleRunning) {
    updateStatusBanner({
      show: true, bg: 'rgba(210,153,34,.1)', border: 'rgba(210,153,34,.3)',
      title: 'Single Registration Running...', titleColor: 'var(--green)',
      progText: 'Automating Prometric registration...', progColor: 'var(--yellow)'
    });
    if (sStart) sStart.style.display = 'none';
    if (resumeBatchBtn) resumeBatchBtn.style.display = 'none';
    if (pauseBatchBtn) pauseBatchBtn.style.display = 'none';
    if (cancelBatchBtn) cancelBatchBtn.style.display = 'block';
    if (batchSpinner) batchSpinner.style.display = 'block';
  } else {
    if (sStart) sStart.style.display = 'block';
  }
}

function updateQueueItemsUI(queue, queueIndex, isRunning) {
  queue.forEach((item, i) => {
    const dot  = document.getElementById(`qd-${i}`);
    const stat = document.getElementById(`qs-${i}`);
    if (!dot || !stat) return;
    let s;
    if (item.status === 'done' || item.status === 'failed') {
      s = item.status;
    } else if (i === queueIndex && isRunning) {
      s = 'running';
    } else if (i < queueIndex) {
      s = item.status || 'done';
    } else {
      s = 'pending';
    }
    dot.className  = `q-dot ${s}`;
    stat.className = `q-status ${s}`;
    stat.textContent = statusLabel(s);
  });
}

function updateBatchModeRunningUI(queueLength, queueIndex, queue) {
  const done    = (queue || []).filter(i => i.status === 'done').length;
  const failed  = (queue || []).filter(i => i.status === 'failed').length;
  const finished = done + failed;
  const pending  = queueLength - finished;

  // ── ETA ──────────────────────────────────────────────────────────────────
  let etaStr = '';
  const batchStartTime = window.__batchStartTime;
  if (batchStartTime && finished > 0) {
    const elapsedMs     = Date.now() - batchStartTime;
    const avgMsPerUser  = elapsedMs / finished;
    const remainingMs   = avgMsPerUser * pending;
    const remainingMins = Math.ceil(remainingMs / 60000);
    if (remainingMins <= 1)         etaStr = ' · ~1 min remaining';
    else if (remainingMins < 60)    etaStr = ` · ~${remainingMins} min remaining`;
    else {
      const h = Math.floor(remainingMins / 60);
      const m = remainingMins % 60;
      etaStr = ` · ~${h}h ${m}m remaining`;
    }
  }

  updateStatusBanner({
    show: true, bg: 'rgba(210,153,34,.1)', border: 'rgba(210,153,34,.3)',
    title: 'Batch Registration Running...', titleColor: 'var(--green)',
    progText: `${Math.min(queueIndex + 1, queueLength)} / ${queueLength}${etaStr}`, progColor: 'var(--yellow)'
  });
  if (bStart) bStart.style.display = 'none';
  if (resumeBatchBtn) resumeBatchBtn.style.display = 'none';
  if (pauseBatchBtn) pauseBatchBtn.style.display = 'block';
  if (cancelBatchBtn) cancelBatchBtn.style.display = 'block';
  if (batchSpinner) batchSpinner.style.display = 'block';
  if (retryFailedBtn) retryFailedBtn.style.display = 'none';
}


function updateBatchModePausedUI(queue, queueIndex, isRunning) {
  const pendingItems = queue.slice(queueIndex).filter(it => it.status === 'pending');
  const hasPending   = pendingItems.length > 0 && queueIndex < queue.length;

  if (bStart) bStart.style.display = 'none';
  if (pauseBatchBtn) pauseBatchBtn.style.display = 'none';
  if (batchSpinner) batchSpinner.style.display = 'none';

  if (hasPending) {
    updateStatusBanner({
      show: true, bg: 'rgba(56,139,253,.08)', border: 'rgba(56,139,253,.3)',
      title: 'Batch Paused', titleColor: 'var(--yellow)',
      progText: `Queue paused - ${pendingItems.length} remaining`, progColor: 'var(--blue)'
    });
    if (resumeBatchBtn) resumeBatchBtn.style.display = 'block';
    if (cancelBatchBtn) cancelBatchBtn.style.display = 'block';
  } else {
    updateStatusBanner({ show: false });
    if (resumeBatchBtn) resumeBatchBtn.style.display = 'none';
    if (cancelBatchBtn) cancelBatchBtn.style.display = 'none';
    if (bStart) bStart.style.display = 'block';
  }
  const failedCount = queue.filter(it => it.status === 'failed').length;
  if (retryFailedBtn) retryFailedBtn.style.display = failedCount > 0 && !isRunning ? 'block' : 'none';
}

function hasQueueChanged(queue, oldQueue) {
  if (queue.length !== oldQueue.length) return true;
  return queue.some((it, i) =>
    it.status !== oldQueue[i]?.status ||
    it.finalUsername !== oldQueue[i]?.finalUsername ||
    it.failureReason !== oldQueue[i]?.failureReason
  );
}

function handleEmptyQueue(singleRunning) {
  if (retryFailedBtn) retryFailedBtn.style.display = 'none';
  if (clearSessionBtn) clearSessionBtn.style.display = 'none';
  const sheetRetryBtn = document.getElementById('sheetRetryFailed');
  const sheetClearBtn = document.getElementById('sheetClearSession');
  if (sheetRetryBtn) sheetRetryBtn.style.display = 'none';
  if (sheetClearBtn) sheetClearBtn.style.display = 'none';
  if (!singleRunning && batchBanner) batchBanner.style.display = 'none';
  if (batchItems.length === 0) {
    wipeExcelPane();
  }
}

async function pollStatus() {
  const { queue, queueIndex, isRunning, singleRunning, batchSource, runLogs = [] } = await chrome.storage.local.get(['queue', 'queueIndex', 'isRunning', 'singleRunning', 'batchSource', 'runLogs']);

  // Update header status pill
  if (isRunning)      updateStatusPill('running');
  else if (singleRunning) updateStatusPill('single');
  else                updateStatusPill('idle');

  updateSingleModeUI(singleRunning);

  if (!queue || queue.length === 0) {
    updateProgressAndStats(null, false, batchSource || 'excel');
    renderLogs(runLogs, batchSource || 'excel');
    return handleEmptyQueue(singleRunning);
  }

  const pendingCount = (queue || []).filter(i => i.status === 'pending' || !i.status).length;
  const failedCount  = (queue || []).filter(i => i.status === 'failed').length;
  const isFinished   = !isRunning && pendingCount === 0;

  // Auto-cleanup 100% finished queue from storage so UI returns to clean empty state
  if (isFinished && failedCount === 0) {
    await chrome.storage.local.remove(['queue', 'queueIndex', 'currentItem', 'currentProcessingId', 'activeQueueId', 'savedCreds', 'batchSource']);
    updateProgressAndStats(null, false, batchSource || 'excel');
    renderLogs(runLogs, batchSource || 'excel');
    return handleEmptyQueue(singleRunning);
  }

  // Isolate Single vs Sheet vs Excel
  if (singleRunning || batchSource === 'single') {
    renderLogs(runLogs, 'single');
    return;
  }

  if (batchSource === 'sheet') {
    renderLogs(runLogs, 'sheet');
    const sheetStartBtn = document.getElementById('sheetStart');
    const sheetRetryBtn = document.getElementById('sheetRetryFailed');
    const sheetClearBtn = document.getElementById('sheetClearSession');

    if (sheetClearBtn) sheetClearBtn.style.display = (isRunning || (queue.length > 0 && failedCount > 0)) ? 'block' : 'none';
    if (sheetRetryBtn) sheetRetryBtn.style.display = (failedCount > 0 && !isRunning) ? 'block' : 'none';
    if (sheetStartBtn) sheetStartBtn.disabled = isRunning;

    if (queue.length > 0 && !singleRunning && (isRunning || pendingCount > 0 || failedCount > 0)) {
      updateProgressAndStats(queue, isRunning, 'sheet');

      if (isRunning) {
        if (!window.__batchStartTime || queueIndex === 0) {
          if (!window.__batchStartTime) window.__batchStartTime = Date.now();
        }
        updateBatchModeRunningUI(queue.length, queueIndex, queue);
      } else {
        window.__batchStartTime = null;
        updateBatchModePausedUI(queue, queueIndex, isRunning);
      }
    }
    return;
  }

  renderLogs(runLogs, 'excel');

  const queueChanged = queue.length === batchItems.length && hasQueueChanged(queue, batchItems);

  if (isRunning || batchItems.length === 0 || queueChanged) {
    batchItems = queue;
    renderQueue();
    queueWrap.style.display = 'block';
    bStart.disabled = true;
  }
  if (clearSessionBtn) clearSessionBtn.style.display = (isRunning || (queue.length > 0 && failedCount > 0)) ? 'block' : 'none';

  // Update stats and progress bar for Excel
  if (queue.length > 0 && !singleRunning && (isRunning || pendingCount > 0 || failedCount > 0)) {
    updateProgressAndStats(queue, isRunning, 'excel');
    updateQueueItemsUI(queue, queueIndex, isRunning);

    if (isRunning) {
      if (!window.__batchStartTime || queueIndex === 0) {
        if (!window.__batchStartTime) window.__batchStartTime = Date.now();
      }
      updateBatchModeRunningUI(queue.length, queueIndex, queue);
    } else {
      window.__batchStartTime = null;
      updateBatchModePausedUI(queue, queueIndex, isRunning);
    }
  }
}

// -- Reactive updates via storage.onChanged (replaces most of the polling) ---
chrome.storage.onChanged.addListener((changes) => {
  // Any queue/running state change → refresh status immediately
  if (changes.queue || changes.queueIndex || changes.isRunning ||
      changes.singleRunning || changes.runLogs) {
    pollStatus();
  }
  // Saved credentials change → refresh panel immediately
  if (changes.savedCreds) {
    loadSavedCreds();
  }
  // Copied credentials change → refresh clipboard countdown banner immediately
  if (changes.copiedCreds) {
    checkClipboard();
  }
  // History change → refresh only if the tab is visible
  if (changes.history) {
    const histPane = document.getElementById('pane-history');
    if (histPane?.classList.contains('active')) loadHistory();
  }
});

// Fallback interval (5s) catches edge-cases where onChanged misses a tick
setInterval(pollStatus, 5000);
pollStatus();

// -- HIST// History filter state
let historyFilter = 'all';
let historySearch = '';

// Format a date as a readable day label: "Saturday, 20 Jun 2026"
function formatDayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

// Returns a sortable day key: "2026-06-20"
function dayKey(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function exportDayCSV(dayRecords, dateLabel) {
  const rows = [
    ['Name', 'Email', 'Username', 'Password', 'Status', 'Reason', 'URL', 'Step', 'Date'],
    ...dayRecords.map(h => [
      h.name || '',
      h.email || '',
      h.finalUsername || h.username || '',
      h.password || '',
      h.status || '',
      h.reason || '',
      h.url || '',
      h.step || '',
      h.date ? new Date(h.date).toLocaleString() : ''
    ])
  ];
  const csvContent = rows.map(row =>
    row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `history_${dateLabel}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function loadHistory() {
  const { history = [] } = await chrome.storage.local.get(['history']);
  const list          = document.getElementById('histList');
  const countEl       = document.getElementById('histCount');
  const analyticsWrap = document.getElementById('histAnalytics');
  if (!list) return;

  // ── Today's summary + All-Time stats (always on full history) ────────────
  const today = new Date().toDateString();
  let todaySuccess = 0, todayFail = 0;
  let allSuccess = 0, allFail = 0;
  const allDayKeys = new Set();
  history.forEach(h => {
    if (h.status === 'done')        allSuccess++;
    else if (h.status === 'failed') allFail++;
    if (h.date) allDayKeys.add(dayKey(h.date));
    if (h.date && new Date(h.date).toDateString() === today) {
      if (h.status === 'done')        todaySuccess++;
      else if (h.status === 'failed') todayFail++;
    }
  });
  if (analyticsWrap) {
    analyticsWrap.style.display = history.length ? 'block' : 'none';
    const todayTotal = todaySuccess + todayFail;
    const todayRate  = todayTotal ? Math.round((todaySuccess / todayTotal) * 100) : 0;
    const allTotal   = allSuccess + allFail;
    const allRate    = allTotal   ? Math.round((allSuccess   / allTotal)   * 100) : 0;
    document.getElementById('statSuccess').textContent    = todaySuccess;
    document.getElementById('statFail').textContent       = todayFail;
    document.getElementById('statTodayRate').textContent  = `${todayRate}%`;
    document.getElementById('statAllSuccess').textContent = allSuccess;
    document.getElementById('statAllFail').textContent    = allFail;
    document.getElementById('statAllDays').textContent    = allDayKeys.size;
    document.getElementById('statAllRate').textContent    = `${allRate}%`;
  }

  // ── Apply filter + search ─────────────────────────────────────────────────
  const isSearching = !!historySearch;
  let indexedItems = history.map((item, originalIndex) => ({ item, originalIndex }));
  if (historyFilter !== 'all') indexedItems = indexedItems.filter(({ item }) => item.status === historyFilter);
  if (isSearching) {
    const q = historySearch.toLowerCase();
    indexedItems = indexedItems.filter(({ item }) =>
      (item.name || '').toLowerCase().includes(q) ||
      (item.finalUsername || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q)
    );
  }

  if (indexedItems.length === 0) {
    countEl.textContent = '0 records';
    list.innerHTML = '<div class="hist-empty">No results found</div>';
    return;
  }

  // ── Group by calendar day ─────────────────────────────────────────────────
  const groups = new Map();
  const todayKey_ = dayKey(new Date().toISOString());

  indexedItems.forEach(({ item: h, originalIndex }) => {
    const dk    = h.date ? dayKey(h.date) : 'unknown';
    const label = h.date ? formatDayLabel(h.date) : 'Unknown Date';
    if (!groups.has(dk)) groups.set(dk, { dk, label, records: [], historyIndices: [] });
    const g = groups.get(dk);
    g.records.push(h);
    g.historyIndices.push(originalIndex);
  });

  const sortedGroups = [...groups.values()].sort((a, b) => b.dk.localeCompare(a.dk));
  // Reverse each day's records so the first user created appears first (chronological order)
  sortedGroups.forEach(g => {
    g.records.reverse();
    g.historyIndices.reverse();
  });

  // ── Smart count: "24 records across 3 days" ───────────────────────────────
  const dayCount = sortedGroups.length;
  countEl.textContent = dayCount > 1
    ? `${indexedItems.length} records across ${dayCount} days`
    : `${indexedItems.length} record${indexedItems.length !== 1 ? 's' : ''}`;

  // ── Render ────────────────────────────────────────────────────────────────
  list.innerHTML = '';

  sortedGroups.forEach(({ dk, label, records, historyIndices }) => {
    const isToday  = dk === todayKey_;
    // Auto-expand when searching so user sees results immediately
    const isOpen   = isToday || isSearching;
    const doneCount   = records.filter(r => r.status === 'done').length;
    const failedCount = records.filter(r => r.status === 'failed').length;

    const section = document.createElement('div');
    section.className = 'hist-day-section';

    // ── Day header ────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = `hist-day-header${isOpen ? ' open' : ''}`;
    header.dataset.dk = dk;
    header.innerHTML = `
      <span class="hist-day-chevron">▶</span>
      <span class="hist-day-label">
        ${escapeHtml(label)}
        ${isToday ? '<span class="hist-day-today">Today</span>' : ''}
      </span>
      <span class="hist-day-stats">
        ${doneCount   ? `<span class="hist-day-stat ok">✓ ${doneCount}</span>`   : ''}
        ${failedCount ? `<span class="hist-day-stat fail">✗ ${failedCount}</span>` : ''}
      </span>
      ${doneCount ? `<button class="hist-day-copy-all" data-dk="${escapeHtml(dk)}" title="Copy all credentials for this day">Copy All</button>` : ''}
      <button class="hist-day-export" data-dk="${escapeHtml(dk)}" title="Export this day as CSV">CSV</button>
      <button class="hist-day-clear" data-dk="${escapeHtml(dk)}" data-label="${escapeHtml(label)}" title="Delete this day from history">🗑</button>
    `;

    // ── Day body ──────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = `hist-day-body${isOpen ? '' : ' collapsed'}`;

    body.innerHTML = records.map((h, i) => {
      const realIdx = historyIndices[i];
      return `
        <div class="hist-item">
          <div class="hist-name" title="${escapeHtml(h.reason || h.name || '')}">${escapeHtml(h.name || '-')}</div>
          <div class="hist-user" title="${escapeHtml(h.finalUsername || '')}">${escapeHtml(h.finalUsername || '-')}</div>
          <div class="hist-pass" title="${escapeHtml(h.password || '')}">${escapeHtml(h.password || '-')}</div>
          <div style="text-align:right;white-space:nowrap">
            <span class="hist-badge ${escapeHtml(h.status)}" title="${escapeHtml(h.reason || (h.date ? new Date(h.date).toLocaleString('en-GB') : ''))}">${h.status === 'done' ? 'OK' : 'Fail'}</span>
            ${h.status === 'done' ? `<button class="hist-copy" data-index="${realIdx}" title="Copy Credentials">
              <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>` : ''}
          </div>
        </div>`;
    }).join('');

    section.appendChild(header);
    section.appendChild(body);
    list.appendChild(section);
  });

  // ── Toggle collapse ───────────────────────────────────────────────────────
  list.querySelectorAll('.hist-day-header').forEach(hdr => {
    hdr.addEventListener('click', e => {
      if (e.target.closest('.hist-day-export') ||
          e.target.closest('.hist-day-copy-all') ||
          e.target.closest('.hist-day-clear')) return;
      const body = hdr.nextElementSibling;
      const isOpen_ = hdr.classList.contains('open');
      hdr.classList.toggle('open', !isOpen_);
      body.classList.toggle('collapsed', isOpen_);
    });
  });

  // ── Per-day CSV export ────────────────────────────────────────────────────
  list.querySelectorAll('.hist-day-export').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const group = groups.get(btn.dataset.dk);
      if (group) exportDayCSV(group.records, btn.dataset.dk);
    });
  });

  // ── Copy All creds for a day ──────────────────────────────────────────────
  list.querySelectorAll('.hist-day-copy-all').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const group = groups.get(btn.dataset.dk);
      if (!group) return;
      const lines = group.records
        .filter(r => r.status === 'done' && (r.finalUsername || r.username))
        .map(r => `${r.finalUsername || r.username}\t${r.password || ''}`)
        .join('\n');
      if (!lines) return;
      fallbackCopyPopup(lines);
      const old = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green)';
      setTimeout(() => {
        btn.textContent = old;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  });

  // ── Clear Day ─────────────────────────────────────────────────────────────
  list.querySelectorAll('.hist-day-clear').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const label_ = btn.dataset.label;
      if (!confirm(`Delete all history records for "${label_}"?`)) return;
      const dkToClear = btn.dataset.dk;
      const { history: latest = [] } = await chrome.storage.local.get(['history']);
      const updated = latest.filter(h => !h.date || dayKey(h.date) !== dkToClear);
      await chrome.storage.local.set({ history: updated });
      loadHistory();
    });
  });
}


// History search
document.getElementById('histSearch')?.addEventListener('input', e => {
  historySearch = e.target.value.trim();
  loadHistory();
});

// History filter tabs
document.querySelectorAll('.hist-filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.hist-filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    historyFilter = tab.dataset.filter;
    loadHistory();
  });
});

document.getElementById('clearHist')?.addEventListener('click', async () => {
  if (!confirm('Clear all history?')) return;
  await chrome.storage.local.set({ history: [] });
  loadHistory();
});

document.querySelectorAll('.tab').forEach(tab => {
  if (tab.dataset.tab === 'history') tab.addEventListener('click', loadHistory);
});

loadHistory();

// -- Saved Credentials Panel ---
async function loadSavedCreds() {
  const { savedCreds } = await chrome.storage.local.get(['savedCreds']);

  // Only show after registration completes (username is filled by stepDone in background.js)
  if (savedCreds && savedCreds.username && savedCreds.username !== '-') {
    if (scNamePanel) scNamePanel.textContent = savedCreds.name     || '-';
    if (scUserPanel) scUserPanel.textContent = savedCreds.username || '-';
    if (scPassPanel) scPassPanel.textContent = savedCreds.password || '-';
    if (savedCredsPanel) savedCredsPanel.style.display = 'block';
  } else {
    if (savedCredsPanel) savedCredsPanel.style.display = 'none';
    if (scNamePanel) scNamePanel.textContent = '-';
    if (scUserPanel) scUserPanel.textContent = '-';
    if (scPassPanel) scPassPanel.textContent = '-';
  }
}

// -- Global Event Delegation ---
document.addEventListener('click', async (e) => {
  // Handle history copy
  if (e.target.classList.contains('hist-copy')) {
    const i = e.target.dataset.index;
    const { history = [] } = await chrome.storage.local.get(['history']);
    const h = history[i];
    if (h) fallbackCopyPopup(`${h.finalUsername}\t${h.password}`);
    const btn = e.target.closest('.hist-copy');
    if (btn) {
      const oldHtml = btn.innerHTML;
      btn.innerHTML = `<svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      setTimeout(() => btn.innerHTML = oldHtml, 2000);
    }
  }

  // Handle queue item cred copy
  if (e.target.closest('.q-cred-copy')) {
    const btn = e.target.closest('.q-cred-copy');
    const u = btn.dataset.user;
    const p = btn.dataset.pass;
    fallbackCopyPopup(`${u}\t${p}`);
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    setTimeout(() => btn.innerHTML = oldHtml, 2000);
  }

  // Handle single mode preview copy
  if (e.target.closest('#sCopyUser')) {
    const btn = e.target.closest('#sCopyUser');
    fallbackCopyPopup(document.getElementById('sPreviewUser')?.textContent || '');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => btn.innerHTML = oldHtml, 2000);
  }
  if (e.target.closest('#sCopyPass')) {
    const btn = e.target.closest('#sCopyPass');
    fallbackCopyPopup(document.getElementById('sPreviewPass')?.textContent || '');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
    setTimeout(() => btn.innerHTML = oldHtml, 2000);
  }

  // Handle saved creds copy
  if (e.target.classList.contains('sc-copy')) {
    const id = e.target.dataset.copy;
    const text = document.getElementById(id)?.textContent || '';
    fallbackCopyPopup(text);
    const btn = e.target;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<svg class="pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    setTimeout(() => btn.innerHTML = oldHtml, 2000);
  }
});

loadSavedCreds();
// Fallback only — primary updates come from storage.onChanged above
setInterval(loadSavedCreds, 10000);

// -- History Export ---
document.getElementById('exportCSV')?.addEventListener('click', async () => {
  const btn = document.getElementById('exportCSV');
  const { history = [] } = await chrome.storage.local.get(['history']);
  if (!history.length) return;

  const oldText = btn.textContent;
  btn.textContent = 'Generating...';
  btn.disabled = true;

  try {
    // History is unshifted (newest first), so reverse it to keep original registration order
    const exportData = [...history].reverse();
    const rows = [
      ['Name', 'Email', 'Username', 'Password', 'Status', 'Reason', 'Failure Kind', 'URL', 'Step', 'Date'],
      ...exportData.map(h => [
        h.name || '',
        h.email || '',
        h.finalUsername || h.username || '',
        h.password || '',
        h.status || '',
        h.reason || '',
        h.failureKind || '',
        h.url || '',
        h.step || '',
        h.date ? new Date(h.date).toLocaleString() : ''
      ])
    ];

    downloadRowsAsCSV(rows, `prometric_batch_${new Date().toISOString().slice(0,10)}.csv`);
  } catch (e) {
    console.error('Export failed:', e);
    alert('Export failed. Check console for details.');
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
});

// -- Template Download ---
document.getElementById('downloadTemplate')?.addEventListener('click', () => {
  const csv  = 'Name,Email\nJOHN SMITH,john.smith@example.com\nSARAH JONES,sarah.jones@example.com';
  chrome.downloads.download({
    url: 'data:text/csv;base64,' + btoa(csv),
    filename: 'prometric_template.csv',
    saveAs: false
  });
});

// -- Google Sheet Integration ---
let sheetData = [];
const excludedSheetRows = new Set();
const uncheckedSheetRows = new Set();

function showSheetError(msg) {
  const el = document.getElementById('sheetMsg');
  if(el) {
    showMessage(el, msg ? 'err' : '', msg);
  }
}

function findColumnIndex(headers, patterns) {
  if (!headers || !headers.length) return -1;
  const normHeaders = headers.map(h => typeof normalizeMatchText === 'function' ? normalizeMatchText(String(h || '')) : String(h || '').toLowerCase().trim());

  for (const pat of patterns) {
    const normPat = typeof normalizeMatchText === 'function' ? normalizeMatchText(pat) : pat.toLowerCase().trim();
    let idx = normHeaders.findIndex(h => h === normPat);
    if (idx >= 0) return idx;
    idx = normHeaders.findIndex(h => h.includes(normPat));
    if (idx >= 0) return idx;
  }
  return -1;
}

document.getElementById('sheetFetch')?.addEventListener('click', async () => {
  const btn = document.getElementById('sheetFetch');
  const url = document.getElementById('sheetUrl').value.trim();

  const m = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return showSheetError('Invalid Google Sheet URL. Make sure you copy the full link.');
  const id = m[1];

  let gid = '0';
  const gm = url.match(/[#&]gid=([0-9]+)/);
  if (gm) gid = gm[1];

  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

  btn.textContent = 'Generating';
  btn.disabled = true;
  showSheetError('');

  try {
    // Request optional access directly from the user's click, before other awaits.
    const allowed = await chrome.permissions.request({ origins: ['https://docs.google.com/*'] });
    if (!allowed) return showSheetError('Google Sheets access was declined. Allow access to import this sheet.');
    await chrome.storage.local.set({ sheetUrl: url });
    // Delegate to the background service worker — the SW has no browser cookies
    // so Google won't redirect to ServiceLogin (which causes a CORS block here).
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetchSheet', url: exportUrl }, (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(res);
      });
    });
    if (!result || !result.ok) throw new Error(result?.error || 'Cannot read sheet.');
    const text = result.text;
    const rows = parseDelimitedRows(text);
    if (rows.length < 2) throw new Error('Sheet is empty or has only one row.');

    excludedSheetRows.clear();
    uncheckedSheetRows.clear();

    const headers = rows[0];
    sheetData = rows.slice(1);

    const nameSel = document.getElementById('sheetNameCol');
    const emailSel = document.getElementById('sheetEmailCol');
    const daySel = document.getElementById('sheetDayCol');
    const certSel = document.getElementById('sheetCertCol');

    if (daySel) daySel.innerHTML = '<option value="-1">- None -</option>';
    if (certSel) certSel.innerHTML = '<option value="-1">- None -</option>';
    if (nameSel) nameSel.innerHTML = '';
    if (emailSel) emailSel.innerHTML = '';

    headers.forEach((h, i) => {
      const opt = `<option value="${i}">${escapeHtml(h || 'Column ' + (i + 1))}</option>`;
      if (nameSel) nameSel.innerHTML += opt;
      if (emailSel) emailSel.innerHTML += opt;
      if (daySel) daySel.innerHTML += opt;
      if (certSel) certSel.innerHTML += opt;
    });

    // Auto-detect Name, Email, Day, Cert columns
    const nIdx = findColumnIndex(headers, ['الاسم باللغة الانجليزية', 'english', 'en', 'name', 'اسم']);
    const eIdx = findColumnIndex(headers, ['email address', 'email', 'بريد', 'mail']);
    const dayIdx = findColumnIndex(headers, ['إختر اليوم المناسب للإختبار', 'اليوم المناسب', 'يوم', 'day', 'تاريخ', 'date']);
    const certIdx = findColumnIndex(headers, ['الشهادة المطلوب الإختبار فيها', 'الشهادة المطلوب الاختبار فيها', 'الشهادة المطلوبة', 'الشهادة', 'شهادة', 'cert', 'certificate', 'exam', 'اختبار', 'الدورة', 'course']);

    if (nameSel && nIdx >= 0) nameSel.value = nIdx;
    if (emailSel && eIdx >= 0) emailSel.value = eIdx;
    else if (emailSel && headers.length > 1) emailSel.value = 1;

    if (daySel && dayIdx >= 0) {
      daySel.value = dayIdx;
      buildDayFilter(dayIdx);
    }
    if (certSel && certIdx >= 0) {
      certSel.value = certIdx;
      buildCertFilter(certIdx);
    }

    if (daySel) daySel.onchange = () => {
      buildDayFilter(parseInt(daySel.value));
      const curCertIdx = certSel ? parseInt(certSel.value) : -1;
      if (curCertIdx >= 0) buildCertFilter(curCertIdx);
    };

    if (certSel) certSel.onchange = () => buildCertFilter(parseInt(certSel.value));

    [nameSel, emailSel, certSel].forEach(sel => {
      sel?.addEventListener('change', renderSheetPreview);
    });

    document.getElementById('sheetCols').style.display = 'block';
    document.getElementById('sheetStart').disabled = false;
  } catch (e) {
    if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
      showSheetError('Cannot access the sheet. Make sure share settings are "Anyone with the link can view".');
    } else {
      showSheetError(e.message);
    }
  } finally {
    btn.textContent = 'Load Columns';
    btn.disabled = false;
  }
});

function getSelectedDays() {
  const daySel = document.getElementById('sheetDayCol');
  const dIdx = daySel ? parseInt(daySel.value) : -1;
  if (dIdx < 0) return null;

  const allBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk');
  if (allBoxes.length === 0) {
    const legacyBadges = document.querySelectorAll('#sheetDayBadges .day-badge.selected');
    if (legacyBadges.length > 0) {
      return new Set([...legacyBadges].map(b => b.dataset.day.toLowerCase()));
    }
    return null;
  }

  const checkedBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk:checked');
  if (checkedBoxes.length === allBoxes.length) {
    return null;
  }
  if (checkedBoxes.length === 0) {
    return new Set(['__none_match__']);
  }

  return new Set([...checkedBoxes].map(cb => cb.value.toLowerCase()));
}

function getSelectedCertificates() {
  const certSel = document.getElementById('sheetCertCol');
  const cIdx = certSel ? parseInt(certSel.value) : -1;
  if (cIdx < 0) return null;

  const allBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk');
  if (allBoxes.length === 0) {
    const certPicker = document.getElementById('sheetCertPicker');
    if (certPicker && certPicker.value && certPicker.value !== 'all') {
      return new Set([certPicker.value.toLowerCase()]);
    }
    return null;
  }

  const checkedBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk:checked');
  if (checkedBoxes.length === allBoxes.length) {
    return null;
  }
  if (checkedBoxes.length === 0) {
    return new Set(['__none_match__']);
  }

  return new Set([...checkedBoxes].map(cb => cb.value.toLowerCase()));
}

function renderSheetPreview() {
  const wrap  = document.getElementById('sheetPreviewWrap');
  const count = document.getElementById('sheetPreviewCount');
  const list  = document.getElementById('sheetPreviewList');
  const masterCheck = document.getElementById('sheetSelectAll');

  const nIdx = parseInt(document.getElementById('sheetNameCol').value);
  const eIdx = parseInt(document.getElementById('sheetEmailCol').value);
  const daySel = document.getElementById('sheetDayCol');
  const dIdx = daySel ? parseInt(daySel.value) : -1;
  const certSel = document.getElementById('sheetCertCol');
  const cIdx = certSel ? parseInt(certSel.value) : -1;

  if (isNaN(nIdx) || isNaN(eIdx)) {
    wrap.style.display = 'none';
    document.getElementById('sheetStart').disabled = true;
    return;
  }

  const selectedDays = getSelectedDays();
  const selectedCerts = getSelectedCertificates();

  const getCol = (cols, idx) => (idx >= 0 && cols[idx] !== undefined && cols[idx] !== null ? String(cols[idx]).trim() : '');

  let items = sheetData.map((cols, origIndex) => ({
    origIndex,
    name: getCol(cols, nIdx),
    email: getCol(cols, eIdx),
    day: dIdx >= 0 ? getCol(cols, dIdx) : '',
    cert: cIdx >= 0 ? getCol(cols, cIdx) : ''
  })).filter(item => item.name.length >= 2 && !excludedSheetRows.has(item.origIndex));

  if (selectedDays !== null) {
    items = items.filter(item => selectedDays.has((item.day || '').toLowerCase()));
  }

  if (selectedCerts !== null) {
    items = items.filter(item => selectedCerts.has((item.cert || '').toLowerCase()));
  }

  if (items.length === 0) {
    wrap.style.display = 'none';
    document.getElementById('sheetStart').disabled = true;
    return;
  }

  wrap.style.display = 'block';

  const checkedItems = items.filter(item => !uncheckedSheetRows.has(item.origIndex));
  const stats = validateBatchItems(checkedItems);
  document.getElementById('sheetStart').disabled = checkedItems.length === 0 || stats.hasBlockingIssues;
  count.textContent = checkedItems.length === items.length
    ? `${items.length} Selected`
    : `${checkedItems.length} / ${items.length} Selected`;

  // Update master select all checkbox state
  if (masterCheck) {
    if (items.length === 0 || checkedItems.length === 0) {
      masterCheck.checked = false;
      masterCheck.indeterminate = false;
    } else if (checkedItems.length === items.length) {
      masterCheck.checked = true;
      masterCheck.indeterminate = false;
    } else {
      masterCheck.checked = false;
      masterCheck.indeterminate = true;
    }
  }

  if (stats.hasBlockingIssues) {
    showSheetError(`Sheet check: ${stats.missingEmail} missing email, ${stats.invalidEmail} invalid email.`);
  } else {
    showSheetError('');
  }

  // Limit preview to 100 items to avoid lagging the popup
  const previewItems = items.slice(0, 100);
  list.innerHTML = previewItems.map((item) => {
    const c = generateCredsFromCurrentPattern(item.name);
    const isChecked = !uncheckedSheetRows.has(item.origIndex);
    return `
    <div class="sheet-grid" style="display:grid;grid-template-columns:26px 1.4fr 1.6fr 1.1fr 1.1fr 26px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--border);opacity:${isChecked ? '1' : '0.45'};transition:opacity .15s">
      <div>
        <input type="checkbox" class="sheet-row-check" data-idx="${item.origIndex}" style="cursor:pointer;width:14px;height:14px;accent-color:var(--blue)" ${isChecked ? 'checked' : ''}/>
      </div>
      <div style="font-weight:700;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.name)}${item.cert ? ' · ' + escapeHtml(item.cert) : ''}">
        ${escapeHtml(item.name)}
        ${item.cert ? `<div class="cert-tag" title="${escapeHtml(item.cert)}">${escapeHtml(item.cert)}</div>` : ''}
      </div>
      <div style="font-size:10px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.email)}">${escapeHtml(item.email)}</div>
      <div style="font-family:monospace;color:var(--blue);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c ? c.username : '')}</div>
      <div style="font-family:monospace;color:var(--yellow);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c ? c.password : '')}</div>
      <div style="text-align:right">
        <button class="delete-row-btn" data-idx="${item.origIndex}" style="background:transparent;border:none;color:var(--red);cursor:pointer;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;transition:var(--transition)" title="Exclude from batch">
          <svg class="pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    </div>`;
  }).join('') + (items.length > 100 ? `<div style="text-align:center;padding:8px;color:var(--muted);font-size:11px">...and ${items.length - 100} more</div>` : '');

  list.querySelectorAll('.sheet-row-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const idx = parseInt(chk.dataset.idx, 10);
      if (chk.checked) {
        uncheckedSheetRows.delete(idx);
      } else {
        uncheckedSheetRows.add(idx);
      }
      renderSheetPreview();
    });
  });

  list.querySelectorAll('.delete-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      excludedSheetRows.add(idx);
      renderSheetPreview();
    });
  });
}

document.getElementById('sheetSelectAll')?.addEventListener('change', (e) => {
  const isChecked = e.target.checked;
  const nIdx = parseInt(document.getElementById('sheetNameCol').value);
  const daySel = document.getElementById('sheetDayCol');
  const dIdx = daySel ? parseInt(daySel.value) : -1;
  const certSel = document.getElementById('sheetCertCol');
  const cIdx = certSel ? parseInt(certSel.value) : -1;
  const selectedDays = new Set([...document.querySelectorAll('#sheetDayBadges .day-badge.selected')].map(b => b.dataset.day.toLowerCase()));
  const selectedCerts = getSelectedCertificates();

  const getCol = (cols, idx) => (idx >= 0 && cols[idx] !== undefined && cols[idx] !== null ? String(cols[idx]).trim() : '');

  let items = sheetData.map((cols, origIndex) => ({
    origIndex,
    name: getCol(cols, nIdx),
    day: dIdx >= 0 ? getCol(cols, dIdx) : '',
    cert: cIdx >= 0 ? getCol(cols, cIdx) : ''
  })).filter(item => item.name.length >= 2 && !excludedSheetRows.has(item.origIndex));

  if (dIdx >= 0 && selectedDays.size > 0) {
    items = items.filter(item => selectedDays.has(item.day.toLowerCase()));
  }
  if (selectedCerts !== null) {
    items = items.filter(item => selectedCerts.has((item.cert || '').toLowerCase()));
  }

  items.forEach(item => {
    if (isChecked) {
      uncheckedSheetRows.delete(item.origIndex);
    } else {
      uncheckedSheetRows.add(item.origIndex);
    }
  });

  renderSheetPreview();
});


async function processSheetStart() {
  if (!(await confirmReplaceRunning(document.getElementById('sheetMsg')))) return;
  const nIdx = parseInt(document.getElementById('sheetNameCol').value);
  const eIdx = parseInt(document.getElementById('sheetEmailCol').value);
  const daySel = document.getElementById('sheetDayCol');
  const certSel = document.getElementById('sheetCertCol');

  if (isNaN(nIdx) || isNaN(eIdx)) return showSheetError('Please select valid columns.');

  const selectedDays = getSelectedDays();
  const selectedCerts = getSelectedCertificates();
  const dIdx = daySel ? parseInt(daySel.value) : -1;
  const cIdx = certSel ? parseInt(certSel.value) : -1;

  const getCol = (cols, idx) => (idx >= 0 && cols[idx] !== undefined && cols[idx] !== null ? String(cols[idx]).trim() : '');

  let items = sheetData.map((cols, origIndex) => ({
    origIndex,
    name: getCol(cols, nIdx),
    email: getCol(cols, eIdx),
    day: dIdx >= 0 ? (getCol(cols, dIdx) || (cols[dIdx] || '').trim()) : '',
    cert: cIdx >= 0 ? getCol(cols, cIdx) : ''
  })).filter(item => item.name.length >= 2 && !excludedSheetRows.has(item.origIndex) && !uncheckedSheetRows.has(item.origIndex));

  if (selectedDays !== null) {
    items = items.filter(item => selectedDays.has((item.day || '').toLowerCase()));
  }

  if (selectedCerts !== null) {
    items = items.filter(item => selectedCerts.has((item.cert || '').toLowerCase()));
  }

  if (items.length === 0) return showSheetError('No valid names selected matching the filters.');
  const stats = validateBatchItems(items);
  if (stats.hasBlockingIssues) {
    return showSheetError(`Sheet check failed: ${stats.missingEmail} missing email, ${stats.invalidEmail} invalid email.`);
  }

  const { defAddress, defCity, defState, defPostal, defCountry } = await chrome.storage.local.get(['defAddress', 'defCity', 'defState', 'defPostal', 'defCountry']);

  // Pre-fill default fields for batch
  items = items.map(i => ({
    ...i,
    status:         'pending',
    mailingAddress: defAddress || 'Al-Alameya',
    city:           defCity || 'JEDDAH',
    state:          defState || 'JEDDAH',
    postalCode:     defPostal || '00000',
    country:        defCountry || 'Saudi Arabia'
  }));

  if (!await sendCommand({ action: 'startQueue', items, source: 'sheet' }, document.getElementById('sheetMsg'))) return;
  if (batchBanner) batchBanner.classList.add('show');

  setBatchControlsState('running');

  const sheetMsgEl = document.getElementById('sheetMsg');
  if (sheetMsgEl) {
    showMessage(sheetMsgEl, 'ok', `Started ${items.length} registrations.`);
    if (stats.exactDuplicates) {
      showMessage(sheetMsgEl, 'ok', `Started ${items.length - stats.exactDuplicates} registrations. Removed ${stats.exactDuplicates} exact duplicate row(s).`);
    }
  }
}

document.getElementById('sheetStart')?.addEventListener('click', processSheetStart);

function getDaySortWeight(dayStr) {
  if (!dayStr) return 999;
  const s = typeof normalizeMatchText === 'function' ? normalizeMatchText(dayStr) : String(dayStr).toLowerCase();

  // Strict Weekday Ordering: الاحد (1) -> الاثنين (2) -> الثلاثاء (3) -> الاربعاء (4) -> الخميس (5) -> الجمعة (6) -> السبت (7)
  if (s.includes('احد') || s.includes('sun')) return 1;
  if (s.includes('اثنين') || s.includes('اتنين') || s.includes('تنين') || s.includes('mon')) return 2;
  if (s.includes('ثلاث') || s.includes('تلات') || s.includes('tue')) return 3;
  if (s.includes('اربع') || s.includes('wed')) return 4;
  if (s.includes('خميس') || s.includes('thu')) return 5;
  if (s.includes('جمع') || s.includes('fri')) return 6;
  if (s.includes('سبت') || s.includes('sat')) return 7;

  // If date pattern present (e.g. 23-8-2026 or 2026-08-23), sort chronologically
  const dateMatch = dayStr.match(/(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (dateMatch) {
    const p1 = parseInt(dateMatch[1], 10);
    const p2 = parseInt(dateMatch[2], 10);
    const p3 = parseInt(dateMatch[3], 10);
    let d = p1, m = p2, y = p3;
    if (p1 > 1000) { y = p1; m = p2; d = p3; }
    const ts = new Date(y, m - 1, d).getTime();
    if (!isNaN(ts)) return 100 + ts / 100000000;
  }
  return 500;
}

// Build day filter dropdown and multi-select from selected column
function buildDayFilter(dIdx) {
  const filterWrap  = document.getElementById('sheetDayFilter');
  const optionsList = document.getElementById('dayMultiOptionsList');
  const triggerText = document.getElementById('dayMultiTriggerText');
  const menu        = document.getElementById('dayMultiMenu');
  const selectWrap  = document.getElementById('dayMultiSelectWrap');
  if (!filterWrap) return;

  if (dIdx < 0) {
    filterWrap.style.display = 'none';
    if (optionsList) optionsList.innerHTML = '';
    if (triggerText) triggerText.textContent = '-- جميع الأيام (All Days) --';
    if (menu) menu.style.display = 'none';
    if (selectWrap) selectWrap.classList.remove('open');
    const daySelectAllBtn = document.getElementById('daySelectAllBtn');
    if (daySelectAllBtn) daySelectAllBtn.textContent = 'تحديد الكل (Select All)';
    renderSheetPreview();
    return;
  }

  const rawDays = [...new Set(sheetData.map(r => (r[dIdx] || '').trim()).filter(Boolean))];
  if (rawDays.length === 0) {
    filterWrap.style.display = 'none';
    if (optionsList) optionsList.innerHTML = '';
    if (triggerText) triggerText.textContent = '-- جميع الأيام (All Days) --';
    if (menu) menu.style.display = 'none';
    if (selectWrap) selectWrap.classList.remove('open');
    const daySelectAllBtn = document.getElementById('daySelectAllBtn');
    if (daySelectAllBtn) daySelectAllBtn.textContent = 'تحديد الكل (Select All)';
    renderSheetPreview();
    return;
  }

  filterWrap.style.display = 'block';
  updateDayDropdownOptions(dIdx, true);
  renderSheetPreview();
}

function updateDayMultiSelectTriggerText() {
  const triggerText = document.getElementById('dayMultiTriggerText');
  const allBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk');
  const checkedBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk:checked');
  const selectAllBtn = document.getElementById('daySelectAllBtn');

  if (selectAllBtn) {
    if (allBoxes.length > 0 && checkedBoxes.length === allBoxes.length) {
      selectAllBtn.textContent = 'إلغاء تحديد الكل (Deselect All)';
    } else {
      selectAllBtn.textContent = 'تحديد الكل (Select All)';
    }
  }

  if (!triggerText) return;

  if (allBoxes.length === 0) {
    triggerText.textContent = '-- جميع الأيام (All Days) --';
    return;
  }

  let totalCheckedCandidates = 0;
  let totalAllCandidates = 0;
  allBoxes.forEach(cb => {
    const cnt = parseInt(cb.dataset.cnt || '0', 10);
    totalAllCandidates += cnt;
    if (cb.checked) totalCheckedCandidates += cnt;
  });

  if (checkedBoxes.length === allBoxes.length) {
    triggerText.textContent = `-- جميع الأيام (All Days) (${totalAllCandidates}) --`;
  } else if (checkedBoxes.length === 0) {
    triggerText.textContent = 'لم يتم تحديد أي يوم (0 مرشح)';
  } else if (checkedBoxes.length === 1) {
    const singleVal = checkedBoxes[0].value;
    const cnt = checkedBoxes[0].dataset.cnt || '';
    triggerText.textContent = cnt ? `${singleVal} (${cnt})` : singleVal;
  } else {
    triggerText.textContent = `تم تحديد ${checkedBoxes.length} أيام (${totalCheckedCandidates} مرشح)`;
  }
}

function updateDayDropdownOptions(dIdx, isInitial = false) {
  const optionsList = document.getElementById('dayMultiOptionsList');
  if (!optionsList || dIdx < 0) return;

  const certSel = document.getElementById('sheetCertCol');
  const cIdx = certSel ? parseInt(certSel.value) : -1;
  const selectedCerts = getSelectedCertificates();

  const prevChecked = new Set(
    [...optionsList.querySelectorAll('.day-opt-chk:checked')].map(cb => cb.value)
  );
  const hadOptions = optionsList.querySelectorAll('.day-opt-chk').length > 0;

  // Count candidates per day based on active cert filter
  const dayCounts = new Map();
  let totalCandidates = 0;
  sheetData.forEach(r => {
    const cert = cIdx >= 0 ? (r[cIdx] || '').trim().toLowerCase() : '';
    if (cIdx >= 0 && selectedCerts !== null && !selectedCerts.has(cert)) return;
    const day = (r[dIdx] || '').trim();
    if (day) {
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      totalCandidates++;
    }
  });

  const rawDays = [...dayCounts.keys()];
  const days = rawDays.sort((a, b) => {
    const wA = getDaySortWeight(a);
    const wB = getDaySortWeight(b);
    if (wA !== wB) return wA - wB;
    return a.localeCompare(b, 'ar');
  });

  optionsList.innerHTML = days.map(day => {
    const cnt = dayCounts.get(day) || 0;
    const isChecked = isInitial || !hadOptions ? true : prevChecked.has(day);
    return `
      <label class="custom-multiselect-option" data-day="${escapeHtml(day)}">
        <input type="checkbox" class="day-opt-chk" value="${escapeHtml(day)}" data-cnt="${cnt}" ${isChecked ? 'checked' : ''} />
        <span class="custom-multiselect-opt-name" title="${escapeHtml(day)}">${escapeHtml(day)}</span>
        <span class="custom-multiselect-opt-cnt">${cnt}</span>
      </label>`;
  }).join('');

  optionsList.querySelectorAll('.day-opt-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      updateDayMultiSelectTriggerText();
      const curCertIdx = certSel ? parseInt(certSel.value) : -1;
      if (curCertIdx >= 0) updateCertDropdownOptions(curCertIdx);
      renderSheetPreview();
    });
  });

  updateDayMultiSelectTriggerText();
}

// Build certificate filter dropdown and multi-select from selected column
function buildCertFilter(cIdx) {
  const filterWrap = document.getElementById('sheetCertFilter');
  const certPicker = document.getElementById('sheetCertPicker');
  const optionsList = document.getElementById('certMultiOptionsList');
  const triggerText = document.getElementById('certMultiTriggerText');
  const menu = document.getElementById('certMultiMenu');
  const selectWrap = document.getElementById('certMultiSelectWrap');
  if (!filterWrap) return;

  if (cIdx < 0) {
    filterWrap.style.display = 'none';
    if (certPicker) certPicker.innerHTML = '<option value="all">-- جميع الشهادات (All Certificates) --</option>';
    if (optionsList) optionsList.innerHTML = '';
    if (triggerText) triggerText.textContent = '-- جميع الشهادات (All Certificates) --';
    if (menu) menu.style.display = 'none';
    if (selectWrap) selectWrap.classList.remove('open');
    const certSelectAllBtn = document.getElementById('certSelectAllBtn');
    if (certSelectAllBtn) certSelectAllBtn.textContent = 'تحديد الكل (Select All)';
    renderSheetPreview();
    return;
  }

  const rawCerts = [...new Set(sheetData.map(r => (r[cIdx] || '').trim()).filter(Boolean))];
  if (rawCerts.length === 0) {
    filterWrap.style.display = 'none';
    if (certPicker) certPicker.innerHTML = '<option value="all">-- جميع الشهادات (All Certificates) --</option>';
    if (optionsList) optionsList.innerHTML = '';
    if (triggerText) triggerText.textContent = '-- جميع الشهادات (All Certificates) --';
    if (menu) menu.style.display = 'none';
    if (selectWrap) selectWrap.classList.remove('open');
    const certSelectAllBtn = document.getElementById('certSelectAllBtn');
    if (certSelectAllBtn) certSelectAllBtn.textContent = 'تحديد الكل (Select All)';
    renderSheetPreview();
    return;
  }

  filterWrap.style.display = 'block';
  updateCertDropdownOptions(cIdx, true);
  renderSheetPreview();
}

function updateMultiSelectTriggerText() {
  const triggerText = document.getElementById('certMultiTriggerText');
  const allBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk');
  const checkedBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk:checked');
  const certPicker = document.getElementById('sheetCertPicker');
  const selectAllBtn = document.getElementById('certSelectAllBtn');

  if (selectAllBtn) {
    if (allBoxes.length > 0 && checkedBoxes.length === allBoxes.length) {
      selectAllBtn.textContent = 'إلغاء تحديد الكل (Deselect All)';
    } else {
      selectAllBtn.textContent = 'تحديد الكل (Select All)';
    }
  }

  if (!triggerText) return;

  if (allBoxes.length === 0) {
    triggerText.textContent = '-- جميع الشهادات (All Certificates) --';
    if (certPicker) certPicker.value = 'all';
    return;
  }

  let totalCheckedCandidates = 0;
  let totalAllCandidates = 0;
  allBoxes.forEach(cb => {
    const cnt = parseInt(cb.dataset.cnt || '0', 10);
    totalAllCandidates += cnt;
    if (cb.checked) totalCheckedCandidates += cnt;
  });

  if (checkedBoxes.length === allBoxes.length) {
    triggerText.textContent = `-- جميع الشهادات (All Certificates) (${totalAllCandidates}) --`;
    if (certPicker) certPicker.value = 'all';
  } else if (checkedBoxes.length === 0) {
    triggerText.textContent = 'لم يتم تحديد أي شهادة (0 مرشح)';
    if (certPicker) certPicker.value = 'none';
  } else if (checkedBoxes.length === 1) {
    const singleVal = checkedBoxes[0].value;
    const cnt = checkedBoxes[0].dataset.cnt || '';
    triggerText.textContent = cnt ? `${singleVal} (${cnt})` : singleVal;
    if (certPicker) certPicker.value = singleVal;
  } else {
    triggerText.textContent = `تم تحديد ${checkedBoxes.length} شهادات (${totalCheckedCandidates} مرشح)`;
    if (certPicker) certPicker.value = 'multiple';
  }
}

function updateCertDropdownOptions(cIdx, isInitial = false) {
  const optionsList = document.getElementById('certMultiOptionsList');
  const certPicker = document.getElementById('sheetCertPicker');
  if (!optionsList || cIdx < 0) return;

  const daySel = document.getElementById('sheetDayCol');
  const dIdx = daySel ? parseInt(daySel.value) : -1;
  const selectedDays = getSelectedDays();

  // Remember previously checked certs if not initial load
  const prevChecked = new Set(
    [...optionsList.querySelectorAll('.cert-opt-chk:checked')].map(cb => cb.value)
  );
  const hadOptions = optionsList.querySelectorAll('.cert-opt-chk').length > 0;

  // Count candidates per certificate based on active day filter
  const certCounts = new Map();
  let totalCandidates = 0;
  sheetData.forEach(r => {
    const day = dIdx >= 0 ? (r[dIdx] || '').trim().toLowerCase() : '';
    if (dIdx >= 0 && selectedDays !== null && !selectedDays.has(day)) return;
    const cert = (r[cIdx] || '').trim();
    if (cert) {
      certCounts.set(cert, (certCounts.get(cert) || 0) + 1);
      totalCandidates++;
    }
  });

  const rawCerts = [...certCounts.keys()];
  const certs = rawCerts.sort((a, b) => {
    const diff = (certCounts.get(b) || 0) - (certCounts.get(a) || 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b, 'ar');
  });

  // Render options inside custom multiselect list
  optionsList.innerHTML = certs.map(cert => {
    const cnt = certCounts.get(cert) || 0;
    const isChecked = isInitial || !hadOptions ? true : prevChecked.has(cert);
    return `
      <label class="custom-multiselect-option" data-cert="${escapeHtml(cert)}">
        <input type="checkbox" class="cert-opt-chk" value="${escapeHtml(cert)}" data-cnt="${cnt}" ${isChecked ? 'checked' : ''} />
        <span class="custom-multiselect-opt-name" title="${escapeHtml(cert)}">${escapeHtml(cert)}</span>
        <span class="custom-multiselect-opt-cnt">${cnt}</span>
      </label>`;
  }).join('');

  if (certPicker) {
    let optionsHtml = `<option value="all">-- جميع الشهادات (All Certificates) (${totalCandidates}) --</option>`;
    certs.forEach(cert => {
      const cnt = certCounts.get(cert) || 0;
      optionsHtml += `<option value="${escapeHtml(cert)}">${escapeHtml(cert)} (${cnt})</option>`;
    });
    certPicker.innerHTML = optionsHtml;
  }

  // Bind change event to checkboxes
  optionsList.querySelectorAll('.cert-opt-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      updateMultiSelectTriggerText();
      const daySel = document.getElementById('sheetDayCol');
      const curDayIdx = daySel ? parseInt(daySel.value) : -1;
      if (curDayIdx >= 0) updateDayDropdownOptions(curDayIdx);
      renderSheetPreview();
    });
  });

  updateMultiSelectTriggerText();
}

function initCertMultiSelect() {
  const trigger = document.getElementById('certMultiTrigger');
  const menu = document.getElementById('certMultiMenu');
  const wrap = document.getElementById('certMultiSelectWrap');
  const selectAllBtn = document.getElementById('certSelectAllBtn');
  const deselectAllBtn = document.getElementById('certDeselectAllBtn');
  const picker = document.getElementById('sheetCertPicker');

  if (trigger) {
    trigger.onclick = (e) => {
      e.stopPropagation();
      if (!menu) return;
      const isHidden = menu.style.display === 'none';
      const dayMenu = document.getElementById('dayMultiMenu');
      const dayWrap = document.getElementById('dayMultiSelectWrap');
      if (dayMenu) dayMenu.style.display = 'none';
      if (dayWrap) dayWrap.classList.remove('open');

      menu.style.display = isHidden ? 'block' : 'none';
      wrap?.classList.toggle('open', isHidden);
      trigger?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    };
  }

  if (menu) {
    menu.onclick = (e) => e.stopPropagation();
  }

  if (selectAllBtn) {
    selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      const allBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk');
      const checkedBoxes = document.querySelectorAll('#certMultiOptionsList .cert-opt-chk:checked');
      const shouldCheck = (allBoxes.length > 0 && checkedBoxes.length === allBoxes.length) ? false : true;
      allBoxes.forEach(chk => { chk.checked = shouldCheck; });
      updateMultiSelectTriggerText();
      const daySel = document.getElementById('sheetDayCol');
      const curDayIdx = daySel ? parseInt(daySel.value) : -1;
      if (curDayIdx >= 0) updateDayDropdownOptions(curDayIdx);
      renderSheetPreview();
    };
  }

  if (deselectAllBtn) {
    deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('#certMultiOptionsList .cert-opt-chk').forEach(chk => { chk.checked = false; });
      updateMultiSelectTriggerText();
      const daySel = document.getElementById('sheetDayCol');
      const curDayIdx = daySel ? parseInt(daySel.value) : -1;
      if (curDayIdx >= 0) updateDayDropdownOptions(curDayIdx);
      renderSheetPreview();
    };
  }

  if (picker) {
    picker.onchange = (e) => {
      const val = e.target.value;
      document.querySelectorAll('#certMultiOptionsList .cert-opt-chk').forEach(chk => {
        chk.checked = (val === 'all' || chk.value === val);
      });
      updateMultiSelectTriggerText();
      const daySel = document.getElementById('sheetDayCol');
      const curDayIdx = daySel ? parseInt(daySel.value) : -1;
      if (curDayIdx >= 0) updateDayDropdownOptions(curDayIdx);
      renderSheetPreview();
    };
  }
}

function initDayMultiSelect() {
  const trigger = document.getElementById('dayMultiTrigger');
  const menu = document.getElementById('dayMultiMenu');
  const wrap = document.getElementById('dayMultiSelectWrap');
  const selectAllBtn = document.getElementById('daySelectAllBtn');
  const deselectAllBtn = document.getElementById('dayDeselectAllBtn');

  if (trigger) {
    trigger.onclick = (e) => {
      e.stopPropagation();
      if (!menu) return;
      const isHidden = menu.style.display === 'none';
      const certMenu = document.getElementById('certMultiMenu');
      const certWrap = document.getElementById('certMultiSelectWrap');
      if (certMenu) certMenu.style.display = 'none';
      if (certWrap) certWrap.classList.remove('open');

      menu.style.display = isHidden ? 'block' : 'none';
      wrap?.classList.toggle('open', isHidden);
      trigger?.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    };
  }

  if (menu) {
    menu.onclick = (e) => e.stopPropagation();
  }

  if (selectAllBtn) {
    selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      const allBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk');
      const checkedBoxes = document.querySelectorAll('#dayMultiOptionsList .day-opt-chk:checked');
      const shouldCheck = (allBoxes.length > 0 && checkedBoxes.length === allBoxes.length) ? false : true;
      allBoxes.forEach(chk => { chk.checked = shouldCheck; });
      updateDayMultiSelectTriggerText();
      const certSel = document.getElementById('sheetCertCol');
      const curCertIdx = certSel ? parseInt(certSel.value) : -1;
      if (curCertIdx >= 0) updateCertDropdownOptions(curCertIdx);
      renderSheetPreview();
    };
  }

  if (deselectAllBtn) {
    deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('#dayMultiOptionsList .day-opt-chk').forEach(chk => { chk.checked = false; });
      updateDayMultiSelectTriggerText();
      const certSel = document.getElementById('sheetCertCol');
      const curCertIdx = certSel ? parseInt(certSel.value) : -1;
      if (curCertIdx >= 0) updateCertDropdownOptions(curCertIdx);
      renderSheetPreview();
    };
  }
}

// Close multiselect dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dayWrap = document.getElementById('dayMultiSelectWrap');
  const dayMenu = document.getElementById('dayMultiMenu');
  if (dayWrap && dayMenu && dayMenu.style.display !== 'none' && !dayWrap.contains(e.target)) {
    dayMenu.style.display = 'none';
    dayWrap.classList.remove('open');
    document.getElementById('dayMultiTrigger')?.setAttribute('aria-expanded', 'false');
  }

  const certWrap = document.getElementById('certMultiSelectWrap');
  const certMenu = document.getElementById('certMultiMenu');
  if (certWrap && certMenu && certMenu.style.display !== 'none' && !certWrap.contains(e.target)) {
    certMenu.style.display = 'none';
    certWrap.classList.remove('open');
    document.getElementById('certMultiTrigger')?.setAttribute('aria-expanded', 'false');
  }
});

initDayMultiSelect();
initCertMultiSelect();

// -- Clipboard Banner - shows last copied creds for 30 seconds ---
let clipInterval = null;

async function checkClipboard() {
  const { copiedCreds } = await chrome.storage.local.get(['copiedCreds']);
  const banner  = document.getElementById('clipBanner');
  const textEl  = document.getElementById('clipText');
  const circle  = document.getElementById('clipTimerCircle');
  const copyBtn = document.getElementById('clipCopyBtn');

  if (!banner) return;

  if (!copiedCreds || Date.now() >= copiedCreds.expiresAt) {
    banner.classList.remove('show');
    if (clipInterval) { clearInterval(clipInterval); clipInterval = null; }
    return;
  }

  // Show banner
  banner.classList.add('show');
  const remaining = Math.max(0, copiedCreds.expiresAt - Date.now());
  const pct = remaining / 30000; // 0->1
  const circumference = 72; // 2pir approx 72 for r=11.5
  if (circle) circle.style.strokeDashoffset = circumference * (1 - pct);

  const secs = Math.ceil(remaining / 1000);
  if (textEl) textEl.textContent = `Copy ${copiedCreds.label || 'Credentials copied'} (${secs}s)`;

  // Copy Again button
  if (copyBtn && !copyBtn._bound) {
    copyBtn._bound = true;
    copyBtn.addEventListener('click', () => {
      fallbackCopyPopup(copiedCreds.text);
      copyBtn.textContent = 'OK Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy Again', 3000);
    });
  }
}

setInterval(checkClipboard, 1000);
checkClipboard();
loadSettings();

// -- Pattern Live Preview in Settings ---
document.getElementById('passPattern')?.addEventListener('input', (e) => {
  const p = e.target.value;
  const pEl = document.getElementById('patternPreview');
  if (!pEl) return;
  const c = generateCredentials('ABDULLAH MOHAMMED', p);
  if (c) {
    pEl.style.display = 'block';
    pEl.textContent = `Example: ${c.password}`;
  } else {
    pEl.style.display = 'none';
  }
});

// -- Export for Testing ---
if (typeof module !== 'undefined' && module.exports) {
  if (typeof isValidEmail === 'undefined') {
    // Inject required utilities for Node test environment
    const utils = require('./utils.js');
    global.isValidEmail = utils.isValidEmail;
    global.generateCredentials = utils.generateCredentials;
    global.escapeHtml = utils.escapeHtml;

    const parsers = require('./parsers.js');
    global.parseDelimitedRows = parsers.parseDelimitedRows;
    global.parseCSV = parsers.parseCSV;
  }
  module.exports = {
    generateCredsFromCurrentPattern,
    isValidEmail,
    validateBatchItems,
    loadHistory,
    updateSinglePreview,
    initCertMultiSelect,
    getSelectedCertificates,
    buildCertFilter,
    updateCertDropdownOptions,
    updateMultiSelectTriggerText,
    initDayMultiSelect,
    getSelectedDays,
    buildDayFilter,
    updateDayDropdownOptions,
    updateDayMultiSelectTriggerText
  };
}
