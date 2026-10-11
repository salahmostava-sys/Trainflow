import * as React from "react";
import { SelectOptions } from "./WorkspaceDataViews";

export function WorksheetDialog() {
  return (
    <>
      <h3 id="sheet-worksheet-title" />
      <input id="sheet-worksheet-name" type="text" maxLength={100} dir="auto" />
      <select id="sheet-worksheet-target" />
      <label className="sheet-file-checkbox">
        <input id="sheet-worksheet-copy" type="checkbox" />
        <span id="sheet-worksheet-copy-caption" />
      </label>
      <input id="sheet-worksheet-color" type="color" defaultValue="#0070f3" />
      <label className="sheet-file-checkbox">
        <input id="sheet-worksheet-clear-color" type="checkbox" />
        <span id="sheet-worksheet-clear-caption" />
      </label>
      <p id="sheet-worksheet-status" role="status" />
      <div className="sheet-dialog-footer">
        <button type="button" id="sheet-worksheet-cancel" />
        <button
          type="button"
          id="sheet-worksheet-apply"
          className="sheet-primary"
        />
      </div>
    </>
  );
}
export interface WorksheetTabsProps {
  sheets: { sheet_id: string; sheet_name: string; tab_color?: string | null }[];
  selected: string;
  loaded: boolean;
  addLabel: string;
  choose(sheet: string): void;
  rename(sheet: string): void;
  add(): void;
}
export function WorksheetTabs(props: WorksheetTabsProps) {
  return (
    <>
      {props.sheets.map((sheet) => (
        <button
          type="button"
          key={sheet.sheet_id}
          data-sheet-id={sheet.sheet_id}
          role="tab"
          aria-selected={sheet.sheet_id === props.selected}
          disabled={!props.loaded}
          style={
            sheet.tab_color ? { borderBottomColor: sheet.tab_color } : undefined
          }
          onClick={() => props.choose(sheet.sheet_id)}
          onDoubleClick={() => props.rename(sheet.sheet_id)}
        >
          {sheet.sheet_name}
        </button>
      ))}
      <button
        type="button"
        id="sheet-worksheet-add"
        disabled={!props.loaded}
        title={props.addLabel}
        aria-label={props.addLabel}
        onClick={props.add}
      >
        +
      </button>
    </>
  );
}
export function CertificateDialog({ headers }: { headers: string[] }) {
  return (
    <>
      <div className="sheet-file-header">
        <h3 id="sheet-certificate-title" />
        <button id="sheet-certificate-close" type="button">
          ×
        </button>
      </div>
      <p id="sheet-certificate-hint" />
      <form className="sheet-certificate-fields">
        {headers.map((heading, column) => (
          <label key={heading} dir="ltr">
            {heading}
            <input
              id={"sheet-certificate-field-" + column}
              type="text"
              dir="ltr"
              aria-label={heading}
              maxLength={2000}
              readOnly={column !== 6}
              required={column === 6}
              autoComplete={column === 6 ? "off" : undefined}
            />
          </label>
        ))}
        <label>
          <span id="sheet-certificate-score-caption" />
          <input
            id="sheet-certificate-score"
            type="text"
            inputMode="decimal"
            dir="ltr"
            maxLength={8}
          />
        </label>
        <button
          id="sheet-certificate-export"
          type="submit"
          className="sheet-primary"
        />
      </form>
      <p id="sheet-certificate-status" role="status" />
    </>
  );
}
export function ExcelFileDialog() {
  return (
    <>
      <div className="sheet-file-header">
        <h3 id="sheet-xlsx-title" />
        <button id="sheet-xlsx-close" type="button" />
      </div>
      <label>
        <span id="sheet-xlsx-mode-caption" />
        <select id="sheet-xlsx-mode" aria-describedby="sheet-xlsx-mode-hint" />
      </label>
      <p id="sheet-xlsx-mode-hint" className="sheet-local-note" />
      <label>
        <span id="sheet-xlsx-file-caption" />
        <input
          id="sheet-xlsx-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
      </label>
      <label id="sheet-xlsx-sheet-label" hidden>
        <span id="sheet-xlsx-sheet-caption" />
        <select id="sheet-xlsx-sheet" />
      </label>
      <label
        id="sheet-xlsx-headers-label"
        className="sheet-file-checkbox"
        hidden
      >
        <input id="sheet-xlsx-headers" type="checkbox" />
        <span id="sheet-xlsx-headers-caption" />
      </label>
      <p id="sheet-xlsx-status" role="status" aria-live="polite" />
      <div id="sheet-xlsx-preview" className="sheet-file-preview" />
      <button
        id="sheet-xlsx-apply"
        type="button"
        className="sheet-primary"
        disabled
      />
    </>
  );
}
export function DataPreview({
  headings,
  rows,
  note,
}: {
  headings: string[];
  rows: string[][];
  note?: string;
}) {
  if (!headings.length) return null;
  return (
    <>
      <table>
        <thead>
          <tr>
            {headings.map((heading, index) => (
              <th key={index}>{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {headings.map((_, column) => (
                <td key={column}>{row[column] ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p>{note}</p>}
    </>
  );
}
export function PrometricDialog({ extensionURL }: { extensionURL: string }) {
  return (
    <>
      <div className="sheet-file-header">
        <h3 id="sheet-prometric-title" />
        <button type="button" id="sheet-prometric-close">
          ×
        </button>
      </div>
      <p id="sheet-prometric-connection" role="status" />
      <div className="sheet-prometric-setup">
        <a id="sheet-prometric-download" href={extensionURL} download />
        <p id="sheet-prometric-instructions" />
      </div>
      <p id="sheet-prometric-summary" role="status" />
      <p id="sheet-prometric-account-help" hidden />
      <div id="sheet-prometric-preview" className="sheet-file-preview" />
      <section id="sheet-prometric-account-comparison" hidden>
        <div className="sheet-prometric-comparison-header">
          <h4 id="sheet-prometric-comparison-title" />
          <select id="sheet-prometric-account-source" />
          <button type="button" id="sheet-prometric-comparison-close">×</button>
        </div>
        <div id="sheet-prometric-account-records" />
        <button type="button" id="sheet-prometric-reuse-account" />
      </section>
      <div className="sheet-prometric-actions">
        <button
          type="button"
          id="sheet-prometric-start"
          className="sheet-primary"
        />
        <button type="button" id="sheet-prometric-refresh" />
        <button type="button" id="sheet-prometric-stop" />
        <button type="button" id="sheet-prometric-recover" />
      </div>
      <p id="sheet-prometric-status" role="status" />
      <div className="sheet-file-preview" id="sheet-prometric-results" />
    </>
  );
}
export function RegistrationPreview({
  rows,
  headings,
  labels,
  page,
  disabled,
  changeAccount,
  changePage,
  copyAccount,
  inspectAccount,
}: {
  rows: {
    row: number;
    name: string;
    email: string;
    username: string;
    hasAccount: boolean;
    hasOwnAccount: boolean;
    mode: string;
    status: string;
  }[];
  headings: string[];
  labels: {
    reuse: string;
    create: string;
    copy: string;
    account: string;
    previous: string;
    next: string;
    page: string;
    inspect: string;
  };
  page: number;
  disabled: boolean;
  changeAccount(row: number, mode: string): void;
  changePage(page: number): void;
  copyAccount(row: number): Promise<void>;
  inspectAccount(row: number): void;
}) {
  if (!rows.length) return null;
  const pageSize = 50,
    pages = Math.ceil(rows.length / pageSize),
    currentPage = Math.min(page, pages - 1);
  return (
    <>
      <table>
        <thead>
          <tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((row) => (
            <tr key={row.row} className={row.hasAccount ? "sheet-prometric-existing-account" : undefined}>
              <td>{row.row + 1}</td>
              <td>{row.name}</td>
              <td><bdi>{row.email}</bdi></td>
              <td><bdi>{row.username || "—"}</bdi></td>
              <td>
                {row.hasAccount ? (
                  <div className="sheet-prometric-row-choice">
                    <select
                      aria-label={labels.account + " " + (row.row + 1)}
                      value={row.mode}
                      disabled={disabled}
                      onChange={(event) => changeAccount(row.row, event.currentTarget.value)}
                    >
                      <option value="reuse">{labels.reuse}</option>
                      <option value="new">{labels.create}</option>
                    </select>
                    <button type="button" disabled={disabled} onClick={() => inspectAccount(row.row)}>
                      {labels.inspect}
                    </button>
                    {row.hasOwnAccount && <button
                      type="button"
                      aria-label={labels.copy + " " + (row.row + 1)}
                      disabled={disabled}
                      onClick={() => { void copyAccount(row.row); }}
                    >
                      {labels.copy}
                    </button>}
                  </div>
                ) : labels.create}
              </td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="sheet-prometric-pagination">
          <button type="button" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>
            {labels.previous}
          </button>
          <span role="status">{labels.page} {currentPage + 1} / {pages}</span>
          <button type="button" disabled={currentPage === pages - 1} onClick={() => changePage(currentPage + 1)}>
            {labels.next}
          </button>
        </div>
      )}
    </>
  );
}
export interface RegistrationRow {
  id: string;
  name: string;
  status: string;
  actions: { label: string; run(): Promise<void> }[];
}
export function RegistrationResults({
  headings,
  rows,
}: {
  headings: string[];
  rows: RegistrationRow[];
}) {
  if (!rows.length) return null;
  return (
    <table>
      <thead>
        <tr>
          {headings.map((heading) => (
            <th key={heading}>{heading}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>{row.status}</td>
            <td>
              {row.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    void action.run();
                  }}
                >
                  {action.label}
                </button>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export function CodesExportDialog() {
  return (
    <>
      <div className="sheet-file-header">
        <h3 id="codes-export-title" />
        <button id="codes-export-close" type="button" />
      </div>
      <label>
        <span id="codes-export-mode-label" />
        <select id="codes-export-mode">
          <SelectOptions
            options={[
              { value: "remaining", label: "" },
              { value: "all", label: "" },
            ]}
          />
        </select>
      </label>
      <label>
        <span id="codes-export-scope-label" />
        <select id="codes-export-scope">
          <SelectOptions
            options={[
              { value: "all", label: "" },
              { value: "current", label: "" },
            ]}
          />
        </select>
      </label>
      <p id="codes-export-status" role="status" aria-live="polite" />
      <button id="codes-export-save" className="sheet-primary" type="button" />
    </>
  );
}
