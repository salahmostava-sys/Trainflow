// bridge.js - runs in the ISOLATED world, like content.js.
// Handles chrome APIs and talks to content.js only over the private PromChannel
// (prom-channel.js); nothing is exchanged through page-visible window events.

const BRIDGE_DEFAULT_PAGE_DELAY = 1;
const BRIDGE_DEFAULT_ANSWER = 'a';

/** Wait before retrying a message to a sleeping service worker (MV3). */
const BRIDGE_SW_WAKE_RETRY_MS = 300;

// Send currentItem to content.js
async function registrationTabAllowed(){const result=await sendToBackground({action:'prometricContext'});return result?.ok===true&&result.active===true;}
async function sendDataToPage() {
  if(!await registrationTabAllowed())return;
  const {
    currentItem, currentProcessingId, isRunning, singleRunning, pageDelay,
    autoSubmit, defAnswer, stabilityMode
  } = await chrome.storage.local.get([
    'currentItem', 'currentProcessingId', 'isRunning', 'singleRunning', 'pageDelay',
    'autoSubmit', 'defAnswer', 'stabilityMode'
  ]);
  if((isRunning||singleRunning)&&(!currentProcessingId||currentItem?._queueId!==currentProcessingId))return;
  PromChannel.emit('__prom_init', {
      currentItem: currentItem || null,
      isRunning,
      singleRunning,
      pageDelay: pageDelay ?? BRIDGE_DEFAULT_PAGE_DELAY,
      autoSubmit: autoSubmit ?? false,
      stabilityMode: stabilityMode ?? false,
      defAnswer: defAnswer ?? BRIDGE_DEFAULT_ANSWER
  });
}

// Retry once if service worker was sleeping (MV3).
// Returns { success: false, error } on final failure so callers can react.
async function sendToBackground(payload) {
  try {
    return await chrome.runtime.sendMessage(payload);
  } catch (e) {
    if (e?.message?.includes('Receiving end does not exist')) {
      await new Promise(r => setTimeout(r, BRIDGE_SW_WAKE_RETRY_MS));
      try {
        return await chrome.runtime.sendMessage(payload);
      } catch (retryErr) {
        console.warn('[bridge] Both attempts failed:', retryErr);
        return { success: false, error: retryErr?.message || 'Unknown error' };
      }
    }
    console.warn('[bridge] Unexpected error:', e);
    return { success: false, error: e?.message || 'Unknown error' };
  }
}

// Listen for messages from content.js (private channel only)
PromChannel.on('__prom_msg', async (e) => {
  const { action, payload } = e.detail || {};
  if(!await registrationTabAllowed())return;

  if (action === 'ibtaSubmitted') {
    const result=await sendToBackground({action:'ibtaSubmitted',queueId:payload?.queueId});PromChannel.emit('__prom_ibta_ack',{queueId:payload?.queueId,ok:result?.ok===true});
  }
  if (action === 'stepDone') {
    const result=await sendToBackground({
      action:        'stepDone',
      finalUsername: payload?.finalUsername || '',
      password:      payload?.password      || '',
      name:          payload?.name          || '',
      email:         payload?.email         || '',
      url:           payload?.url           || '',
      step:          payload?.step          || '',
      queueId:       payload?.queueId       || ''
    });
    PromChannel.emit('__prom_done_ack',{queueId:payload?.queueId,ok:result?.ok===true});
  }

  if (action === 'stepFailed') {
    await sendToBackground({
      action: 'stepFailed',
      name:        payload?.name        || '',
      reason:      payload?.reason      || '',
      failureKind: payload?.failureKind || '',
      retryable:   payload?.retryable,
      url:         payload?.url         || '',
      step:        payload?.step        || '',
      pageSnippet: payload?.pageSnippet || '',
      queueId:     payload?.queueId     || ''
    });
  }

  if (action === 'updateItem') {
    const {currentItem}=await chrome.storage.local.get('currentItem');if(payload?._queueId&&payload._queueId===currentItem?._queueId)await chrome.storage.local.set({ currentItem: payload });
  }

  if (action === 'pauseBatch') {
    // FIX: Only pause batch (isRunning), never touch singleRunning.
    // Sending 'stopQueue' to background also resets singleRunning, which is wrong.
    await chrome.storage.local.set({ isRunning: false });
  }
  if (action === 'resumeBatch') {
    await chrome.storage.local.set({ isRunning: true });
    await sendToBackground({ action: 'resumeQueue' });
  }
  if (action === 'stopBatch') {
    await chrome.storage.local.set({ isRunning: false, singleRunning: false });
    await sendToBackground({ action: 'stopQueue' });
  }

  // Save copied credentials with expiry for cross-tab access
  if (action === 'saveCopied') {
    await chrome.storage.local.set({ copiedCreds: payload });
    // Auto-clear after expiry
    setTimeout(async () => {
      const { copiedCreds } = await chrome.storage.local.get(['copiedCreds']);
      if (copiedCreds && Date.now() >= copiedCreds.expiresAt) {
        await chrome.storage.local.remove('copiedCreds');
      }
    }, 30000);
  }
});

// Send data when page loads. content.js may not have attached its listener yet,
// so also respond to an explicit ready signal and do a couple of short retries.
(async () => { await sendDataToPage(); })();
setTimeout(sendDataToPage, 250);
setTimeout(sendDataToPage, 1000);

PromChannel.on('__prom_ready', () => {
  sendDataToPage();
});

// Also re-send if storage changes (for future items in batch)
chrome.storage.onChanged.addListener((changes) => {
  if (
    changes.currentItem || changes.currentProcessingId || changes.isRunning || changes.singleRunning ||
    changes.pageDelay || changes.autoSubmit || changes.defAnswer || changes.stabilityMode
  ) {
    chrome.storage.local.get([
      'isRunning', 'singleRunning', 'currentItem', 'currentProcessingId', 'pageDelay',
      'autoSubmit', 'defAnswer', 'stabilityMode'
    ]).then(async state => {
      if(!await registrationTabAllowed())return;
      if((state.isRunning||state.singleRunning)&&(!state.currentProcessingId||state.currentItem?._queueId!==state.currentProcessingId))return;
      PromChannel.emit('__prom_init', {
          currentItem: state.currentItem || null,
          isRunning: state.isRunning,
          singleRunning: state.singleRunning,
          pageDelay: state.pageDelay ?? BRIDGE_DEFAULT_PAGE_DELAY,
          autoSubmit: state.autoSubmit ?? false,
          stabilityMode: state.stabilityMode ?? false,
          defAnswer: state.defAnswer ?? BRIDGE_DEFAULT_ANSWER
      });
    });
  }
});
