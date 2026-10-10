import * as React from "react";

type ReportKind = "operations" | "success";
interface ReportPreviewProps {
  rows: string[][];
  date: string;
  missing: number;
  columns: Record<ReportKind, [string, number | null][]>;
  language: string;
  upload(
    kind: ReportKind,
    status: (message: string, failed?: boolean) => void,
    date?: string,
  ): Promise<void>;
  close(): void;
  onDateChange?(date: string): void;
}

export function ReportPanel() {
  return (
    <>
      <div className="sheet-report-actions">
        <strong data-ar="تقارير جوجل اليومية" data-en="Daily Google reports" />
        <button type="button" data-action="date" />
        <button
          type="button"
          data-action="preview"
          data-ar="معاينة التقرير"
          data-en="Preview report"
        />
      </div>
      <span className="sheet-report-state" />
      <div popover="auto" className="sheet-report-date-picker">
        <label>
          <span data-ar="تاريخ التقرير" data-en="Report date" />
          <input type="date" data-field="date" />
        </label>
        <button
          type="button"
          data-action="apply-date"
          data-ar="اختيار التاريخ"
          data-en="Choose date"
        />
      </div>
      <p role="status" aria-live="polite" />
    </>
  );
}

export function ReportPreview(props: ReportPreviewProps) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const viewport = React.useRef<HTMLDivElement>(null);
  const [kind, setKind] = React.useState<ReportKind>("operations");
  const [page, setPage] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [status, setStatus] = React.useState<{
    message: string;
    failed?: boolean;
  } | null>(null);
  const tr = (ar: string, en: string) => (props.language === "ar" ? ar : en);
  const reportDate = props.date.split("-").reverse().join("/");
  const passed = props.rows.filter((row) => row[11] === "ناجح");
  const records = kind === "success" ? passed : props.rows;
  const voucherIds = props.rows.map((row) =>
    String(row[0] || "")
      .trim()
      .toUpperCase(),
  );
  const duplicates = voucherIds.length - new Set(voucherIds).size;
  const warning = [
    duplicates
      ? tr(
          "يوجد فاوتشر مكرر في أكثر من صف؛ صحح التكرار قبل الرفع.",
          "A voucher appears in multiple rows; correct duplicates before uploading.",
        )
      : "",
    props.missing
      ? tr(
          "فاوتشرات مستخدمة بدون بيانات متدرب: ",
          "Used vouchers without trainee data: ",
        ) + props.missing
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const title =
    kind === "operations"
      ? tr("تقرير العمليات", "Operations report")
      : tr("تقرير الناجحين", "Successful trainees report");
  const uploadText =
    kind === "operations"
      ? tr("رفع تقرير العمليات", "Upload operations report")
      : tr("رفع تقرير الناجحين", "Upload successful trainees");
  React.useLayoutEffect(() => {
    dialog.current!.showModal();
  }, []);
  React.useLayoutEffect(() => {
    viewport.current!.scrollTop = 0;
  }, [kind, page]);
  const upload = async () => {
    if (uploading) return;
    setUploading(true);
    setStatus({ message: "" });
    try {
      await props.upload(
        kind,
        (message, failed) => setStatus({ message, failed }),
        props.date,
      );
    } finally {
      setUploading(false);
    }
  };
  const copyReport = async () => {
    const headers = props.columns[kind].map(([heading]) => heading);
    const lines = [
      headers.join("\t"),
      ...records.map((row) =>
        props.columns[kind]
          .map(([, column]) =>
            column === null ? reportDate : String(row[column] || ""),
          )
          .join("\t"),
      ),
    ];
    try {
      const helper = (window as unknown as { copyText?: (t: string) => Promise<boolean> }).copyText;
      if (typeof helper === "function") {
        await helper(lines.join("\n"));
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(lines.join("\n"));
      }
      setStatus({
        message: tr(
          "تم نسخ بيانات التقرير — يمكنك لصقها مباشرة في Google Sheets.",
          "Report data copied — You can paste it directly into Google Sheets.",
        ),
        failed: false,
      });
    } catch {
      setStatus({
        message: tr("تعذر نسخ البيانات.", "Could not copy data."),
        failed: true,
      });
    }
  };
  const uploadButton = (
    <button
      type="button"
      className="sheet-primary sheet-report-upload-btn"
      data-action={kind}
      disabled={uploading || !records.length}
      onClick={() => {
        void upload();
      }}
    >
      {uploadText}
    </button>
  );
  return (
    <dialog
      ref={dialog}
      id="sheet-report-preview"
      className="sheet-report-preview"
      dir={props.language === "ar" ? "rtl" : "ltr"}
      aria-labelledby="sheet-report-preview-title"
      onClose={props.close}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          event.currentTarget.close();
      }}
    >
      <div className="sheet-report-preview-header">
        <h2 id="sheet-report-preview-title">
          {tr("معاينة تقرير Google Sheets", "Google Sheets report preview")}
        </h2>
        <button
          type="button"
          className="sheet-report-preview-close"
          onClick={() => dialog.current!.close()}
        >
          {tr("إغلاق", "Close")}
        </button>
      </div>
      <div className="sheet-report-preview-controls">
        <p className="sheet-report-preview-info">
          {tr("تاريخ التقرير: ", "Report date: ") +
            reportDate +
            tr(" — المحاولات: ", " — Attempts: ") +
            props.rows.length +
            tr(" — الناجحون: ", " — Passed: ") +
            passed.length}
        </p>
        <div className="sheet-report-date-changer">
          <label htmlFor="sheet-report-dialog-date">
            <span>📅 {tr("تغيير تاريخ التقرير:", "Change report date:")}</span>
          </label>
          <input
            id="sheet-report-dialog-date"
            type="date"
            className="sheet-report-date-input"
            value={props.date}
            disabled={uploading}
            onChange={(e) => {
              if (e.target.value && props.onDateChange) {
                props.onDateChange(e.target.value);
              }
            }}
          />
        </div>
      </div>
      <div
        className="sheet-report-preview-tabs"
        role="group"
        aria-label={tr("نوع التقرير", "Report type")}
      >
        {(["operations", "success"] as const).map((reportKind) => (
          <button
            key={reportKind}
            type="button"
            data-report-kind={reportKind}
            aria-pressed={kind === reportKind}
            disabled={uploading}
            onClick={() => {
              setKind(reportKind);
              setPage(0);
            }}
          >
            {reportKind === "operations"
              ? tr("تقرير العمليات", "Operations report")
              : tr("تقرير الناجحين", "Successful trainees report")}
          </button>
        ))}
        <span style={{ marginInlineStart: "auto", display: "inline-flex", gap: "8px" }}>
          <button
            type="button"
            className="sheet-report-copy-btn"
            disabled={uploading || !records.length}
            onClick={() => void copyReport()}
          >
            📋 {tr("نسخ بيانات التقرير", "Copy report data")}
          </button>
          {uploadButton}
        </span>
      </div>
      <p
        className="sheet-report-preview-status ops-status"
        role="status"
        aria-live="polite"
        hidden={!status}
        style={{ color: status?.failed ? "#b42318" : "#15803d" }}
      >
        {status?.message}
      </p>
      <p className="sheet-report-preview-note">
        {tr(
          "هذه بيانات التقرير من الشيت الحالي. عند الرفع يستبعد جوجل الفاوتشرات الموجودة مسبقًا في التقرير.",
          "These are the report values from the current sheet. Upload skips vouchers already in the Google report.",
        )}
      </p>
      <p className="sheet-report-preview-warning" hidden={!warning}>
        {warning}
      </p>
      <p
        className="sheet-report-preview-empty"
        role="status"
        hidden={!!records.length}
      >
        {tr(
          "لا توجد بيانات لهذا التقرير في التاريخ المختار.",
          "No records for this report on the selected date.",
        )}
      </p>
      <div
        ref={viewport}
        className="sheet-report-preview-table"
        tabIndex={0}
        role="region"
        aria-label={tr("بيانات التقرير", "Report data")}
        hidden={!records.length}
      >
        <table>
          <caption>{title}</caption>
          <thead>
            <tr>
              {props.columns[kind].map(([heading]) => (
                <th key={heading} scope="col">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.slice(page * 50, (page + 1) * 50).map((row, index) => (
              <tr key={index}>
                {props.columns[kind].map(([heading, column]) => (
                  <td key={heading} dir="auto">
                    {column === null ? reportDate : String(row[column] || "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sheet-report-preview-footer" hidden={!records.length}>
        <button
          type="button"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          {tr("السابق", "Previous")}
        </button>
        <span aria-live="polite">
          {tr("الصفوف: ", "Rows: ") +
            (page * 50 + 1) +
            "–" +
            Math.min((page + 1) * 50, records.length) +
            tr(" من ", " of ") +
            records.length}
        </span>
        <button
          type="button"
          disabled={(page + 1) * 50 >= records.length}
          onClick={() => setPage(page + 1)}
        >
          {tr("التالي", "Next")}
        </button>
        {uploadButton}
      </div>
    </dialog>
  );
}
