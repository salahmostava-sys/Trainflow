// Universal in-app modal dialog for confirmations, alerts, and user prompts.
// Replaces native browser confirm() and prompt() with sleek, themed, accessible modals.
(function(global){
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
    let altBtn = document.getElementById('app-modal-alt');
    if (dialog && !altBtn) {
      altBtn = document.createElement('button');
      altBtn.id = 'app-modal-alt';
      altBtn.type = 'button';
      altBtn.className = 'app-modal-btn app-modal-btn-alt';
      altBtn.hidden = true;
      const actions = dialog.querySelector('.app-modal-actions');
      if (actions) {
        actions.insertBefore(altBtn, actions.lastElementChild);
      }
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
      altBtn: altBtn || document.getElementById('app-modal-alt'),
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
        window.WorkspaceViews.modalIcon(els.iconBadge,{kind:iconType,fallback:'warning'});

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

        if (options.altText && els.altBtn) {
          els.altBtn.textContent = options.altText;
          els.altBtn.hidden = false;
          els.altBtn.onclick = () => closeDialog('alt');
          els.confirmBtn.onclick = () => closeDialog('confirm');
        } else {
          if (els.altBtn) els.altBtn.hidden = true;
          els.confirmBtn.onclick = () => closeDialog(true);
        }
        els.cancelBtn.onclick = () => closeDialog(false);

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
        window.WorkspaceViews.modalIcon(els.iconBadge,{kind:iconType,fallback:'edit'});

        els.title.textContent = options.title || (isAr ? 'تعديل' : 'Edit');
        els.desc.textContent = options.message || '';
        els.desc.hidden = !options.message;

        // Show prompt body
        els.body.hidden = false;
        if (els.altBtn) els.altBtn.hidden = true;
        els.error.hidden = true;
        els.error.textContent = '';

        els.inputLabel.hidden = false;
        els.inputLabel.textContent = options.label || els.title.textContent;
        els.input.removeAttribute('aria-invalid');
        els.input.oninput = () => {
          els.input.removeAttribute('aria-invalid');
          els.error.hidden = true;
          els.error.textContent = '';
        };

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
              els.input.setAttribute('aria-invalid', 'true');
              els.input.focus();
              return;
            }
            if (options.min != null && num < options.min) {
              els.error.textContent = isAr ? `الحد الأدنى هو ${options.min}` : `Minimum value is ${options.min}`;
              els.error.hidden = false;
              els.input.setAttribute('aria-invalid', 'true');
              els.input.focus();
              return;
            }
            if (options.max != null && num > options.max) {
              els.error.textContent = isAr ? `الحد الأقصى هو ${options.max}` : `Maximum value is ${options.max}`;
              els.error.hidden = false;
              els.input.setAttribute('aria-invalid', 'true');
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
