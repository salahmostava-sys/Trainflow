import * as React from "react";

export interface DetailField {
  label: string;
  copyName?: string;
  value: string;
  display?: string;
  direction?: string;
  className?: string;
  result?: string;
  empty?: string;
  note?: string;
  editor?: {
    saveLabel: string;
    save(value: string): Promise<void>;
  };
  action?: {
    label: string;
    title: string;
    ariaLabel: string;
    disabled: boolean;
    run(button: HTMLButtonElement): Promise<void>;
  };
}
interface DetailRecord {
  title?: string;
  fields: DetailField[];
}
interface DetailRecordsProps {
  records: DetailRecord[];
  copyLabel: string;
  copyTitle: string;
  copy(value: string): Promise<void>;
}
function DetailEditor({ field }: { field: DetailField }) {
  const [draft, setDraft] = React.useState(field.value);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  async function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await field.editor!.save(draft);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="sheet-detail-editor" onSubmit={saveDraft}>
      <input
        aria-label={field.label}
        dir="ltr"
        inputMode="numeric"
        maxLength={2000}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      <button type="submit" disabled={saving}>{field.editor!.saveLabel}</button>
      {error && <span role="alert">{error}</span>}
    </form>
  );
}
function DetailValue({
  field,
  copyLabel,
  copyTitle,
  copy,
}: { field: DetailField } & Pick<
  DetailRecordsProps,
  "copyLabel" | "copyTitle" | "copy"
>) {
  if (field.editor) return <DetailEditor field={field} />;
  if (field.action)
    return (
      <button
        type="button"
        className="sheet-get-exam-code"
        dir="ltr"
        disabled={field.action.disabled}
        aria-label={field.action.ariaLabel}
        title={field.action.title}
        onClick={(event) => {
          void field.action!.run(event.currentTarget);
        }}
      >
        {field.action.label}
      </button>
    );
  if (!field.value) return <span>{field.empty || "—"}</span>;
  return (
    <button
      type="button"
      className={"sheet-detail-copy-value " + (field.className || "")}
      dir={field.direction || "auto"}
      data-result={field.result}
      title={copyTitle + (field.copyName || field.label)}
      aria-label={copyLabel + (field.copyName || field.label)}
      onClick={() => {
        void copy(field.value);
      }}
    >
      {field.display ?? field.value}
    </button>
  );
}
export function DetailRecords(props: DetailRecordsProps) {
  return (
    <>
      {props.records.map((record, index) => (
        <section key={index} className="sheet-detail-record">
          {record.title && <h3>{record.title}</h3>}
          <dl>
            {record.fields.map((field, column) => (
              <React.Fragment key={column}>
                <dt dir="auto">{field.label}</dt>
                <dd
                  dir={field.direction || "auto"}
                  className={
                    field.className === "sheet-detail-category"
                      ? "sheet-detail-category-value"
                      : undefined
                  }
                >
                  <DetailValue field={field} {...props} />
                  {field.note && <div>{field.note}</div>}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}
interface DuplicateHintProps {
  title: string;
  identity: string;
  note: string;
  records: DetailRecord[];
}
export function DuplicateHint(props: DuplicateHintProps) {
  return (
    <>
      <strong>{props.title}</strong>
      <div className="sheet-detail-id" dir="ltr">
        {props.identity}
      </div>
      {props.records.map((record, index) => (
        <div key={index} className="sheet-hint-record">
          <strong>{record.title}</strong>
          <dl>
            {record.fields.map((field, column) => (
              <React.Fragment key={column}>
                <dt>{field.label}</dt>
                <dd dir="auto">
                  <span
                    className={
                      field.result !== undefined
                        ? "sheet-detail-result"
                        : undefined
                    }
                    dir={field.result !== undefined ? "rtl" : undefined}
                    data-result={field.result}
                  >
                    {field.value || "—"}
                  </span>
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      ))}
      <p>{props.note}</p>
    </>
  );
}
export function TraineeDetailDialogs() {
  return (
    <>
      <dialog
        id="sheet-trainee-dialog"
        className="sheet-duplicate-dialog sheet-trainee-dialog"
        aria-labelledby="sheet-trainee-title"
      >
        <div className="sheet-detail-header">
          <h2 id="sheet-trainee-title" />
          <button type="button" className="sheet-detail-close">
            ×
          </button>
        </div>
        <div id="sheet-trainee-record" className="sheet-detail-record" />
      </dialog>
      <div
        id="sheet-duplicate-hint"
        className="sheet-duplicate-hint"
        role="tooltip"
        hidden
      />
      <dialog
        id="sheet-duplicate-dialog"
        className="sheet-duplicate-dialog"
        aria-labelledby="sheet-duplicate-title"
      >
        <div className="sheet-detail-header">
          <h2 id="sheet-duplicate-title" />
          <button type="button" className="sheet-detail-close">
            ×
          </button>
        </div>
        <p id="sheet-duplicate-description" />
        <div id="sheet-duplicate-records" />
        <div className="sheet-detail-footer">
          <button type="button" id="sheet-detail-prev">
            ‹
          </button>
          <span id="sheet-detail-page" />
          <button type="button" id="sheet-detail-next">
            ›
          </button>
        </div>
      </dialog>
    </>
  );
}
