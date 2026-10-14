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

function cachedReportOrder(owner: string, kind: ReportKind, totalColumns: number): number[] {
  if (typeof window === "undefined") return [];
  try {
    const cached = JSON.parse(localStorage.getItem(`trainflow_report_order_${owner}`) || "null")?.[kind];
    return Array.isArray(cached) ? cached.filter(
      (column: unknown) => typeof column === "number" && Number.isInteger(column) && column >= 0 && column < totalColumns
    ) : [];
  } catch (error) {
    // The account order remains usable when optional device storage is blocked or corrupt.
    if (error instanceof DOMException || error instanceof SyntaxError) return [];
    throw error;
  }
}

export function ReportSettings(props: ReportSettingsProps) {
  const tr = (ar: string, en: string) => (props.language === "ar" ? ar : en);
  const preferencesKey = JSON.stringify(props.preferences);

  const resolveInitialOrder = (kind: ReportKind, saved: number[]): number[] => {
    const total = props.columns.length;
    const all = Array.from({ length: total }, (_, i) => i);
    const savedColumns = [...new Set(saved.filter(
      (column) => Number.isInteger(column) && column >= 0 && column < total
    ))];
    const cachedOrder = cachedReportOrder(props.owner, kind, total);
    const orderedColumns = [...new Set([...cachedOrder, ...all])];
    const selectedColumns = new Set(savedColumns);
    let savedIndex = 0;
    // Account preferences determine the copied order; cached slots retain unchecked columns.
    return orderedColumns.map((column) =>
      selectedColumns.has(column) ? savedColumns[savedIndex++] : column
    );
  };

  const [order, setOrder] = React.useState<Record<ReportKind, number[]>>(() => ({
    operations: resolveInitialOrder("operations", props.preferences?.operations),
    success: resolveInitialOrder("success", props.preferences?.success),
  }));

  const [checked, setChecked] = React.useState<Record<ReportKind, Set<number>>>(
    () => ({
      operations: new Set(props.preferences?.operations || []),
      success: new Set(props.preferences?.success || []),
    })
  );

  const [dragging, setDragging] = React.useState<{
    kind: ReportKind;
    index: number;
  } | null>(null);
  const [dragOver, setDragOver] = React.useState<{
    kind: ReportKind;
    index: number;
  } | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    const nextPrefs = JSON.parse(preferencesKey) as ReportColumns;
    setChecked({
      operations: new Set(nextPrefs.operations || []),
      success: new Set(nextPrefs.success || []),
    });
    setOrder({
      operations: resolveInitialOrder("operations", nextPrefs.operations),
      success: resolveInitialOrder("success", nextPrefs.success),
    });
    setStatus("");
  }, [preferencesKey, props.owner, props.columns.length]);

  const draft = {
    operations: order.operations.filter((column) => checked.operations.has(column)),
    success: order.success.filter((column) => checked.success.has(column)),
  };
  const dirty = JSON.stringify(draft) !== preferencesKey;

  const toggleColumn = (kind: ReportKind, column: number) => {
    setChecked((previous) => {
      const nextSet = new Set(previous[kind]);
      if (nextSet.has(column)) {
        nextSet.delete(column);
      } else {
        nextSet.add(column);
      }
      return { ...previous, [kind]: nextSet };
    });
  };

  const moveColumn = (kind: ReportKind, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setOrder((previous) => {
      const list = [...previous[kind]];
      if (fromIndex >= list.length || toIndex >= list.length) return previous;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      const nextOrder = { ...previous, [kind]: list };
      try {
        localStorage.setItem(
          `trainflow_report_order_${props.owner}`,
          JSON.stringify(nextOrder)
        );
      } catch {}
      return nextOrder;
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!draft.operations.length || !draft.success.length) {
      setStatus(
        tr(
          "اختر عمودًا واحدًا على الأقل لكل تقرير.",
          "Choose at least one column for each report."
        )
      );
      return;
    }
    setSaving(true);
    try {
      const saved = await props.save(draft);
      if (saved) {
        try {
          localStorage.setItem(
            `trainflow_report_order_${props.owner}`,
            JSON.stringify(order)
          );
        } catch {}
      }
      setStatus(
        saved
          ? tr(
              "تم حفظ أعمدة وترتيب التقريرين مع حسابك.",
              "Report columns and custom order saved with your account."
            )
          : tr(
              "تعذر حفظ الأعمدة. حاول مجددًا.",
              "Could not save columns. Please retry."
            )
      );
    } catch {
      setStatus(
        tr(
          "تعذر حفظ الأعمدة. حاول مجددًا.",
          "Could not save columns. Please retry."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ops-card" data-report-dirty={dirty} dir={props.language === "ar" ? "rtl" : "ltr"}>
      <h3>{tr("أعمدة نسخ التقارير", "Report copy columns")}</h3>
      <p>
        {tr(
          "اختر أعمدة كل تقرير بشكل مستقل. الاختيارات محفوظة مع حسابك على كل أجهزتك.",
          "Choose columns separately for each report. Your choices are saved with your account across devices."
        )}
      </p>
      <p>
        {tr(
          "يُنسخ محتوى الخلايا بدون عناوين بالترتيب المحدد لكل تقرير أدناه. يمكنك سحب الصفوف وإفلاتها لتقديم أي عمود في البداية كالجوال أو تأخيره حسب رغبتك.",
          "Cell values are copied without headers in the chosen order below. You can drag and drop rows to place any column first, such as phone number, or adjust the order as desired."
        )}
      </p>
      <form onSubmit={save}>
        <div className="sheet-report-column-groups">
          {(["operations", "success"] as const).map((kind) => (
            <fieldset key={kind} disabled={saving} id={"settings-report-" + kind}>
              <legend>
                {kind === "operations"
                  ? tr("تقرير العمليات", "Operations report")
                  : tr("تقرير الناجحين", "Successful trainees report")}
              </legend>
              <div className="sheet-report-column-options">
                {order[kind].map((column, index) => {
                  const isChecked = checked[kind].has(column);
                  const heading = props.columns[column] || "";
                  const checkedCols = order[kind].filter((c) => checked[kind].has(c));
                  const orderNum = isChecked ? checkedCols.indexOf(column) + 1 : 0;
                  const isDraggingThis =
                    dragging?.kind === kind && dragging?.index === index;
                  const isDragOverThis =
                    dragOver?.kind === kind && dragOver?.index === index;

                  return (
                    <div
                      key={column}
                      className={[
                        "sheet-report-column-row",
                        isDraggingThis ? "sheet-row-dragging" : "",
                        isDragOverThis ? "sheet-row-drag-over" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      draggable={!saving}
                      onDragStart={(e) => {
                        setDragging({ kind, index });
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", `${kind}:${index}`);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (
                          !dragOver ||
                          dragOver.kind !== kind ||
                          dragOver.index !== index
                        ) {
                          setDragOver({ kind, index });
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOver?.kind === kind && dragOver?.index === index) {
                          setDragOver(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(null);
                        if (
                          dragging &&
                          dragging.kind === kind &&
                          dragging.index !== index
                        ) {
                          moveColumn(kind, dragging.index, index);
                        }
                        setDragging(null);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDragOver(null);
                      }}
                    >
                      <span
                        className="sheet-report-drag-handle"
                        title={tr("اسحب لإعادة الترتيب", "Drag to reorder")}
                        aria-hidden="true"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <circle cx="5" cy="4" r="1.5" />
                          <circle cx="11" cy="4" r="1.5" />
                          <circle cx="5" cy="8" r="1.5" />
                          <circle cx="11" cy="8" r="1.5" />
                          <circle cx="5" cy="12" r="1.5" />
                          <circle cx="11" cy="12" r="1.5" />
                        </svg>
                      </span>


                      <label className="sheet-report-column-label">
                        <input
                          type="checkbox"
                          value={column}
                          checked={isChecked}
                          onChange={() => toggleColumn(kind, column)}
                        />
                        <span className="sheet-report-column-text">
                          <b dir="ltr">{String.fromCharCode(65 + column)}</b>
                          {" — "}
                          {heading}
                        </span>
                      </label>

                      <div className="report-reorder-actions">
                        {([-1, 1] as const).map((step) => (
                          <button
                            key={step}
                            type="button"
                            aria-label={(step < 0
                              ? tr("تحريك لأعلى: ", "Move up: ")
                              : tr("تحريك لأسفل: ", "Move down: ")) + heading}
                            disabled={saving || (step < 0 ? index === 0 : index === order[kind].length - 1)}
                            onClick={() => moveColumn(kind, index, index + step)}
                          >
                            {step < 0 ? "↑" : "↓"}
                          </button>
                        ))}
                      </div>

                      {isChecked && (
                        <span
                          className="sheet-report-order-badge"
                          title={tr(
                            `العمود رقم ${orderNum} في التقرير المنسوخ`,
                            `Column #${orderNum} in copied report`
                          )}
                        >
                          #{orderNum}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="submit"
          id="settings-report-save"
          disabled={saving || !props.owner}
        >
          {saving
            ? tr("جارٍ الحفظ…", "Saving…")
            : tr("حفظ أعمدة التقارير", "Save report columns")}
        </button>
        <p id="settings-report-status" className="ops-status" role="status">
          {status}
        </p>
      </form>
    </section>
  );
}
