import { TraineeDetailDialogs } from "./TraineeDetails";
import { SheetRibbon } from "./SheetRibbon";
import { SheetToolDialogs } from "./SheetToolDialogs";
export function TraineesScreen({ active = false }: { active?: boolean }) {
  return (
    <>
      <section
        className={active ? "panel active" : "panel"}
        id="panel-trainees"
      >
        <div className="sheet-heading">
          <div>
            <h2 id="sheet-title"></h2>
            <p id="sheet-subtitle"></p>
          </div>
        </div>
        <div id="sheet-workspace" className="sheet-card">
          <div id="sheet-extension-update" role="status" hidden>
            <span id="sheet-extension-update-message" />
            <a id="sheet-extension-update-download" download />
          </div>
          <div className="sheet-expanded-bar">
            <button type="button" id="sheet-expanded-close">
              {"رجوع للعرض العادي"}
            </button>
            <button
              type="button"
              id="sheet-expanded-tools"
              aria-pressed="false"
            >
              {"الأدوات"}
            </button>
            <output id="sheet-visible-rows" role="status"></output>
          </div>
          <section
            id="sheet-report-panel"
            className="sheet-tools sheet-report-panel"
          />
          <SheetRibbon />
          <div className="sheet-filters">
            <div className="sheet-search-group">
              <input
                id="sheet-address"
                defaultValue="A1"
                aria-label="عنوان الخلية / Cell address"
                title="D150"
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
              />
              <input
                id="sheet-cell-content"
                type="text"
                disabled
                maxLength={2000}
                dir="auto"
                autoComplete="off"
                spellCheck={false}
              />
              <input id="sheet-search" type="search" />
            </div>
            <input id="sheet-org" type="search" />
            <input id="sheet-date" type="search" />
            <select id="sheet-result"></select>
            <label
              className="sheet-duplicates-filter"
              id="sheet-duplicates-filter"
            >
              <input type="checkbox" id="sheet-duplicates-only" />
              <span id="sheet-duplicates-label"></span>
              <span
                id="sheet-duplicates-count"
                className="sheet-duplicates-badge"
              >
                {"0"}
              </span>
            </label>
            <button type="button" id="sheet-clear-filters"></button>
          </div>
          <div className="sheet-scroll">
            <table
              className="sheet-grid"
              id="sheet-grid"
              role="grid"
              aria-label="Trainees"
            >
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
          <div
            id="sheet-worksheet-tabs"
            className="sheet-worksheet-tabs"
            role="tablist"
            aria-label="Worksheets"
          />
          <div className="sheet-footer">
            <div className="sheet-add-rows-bar">
              <span id="sheet-add-prefix"></span>
              <input
                type="number"
                id="sheet-add-bulk-count"
                defaultValue="1000"
                min="1"
                max="100000"
                step="100"
                className="sheet-add-bulk-input"
                aria-label="عدد الصفوف المراد إضافتها"
              />
              <span id="sheet-add-suffix"></span>
              <button
                type="button"
                id="sheet-add-bulk-btn"
                className="sheet-primary"
              ></button>
            </div>
            <div className="sheet-footer-stats">
              <span
                id="sheet-selection-stats"
                className="sheet-selection-stats"
                hidden={true}
              ></span>
              <span id="sheet-count"></span>
            </div>
            <p id="sheet-help"></p>
            <div className="sheet-zoom-tools" dir="ltr">
              <button type="button" id="sheet-expanded" aria-pressed="false" />
              <span id="sheet-zoom-label"></span>
              <button type="button" id="sheet-zoom-out">
                {"−"}
              </button>
              <input
                type="range"
                id="sheet-zoom-slider"
                min="50"
                max="200"
                step="1"
                defaultValue="100"
              />
              <button type="button" id="sheet-zoom-in">
                {"+"}
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                id="sheet-zoom-reset"
                defaultValue="100%"
              />
            </div>
          </div>
        </div>
        <div id="sheet-code-workspace" hidden={true}>
          <div className="sheet-code-tools" id="sheet-code-admin" hidden={true}>
            <button type="button" id="sheet-owned"></button>
            <button type="button" id="sheet-pool"></button>
            <button
              type="button"
              id="sheet-assign"
              className="sheet-primary"
            ></button>
          </div>
          <div className="sheet-code-tools">
            <input id="sheet-code-search" type="search" />
            <button type="button" id="sheet-code-refresh"></button>
            <span id="sheet-code-count"></span>
          </div>
          <p className="sheet-notice" id="sheet-code-notice"></p>
          <div
            className="sheet-card sheet-code-list"
            id="sheet-code-list"
          ></div>
          <p id="sheet-code-status" role="status"></p>
        </div>
      </section>
      <div id="sheet-context-menu" className="sheet-context-menu" hidden>
        <button type="button" data-action="cut">
          <span>
            {"✂️ "}
            <span className="sheet-menu-label"></span>
          </span>
          <span className="sheet-menu-shortcut">{"Ctrl+X"}</span>
        </button>
        <button type="button" data-action="copy">
          <span>
            {"📋 "}
            <span className="sheet-menu-label"></span>
          </span>
          <span className="sheet-menu-shortcut">{"Ctrl+C"}</span>
        </button>
        <button type="button" data-action="paste">
          <span>
            {"📄 "}
            <span className="sheet-menu-label"></span>
          </span>
          <span className="sheet-menu-shortcut">{"Ctrl+V"}</span>
        </button>
        <hr />
        <button type="button" data-action="insert-above">
          <span>
            {"⬆️ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="insert-below">
          <span>
            {"⬇️ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="insert-1000">
          <span>
            {"➕ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="delete-row">
          <span>
            {"🗑️ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="row-height">
          <span>
            {"↕ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="insert-column-left">
          <span>
            {"← "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="insert-column-right">
          <span>
            {"→ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="delete-column">
          <span>
            {"🗑️ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <hr />
        <button type="button" data-action="clear-contents">
          <span>
            {"🧹 "}
            <span className="sheet-menu-label"></span>
          </span>
          <span className="sheet-menu-shortcut">{"Del"}</span>
        </button>
        <button type="button" data-action="delete-left">
          <span>
            {"← "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="delete-right">
          <span>
            {"→ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <button type="button" data-action="clear-format">
          <span>
            {"✨ "}
            <span className="sheet-menu-label"></span>
          </span>
        </button>
        <hr />
        <button type="button" data-action="select-all">
          <span>
            {"☑️ "}
            <span className="sheet-menu-label"></span>
          </span>
          <span className="sheet-menu-shortcut">{"Ctrl+A"}</span>
        </button>
      </div>
      <dialog id="sheet-exam-dialog" className="sheet-file-dialog sheet-prometric-dialog" aria-labelledby="sheet-exam-title" />
      <dialog
        id="sheet-find-dialog"
        className="sheet-find-dialog"
        aria-labelledby="sheet-find-title"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "10px",
          }}
        >
          <h3
            id="sheet-find-title"
            style={{ margin: "0", fontSize: "15px", fontWeight: "700" }}
          ></h3>
          <button
            type="button"
            id="sheet-find-close"
            style={{
              border: "0",
              background: "transparent",
              fontSize: "18px",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "2px 8px",
              lineHeight: "1",
            }}
            aria-label="Close"
          >
            {"✕"}
          </button>
        </div>
        <div className="sheet-find-body">
          <div className="sheet-find-row">
            <label htmlFor="sheet-find-input" id="sheet-find-label"></label>
            <input
              type="text"
              id="sheet-find-input"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="sheet-find-row">
            <label
              htmlFor="sheet-replace-input"
              id="sheet-replace-label"
            ></label>
            <input
              type="text"
              id="sheet-replace-input"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="sheet-find-options">
            <label>
              <input type="checkbox" id="sheet-find-case" />
              <span id="sheet-find-case-label"></span>
            </label>
            <label>
              <input type="checkbox" id="sheet-find-entire" />
              <span id="sheet-find-entire-label"></span>
            </label>
          </div>
          <p
            id="sheet-find-status"
            className="sheet-find-status"
            role="status"
          ></p>
          <div className="sheet-find-actions">
            <button
              type="button"
              id="sheet-find-next"
              className="sheet-primary"
            ></button>
            <button type="button" id="sheet-find-replace-one"></button>
            <button type="button" id="sheet-find-replace-all"></button>
          </div>
        </div>
      </dialog>
      <dialog
        id="sheet-prometric-dialog"
        className="sheet-file-dialog sheet-prometric-dialog"
        aria-labelledby="sheet-prometric-title"
      />
      <dialog
        id="sheet-worksheet-dialog"
        className="sheet-file-dialog sheet-worksheet-dialog"
        aria-labelledby="sheet-worksheet-title"
      />
      <dialog
        id="sheet-certificate-dialog"
        className="sheet-file-dialog sheet-certificate-dialog"
        aria-labelledby="sheet-certificate-title"
      />
      <dialog
        id="sheet-xlsx-dialog"
        className="sheet-file-dialog"
        aria-labelledby="sheet-xlsx-title"
      />
      <dialog
        id="codes-export-dialog"
        className="sheet-file-dialog"
        aria-labelledby="codes-export-title"
      />
      <SheetToolDialogs />
      <TraineeDetailDialogs />
      <div id="sheet-report-preview-root" />
    </>
  );
}
