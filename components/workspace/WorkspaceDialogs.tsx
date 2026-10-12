export function WorkspaceDialogs() {
  return (
    <>
      <div
        className="toast"
        id="toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ></div>
      <dialog
        id="delete-dialog"
        className="delete-dialog"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-message"
      >
        <div className="delete-dialog-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6m4-6v6"></path>
          </svg>
        </div>
        <h2 id="delete-dialog-title" data-i18n="deleteConfirmTitle">
          Delete item?
        </h2>
        <p id="delete-dialog-message"></p>
        <div className="delete-dialog-actions">
          <button id="delete-cancel" type="button" data-i18n="cancelBtn">
            Cancel
          </button>
          <button
            id="delete-confirm"
            className="danger"
            type="button"
            data-i18n="deleteBtn"
          >
            Delete
          </button>
        </div>
      </dialog>
      <dialog id="edit-dialog" className="edit-dialog" aria-labelledby="edit-heading">
        <form id="edit-form">
          <h2 id="edit-heading"></h2>
          <div id="edit-name-field">
            <label htmlFor="edit-name" data-i18n="categoryNamePlaceholder">
              Category name
            </label>
            <input id="edit-name" maxLength={100} />
          </div>
          <div id="edit-title-field">
            <label htmlFor="edit-title" data-i18n="examTitleCol">
              Exam Title
            </label>
            <input id="edit-title" maxLength={200} />
          </div>
          <div id="edit-language-field">
            <label htmlFor="edit-language" data-i18n="langCol">
              Language
            </label>
            <select id="edit-language">
              <option value="English">English</option>
              <option value="Arabic">Arabic</option>
            </select>
          </div>
          <div id="edit-code-field">
            <label htmlFor="edit-code" id="edit-code-label"></label>
            <input id="edit-code" maxLength={200} required />
          </div>
          <div id="edit-category-field">
            <label htmlFor="edit-category" data-i18n="moveCategoryCol">
              Move Category
            </label>
            <select id="edit-category"></select>
          </div>
          <div id="edit-date-field">
            <label htmlFor="edit-date" data-i18n="editUsedDate">
              Usage date
            </label>
            <input
              id="edit-date"
              placeholder="DD/MM/YYYY"
              inputMode="numeric"
            />
          </div>
          <div id="edit-notes-field">
            <label htmlFor="edit-notes" data-i18n="colNotes">
              Notes
            </label>
            <input id="edit-notes" maxLength={2000} />
          </div>
          <div className="edit-dialog-actions">
            <button type="button" id="edit-cancel" data-i18n="cancelBtn">
              Cancel
            </button>
            <button
              type="submit"
              className="save"
              data-i18n="saveSharedSettings"
            >
              Save changes
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        id="app-modal-dialog"
        className="app-modal-dialog"
        aria-labelledby="app-modal-title"
        aria-describedby="app-modal-desc"
      >
        <div className="app-modal-content">
          <div className="app-modal-header">
            <div
              id="app-modal-icon-badge"
              className="app-modal-icon-badge"
              aria-hidden="true"
            ></div>
            <div className="app-modal-text">
              <h2 id="app-modal-title" className="app-modal-title"></h2>
              <p id="app-modal-desc" className="app-modal-desc"></p>
            </div>
          </div>
          <div id="app-modal-body" className="app-modal-body" hidden>
            <div className="app-modal-field">
              <label
                id="app-modal-input-label"
                htmlFor="app-modal-input"
                className="app-modal-label"
                hidden
              ></label>
              <div className="app-modal-input-wrap">
                <input
                  id="app-modal-input"
                  className="app-modal-input"
                  autoComplete="off"
                  aria-describedby="app-modal-desc app-modal-error"
                />
                <span
                  id="app-modal-unit"
                  className="app-modal-unit"
                  hidden
                ></span>
              </div>
              <div
                id="app-modal-error"
                className="app-modal-error"
                aria-live="polite"
                hidden
              ></div>
            </div>
          </div>
          <div className="app-modal-actions">
            <button
              id="app-modal-cancel"
              type="button"
              className="app-modal-btn app-modal-btn-cancel"
            ></button>
            <button
              id="app-modal-alt"
              type="button"
              className="app-modal-btn app-modal-btn-alt"
              hidden
            ></button>
            <button
              id="app-modal-confirm"
              type="button"
              className="app-modal-btn app-modal-btn-confirm"
            ></button>
          </div>
        </div>
      </dialog>
    </>
  );
}
