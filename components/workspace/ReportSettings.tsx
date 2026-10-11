import * as React from "react";

type ReportKind = "operations" | "success";
type ReportColumns = Record<ReportKind, number[]>;
interface ReportSettingsProps {
  owner: string;
  columns: string[];
  preferences: ReportColumns;
  language: string;
  save(columns: ReportColumns): Promise<boolean>;
}

export function ReportSettings(props: ReportSettingsProps) {
  const [draft, setDraft] = React.useState(props.preferences);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const preferencesKey = JSON.stringify(props.preferences);
  const tr = (ar: string, en: string) => props.language === "ar" ? ar : en;
  React.useEffect(() => {
    setDraft(JSON.parse(preferencesKey));
    setStatus("");
  }, [preferencesKey]);

  const toggleColumn = (kind: ReportKind, column: number) => {
    setDraft(previous => ({
      ...previous,
      [kind]: previous[kind].includes(column)
        ? previous[kind].filter(index => index !== column)
        : [...previous[kind], column].sort((left, right) => left - right),
    }));
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!draft.operations.length || !draft.success.length) {
      setStatus(tr("اختر عمودًا واحدًا على الأقل لكل تقرير.", "Choose at least one column for each report."));
      return;
    }
    setSaving(true);
    try {
      const saved = await props.save(draft);
      setStatus(saved
        ? tr("تم حفظ أعمدة التقريرين مع حسابك.", "Report columns saved with your account.")
        : tr("تعذر حفظ الأعمدة. حاول مجددًا.", "Could not save columns. Please retry."));
    } catch {
      setStatus(tr("تعذر حفظ الأعمدة. حاول مجددًا.", "Could not save columns. Please retry."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="ops-card" dir={props.language === "ar" ? "rtl" : "ltr"}>
      <h3>{tr("أعمدة نسخ التقارير", "Report copy columns")}</h3>
      <p>{tr(
        "اختر أعمدة كل تقرير بشكل مستقل. الاختيارات محفوظة مع حسابك على كل أجهزتك.",
        "Choose columns separately for each report. Your choices are saved with your account across devices.",
      )}</p>
      <p>{tr(
        "يُنسخ محتوى الخلايا بدون عناوين وبترتيب الأعمدة في الجدول. التاريخ يحدد يوم استخدام الكود، وتقرير الناجحين يشمل نتيجة ناجح فقط.",
        "Cell values are copied without headers, in worksheet column order. The date selects the voucher usage day; the successful trainees report includes passed results only.",
      )}</p>
      <form onSubmit={save}>
        <div className="sheet-report-column-groups">
          {(["operations", "success"] as const).map(kind => (
            <fieldset key={kind} disabled={saving} id={"settings-report-" + kind}>
              <legend>{kind === "operations" ? tr("تقرير العمليات", "Operations report") : tr("تقرير الناجحين", "Successful trainees report")}</legend>
              <div className="sheet-report-column-options">
                {props.columns.map((heading, column) => (
                  <label key={column}>
                    <input type="checkbox" value={column} checked={draft[kind].includes(column)} onChange={() => toggleColumn(kind, column)} />
                    <span><b dir="ltr">{String.fromCharCode(65 + column)}</b>{" — "}{heading}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button type="submit" id="settings-report-save" disabled={saving || !props.owner}>
          {saving ? tr("جارٍ الحفظ…", "Saving…") : tr("حفظ أعمدة التقارير", "Save report columns")}
        </button>
        <p id="settings-report-status" className="ops-status" role="status">{status}</p>
      </form>
    </section>
  );
}
