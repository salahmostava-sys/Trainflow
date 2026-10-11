export function ReportPanel() {
  return (
    <>
      <div className="sheet-report-actions">
        <label className="sheet-report-date">
          <span data-ar="تاريخ التقرير" data-en="Report date" />
          <input type="date" data-field="date" />
        </label>
        <button type="button" data-action="operations" data-ar="نسخ تقرير العمليات" data-en="Copy operations report" />
        <button type="button" data-action="success" data-ar="نسخ تقرير الناجحين" data-en="Copy successful trainees report" />
      </div>
      <p role="status" aria-live="polite" />
    </>
  );
}
