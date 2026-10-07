import * as React from "react";
export function ReportSettings({
  headers,
}: {
  headers: Record<"operations" | "success", string[]>;
}) {
  return (
    <>
      <section className="ops-card">
        <h3
          data-ar="ربط تقارير Google Sheets"
          data-en="Connect Google Sheets reports"
        >
          {"ربط تقارير Google Sheets"}
        </h3>
        <p
          data-ar="أضف روابط التقارير ورابط أداة الربط، ثم احفظ. الروابط محفوظة مع حسابك وتظهر على أي جهاز تسجّل الدخول منه."
          data-en="Add the report links and connector link, then save. Links are saved with your account and available on any device you sign in from."
        >
          {
            "أضف روابط التقارير ورابط أداة الربط، ثم احفظ. الروابط محفوظة مع حسابك وتظهر على أي جهاز تسجّل الدخول منه."
          }
        </p>
        <form>
          <label>
            <span
              data-ar="رابط تقرير العمليات"
              data-en="Operations report link"
            >
              {"رابط تقرير العمليات"}
            </span>
            <input
              type="url"
              dir="ltr"
              maxLength={2000}
              autoComplete="off"
              id="settings-report-operations"
              data-field="operations"
            />
          </label>
          <label>
            <span
              data-ar="رابط تقرير الناجحين"
              data-en="Successful trainees report link"
            >
              {"رابط تقرير الناجحين"}
            </span>
            <input
              type="url"
              dir="ltr"
              maxLength={2000}
              autoComplete="off"
              id="settings-report-success"
              data-field="success"
            />
          </label>
          <label>
            <span
              data-ar="رابط أداة الربط Google Apps Script"
              data-en="Google Apps Script connector link"
            >
              {"رابط أداة الربط Google Apps Script"}
            </span>
            <input
              type="url"
              dir="ltr"
              maxLength={2000}
              autoComplete="off"
              id="settings-report-bridge"
              data-field="bridge"
            />
          </label>
          <button
            data-ar="حفظ إعدادات التقارير"
            data-en="Save report settings"
            type="submit"
            id="settings-report-save"
          >
            {"حفظ إعدادات التقارير"}
          </button>
          <p
            id="settings-report-status"
            className="ops-status"
            role="status"
          ></p>
        </form>
      </section>
      <details
        className="ops-card sheet-report-guide"
        id="settings-report-guide"
      >
        <summary
          data-ar="طريقة الربط بجوجل شيت — إعداد مرة واحدة"
          data-en="How to connect Google Sheets — one-time setup"
        >
          {"طريقة الربط بجوجل شيت — إعداد مرة واحدة"}
        </summary>
        <ol>
          <li>
            <p
              data-ar="جهّز ملف تقرير العمليات وملف تقرير الناجحين، بحساب Google لديه صلاحية تعديلهما. أضف رابطَي الملفين أعلاه. ضع العناوين التالية في صف 1؛ يمكنك تغيير ترتيبها مع الحفاظ على الأسماء."
              data-en="Prepare the operations and successful-trainee spreadsheets using a Google account with edit access to both. Add their links above. Place these headers in row 1; column order can change while keeping the names."
            >
              {
                "جهّز ملف تقرير العمليات وملف تقرير الناجحين، بحساب Google لديه صلاحية تعديلهما. أضف رابطَي الملفين أعلاه. ضع العناوين التالية في صف 1؛ يمكنك تغيير ترتيبها مع الحفاظ على الأسماء."
              }
            </p>
            <button
              data-ar="نسخ عناوين تقرير العمليات"
              data-en="Copy operations headers"
              type="button"
              id="report-copy-headers-operations"
            >
              {"نسخ عناوين تقرير العمليات"}
            </button>
            <p className="sheet-report-headings" dir="rtl">
              {headers.operations.join(" · ")}
            </p>
            <button
              data-ar="نسخ عناوين تقرير الناجحين"
              data-en="Copy successful-trainee headers"
              type="button"
              id="report-copy-headers-success"
            >
              {"نسخ عناوين تقرير الناجحين"}
            </button>
            <p className="sheet-report-headings" dir="rtl">
              {headers.success.join(" · ")}
            </p>
          </li>
          <li>
            <p
              data-ar="افتح Google Apps Script وأنشئ مشروعًا جديدًا. حمّل كود الربط من الزر التالي، وافتح الملف وانسخ محتواه كاملًا بدل محتوى Code.gs، ثم احفظ."
              data-en="Open Google Apps Script and create a new project. Download the connector below, open the file, replace the contents of Code.gs with its complete code, and save."
            >
              {
                "افتح Google Apps Script وأنشئ مشروعًا جديدًا. حمّل كود الربط من الزر التالي، وافتح الملف وانسخ محتواه كاملًا بدل محتوى Code.gs، ثم احفظ."
              }
            </p>
            <a
              data-ar="فتح Google Apps Script"
              data-en="Open Google Apps Script"
              href="https://script.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {"فتح Google Apps Script"}
            </a>
            {" · "}
            <a
              data-ar="تحميل كود الربط Code.gs"
              data-en="Download connector Code.gs"
              id="report-connector-download"
              href="google-reports.gs"
              download="Code.gs"
            >
              {"تحميل كود الربط Code.gs"}
            </a>
            <button
              data-ar="نسخ كود الربط"
              data-en="Copy connector code"
              type="button"
              id="report-connector-copy"
            >
              {"نسخ كود الربط"}
            </button>
          </li>
          <li>
            <p
              data-ar="في Apps Script افتح Project settings ← Script properties. اضغط عرض إعدادات المشروع هنا، ثم أضف كل اسم وقيمته في Script properties. IDs هي الجزء بين /d/ والشرطة التالية في رابط كل تقرير."
              data-en="In Apps Script, open Project settings → Script properties. Show project properties below, then add each listed name and value. IDs are the portion between /d/ and the next slash in each report link."
            >
              {
                "في Apps Script افتح Project settings ← Script properties. اضغط عرض إعدادات المشروع هنا، ثم أضف كل اسم وقيمته في Script properties. IDs هي الجزء بين /d/ والشرطة التالية في رابط كل تقرير."
              }
            </p>
            <button
              data-ar="عرض إعدادات المشروع"
              data-en="Show project properties"
              type="button"
              id="report-project-properties-open"
            >
              {"عرض إعدادات المشروع"}
            </button>
            <textarea
              id="report-project-properties"
              dir="ltr"
              rows={7}
              readOnly={true}
              hidden={true}
            ></textarea>
            <button
              data-ar="نسخ إعدادات المشروع"
              data-en="Copy project properties"
              type="button"
              id="report-project-properties-copy"
              hidden={true}
            >
              {"نسخ إعدادات المشروع"}
            </button>
            <p
              data-ar="اختياري: OPERATIONS_TAB وSUCCESS_TAB لاسم التبويب داخل كل ملف. بدونها يُستخدم أول تبويب. HEADER_ROW هو رقم صف العناوين، وافتراضيًا 1."
              data-en="Optional: OPERATIONS_TAB and SUCCESS_TAB select worksheet names. Without them, the first worksheet is used. HEADER_ROW is the header row number, default 1."
            >
              {
                "اختياري: OPERATIONS_TAB وSUCCESS_TAB لاسم التبويب داخل كل ملف. بدونها يُستخدم أول تبويب. HEADER_ROW هو رقم صف العناوين، وافتراضيًا 1."
              }
            </p>
          </li>
          <li>
            <p
              data-ar="اضغط Deploy ← New deployment واختر Web app. اجعل Execute as = Me وWho has access = Anyone. اضغط Deploy ووافق على صلاحيات Google. حساب النشر لازم يقدر يعدّل التقريرين. إذا Anyone غير متاح في حساب المؤسسة، راجع مسؤول Google Workspace."
              data-en="Choose Deploy → New deployment → Web app. Set Execute as = Me and Who has access = Anyone. Deploy and authorize Google permissions. The deploying account must be able to edit both reports. If your organization hides Anyone, contact your Google Workspace administrator."
            >
              {
                "اضغط Deploy ← New deployment واختر Web app. اجعل Execute as = Me وWho has access = Anyone. اضغط Deploy ووافق على صلاحيات Google. حساب النشر لازم يقدر يعدّل التقريرين. إذا Anyone غير متاح في حساب المؤسسة، راجع مسؤول Google Workspace."
              }
            </p>
          </li>
          <li>
            <p
              data-ar="انسخ Web app URL الذي ينتهي بـ /exec إلى خانة رابط أداة الربط أعلاه، ثم احفظ الإعدادات. استخدم /exec وليس /dev. لا تحتاج جعل ملفات Google Sheets متاحة للعامة."
              data-en="Paste the Web app URL ending in /exec into the connector field above, then save settings. Use /exec, not /dev. The spreadsheets do not need to be public."
            >
              {
                "انسخ Web app URL الذي ينتهي بـ /exec إلى خانة رابط أداة الربط أعلاه، ثم احفظ الإعدادات. استخدم /exec وليس /dev. لا تحتاج جعل ملفات Google Sheets متاحة للعامة."
              }
            </p>
          </li>
          <li>
            <p
              data-ar="ارجع لشيت المتدربين، اختر تاريخ التقرير، واضغط معاينة التقرير لمراجعة الصفوف والأعمدة لكل تقرير. بعد المراجعة اضغط رفع تقرير العمليات أو رفع تقرير الناجحين. النتيجة تظهر في نافذة Google، ويُضاف الجديد في نهاية التقرير بدون تكرار نفس VOUCHER."
              data-en="Return to the trainee sheet, choose the report date, and preview report rows and columns for each report. Review the data, then upload operations or successful trainees. Google shows the result; new rows are appended without repeating a VOUCHER."
            >
              {
                "ارجع لشيت المتدربين، اختر تاريخ التقرير، واضغط معاينة التقرير لمراجعة الصفوف والأعمدة لكل تقرير. بعد المراجعة اضغط رفع تقرير العمليات أو رفع تقرير الناجحين. النتيجة تظهر في نافذة Google، ويُضاف الجديد في نهاية التقرير بدون تكرار نفس VOUCHER."
              }
            </p>
          </li>
        </ol>
        <p
          data-ar="لو ظهر خطأ VOUCHER رغم وجود العمود: اضبط HEADER_ROW على رقم صف العناوين، وOPERATIONS_TAB أو SUCCESS_TAB على اسم التبويب المطلوب بالضبط. رابط الملف وحده لا يحدد التبويب؛ بدون هذه الخصائص يُستخدم أول تبويب. بعد تحديث كود الربط في Code.gs احفظه، ثم انشر إصدارًا جديدًا من النشر الحالي عبر Deploy ← Manage deployments ← Edit ← New version ← Deploy."
          data-en="If VOUCHER is not found despite the column being present, set HEADER_ROW to the header row number and OPERATIONS_TAB or SUCCESS_TAB to the exact worksheet name. The spreadsheet link alone does not select a worksheet; without these properties the first worksheet is used. After updating Code.gs, save and update the existing deployment using Deploy → Manage deployments → Edit → New version → Deploy."
        >
          {
            "لو ظهر خطأ VOUCHER رغم وجود العمود: اضبط HEADER_ROW على رقم صف العناوين، وOPERATIONS_TAB أو SUCCESS_TAB على اسم التبويب المطلوب بالضبط. رابط الملف وحده لا يحدد التبويب؛ بدون هذه الخصائص يُستخدم أول تبويب. بعد تحديث كود الربط في Code.gs احفظه، ثم انشر إصدارًا جديدًا من النشر الحالي عبر Deploy ← Manage deployments ← Edit ← New version ← Deploy."
          }
        </p>
        <p
          data-ar="التاريخ يعتمد على وقت استخدام الفاوتشر بتوقيت السعودية. تقرير الناجحين يشمل نتيجة ناجح فقط. اليوزر والباسورد وAnyDesk لا تُرسل. جرّب أول مرة على نسخة من التقريرين."
          data-en="Report dates use voucher usage time in Saudi Arabia. Successful-trainee reports include passed results only. Usernames, passwords and AnyDesk are excluded. Test first using copies of the reports."
        >
          {
            "التاريخ يعتمد على وقت استخدام الفاوتشر بتوقيت السعودية. تقرير الناجحين يشمل نتيجة ناجح فقط. اليوزر والباسورد وAnyDesk لا تُرسل. جرّب أول مرة على نسخة من التقريرين."
          }
        </p>
        <a
          data-ar="شرح Google الرسمي لنشر Web app"
          data-en="Google’s official Web app deployment guide"
          href="https://developers.google.com/apps-script/guides/web"
          target="_blank"
          rel="noopener noreferrer"
        >
          {"شرح Google الرسمي لنشر Web app"}
        </a>
      </details>
    </>
  );
}
