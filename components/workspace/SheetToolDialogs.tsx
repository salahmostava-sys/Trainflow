import * as React from "react";
export function SheetToolDialogs() {
  return (
    <>
      <div
        id="sheet-border-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-border-menu-trigger"
      >
        <button
          type="button"
          id="sheet-border-menu-all"
          data-excel-ar="كل الحدود"
          data-excel-en="All borders"
          aria-label="كل الحدود"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-outline"
          data-excel-ar="حدود خارجية"
          data-excel-en="Outside borders"
          aria-label="حدود خارجية"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-none"
          data-excel-ar="بدون حدود"
          data-excel-en="No borders"
          aria-label="بدون حدود"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-top"
          data-excel-ar="علوي"
          data-excel-en="Top"
          aria-label="علوي"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-bottom"
          data-excel-ar="سفلي"
          data-excel-en="Bottom"
          aria-label="سفلي"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-left"
          data-excel-ar="يسار"
          data-excel-en="Left"
          aria-label="يسار"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-right"
          data-excel-ar="يمين"
          data-excel-en="Right"
          aria-label="يمين"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-border-menu-format"
          data-excel-ar="تنسيق الحدود…"
          data-excel-en="Format borders…"
          aria-label="تنسيق الحدود…"
          role="menuitem"
        ></button>
      </div>
      <div
        id="sheet-merge-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-merge-menu-trigger"
      >
        <button
          type="button"
          id="sheet-merge-menu-center"
          data-excel-ar="دمج وتوسيط"
          data-excel-en="Merge & Center"
          aria-label="دمج وتوسيط"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-merge-menu-across"
          data-excel-ar="دمج كل صف"
          data-excel-en="Merge Across"
          aria-label="دمج كل صف"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-merge-menu-cells"
          data-excel-ar="دمج الخلايا"
          data-excel-en="Merge Cells"
          aria-label="دمج الخلايا"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-merge-menu-unmerge"
          data-excel-ar="إلغاء الدمج"
          data-excel-en="Unmerge Cells"
          aria-label="إلغاء الدمج"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-merge-menu-selection"
          data-excel-ar="توسيط عبر التحديد"
          data-excel-en="Center Across Selection"
          aria-label="توسيط عبر التحديد"
          role="menuitem"
        ></button>
      </div>
      <div
        id="sheet-sort-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-sort-menu-trigger"
      >
        <button
          type="button"
          id="sheet-sort-menu-ascending"
          data-excel-ar="فرز من A إلى Z"
          data-excel-en="Sort A to Z"
          aria-label="فرز من A إلى Z"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-sort-menu-descending"
          data-excel-ar="فرز من Z إلى A"
          data-excel-en="Sort Z to A"
          aria-label="فرز من Z إلى A"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-sort-menu-custom"
          data-excel-ar="فرز مخصص…"
          data-excel-en="Custom Sort…"
          aria-label="فرز مخصص…"
          role="menuitem"
        ></button>
        <hr role="separator" />
        <button
          type="button"
          id="sheet-sort-menu-filter"
          data-excel-ar="إظهار / إخفاء الفلاتر"
          data-excel-en="Filter"
          aria-label="إظهار / إخفاء الفلاتر"
          role="menuitem"
          aria-pressed="true"
        ></button>
        <button
          type="button"
          id="sheet-sort-menu-clear-filters"
          data-excel-ar="مسح الفلاتر"
          data-excel-en="Clear"
          aria-label="مسح الفلاتر"
          role="menuitem"
          disabled={true}
        ></button>
        <button
          type="button"
          id="sheet-sort-menu-reapply"
          data-excel-ar="إعادة التطبيق"
          data-excel-en="Reapply"
          aria-label="إعادة التطبيق"
          role="menuitem"
          disabled={true}
        ></button>
        <hr role="separator" />
        <button
          type="button"
          id="sheet-sort-menu-clear"
          data-excel-ar="إلغاء الفرز"
          data-excel-en="Clear sort"
          aria-label="إلغاء الفرز"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-find-select-menu-all"
          data-excel-ar="تحديد الكل"
          data-excel-en="Select all"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-find-select-menu-row"
          data-excel-ar="تحديد الصف"
          data-excel-en="Select row"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-find-select-menu-column"
          data-excel-ar="تحديد العمود"
          data-excel-en="Select column"
          role="menuitem"
        ></button>
      </div>
      <div
        id="sheet-cell-format-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-cell-format-menu-trigger"
      >
        <div
          className="sheet-menu-heading"
          role="presentation"
          data-excel-ar="حجم الخلية"
          data-excel-en="Cell Size"
        ></div>
        <button
          type="button"
          id="sheet-cell-format-menu-row-height"
          data-excel-ar="ارتفاع الصف…"
          data-excel-en="Row Height…"
          aria-label="ارتفاع الصف…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-autofit-row"
          data-excel-ar="ضبط ارتفاع الصف تلقائيًا"
          data-excel-en="AutoFit Row Height"
          aria-label="ضبط ارتفاع الصف تلقائيًا"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-column-width"
          data-excel-ar="عرض العمود…"
          data-excel-en="Column Width…"
          aria-label="عرض العمود…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-autofit"
          data-excel-ar="ضبط عرض العمود تلقائيًا"
          data-excel-en="AutoFit Column Width"
          aria-label="ضبط عرض العمود تلقائيًا"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-default-width"
          data-excel-ar="العرض الافتراضي…"
          data-excel-en="Default Width…"
          aria-label="العرض الافتراضي…"
          role="menuitem"
        ></button>
        <hr role="separator" />
        <div
          className="sheet-menu-heading"
          role="presentation"
          data-excel-ar="الإظهار والإخفاء"
          data-excel-en="Visibility"
        ></div>
        <div
          id="sheet-cell-format-menu-visibility"
          className="sheet-command-dropdown sheet-command-submenu"
        >
          <button
            type="button"
            data-excel-ar="إخفاء وإظهار ▾"
            data-excel-en="Hide & Unhide ▾"
            id="sheet-cell-format-menu-visibility-trigger"
            aria-haspopup="menu"
            aria-controls="sheet-cell-format-menu-visibility-items"
            aria-expanded="false"
            data-submenu="true"
            aria-label="إخفاء وإظهار"
            role="menuitem"
          ></button>
          <div
            id="sheet-cell-format-menu-visibility-items"
            className="sheet-command-popover"
            popover="auto"
            role="menu"
            data-trigger="sheet-cell-format-menu-visibility-trigger"
          >
            <button
              type="button"
              id="sheet-cell-format-menu-hide-rows"
              data-excel-ar="إخفاء الصفوف"
              data-excel-en="Hide Rows"
              aria-label="إخفاء الصفوف"
              role="menuitem"
            ></button>
            <button
              type="button"
              id="sheet-cell-format-menu-show-rows"
              data-excel-ar="إظهار كل الصفوف"
              data-excel-en="Unhide Rows"
              aria-label="إظهار كل الصفوف"
              role="menuitem"
            ></button>
            <button
              type="button"
              id="sheet-cell-format-menu-hide-cols"
              data-excel-ar="إخفاء الأعمدة"
              data-excel-en="Hide Columns"
              aria-label="إخفاء الأعمدة"
              role="menuitem"
            ></button>
            <button
              type="button"
              id="sheet-cell-format-menu-show-cols"
              data-excel-ar="إظهار كل الأعمدة"
              data-excel-en="Unhide Columns"
              aria-label="إظهار كل الأعمدة"
              role="menuitem"
            ></button>
            <button
              type="button"
              id="sheet-cell-format-menu-hide-sheet"
              data-excel-ar="إخفاء الشيت"
              data-excel-en="Hide Sheet"
              aria-label="إخفاء الشيت"
              role="menuitem"
            ></button>
            <button
              type="button"
              id="sheet-cell-format-menu-show-sheet"
              data-excel-ar="إظهار شيت…"
              data-excel-en="Unhide Sheet…"
              aria-label="إظهار شيت…"
              role="menuitem"
            ></button>
          </div>
        </div>
        <hr role="separator" />
        <div
          className="sheet-menu-heading"
          role="presentation"
          data-excel-ar="تنظيم الشيتات"
          data-excel-en="Organize Sheets"
        ></div>
        <button
          type="button"
          id="sheet-cell-format-menu-rename-sheet"
          data-excel-ar="إعادة تسمية الشيت…"
          data-excel-en="Rename Sheet…"
          aria-label="إعادة تسمية الشيت…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-move-sheet"
          data-excel-ar="نقل أو نسخ الشيت…"
          data-excel-en="Move or Copy Sheet…"
          aria-label="نقل أو نسخ الشيت…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-cell-format-menu-tab-color"
          data-excel-ar="لون التبويب…"
          data-excel-en="Tab Color…"
          aria-label="لون التبويب…"
          role="menuitem"
        ></button>
      </div>
      <div
        id="sheet-insert-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-insert-menu-trigger"
      >
        <button
          type="button"
          id="sheet-insert-cells"
          data-excel-ar="إدراج خلايا…"
          data-excel-en="Insert Cells…"
          aria-label="إدراج خلايا…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-add"
          data-excel-ar="إدراج صفوف"
          data-excel-en="Insert Sheet Rows"
          aria-label="إدراج صفوف"
          role="menuitem"
          title="إضافة صف جديد في نهاية الجدول"
        ></button>
        <button
          type="button"
          id="sheet-add-col"
          data-excel-ar="إدراج أعمدة"
          data-excel-en="Insert Sheet Columns"
          aria-label="إدراج أعمدة"
          role="menuitem"
          title="إضافة عمود إلى جدول المتدربين"
        ></button>
        <button
          type="button"
          id="sheet-insert-sheet"
          data-excel-ar="إدراج شيت…"
          data-excel-en="Insert Sheet…"
          aria-label="إدراج شيت…"
          role="menuitem"
        ></button>
      </div>
      <div
        id="sheet-delete-menu-items"
        className="sheet-command-popover"
        popover="auto"
        role="menu"
        data-trigger="sheet-delete-menu-trigger"
      >
        <button
          type="button"
          id="sheet-delete-cells"
          data-excel-ar="حذف خلايا…"
          data-excel-en="Delete Cells…"
          aria-label="حذف خلايا…"
          role="menuitem"
        ></button>
        <button
          type="button"
          id="sheet-delete"
          data-excel-ar="حذف الصفوف"
          data-excel-en="Delete Sheet Rows"
          aria-label="حذف الصفوف"
          role="menuitem"
          title="حذف الصفوف أو الصف المحدد حالياً"
        ></button>
        <button
          type="button"
          id="sheet-delete-col"
          data-excel-ar="حذف الأعمدة"
          data-excel-en="Delete Sheet Columns"
          aria-label="حذف الأعمدة"
          role="menuitem"
          disabled={true}
          title="الأعمدة الأساسية ثابتة؛ يمكن إخفاؤها."
        ></button>
        <button
          type="button"
          id="sheet-delete-sheet"
          data-excel-ar="حذف الشيت…"
          data-excel-en="Delete Sheet…"
          aria-label="حذف الشيت…"
          role="menuitem"
        ></button>
      </div>
      <dialog
        id="sheet-border-dialog"
        className="sheet-file-dialog sheet-border-dialog"
        aria-labelledby="sheet-border-title"
      >
        <h3 id="sheet-border-title">{"تنسيق حدود الخلايا"}</h3>
        <div className="sheet-border-body">
          <fieldset>
            <legend>{"الخط"}</legend>
            <div>{"النمط"}</div>
            <div
              id="sheet-border-style"
              className="sheet-border-styles"
              role="radiogroup"
              aria-label="نوع الخط"
            >
              <button
                type="button"
                id="sheet-border-style-none"
                data-style="none"
                role="radio"
                aria-label="None"
                title="None"
                aria-checked="false"
                tabIndex={-1}
              >
                {"بدون"}
              </button>
              <button
                type="button"
                id="sheet-border-style-hair"
                data-style="hair"
                role="radio"
                aria-label="Hairline"
                title="Hairline"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "0.5px solid rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-dotted"
                data-style="dotted"
                role="radio"
                aria-label="Dotted"
                title="Dotted"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "1px dotted rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-dashDotDot"
                data-style="dashDotDot"
                role="radio"
                aria-label="Dash dot dot"
                title="Dash dot dot"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "1px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-dashDot"
                data-style="dashDot"
                role="radio"
                aria-label="Dash dot"
                title="Dash dot"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "1px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-dashed"
                data-style="dashed"
                role="radio"
                aria-label="Dashed"
                title="Dashed"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "1px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-thin"
                data-style="thin"
                role="radio"
                aria-label="Thin"
                title="Thin"
                aria-checked="true"
                tabIndex={0}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "1px solid rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-mediumDashed"
                data-style="mediumDashed"
                role="radio"
                aria-label="Medium dashed"
                title="Medium dashed"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "2px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-mediumDashDotDot"
                data-style="mediumDashDotDot"
                role="radio"
                aria-label="Medium dash dot dot"
                title="Medium dash dot dot"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "2px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-mediumDashDot"
                data-style="mediumDashDot"
                role="radio"
                aria-label="Medium dash dot"
                title="Medium dash dot"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "2px dashed rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-medium"
                data-style="medium"
                role="radio"
                aria-label="Medium"
                title="Medium"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "2px solid rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-thick"
                data-style="thick"
                role="radio"
                aria-label="Thick"
                title="Thick"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "3px solid rgb(0, 0, 0)" }}
                ></span>
              </button>
              <button
                type="button"
                id="sheet-border-style-double"
                data-style="double"
                role="radio"
                aria-label="Double"
                title="Double"
                aria-checked="false"
                tabIndex={-1}
              >
                <span
                  className="sheet-border-stroke"
                  aria-hidden="true"
                  style={{ borderTop: "3px double rgb(0, 0, 0)" }}
                ></span>
              </button>
            </div>
            <label>
              <span>{"اللون"}</span>
              <input
                id="sheet-border-color"
                type="color"
                defaultValue="#000000"
                aria-label="لون الحدود"
              />
            </label>
            <button type="button" id="sheet-border-color-auto">
              {"تلقائي"}
            </button>
          </fieldset>
          <div>
            <div className="sheet-border-section-title">{"إعدادات مسبقة"}</div>
            <div className="sheet-border-presets">
              <button
                type="button"
                id="sheet-border-preset-none"
                data-border-ar="بدون"
                data-border-en="None"
                aria-label="بدون"
                title="بدون"
              >
                <span className="sheet-border-preset-icon">
                  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path
                      d="M5 5h22v22H5zM16 5v22M5 16h22"
                      stroke="#aaa"
                      strokeDasharray="1 2"
                    ></path>
                  </svg>
                </span>
                <span>{"بدون"}</span>
              </button>
              <button
                type="button"
                id="sheet-border-preset-outline"
                data-border-ar="خارجي"
                data-border-en="Outline"
                aria-label="خارجي"
                title="خارجي"
              >
                <span className="sheet-border-preset-icon">
                  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path
                      d="M5 5h22v22H5zM16 5v22M5 16h22"
                      stroke="#aaa"
                      strokeDasharray="1 2"
                    ></path>
                    <path d="M5 5h22v22H5z" stroke="#111"></path>
                  </svg>
                </span>
                <span>{"خارجي"}</span>
              </button>
              <button
                type="button"
                id="sheet-border-preset-inside"
                data-border-ar="داخلي"
                data-border-en="Inside"
                aria-label="داخلي"
                title="داخلي"
              >
                <span className="sheet-border-preset-icon">
                  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path
                      d="M5 5h22v22H5zM16 5v22M5 16h22"
                      stroke="#aaa"
                      strokeDasharray="1 2"
                    ></path>
                    <path d="M16 5v22M5 16h22" stroke="#111"></path>
                  </svg>
                </span>
                <span>{"داخلي"}</span>
              </button>
            </div>
            <div className="sheet-border-section-title">{"الحدود"}</div>
            <div
              id="sheet-border-preview"
              className="sheet-border-preview"
              dir="ltr"
            >
              <button
                type="button"
                id="sheet-border-edge-top"
                className="sheet-border-edge edge-top"
                data-border-ar="علوي"
                data-border-en="Top"
                aria-label="علوي"
                title="علوي"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 5h22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-bottom"
                className="sheet-border-edge edge-bottom"
                data-border-ar="سفلي"
                data-border-en="Bottom"
                aria-label="سفلي"
                title="سفلي"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 27h22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-left"
                className="sheet-border-edge edge-left"
                data-border-ar="يسار"
                data-border-en="Left"
                aria-label="يسار"
                title="يسار"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 5v22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-right"
                className="sheet-border-edge edge-right"
                data-border-ar="يمين"
                data-border-en="Right"
                aria-label="يمين"
                title="يمين"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M27 5v22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-horizontal"
                className="sheet-border-edge edge-horizontal"
                data-border-ar="داخلي أفقي"
                data-border-en="Inside horizontal"
                aria-label="داخلي أفقي"
                title="داخلي أفقي"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 16h22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-vertical"
                className="sheet-border-edge edge-vertical"
                data-border-ar="داخلي رأسي"
                data-border-en="Inside vertical"
                aria-label="داخلي رأسي"
                title="داخلي رأسي"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M16 5v22" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-diagonalUp"
                className="sheet-border-edge edge-diagonalUp"
                data-border-ar="قطري صاعد"
                data-border-en="Diagonal up"
                aria-label="قطري صاعد"
                title="قطري صاعد"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 27 27 5" stroke="#111"></path>
                </svg>
              </button>
              <button
                type="button"
                id="sheet-border-edge-diagonalDown"
                className="sheet-border-edge edge-diagonalDown"
                data-border-ar="قطري هابط"
                data-border-en="Diagonal down"
                aria-label="قطري هابط"
                title="قطري هابط"
              >
                <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path
                    d="M5 5h22v22H5zM16 5v22M5 16h22"
                    stroke="#aaa"
                    strokeDasharray="1 2"
                  ></path>
                  <path d="M5 5 27 27" stroke="#111"></path>
                </svg>
              </button>
              <div className="sheet-border-sample">
                {"نص"}
                <i data-side="horizontal" className="inside-horizontal"></i>
                <i data-side="vertical" className="inside-vertical"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="sheet-dialog-footer">
          <button type="button" id="sheet-border-cancel">
            {"إلغاء"}
          </button>
          <button
            type="button"
            id="sheet-border-apply"
            className="sheet-primary"
          >
            {"تطبيق"}
          </button>
        </div>
      </dialog>
      <dialog
        id="sheet-sort-dialog"
        className="sheet-file-dialog sheet-worksheet-dialog"
      >
        <h3
          id="sheet-sort-title"
          data-excel-ar="فرز مخصص"
          data-excel-en="Custom Sort"
        ></h3>
        <div id="sheet-sort-levels"></div>
        <button
          type="button"
          data-excel-ar="إضافة مستوى"
          data-excel-en="Add Level"
          id="sheet-sort-add-level"
        ></button>
        <button
          type="button"
          id="sheet-sort-cancel"
          data-excel-ar="إلغاء"
          data-excel-en="Cancel"
        ></button>
        <button
          type="button"
          data-excel-ar="تطبيق الفرز"
          data-excel-en="Apply Sort"
          id="sheet-sort-apply"
        ></button>
      </dialog>
      <dialog
        id="sheet-shift-dialog"
        className="sheet-file-dialog sheet-worksheet-dialog"
      >
        <h3 id="sheet-shift-title"></h3>
        <select id="sheet-shift-direction"></select>
        <button
          type="button"
          id="sheet-shift-cancel"
          data-excel-ar="إلغاء"
          data-excel-en="Cancel"
        ></button>
        <button
          type="button"
          data-excel-ar="تطبيق"
          data-excel-en="Apply"
          id="sheet-shift-apply"
        ></button>
      </dialog>
    </>
  );
}
