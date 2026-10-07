function ColumnResize({ column }: { column: number }) {
  return (
    <span
      className="voucher-col-resizer"
      data-column={column}
      tabIndex={0}
      role="separator"
      aria-orientation="vertical"
    />
  );
}

export function VouchersScreen({ active = false }: { active?: boolean }) {
  return (
    <section className={active ? "panel active" : "panel"} id="panel-codes">
      <div className="stats-row">
        <div className="stats" id="code-stats"></div>
        <div className="report-shortcuts">
          <button
            className="icon-pill-btn"
            id="codes-export-open"
            type="button"
            data-i18n="codesExport"
          >
            تصدير الأكواد
          </button>
          <details className="report-card" id="daily-used-details">
            <summary data-i18n="dailyUsedTitle">Codes used on a day</summary>
          </details>
        </div>
      </div>
      <div className="report-panel" id="daily-used-panel" hidden>
        <div className="report-body">
          <label className="daily-used-date">
            <span data-i18n="chooseUsedDate">Choose a date</span>
            <input id="daily-used-date" type="date" />
          </label>
          <div id="daily-used-results"></div>
        </div>
      </div>

      <div className="code-tabs-bar">
        <div className="code-tabs" id="code-cat-tabs"></div>
      </div>
      <div className="bulk-bar" id="bulk-bar">
        <div className="bulk-bar-left">
          <button className="clear-sel" id="clear-sel-btn" data-i18n="clear">
            Clear
          </button>
          <span id="bulk-count"></span>
        </div>
        <button
          className="confirm-btn"
          id="bulk-delete-btn"
          data-i18n="deleteSelected"
        >
          Delete Selected
        </button>
      </div>

      <div className="code-sheet compact">
        <div
          className="code-sheet-scroll"
          id="code-sheet-viewport"
          tabIndex={0}
          role="region"
          aria-label="VOUCHERS"
        >
          <div className="code-sheet-head">
            <div className="col-check">
              <input
                type="checkbox"
                id="select-all-codes"
                aria-label="تحديد جميع الأكواد"
              />
              <ColumnResize column={0} />
            </div>
            <div className="col-n">
              #<ColumnResize column={1} />
            </div>
            <div className="col-code">
              <span data-i18n="colCode">Code</span>
              <ColumnResize column={2} />
            </div>
            <div className="col-date">
              <span data-i18n="colDate">Date</span>
              <ColumnResize column={3} />
            </div>
            <div className="col-trainee-name">
              <span data-i18n="colTraineeName">Trainee name</span>
              <ColumnResize column={4} />
            </div>
            <div className="col-notes">
              <span data-i18n="colNotes">Notes</span>
              <ColumnResize column={5} />
            </div>
            <div className="col-actions">
              <ColumnResize column={6} />
            </div>
          </div>
          <div className="code-list" id="code-grid"></div>
        </div>
      </div>
      <details className="add-box">
        <summary data-i18n="addNewCodes">
          + Add new codes to this category
        </summary>
        <div className="hint" data-i18n="pasteHint">
          Paste codes, one per line
        </div>
        <textarea
          id="add-codes-input"
          placeholder="IBTAMEAF-XXXX-XXXX"
          aria-label="إضافة أكواد جديدة"
        ></textarea>
        <br />
        <button className="save" id="add-codes-btn" data-i18n="addBtn">
          Add
        </button>
      </details>
    </section>
  );
}
