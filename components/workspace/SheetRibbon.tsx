import * as React from "react";
export function SheetRibbon() {
  return (
    <div className="sheet-tools sheet-clean-toolbar">
      <div className="sheet-ribbon-top">
        <div className="sheet-ribbon-actions">
          <button
            id="sheet-ribbon-toggle"
            type="button"
            aria-controls="sheet-ribbon-panel-all"
            aria-expanded="true"
            data-excel-ar="إخفاء أدوات الجدول ▴"
            data-excel-en="Hide sheet tools ▴"
          ></button>
          <button
            type="button"
            id="sheet-xlsx-export"
            data-excel-ar="تصدير Excel"
            data-excel-en="Export Excel"
          ></button>
          <button
            type="button"
            id="sheet-xlsx-import"
            data-excel-ar="استيراد Excel"
            data-excel-en="Import Excel"
          ></button>
          <span className="sheet-ribbon-divider" aria-hidden="true"></span>
          <button type="button" id="sheet-undo" disabled={true}>
            {"تراجع"}
          </button>
          <button type="button" id="sheet-redo" disabled={true}>
            {"إعادة"}
          </button>
          <span className="sheet-ribbon-divider" aria-hidden="true"></span>
          <button
            type="button"
            id="sheet-find-btn"
            title="بحث واستبدال (Ctrl+F / Ctrl+H)"
          >
            {"🔍 بحث واستبدال"}
          </button>
          <button
            type="button"
            id="sheet-select-all"
            title="تحديد الجدول بالكامل (Ctrl+A)"
            aria-pressed="false"
          >
            {"تحديد الكل"}
          </button>
          <button
            type="button"
            id="sheet-add-separator-btn"
            title="إضافة فاصل ودمج الصف الحالي"
          >
            {"إضافة فاصل"}
          </button>
          <span className="sheet-ribbon-divider" aria-hidden="true"></span>
          <button type="button" id="sheet-save">
            {"حفظ الآن"}
          </button>
          <button type="button" id="sheet-reload">
            {"إعادة تحميل"}
          </button>
        </div>
        <span
          className="sheet-status"
          id="sheet-status"
          role="status"
          aria-live="polite"
        ></span>
      </div>
      <div
        id="sheet-ribbon-panel-all"
        className="sheet-ribbon-panel sheet-unified-ribbon"
        role="region"
        aria-label="أدوات الجدول"
      >
        <div className="sheet-ribbon-command-row">
          <div id="sheet-insert-menu" className="sheet-command-dropdown">
            <button
              type="button"
              data-excel-ar="إدراج ▾"
              data-excel-en="Insert ▾"
              id="sheet-insert-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-insert-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="إدراج"
            ></button>
          </div>
          <div id="sheet-delete-menu" className="sheet-command-dropdown">
            <button
              type="button"
              data-excel-ar="حذف ▾"
              data-excel-en="Delete ▾"
              id="sheet-delete-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-delete-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="حذف"
            ></button>
          </div>
          <div id="sheet-cell-format-menu" className="sheet-command-dropdown">
            <button
              type="button"
              data-excel-ar="تنسيق ▾"
              data-excel-en="Format ▾"
              id="sheet-cell-format-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-cell-format-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="تنسيق"
            ></button>
          </div>
          <div
            id="sheet-merge-menu"
            className="sheet-command-dropdown sheet-split-command"
          >
            <button
              type="button"
              id="sheet-merge-center"
              data-excel-ar="دمج وتوسيط"
              data-excel-en="Merge & Center"
              aria-label="دمج وتوسيط"
            ></button>
            <button
              type="button"
              data-excel-ar="دمج وتوسيط ▾"
              data-excel-en="Merge & Center ▾"
              id="sheet-merge-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-merge-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="خيارات الدمج"
              data-split="true"
            ></button>
          </div>
          <div id="sheet-border-menu" className="sheet-command-dropdown">
            <button
              type="button"
              data-excel-ar="حدود ▾"
              data-excel-en="Borders ▾"
              id="sheet-border-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-border-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="حدود"
            ></button>
          </div>
          <div id="sheet-sort-menu" className="sheet-command-dropdown">
            <button
              type="button"
              data-excel-ar="الفرز والفلترة ▾"
              data-excel-en="Sort & Filter ▾"
              id="sheet-sort-menu-trigger"
              aria-haspopup="menu"
              aria-controls="sheet-sort-menu-items"
              aria-expanded="false"
              data-submenu="false"
              aria-label="الفرز والفلترة"
            ></button>
          </div>
          <span className="sheet-ribbon-divider" aria-hidden="true"></span>
          <section id="sheet-excel-alignment" className="sheet-ribbon-group">
            <div className="sheet-ribbon-actions">
              <div className="sheet-align-group" role="group">
                <button
                  type="button"
                  id="sheet-align-right"
                  title="محاذاة لليمين"
                  aria-pressed="false"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="3" y1="5" x2="21" y2="5"></line>
                    <line x1="9" y1="12" x2="21" y2="12"></line>
                    <line x1="5" y1="19" x2="21" y2="19"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  id="sheet-align-center"
                  title="توسيط"
                  aria-pressed="false"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="4" y1="5" x2="20" y2="5"></line>
                    <line x1="7" y1="12" x2="17" y2="12"></line>
                    <line x1="5" y1="19" x2="19" y2="19"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  id="sheet-align-left"
                  title="محاذاة لليسار"
                  aria-pressed="false"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="3" y1="5" x2="21" y2="5"></line>
                    <line x1="3" y1="12" x2="15" y2="12"></line>
                    <line x1="3" y1="19" x2="19" y2="19"></line>
                  </svg>
                </button>
              </div>
              <div className="sheet-align-group sheet-valign-group">
                <button
                  type="button"
                  id="sheet-valign-top"
                  data-excel-ar="محاذاة لأعلى"
                  data-excel-en="Top Align"
                  aria-label="محاذاة لأعلى"
                  aria-pressed="false"
                ></button>
                <button
                  type="button"
                  id="sheet-valign-middle"
                  data-excel-ar="توسيط رأسي"
                  data-excel-en="Middle Align"
                  aria-label="توسيط رأسي"
                  aria-pressed="true"
                ></button>
                <button
                  type="button"
                  id="sheet-valign-bottom"
                  data-excel-ar="محاذاة لأسفل"
                  data-excel-en="Bottom Align"
                  aria-label="محاذاة لأسفل"
                  aria-pressed="false"
                ></button>
              </div>
              <button
                type="button"
                id="sheet-wrap-text"
                data-excel-ar="التفاف النص"
                data-excel-en="Wrap Text"
                aria-label="التفاف النص"
                aria-pressed="false"
              ></button>
            </div>
            <small data-excel-ar="المحاذاة" data-excel-en="Alignment"></small>
          </section>
        </div>
        <div className="sheet-ribbon-format-row">
          <section id="sheet-excel-font" className="sheet-ribbon-group">
            <div className="sheet-ribbon-actions">
              <select id="sheet-font-family" aria-label="نوع الخط">
                <option value="Arial">{"Arial"}</option>
                <option value="Calibri">{"Calibri"}</option>
                <option value="Tahoma">{"Tahoma"}</option>
                <option value="Segoe UI">{"Segoe UI"}</option>
                <option value="Times New Roman">{"Times New Roman"}</option>
                <option value="IBM Plex Sans Arabic">
                  {"IBM Plex Sans Arabic"}
                </option>
              </select>
              <label>
                <span id="sheet-selection-size-label">{"حجم المحدد"}</span>
                <select id="sheet-selection-size">
                  <option value="10">{"10"}</option>
                  <option value="11">{"11"}</option>
                  <option value="12">{"12"}</option>
                  <option value="13">{"13"}</option>
                  <option value="14">{"14"}</option>
                  <option value="15">{"15"}</option>
                  <option value="16">{"16"}</option>
                  <option value="17">{"17"}</option>
                  <option value="18">{"18"}</option>
                  <option value="19">{"19"}</option>
                  <option value="20">{"20"}</option>
                  <option value="21">{"21"}</option>
                  <option value="22">{"22"}</option>
                  <option value="23">{"23"}</option>
                  <option value="24">{"24"}</option>
                  <option value="25">{"25"}</option>
                  <option value="26">{"26"}</option>
                  <option value="27">{"27"}</option>
                  <option value="28">{"28"}</option>
                  <option value="29">{"29"}</option>
                  <option value="30">{"30"}</option>
                  <option value="31">{"31"}</option>
                  <option value="32">{"32"}</option>
                </select>
              </label>
              <button
                type="button"
                id="sheet-font-minus"
                title="تصغير خط الجدول"
              >
                {"A−"}
              </button>
              <output id="sheet-font-size">{"13 px"}</output>
              <button
                type="button"
                id="sheet-font-plus"
                title="تكبير خط الجدول"
              >
                {"A+"}
              </button>
              <div className="sheet-style-group">
                <button
                  type="button"
                  id="sheet-bold"
                  title="خط عريض للمحدد"
                  aria-pressed="false"
                >
                  <b>{"B"}</b>
                </button>
                <button
                  type="button"
                  id="sheet-italic"
                  data-excel-ar="I"
                  data-excel-en="I"
                  aria-pressed="false"
                ></button>
                <button
                  type="button"
                  id="sheet-underline"
                  data-excel-ar="U"
                  data-excel-en="U"
                  aria-pressed="false"
                ></button>
                <button
                  type="button"
                  id="sheet-strike"
                  data-excel-ar="شطب"
                  data-excel-en="Strike"
                  aria-pressed="false"
                ></button>
              </div>
              <div className="sheet-color-group">
                <label>
                  <span id="sheet-fill-label">{"لون الخلية"}</span>
                  <input type="color" id="sheet-fill" defaultValue="#ffffff" />
                </label>
                <label>
                  <span id="sheet-text-color-label">{"لون الخط"}</span>
                  <input
                    type="color"
                    id="sheet-text-color"
                    defaultValue="#16324f"
                  />
                </label>
              </div>
            </div>
            <small
              data-excel-ar="الخط والتنسيق"
              data-excel-en="Font & Style"
            ></small>
          </section>
          <span className="sheet-ribbon-divider" aria-hidden="true"></span>
          <section id="sheet-view-tools" className="sheet-ribbon-group">
            <div className="sheet-ribbon-actions">
              <label>
                <span id="sheet-row-size-label">{"حجم الصف"}</span>
                <select id="sheet-row-size" aria-label="حجم الصف">
                  <option value="15">{"15"}</option>
                  <option value="21">{"21"}</option>
                  <option value="28">{"28"}</option>
                  <option value="36">{"36"}</option>
                </select>
              </label>
              <label>
                <span id="sheet-direction-label">{"الاتجاه"}</span>
                <select id="sheet-direction">
                  <option value="rtl">{"يمين ← يسار"}</option>
                  <option value="ltr">{"Left → Right"}</option>
                </select>
              </label>
              <small
                id="sheet-local-note"
                className="sheet-local-note"
                title="التنسيق وأبعاد الأعمدة تُحفظ مع الجدول؛ الزوم تفضيل لهذا الجهاز."
              >
                {
                  "التنسيق وأبعاد الأعمدة تُحفظ مع الجدول؛ الزوم تفضيل لهذا الجهاز."
                }
              </small>
            </div>
            <small data-excel-ar="عرض الجدول" data-excel-en="View"></small>
          </section>
        </div>
      </div>
    </div>
  );
}
