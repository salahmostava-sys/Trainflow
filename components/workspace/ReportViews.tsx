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
        <span className="sheet-ribbon-divider" aria-hidden="true" />
        <div className="sheet-prometric-actions">
          <button
            type="button"
            id="sheet-prometric-open"
            data-ar="تسجيل Prometric"
            data-en="Prometric registration"
          />
          <button
            type="button"
            id="sheet-exam-open"
            data-ar="جلب نتائج Prometric"
            data-en="Fetch Prometric results"
          />
          <button
            type="button"
            id="sheet-certificate-open"
            data-ar="تعديل اسم الشهادة"
            data-en="Certificate name change"
          />
        </div>
      </div>
      <p role="status" aria-live="polite" />
    </>
  );
}
