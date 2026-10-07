// Universal in-app modal dialog for confirmations, alerts, and user prompts.
// Replaces native browser confirm() and prompt() with sleek, themed, accessible modals.
(function(global){
  const SVGS = {
    trash: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    column: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><path d="M7 8h2m-2 4h2m-2 4h2m7-8h2m-2 4h2m-2 4h2"/></svg>',
    row: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M8 7v2m4-2v2m4-2v2m-8 7v2m4-2v2m4-2v2"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  function getLang() {
    if (typeof global.currentLang === 'string') return global.currentLang;
    const docLang = document.documentElement.lang || document.body?.getAttribute('lang');
    return docLang === 'en' ? 'en' : 'ar';
  }

  function getDir() {
    return getLang() === 'en' ? 'ltr' : 'rtl';
  }

  function ensureDialogElements() {
    let dialog = document.getElementById('app-modal-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'app-modal-dialog';
      dialog.className = 'app-modal-dialog';
      dialog.setAttribute('aria-labelledby', 'app-modal-title');
      dialog.setAttribute('aria-describedby', 'app-modal-desc');
      dialog.innerHTML = `
        <div class="app-modal-content">
          <div class="app-modal-header">
            <div id="app-modal-icon-badge" class="app-modal-icon-badge" aria-hidden="true"></div>
            <div class="app-modal-text">
              <h2 id="app-modal-title" class="app-modal-title"></h2>
              <p id="app-modal-desc" class="app-modal-desc"></p>
            </div>
          </div>
          <div id="app-modal-body" class="app-modal-body" hidden>
            <div class="app-modal-field">
              <label id="app-modal-input-label" for="app-modal-input" class="app-modal-label" hidden></label>
              <div class="app-modal-input-wrap">
                <input id="app-modal-input" class="app-modal-input" autocomplete="off" />
                <span id="app-modal-unit" class="app-modal-unit" hidden></span>
              </div>
              <div id="app-modal-error" class="app-modal-error" hidden></div>
            </div>
          </div>
          <div class="app-modal-actions">
            <button id="app-modal-cancel" type="button" class="app-modal-btn app-modal-btn-cancel"></button>
            <button id="app-modal-confirm" type="button" class="app-modal-btn app-modal-btn-confirm"></button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
    }
    return {
      dialog,
      iconBadge: document.getElementById('app-modal-icon-badge'),
      title: document.getElementById('app-modal-title'),
      desc: document.getElementById('app-modal-desc'),
      body: document.getElementById('app-modal-body'),
      inputLabel: document.getElementById('app-modal-input-label'),
      input: document.getElementById('app-modal-input'),
      unit: document.getElementById('app-modal-unit'),
      error: document.getElementById('app-modal-error'),
      cancelBtn: document.getElementById('app-modal-cancel'),
      confirmBtn: document.getElementById('app-modal-confirm')
    };
  }

  let activeResolve = null;
  let prevFocusedElement = null;

  function closeDialog(value) {
    const dialog = document.getElementById('app-modal-dialog');
    if (dialog && dialog.open) {
      dialog.close();
    }
    if (activeResolve) {
      const fn = activeResolve;
      activeResolve = null;
      fn(value);
    }
    if (prevFocusedElement && typeof prevFocusedElement.focus === 'function') {
      try { prevFocusedElement.focus(); } catch (e) {}
      prevFocusedElement = null;
    }
  }

  const AppDialog = {
    /**
     * Confirmation Modal
     * @param {Object} options
     * @param {string} [options.title]
     * @param {string} options.message
     * @param {string} [options.confirmText]
     * @param {string} [options.cancelText]
     * @param {boolean} [options.danger=false]
     * @param {'trash'|'warning'|'info'|'edit'|'column'|'row'} [options.icon]
     * @returns {Promise<boolean>}
     */
    confirm(options = {}) {
      if (typeof window !== 'undefined' && window.__IBTA_TEST_AUTOMATION__) {
        const text = options.message || options.title || '';
        return Promise.resolve(window.confirm(text));
      }

      if (typeof options === 'string') {
        options = { message: options };
      }

      return new Promise(resolve => {
        closeDialog(false);
        activeResolve = resolve;
        prevFocusedElement = document.activeElement;

        const isAr = getLang() === 'ar';
        const els = ensureDialogElements();

        els.dialog.dir = getDir();
        els.dialog.classList.remove('app-modal-danger', 'app-modal-prompt-mode');
        if (options.danger) {
          els.dialog.classList.add('app-modal-danger');
        }

        const iconType = options.icon || (options.danger ? 'trash' : 'warning');
        els.iconBadge.className = 'app-modal-icon-badge ' + (options.danger ? 'badge-danger' : 'badge-warning');
        els.iconBadge.innerHTML = SVGS[iconType] || SVGS.warning;

        const defaultTitle = options.danger 
          ? (isAr ? 'تأكيد الحذف' : 'Confirm Deletion')
          : (isAr ? 'تأكيد الإجراء' : 'Confirm Action');
        els.title.textContent = options.title || defaultTitle;
        els.desc.textContent = options.message || '';
        els.desc.hidden = !options.message;

        // Hide prompt body
        els.body.hidden = true;
        els.error.hidden = true;
        els.error.textContent = '';

        // Buttons
        const defaultConfirm = options.danger
          ? (isAr ? 'حذف' : 'Delete')
          : (isAr ? 'تأكيد' : 'Confirm');
        const defaultCancel = isAr ? 'إلغاء' : 'Cancel';

        els.confirmBtn.textContent = options.confirmText || defaultConfirm;
        els.confirmBtn.className = 'app-modal-btn ' + (options.danger ? 'app-modal-btn-danger' : 'app-modal-btn-confirm');
        els.cancelBtn.textContent = options.cancelText || defaultCancel;

        els.cancelBtn.onclick = () => closeDialog(false);
        els.confirmBtn.onclick = () => closeDialog(true);

        els.dialog.oncancel = e => {
          e.preventDefault();
          closeDialog(false);
        };

        // Close on backdrop click
        els.dialog.onclick = e => {
          if (e.target === els.dialog) {
            closeDialog(false);
          }
        };

        els.dialog.showModal();
        if (options.danger) {
          els.cancelBtn.focus();
        } else {
          els.confirmBtn.focus();
        }
      });
    },

    /**
     * Prompt / Edit Input Modal
     * @param {Object} options
     * @param {string} options.title
     * @param {string} [options.message]
     * @param {string} [options.label]
     * @param {string} [options.defaultValue='']
     * @param {string} [options.placeholder='']
     * @param {'text'|'number'} [options.inputType='text']
     * @param {number} [options.min]
     * @param {number} [options.max]
     * @param {number|string} [options.step='1']
     * @param {string} [options.unit]
     * @param {string} [options.confirmText]
     * @param {string} [options.cancelText]
     * @param {'edit'|'column'|'row'|'info'} [options.icon='edit']
     * @returns {Promise<string|null>}
     */
    prompt(options = {}) {
      if (typeof window !== 'undefined' && window.__IBTA_TEST_AUTOMATION__) {
        const text = options.message || options.title || '';
        const def = options.defaultValue != null ? String(options.defaultValue) : '';
        return Promise.resolve(window.prompt(text, def));
      }

      if (typeof options === 'string') {
        options = { title: options };
      }

      return new Promise(resolve => {
        closeDialog(null);
        activeResolve = resolve;
        prevFocusedElement = document.activeElement;

        const isAr = getLang() === 'ar';
        const els = ensureDialogElements();

        els.dialog.dir = getDir();
        els.dialog.classList.remove('app-modal-danger');
        els.dialog.classList.add('app-modal-prompt-mode');

        const iconType = options.icon || 'edit';
        els.iconBadge.className = 'app-modal-icon-badge badge-primary';
        els.iconBadge.innerHTML = SVGS[iconType] || SVGS.edit;

        els.title.textContent = options.title || (isAr ? 'تعديل' : 'Edit');
        els.desc.textContent = options.message || '';
        els.desc.hidden = !options.message;

        // Show prompt body
        els.body.hidden = false;
        els.error.hidden = true;
        els.error.textContent = '';

        if (options.label) {
          els.inputLabel.hidden = false;
          els.inputLabel.textContent = options.label;
        } else {
          els.inputLabel.hidden = true;
        }

        const inputType = options.inputType || 'text';
        els.input.type = inputType;
        els.input.value = options.defaultValue != null ? String(options.defaultValue) : '';
        els.input.placeholder = options.placeholder || '';

        if (inputType === 'number') {
          if (options.min != null) els.input.min = String(options.min);
          else els.input.removeAttribute('min');
          if (options.max != null) els.input.max = String(options.max);
          else els.input.removeAttribute('max');
          els.input.step = options.step != null ? String(options.step) : '1';
        } else {
          els.input.removeAttribute('min');
          els.input.removeAttribute('max');
          els.input.removeAttribute('step');
        }

        if (options.unit) {
          els.unit.hidden = false;
          els.unit.textContent = options.unit;
          els.input.style.paddingInlineEnd = '38px';
        } else {
          els.unit.hidden = true;
          els.input.style.paddingInlineEnd = '';
        }

        const defaultConfirm = isAr ? 'حفظ' : 'Save';
        const defaultCancel = isAr ? 'إلغاء' : 'Cancel';

        els.confirmBtn.textContent = options.confirmText || defaultConfirm;
        els.confirmBtn.className = 'app-modal-btn app-modal-btn-confirm';
        els.cancelBtn.textContent = options.cancelText || defaultCancel;

        const validateAndSubmit = () => {
          const val = els.input.value;
          if (inputType === 'number') {
            const num = Number(val);
            if (!Number.isFinite(num)) {
              els.error.textContent = isAr ? 'يرجى إدخال رقم صحيح' : 'Please enter a valid number';
              els.error.hidden = false;
              els.input.focus();
              return;
            }
            if (options.min != null && num < options.min) {
              els.error.textContent = isAr ? `الحد الأدنى هو ${options.min}` : `Minimum value is ${options.min}`;
              els.error.hidden = false;
              els.input.focus();
              return;
            }
            if (options.max != null && num > options.max) {
              els.error.textContent = isAr ? `الحد الأقصى هو ${options.max}` : `Maximum value is ${options.max}`;
              els.error.hidden = false;
              els.input.focus();
              return;
            }
          }
          closeDialog(val);
        };

        els.cancelBtn.onclick = () => closeDialog(null);
        els.confirmBtn.onclick = validateAndSubmit;

        els.input.onkeydown = e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            validateAndSubmit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeDialog(null);
          }
        };

        els.dialog.oncancel = e => {
          e.preventDefault();
          closeDialog(null);
        };

        // Close on backdrop click
        els.dialog.onclick = e => {
          if (e.target === els.dialog) {
            closeDialog(null);
          }
        };

        els.dialog.showModal();
        els.input.focus();
        if (typeof els.input.select === 'function') {
          els.input.select();
        }
      });
    },

    close() {
      closeDialog(null);
    }
  };

  global.AppDialog = AppDialog;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppDialog;
  }
})(typeof window !== 'undefined' ? window : globalThis);
