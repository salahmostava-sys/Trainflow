export function SettingsScreen({ active = false }: { active?: boolean }) {
  return (
    <section className={active ? "panel active" : "panel"} id="panel-settings">
      <div className="settings-header-banner">
        <div className="settings-header-main">
          <div className="settings-header-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path>
              <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.07.07-1.78 1.78-.07-.07A1.8 1.8 0 0 0 16 18.4a1.8 1.8 0 0 0-1 1.66V20h-2v-.06a1.8 1.8 0 0 0-1-1.66 1.8 1.8 0 0 0-1.98.36l-.07.07-1.78-1.78.07-.07A1.8 1.8 0 0 0 8.6 15a1.8 1.8 0 0 0-1.66-1H7v-2h-.06A1.8 1.8 0 0 0 8.6 11a1.8 1.8 0 0 0-.36-1.98l-.07-.07 1.78-1.78.07.07A1.8 1.8 0 0 0 12 7.6a1.8 1.8 0 0 0 1-1.66V6h2v.06a1.8 1.8 0 0 0 1 1.66 1.8 1.8 0 0 0 1.98-.36l.07-.07 1.78 1.78-.07.07A1.8 1.8 0 0 0 19.4 11a1.8 1.8 0 0 0 1.66 1H21v2h.06A1.8 1.8 0 0 0 19.4 15Z"></path>
            </svg>
          </div>
          <div className="settings-header-titles">
            <h2 data-i18n="settingsTitle">Settings</h2>
            <p className="settings-header-sub" data-i18n="manageRecordsDesc">
              Choose a record here to edit it without adding controls to the
              daily work screen.
            </p>
          </div>
        </div>
        <div className="settings-header-badge" id="settings-cloud-indicator">
          <span className="pulse-dot"></span>
          <span data-i18n="dbConnected">Connected to the database</span>
        </div>
      </div>

      <div
        className="settings-tabs"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Settings"
        id="settings-tabs"
      >
        <button
          type="button"
          role="tab"
          id="settings-tab-profile"
          aria-controls="settings-pane-profile"
          aria-selected="true"
          tabIndex={0}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span data-i18n="settingsTabProfile">My account</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-data"
          aria-controls="settings-pane-data"
          aria-selected="false"
          tabIndex={-1}
          hidden
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <span data-i18n="settingsTabData">System data</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-prometric"
          aria-controls="settings-pane-prometric"
          aria-selected="false"
          tabIndex={-1}
          hidden
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span data-i18n="settingsTabPrometric">Prometric</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-inventory"
          aria-controls="settings-pane-inventory"
          aria-selected="false"
          tabIndex={-1}
          hidden
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
            <path d="m3.3 7 8.7 5 8.7-5"></path>
            <path d="M12 22V12"></path>
          </svg>
          <span data-i18n="settingsTabInventory">Inventory</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-extensions"
          aria-controls="settings-pane-extensions"
          aria-selected="false"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8a2.5 2.5 0 0 1 0 5V20a2 2 0 0 0 2 2h4v-1.5a2.5 2.5 0 0 1 5 0V22h4a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"></path>
          </svg>
          <span data-i18n="settingsTabExtensions">Extensions</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-reports"
          aria-controls="settings-pane-reports"
          aria-selected="false"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span data-i18n="settingsTabReports">Google reports</span>
        </button>
        <button
          type="button"
          role="tab"
          id="settings-tab-sync"
          aria-controls="settings-pane-sync"
          aria-selected="false"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span data-i18n="settingsTabSync">Team and sync</span>
        </button>
      </div>

      <div
        className="settings-pane"
        id="settings-pane-profile"
        role="tabpanel"
        aria-labelledby="settings-tab-profile"
      >
        <div className="settings-profile-hero">
          <div className="settings-hero-avatar" id="settings-hero-avatar">
            TF
          </div>
          <div className="settings-hero-info">
            <h3
              className="settings-hero-name"
              id="settings-hero-name"
              data-i18n="currentAccount"
            >
              الحساب الحالي
            </h3>
            <div className="settings-hero-meta">
              <span
                className="settings-hero-email"
                id="settings-hero-email"
              ></span>
              <span
                className="settings-role-badge"
                id="settings-hero-role"
              ></span>
            </div>
          </div>
        </div>

        <div className="settings-grid-2col">
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <h3 className="settings-card-title" data-i18n="profileTitle">
                  My account
                </h3>
                <p className="settings-card-desc" data-i18n="profileDesc">
                  Change your name, sign-in email, or password.
                </p>
              </div>
            </div>
            <div className="profile-forms">
              <form className="shared-settings-form" id="profile-name-form">
                <label>
                  <span data-i18n="profileName">Name</span>
                  <input
                    id="profile-name"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>
                <button
                  className="resource-btn"
                  type="submit"
                  data-i18n="saveName"
                >
                  Save name
                </button>
              </form>
              <form className="shared-settings-form" id="profile-email-form">
                <label>
                  <span data-i18n="profileLoginEmail">Sign-in email</span>
                  <input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                  />
                </label>
                <button
                  className="resource-btn"
                  type="submit"
                  data-i18n="changeEmail"
                >
                  Change email
                </button>
                <div className="settings-desc" data-i18n="emailConfirmHint">
                  Confirm the new address from the verification email before
                  using it to sign in.
                </div>
              </form>
            </div>
          </section>

          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <svg viewBox="0 0 24 24">
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    ry="2"
                  ></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <div>
                <h3 className="settings-card-title" data-i18n="changePassword">
                  Change password
                </h3>
                <p
                  className="settings-card-desc"
                  data-i18n="profilePasswordShort"
                >
                  Use a password with at least 8 characters.
                </p>
              </div>
            </div>
            <form className="shared-settings-form" id="profile-password-form">
              <label>
                <span data-i18n="currentPassword">Current password</span>
                <input
                  id="profile-current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                <span data-i18n="newPassword">New password</span>
                <input
                  id="profile-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                <span data-i18n="confirmNewPassword">Confirm new password</span>
                <input
                  id="profile-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button
                className="resource-btn"
                type="submit"
                data-i18n="changePassword"
              >
                Change password
              </button>
            </form>
          </section>
        </div>

        <p
          className="profile-status"
          id="profile-status"
          role="status"
          aria-live="polite"
        ></p>
      </div>

      <div
        className="settings-pane"
        id="settings-pane-data"
        role="tabpanel"
        aria-labelledby="settings-tab-data"
        hidden
      >
        <section
          className="settings-card"
          id="manage-data"
          hidden
          style={{ cursor: "default" }}
        >
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
              </svg>
            </div>
            <div>
              <h3 className="settings-card-title" data-i18n="manageRecords">
                Edit system data
              </h3>
              <p className="settings-card-desc" data-i18n="manageRecordsDesc">
                Choose a record here to edit it without adding controls to the
                daily work screen.
              </p>
            </div>
          </div>
          <div className="manage-grid">
            <div className="manage-row">
              <label>
                <span data-i18n="categoryNamePlaceholder">Category</span>
                <select id="manage-category"></select>
              </label>
              <button
                type="button"
                id="manage-category-edit"
                data-i18n="editBtn"
              >
                Edit
              </button>
            </div>
            <div className="manage-row">
              <label>
                <span data-i18n="examTitleCol">Exam</span>
                <select id="manage-exam"></select>
              </label>
              <button type="button" id="manage-exam-edit" data-i18n="editBtn">
                Edit
              </button>
            </div>
            <div className="manage-row">
              <label>
                <span data-i18n="moveCategoryCol">Code category</span>
                <select id="manage-code-category"></select>
              </label>
              <span></span>
            </div>
            <div className="manage-row">
              <label>
                <span data-i18n="colCode">Code</span>
                <select id="manage-code"></select>
              </label>
              <button type="button" id="manage-code-edit" data-i18n="editBtn">
                Edit
              </button>
            </div>
          </div>
        </section>
        <div id="settings-add-forms"></div>
        <section className="settings-card" id="code-bulk-tools" hidden>
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <div>
              <h3 className="settings-card-title" data-i18n="bulkImportTitle">
                Import codes from a file
              </h3>
              <p className="settings-card-desc">
                CSV / TXT (IBTAMEAF-XXXX-XXXX)
              </p>
            </div>
          </div>
          <div className="ops-row">
            <label>
              <span data-i18n="bulkImportCategory">Category</span>
              <select id="bulk-import-category"></select>
            </label>
            <label className="file-upload-field">
              <span className="file-upload-label-text">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--blue)" }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <span data-i18n="bulkImportFile">CSV or text file</span>
                <span className="file-upload-badge">.CSV / .TXT</span>
              </span>
              <input
                id="bulk-import-file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
              />
            </label>
          </div>
          <div
            id="bulk-import-preview"
            className="ops-status"
            role="status"
            aria-live="polite"
          ></div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "14px",
              flexWrap: "wrap",
            }}
          >
            <button
              id="bulk-import-submit"
              className="resource-btn"
              type="button"
              disabled
              data-i18n="bulkImportButton"
            >
              Import valid codes
            </button>
            <button
              id="export-codes-csv"
              className="resource-btn"
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                borderColor: "var(--border)",
              }}
              type="button"
              data-i18n="exportCodesCsv"
            >
              Export codes CSV
            </button>
          </div>
        </section>
        <section
          className="settings-card settings-danger-card"
          id="reset-tools"
          hidden
        >
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div>
              <h3 className="settings-card-title" data-i18n="resetMarksTitle">
                Usage marks
              </h3>
              <p className="settings-card-desc" data-i18n="resetMarksHint">
                This clears every used mark and its date. Download a backup
                first if you may need to restore them.
              </p>
            </div>
          </div>
          <button
            className="reset-link"
            id="reset-btn"
            type="button"
            data-i18n="resetLink"
          >
            Reset all copy marks
          </button>
        </section>
      </div>

      <div
        className="settings-pane"
        id="settings-pane-prometric"
        role="tabpanel"
        aria-labelledby="settings-tab-prometric"
        hidden
      >
        <section
          className="settings-card"
          id="prometric-settings"
          hidden
          style={{ cursor: "default" }}
        >
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div>
              <h3
                className="settings-card-title"
                data-i18n="sharedSettingsTitle"
              >
                Prometric and meeting details
              </h3>
              <p className="settings-card-desc" data-i18n="sharedSettingsDesc">
                Administrators can change these shared values.
              </p>
            </div>
          </div>
          <form className="shared-settings-form" id="prometric-settings-form">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: "14px",
              }}
            >
              <label>
                <span data-i18n="prometricAccount">Prometric Account</span>
                <input
                  id="settings-prometric-account"
                  type="text"
                  autoComplete="off"
                  maxLength={300}
                  required
                />
              </label>
              <label>
                <span data-i18n="prometricPassword">Prometric Password</span>
                <input
                  id="settings-prometric-password"
                  type="text"
                  autoComplete="off"
                  maxLength={300}
                  required
                />
              </label>
            </div>
            <label>
              <span data-i18n="zoomMeeting">Zoom meeting</span>
              <input
                id="settings-zoom-link"
                type="url"
                autoComplete="off"
                maxLength={2000}
                required
              />
            </label>
            <label>
              <span data-i18n="prometricLoginLink">Prometric login link</span>
              <input
                id="settings-prometric-link"
                type="url"
                autoComplete="off"
                maxLength={2000}
                required
              />
            </label>
            <button
              className="resource-btn"
              type="submit"
              data-i18n="saveSharedSettings"
            >
              Save changes
            </button>
          </form>
        </section>
      </div>

      <div
        className="settings-pane"
        id="settings-pane-inventory"
        role="tabpanel"
        aria-labelledby="settings-tab-inventory"
        hidden
      >
        <section className="settings-card" id="inventory-admin" hidden>
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                <path d="m3.3 7 8.7 5 8.7-5"></path>
                <path d="M12 22V12"></path>
              </svg>
            </div>
            <div>
              <h3
                className="settings-card-title"
                data-i18n="inventoryUpdateTitle"
              >
                Update supervisor stock
              </h3>
              <p
                className="settings-card-desc"
                data-i18n="inventoryOpeningHint"
              >
                Enter the supervisor's current balance, then add newly purchased
                codes separately.
              </p>
            </div>
          </div>
          <div className="inventory-stock-list" id="inventory-stock-list"></div>
          <div className="inventory-control-bar">
            <label className="inventory-category-field">
              <span data-i18n="inventoryCategory">Category</span>
              <select id="inventory-category"></select>
            </label>
            <p className="ops-status" id="inventory-current-balance"></p>
          </div>
          <div className="inventory-stock-edit-grid">
            <div className="inventory-stock-action">
              <label>
                <span data-i18n="inventoryCurrentQuantity">
                  Current number with supervisor
                </span>
                <input
                  id="inventory-current-quantity"
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  inputMode="numeric"
                />
              </label>
              <p className="ops-status" data-i18n="inventorySetCurrentHint">
                Set the actual balance. This replaces the previous number.
              </p>
              <button
                id="inventory-set-current"
                className="resource-btn"
                type="button"
                data-i18n="inventorySetCurrent"
              >
                Save current balance
              </button>
            </div>
            <div className="inventory-stock-action action-add">
              <label>
                <span data-i18n="inventoryPurchasedQuantity">
                  Newly purchased codes
                </span>
                <input
                  id="inventory-purchased-quantity"
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  inputMode="numeric"
                />
              </label>
              <p className="ops-status" data-i18n="inventoryAddPurchasedHint">
                Add this number to the existing supervisor balance.
              </p>
              <button
                id="inventory-add-purchased"
                className="resource-btn"
                type="button"
                data-i18n="inventoryAddPurchased"
                style={{ background: "#10B981", borderColor: "#10B981" }}
              >
                Add to balance
              </button>
            </div>
          </div>
          <p
            className="ops-status"
            id="inventory-update-status"
            role="status"
            aria-live="polite"
          ></p>
        </section>
      </div>

      <div
        className="settings-pane"
        id="settings-pane-extensions"
        role="tabpanel"
        aria-labelledby="settings-tab-extensions"
        hidden
      >
        <p className="settings-desc" data-i18n="extensionsIntro">
          Download the Chrome extensions here, then install them once in the
          same Chrome profile you use for this program.
        </p>
        <div
          className="settings-extensions-grid"
          style={{ gridTemplateColumns: "1fr" }}
        >
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <div>
                <h3
                  className="settings-card-title"
                  data-i18n="extensionPrometricTitle"
                >
                  Prometric registration
                </h3>
                <p
                  className="settings-card-desc"
                  data-i18n="extensionPrometricDesc"
                >
                  Create trainee accounts through Prometric and return their
                  usernames and passwords to the trainee sheet.
                </p>
              </div>
            </div>
            <a
              className="settings-extension-download"
              id="settings-download-prometric"
              href="trainflow-prometric.zip"
              download=""
              data-i18n="extensionPrometricDownload"
            >
              Download Prometric extension
            </a>
          </section>
        </div>
        <section className="settings-card settings-extension-install">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div>
              <h3
                className="settings-card-title"
                data-i18n="extensionsInstallTitle"
              >
                Install in Google Chrome
              </h3>
            </div>
          </div>
          <ol>
            <li data-i18n="extensionsInstallExtract">
              Extract the downloaded ZIP into a permanent folder.
            </li>
            <li>
              <span data-i18n="extensionsInstallOpen">
                Open this address in Chrome:
              </span>{" "}
              <code dir="ltr">chrome://extensions</code>
            </li>
            <li data-i18n="extensionsInstallDeveloper">
              Enable Developer mode, click Load unpacked, and select the
              extracted folder.
            </li>
            <li data-i18n="extensionsInstallReload">
              Reload this program and Prometric in the same Chrome profile.
              Disable any older copy of the extension.
            </li>
          </ol>
        </section>
      </div>

      <div
        className="settings-pane sheet-report-settings"
        id="settings-pane-reports"
        role="tabpanel"
        aria-labelledby="settings-tab-reports"
        hidden
      ></div>

      <div
        className="settings-pane"
        id="settings-pane-sync"
        role="tabpanel"
        aria-labelledby="settings-tab-sync"
        hidden
      >
        <section id="cloud-tools" className="cloud-controls" hidden>
          <div className="cloud-popover settings-card">
            <p id="cloud-status" hidden></p>
            <details id="admin-tools" className="cloud-admin" open>
              <summary>
                <span data-i18n="manageDataUsers">
                  إدارة البيانات والنسخ الاحتياطي
                </span>
              </summary>
              <div className="cloud-admin-content">
                <div
                  className="settings-card backup-tools"
                  style={{
                    boxShadow: "none",
                    borderColor: "#E2E8F0",
                    background: "#F8FAFC",
                  }}
                >
                  <h3
                    data-i18n="restoreTitle"
                    style={{
                      margin: "0 0 10px",
                      fontSize: "15px",
                      fontWeight: "700",
                    }}
                  >
                    Restore a backup
                  </h3>
                  <p data-i18n="backupPrivacyHint" className="field-note">
                    النسخة تحتوي على بيانات المتدربين وبيانات التشغيل. احفظها في
                    مكان خاص.
                  </p>
                  <div className="cloud-backup-controls">
                    <button
                      id="import-legacy"
                      type="button"
                      data-i18n="importLegacy"
                    >
                      استيراد بيانات المتصفح القديمة
                    </button>
                    <button
                      id="export-data"
                      type="button"
                      data-i18n="exportBackup"
                    >
                      تنزيل نسخة احتياطية
                    </button>
                    <label className="file-upload-field">
                      <span className="file-upload-label-text">
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ color: "var(--blue)" }}
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span data-i18n="restoreFile">
                          Choose a TrainFlow backup JSON file
                        </span>
                        <span className="file-upload-badge">.JSON</span>
                      </span>
                      <input
                        id="restore-file"
                        type="file"
                        accept=".json,application/json"
                      />
                    </label>
                    <button
                      id="restore-button"
                      type="button"
                      disabled
                      data-i18n="restoreButton"
                    >
                      Restore data
                    </button>
                  </div>
                  <p
                    id="restore-preview"
                    className="ops-status"
                    role="status"
                    aria-live="polite"
                  ></p>
                </div>

                <details
                  className="settings-card"
                  id="audit-details"
                  style={{
                    marginTop: "16px",
                    boxShadow: "none",
                    borderColor: "#E2E8F0",
                  }}
                >
                  <summary
                    data-i18n="activityTitle"
                    style={{
                      cursor: "pointer",
                      fontWeight: "700",
                      color: "var(--blue-600)",
                      fontSize: "14px",
                    }}
                  >
                    Recent activity
                  </summary>
                  <div id="audit-list" className="ops-list"></div>
                </details>
              </div>
            </details>
          </div>
        </section>
      </div>
    </section>
  );
}
