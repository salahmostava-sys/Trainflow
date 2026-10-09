# TrainFlow — training and exam operations

Updated 6 October 2026.

Connected project: `xaeffreqwtozsgqajzpc` (TrainFlow). The existing Muhimmat project was not changed.

## First sign-in

Open [TrainFlow](https://trainf.vercel.app/) and sign in with your approved account. Administrators allowlist team members before they create and confirm their accounts.

Configure the existing Supabase Auth Site URL and allowed email redirects for the intended Vercel origin. Verify confirmation and recovery links after a host change. The application does not need access to your email password.

The Settings screen uses separate tabs for account details, system data, Prometric details, preferences, and team/sync tools. System-data and Prometric-edit tabs are visible only to administrators; the database enforces those permissions independently of the interface.

Administrators add exams and categories under **Settings → System data**. The Keycodes screen remains focused on viewing and using keycodes.
The destructive reset of all usage marks is also under **Settings → System data**, with a reminder to download a backup first.

The interface and sign-in page use Cairo with font fallbacks. Sheet cells retain their own saved font settings.

Administrators can allowlist another email from **إدارة البيانات والمستخدمين**, assign a role, and later change or deactivate it. That person then creates an account and confirms the same address. Other signups cannot access operational data. Copy-only users can claim and copy unused codes; operators can also edit notes and release their own codes; administrators can add/delete codes, manage categories, and manage users. The database enforces these roles independently of the interface.

## Data

- `ibta_codes`: one row per unique code, notes, usage date, actor, and optimistic version.
- `ibta_settings`: shared keycode catalog, category labels/ordering/overrides, Prometric credentials, and Zoom/Prometric links. RLS restricts reads to approved users; these values are not embedded in public HTML/JavaScript. Administrators can edit existing categories, exams, codes, and the shared connection details from Settings. The standard category labels Foundation, Master, BIS, Corporate and CYBP remain English in both languages; custom category labels remain editable. Underlying category IDs stay stable.
- `ibta_members`: approved email addresses, immutable Auth user IDs, and roles. Confirming a new sign-in email updates the membership email while retaining the same role.
- `ibta_audit`: database-generated actor/action/time log. Audit entries deliberately do not include passwords or note contents.
- `ibta_supervisor_stock`: the supervisor's unallocated balance by code category. New code inserts and file imports debit this balance in the same database transaction; edits and backup restores do not debit it again.
- `ibta_supervisor_stock_events`: opening balances, replenishments, corrections, and code allocations.

Existing cloud data remains in the same project; counts are live operational values, not fixed seed totals. Operational data is not stored in browser localStorage anymore. Only UI preferences (including language, current panel and numeric sheet positions) remain local. Authentication is stored in sessionStorage and requires logging in again when the browser session ends.

The deployed HTML and JavaScript contain interface code, the Supabase project URL, and a publishable key. They contain no operational codes, Prometric credentials, or secret/service-role key. Browser source is public by nature, so authorization depends on Supabase Auth and database RLS rather than hiding JavaScript. An approved user can inspect any values the application sends to their browser; a different access model would require a server-side API with narrower per-user responses.

Each signed-in team member can edit their own name, sign-in email, and password under **Settings → My account**. The display name is stored in Supabase Auth user metadata and never grants access. Email changes require confirmation from the new inbox; authorization remains attached to the Auth user ID. Password changes ask for the current password and are handled by Supabase Auth without storing either password in app settings. Administrators cannot read team members' passwords.

## Existing browser data

Old localStorage was not erased. Sign in as administrator **in the browser and at the same original file location used previously**, then click **استيراد بيانات المتصفح القديمة**. This merges added codes, notes, usage marks, and custom categories. Existing nonempty cloud notes and usage marks win. This import never deletes cloud codes and does not mirror old deletions or override cloud category ordering/assignments. A hosted HTTPS site or the HTTP preview cannot read storage belonging to the original file URL.

Verify the merged counts and marks before putting the team into operation. The original embedded seed did not contain browser-only usage history.

**تنزيل نسخة احتياطية** exports the shared configuration, codes (including trainee names), supervisor balances and all private worksheets. **استعادة نسخة احتياطية** previews the JSON and asks for confirmation before replacing them in one database transaction; a stale settings version or invalid row cancels the whole restore. Older backup files without supervisor balances leave the current balances untouched. The backup includes Prometric credentials and the Zoom meeting link; keep it private. Auth accounts are managed separately and are not restored from this file. There is no scheduled backup service configured. Supabase recommends regular off-site database dumps for Free projects; the app backup is an additional operational export, not a substitute for a full database dump.

The separate **Inventory / المخزون** page shows unused codes held by the team, supervisor balances and category totals. Use **Copy message** to copy the stock summary. Administrators manage balances under **Settings → Inventory**: set the actual opening balance or add newly purchased stock. Receiving new codes reduces supervisor stock; insufficient stock rejects the entire operation. Using or deleting an existing code does not restore supervisor stock. The report keeps the supervisor name and language preferences and has three sections: team stock, supervisor stock and totals.

Settings → System data includes file import for up to 5,000 codes at a time. CSV files use the first `Code` column and the selected destination category; exact or case-insensitive duplicates are skipped. The same panel retains a plain CSV export. Colored XLSX export is available directly on VOUCHERS. Daily Google uploads use the Apps Script connector described in the Google guide; they are manual submissions, not two-way OAuth synchronization.

Settings → Team and sync includes a recent activity view (last 100 database audit entries) and team role/activation controls. Audit records identify actions, actors, and record keys without containing password or note contents.

## Concurrent use

The server atomically claims a code before copying it. Another user with a stale version cannot claim or overwrite it. If clipboard access fails, the code stays reserved for the same user; they can retry copying or release it. Previously used codes require confirmation before recopying, and operators cannot recopy another person's used code.

The VOUCHERS page has a visible Excel export for unused or all vouchers. A collapsible usage report lets the user choose a date and see only the categories and individual codes used that day, plus their counts. Opening the Codes page refreshes the shared data first. On the Prometric page, the login-link card is the first item; clicking it copies the link directly. All Prometric values use the same typography.

Changes are transactional and version-checked. On conflict, the UI reloads current server data and asks the user to repeat the operation; it never silently overwrites a colleague. Data refreshes on changes, manually, and approximately every two minutes while the page is visible and the user has no unsaved input or selected rows. Rate-limited or unavailable background requests pause for five minutes. This is polling, not push realtime. This version loads the current code inventory into memory, with paginated API reads; a very large inventory should use server-side search and paginated UI.

The database rejects change batches over 250 operations, settings payloads over 64 KiB, notes over 2,000 characters, and claim targets over 200 characters. These limits reduce accidental or abusive database work; they do not stop a distributed denial-of-service attack against the public Supabase endpoint. Before public deployment, review Supabase Auth rate limits and enable Auth CAPTCHA. Protecting the Data API from high-volume traffic would require a server-side gateway with per-client limits and an architecture that prevents direct access to the same operations.

Existing-code edits use an administrator-only atomic database operation. It preserves the recorded user and date when changing a code's value or category, and checks the row version before committing. The live project has migration `migrations/20260929_edit_code.sql` applied; fresh installations can use the matching function in `database.sql`.

Membership identity migrations `migrations/20260929_member_identity.sql` and `migrations/20260929_member_identity_skip_noop.sql` have also been applied to the live project. They keep access stable after a confirmed email change without writing an audit entry at every sign-in.

## Private trainee sheets and code ownership

The **Trainees / المتدربون** page provides independent private, autosaved worksheets for every approved account, including copy-only accounts. Its 13 columns follow the supplied layout: code, email, Arabic name, English name, national ID, phone, organization, exam, exam date, username, password, result, and AnyDesk ID. Cells are strings so leading zeros survive. The sheet supports Excel TSV clipboard paste/copy (including quoted multiline cells), adjacent and Ctrl/Cmd additive selection, direct editing, keyboard navigation, undo/redo, row deletion, search, filters, sorting, and continuous scrolling. Multirow paste requires clearing filters/sorting first. The grid model supports up to 1,000,000 rows and 500 columns, with 2,000 characters per cell and a 12 MiB server write limit. These model limits do not guarantee that a fully populated maximum-size sheet fits one save request. It evaluates the supported arithmetic and AutoSum formulas described below.

The trainee page opens the signed-in account's private sheet; the old owner dropdown is removed. Database permissions still distinguish administrators from ordinary users. New imported vouchers enter the unassigned pool, and atomic assignment operations remain limited to 250 codes. Pasting a voucher into a cell stores text only and does not claim inventory.

Apply `supabase/migrations/20261001064657_private_trainee_sheets.sql` before this frontend. RLS restricts both sheets and codes by authenticated user ID and active membership, with an administrator override. Student data is never embedded in site files or persisted to localStorage. Autosave uses optimistic sheet versions and retains unsaved edits after a network error or conflict; user switching and sign-out stop if saving fails. The user can copy the current sheet before reloading to resolve a conflict.

Current version 4 administrator backups include trainee sheets, formatting and code ownership. Restoring an older backup leaves sheets intact and preserves known code owners. Restoring sheets advances version counters so existing browser editors cannot silently overwrite restored data. The existing 10 MB backup limit still applies. Backup files now contain student records and their login details as well as the existing shared configuration.

Apply `supabase/migrations/20261001090026_trainee_sheet_formatting.sql` for saved sheet formatting. The toolbar controls hidden columns, selected-cell font sizes (10–32 px), bold text, text/background colors, clear formatting, and LTR/RTL direction. Formatting shares the sheet's private access, atomic version and undo history; row deletion keeps formatting aligned. Keyboard navigation and range copy/paste skip hidden columns; **Copy sheet** intentionally includes all columns. At least one column stays visible.

Result dropdowns always use Arabic: **ناجح** (green), **راسب** (red), **لم يدخل** (yellow). Common English equivalents normalize to Arabic on paste/load. Their automatic colors take precedence over manual cell colors. National/Iqama IDs are checked for duplicates across the entire user's sheet, including filtered rows and other pages, with badges and a duplicates-only filter. Comparison ignores spacing/hyphens and accepts Arabic/Persian digits without changing the stored ID or dropping leading zeros. Version 4 backups include formatting; older clients and older backups preserve existing formatting. `tests/trainees-format-database.sql` verifies formatting isolation, input validation, version conflicts, and restoration in a rollback-only transaction.

Duplicate ID cells use the reference Excel colors (`#FFC7CE` fill, `#9C0006` text) across the entire cell. Results use `#00B050`/white for passed, `#FF0000`/white for failed, and `#FFFF00`/black for absent. Hovering or keyboard-focusing a duplicate previews the occurrence count plus username, password and result for up to ten matching rows. A single click or Enter opens a floating dialog with every field, including hidden columns, for all matching rows in the account's sheet (20 records per dialog page). Escape, the close button or the backdrop dismiss it; double-click/F2 and the dialog's Edit ID action retain editing. Tooltip and dialog data are cleared on account switches and sign-out. No cross-user search or new data access is introduced.

Validation: `node tests/trainees.test.cjs`, `node tests/cloud.test.cjs`, and `node tests/trainees-browser.test.cjs` (requires Playwright and Edge; starts its own local preview). `tests/trainees-database.sql` and `database-tests.sql` use transactional fixtures and roll back all changes. The migration lives under the CLI-generated `supabase/migrations` directory; older migrations remain under `migrations`.

## Hosting configuration

The trainee table has an Excel-style zoom control in its footer: minus/plus buttons, a 50–200% slider, and an editable percentage field. Type an exact percentage (for example 85), then press Enter or leave the field to apply it and display 85%. Arabic digits are accepted; invalid input retains the current value, Escape cancels typing, and values stay within 50–200%. Zoom scales data cells and their contents. Column headings, row-number text and toolbar controls keep their font size; column widths stay aligned with the cells. Editing uses the cells directly; the separate value-editing box has been removed. It is a browser preference and survives reload without changing shared data or saved formatting.

**Expanded view** fills the viewport, collapses the optional ribbon tools, and temporarily adjusts cell density toward 45 regular rows. A live count shows the fully visible rows. Tools remain available through the top Tools button; Save and zoom stay visible. Closing the view or pressing Escape restores the previous zoom and keeps the current rows in view. Manual zoom changes become the new preference. Custom row heights and wrapped text retain their formatting. The browser regression test checks more than 40 visible rows at 1600 × 703, resizing at distant rows, mobile bounds and sign-out cleanup.

Floating trainee records display the course name exactly as stored in the sheet, followed by its current keycode and effective category from the shared Keycodes catalog. The 17 supplied CBP course identifiers and Arabic/English course names are matched; Arabic catalog entries take preference. Unknown or ambiguous matches show a no-match note. Trainee details also show the shared Prometric account and password already available to the signed-in account. Click any populated value to copy its exact text. The narrower single-column dialog shortens the displayed Prometric login URL while copying its full value. An empty Code field contains a Get action that reserves, saves and copies a matching voucher; once populated, the voucher value replaces Get and can be copied without allocating another voucher. On narrow screens the details fill the viewport with larger text and vertical scrolling. The imported sheet values are preserved. Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z support Arabic keyboard layouts, including edits in progress.

The single trainee dialog starts with **Prometric login link → Keycode → Prometric Account → Prometric Password → Code**, followed by the remaining sheet fields and course category. These values use the current shared settings; clicking a populated value copies it. The keycode is shown once. On desktop, a compact single-column list keeps each label on the right and its value on the left, showing the standard fields and exam-code action without scrolling, including at 1024 × 600. Narrow mobile screens retain the readable full-viewport layout. Duplicate-ID dialogs keep their existing field layout.

The trainee sheet starts with 52 visible columns (A–AZ); the original 13 retain their labels, and additional columns accept new data. **Add column** extends it to the existing 500-column limit. Right-click a cell or rectangular selection to delete cells and shift the remaining row data physically left or right, including hidden columns. Values, formatting and alignment move together, and Undo restores them. Double-click a nonempty English name cell to show a floating read-only record, including hidden fields and populated extra columns. Hover and single click do not open it. F2 edits the name. It stays open during background translation/data redraws and scrolling, retaining its record and scroll position. Close it with ×, an outside click or Escape. Account switching and sign-out still dismiss it.

The application requires manual sign-in again at **17:00 Asia/Riyadh** every day. A sign-in at or after 17:00 lasts until the following day's cutoff. Token refresh does not extend this deadline. The browser timer and visibility/focus checks hide the application at expiry; the API worker also rejects expired sessions. Saving is attempted shortly before the cutoff. Failed sheet saves retain their draft in the open page and require signing back in with the same account; keep that page open until saved. This application/API rule does not change Supabase's separately accessible REST API or the Google reports bridge.

Vercel deploys main using pnpm build and the Next.js framework configuration. Public assets contain the existing publishable project key, not a service-role key or operational records. Use the Vercel address for Auth redirects and the updated Chrome extensions. See the deployment guide for verification and domain retirement.

Right-click cells or column headers to insert or delete extra columns. Values, headers, formatting and alignment move together and support Undo. The original 13 schema columns remain fixed and can be hidden. Row insertion and deletion are also available in the context menu.

The English-name details dialog includes **Get exam code** only when the trainee's Code cell is empty. It resolves the course's effective category to its inventory category, reserves an unused code for the sheet owner using the existing version-checked RPCs, saves it to the trainee's Code cell, then copies it. Administrators can allocate unassigned stock; ordinary accounts use their assigned stock. Existing codes are never replaced. If saving fails after reservation, the draft retains the code; **Save now** retries saving without claiming another code. No database migration is required.

## Verification

The Excel toolbar includes font family/size, bold/italic/underline/strike, borders, text/fill colors, horizontal alignment, merge/center/across/unmerge, sort/selection, row/column actions, row height, column width/AutoFit and hide/unhide. Clipboard and Orientation menus, vertical alignment, indentation and Wrap text controls were removed at the user's request. Standard keyboard/context-menu copy, cut and paste remain available. Pasting preserves the destination's border settings, including every side of an outline and the default grid. Existing saved formatting remains readable. Borders remain editable through the explicit Borders controls. AutoSum, Fill and Clear toolbar commands were removed at the user's request; existing formulas and keyboard/context-menu editing remain supported. Formatting and merge metadata share private sheet persistence and Undo/Redo. New format validation was deployed with `supabase/migrations/20261004065835_trainee_excel_tools.sql`; RLS and ownership rules remain in place.

Formula strings are stored unchanged and display their calculated results. The supported expression grammar covers cell references, absolute references, ranges inside the five aggregate functions, parentheses and arithmetic. Unsupported Excel functions show `#NAME?`; circular references show `#CYCLE!`. This is a focused spreadsheet feature set rather than a complete Excel formula engine. The operational Result column remains a status dropdown. Merge keeps the first value and asks before discarding other populated values; Undo restores them. Shift/delete operations require unmerging the affected cells first. Old format-only snapshots remain compatible. Build output includes asset hashes so browser reloads fetch updated scripts and styles.

Trainee rows share one continuous scroll area with no pagination controls. A measured row window renders the viewport and a small margin while retaining all rows in the data model, including filtered rows and selections beyond the viewport. Keyboard/address navigation mounts the destination row before focusing it. Browser validation covers 3,068 records with 500 columns, editing/saving the last record, zoom, wrapping and account isolation.

Wide trainee sheets also render only the visible data columns and a small margin; column spacers preserve the complete header geometry. Keyboard/address navigation, frozen columns, RTL, zoom and merged cells retain their positions. Column menus, headers, search text and merge metadata are reused when unchanged. Normalized data snapshots are frozen and share unchanged rows across edits and Undo; ribbon operations copy only the rows they change. Saves omit empty trailing custom cells except in the first row, which preserves the full sheet width. Loading restores the rectangular matrix without changing values, formatting or leading zeros. The existing database validator accepts this compact representation; no migration is needed. Performance regressions are covered by `tests/trainees-performance.test.cjs` and `tests/trainees-performance-browser.test.cjs`, including a full 3,068 × 500 stored matrix, far-column merges, viewport resizing during editing, RTL alignment and save/reload.

The Rows & columns toolbar includes Delete column for the selected extra columns, with Undo support. Trainee details open by double-clicking the English name cell and separate labels on the right from values on the left, including course, keycode, category and Prometric credentials. Copying preserves the original value and its text direction. Duplicate ID previews also show the exam name.

All trainee tools share one ribbon without Home, Cells & layout or View & selection tabs. A Show/Hide sheet tools button collapses the command and formatting rows together while preserving Save and search access. This device preference survives browser refresh; expanded view uses its own Tools button and restores the normal ribbon choice when closed. The first row groups the command dropdowns; the second keeps font, alignment and view controls together. Five command groups use one dropdown button each: Rows & columns, Format (row height and column sizing), Merge & Center, Borders, and Sort & selection. Menus open above the ribbon scroll area, stay inside narrow viewports, support arrow-key navigation and close on selection, outside click or Escape. Repeated Insert/Delete/Find/Clear commands remain removed. Column visibility uses a separate dialog. On narrow screens command buttons wrap, while the formatting row scrolls horizontally without enlarging the page. Virtual redraws preserve scroll position. Unfiltered sheets always offer 1,000 blank rows after the last populated row, up to the row limit, without storing those blank rows. Ctrl/Command+Down navigates to the last populated row; Ctrl/Command+Up navigates to the first row. Shift extends the selection.

**Export Excel / Import Excel** exchanges only the signed-in account's trainee table as `.xlsx`, including hidden columns and all populated rows regardless of filters. Export commits the current cell edit and includes unsaved local records without requiring a database read or successful save. Values are written as text to retain leading zeros and keep formula-like content literal. Import requires an explicit method: append to the current sheet, or start fresh using the file. Append keeps existing records and formatting and adds rows after the last populated record. Start fresh replaces the signed-in account’s current sheet content and formatting; it does not create an additional independently saved sheet. Both methods preview the chosen worksheet and map known column titles before applying. Unknown headers become custom columns, and the entire import supports Undo. Excel date values, rich text, cached formula results and simple zero-padded numeric formats are handled. Files are limited to 20 MB, one million imported rows, 500 columns and 2,000 characters per cell. Append preserves existing sheet formatting; start fresh resets it. Workbook formatting/macros are not imported. Reading and writing use a local Web Worker with ExcelJS 4.4.0, loaded only when needed. No records are uploaded to a file conversion service. Full administrator JSON backups remain in Settings, separate from table exchange.

Code delete and Remove mark buttons use larger 36 px controls, including compact mode. The trainee sheet's separate formula bar is removed; the small cell address control sits with Edit & save. Alignment applies to selected cells and result dropdowns and participates in Undo/Redo.

Install development dependencies with `pnpm install --frozen-lockfile` (Node.js 20 or newer). Run `pnpm test` for all JavaScript unit suites and `pnpm test:browser` for the browser suites, which require Microsoft Edge. Run `pnpm build` to package the original UI and extensions, generate the TypeScript manifest and build the Next.js production application for Vercel. Browser suites run sequentially because two share the same preview port. SQL regression files require a separately authenticated test database session; they are not run by these commands.

Run `node tests/cloud.test.cjs` for frontend storage, import, inventory, and backup-restore regression checks. `database-tests.sql` checks RLS, claims, stale updates, role restrictions, inventory allocation, import, restore, and audit inside a transaction that rolls back all fixtures. Apply `migrations/20260929_ops_hardening.sql`, `migrations/20260929_settings_shape.sql`, `migrations/20260930_supervisor_stock.sql`, `migrations/20260930_supervisor_stock_policy.sql`, and `migrations/20260930_code_copy_time.sql` before deploying this frontend; all have been applied to the current project. `database.sql` records the original schema already applied to this project; it is not an idempotent setup script and should not be rerun on the provisioned database. New code claims store a server timestamp and display its time in the Codes date column in Riyadh time. Older claims continue to show their date only because their exact time was never recorded.

## Prometric registration from trainee rows

The trainee ribbon includes **Prometric registration** for selected rows. Each row
with saved credentials has its own **Keep the saved account / Create a new account**
choice and **Copy account** button. Choosing a new account affects only that row;
all other saved accounts are kept. The preview shows 50 rows per page and retains
choices when navigating pages or switching language. A new batch starts with saved
accounts kept and requires new explicit replacement choices. The original credentials
stay in the row until the new registration is confirmed and the sheet save succeeds.
Invalid emails, incomplete English names and duplicate row identities prevent
creation. Changes to a row's identity or credentials invalidate its replacement choice. Batches
support up to 5,000 selected trainees and run sequentially in one dedicated tab.

Download the integrated extension from this dialog, extract it to a permanent
folder, disable the old Prometric extension, and Load unpacked in the same Chrome
profile as TrainFlow. Reload both websites. The extension retains the original popup
and registration settings; a new extension instance may need those settings
configured again. See [extension setup](../extension/prometric/README.md).

Confirmed registrations write blank Username/Password cells in the matching private
sheet, or replace a selected retake's unchanged saved credentials only after its new
account is confirmed. Matching uses the trainee identity and exam rather than the old
row number. Unconfirmed failures require checking Prometric before retrying.
Results remain in extension storage until a successful sheet save is acknowledged.
Reloading reconnects the current tab; a closed tab's results can be explicitly
recovered for the same sheet owner. Changed, duplicate or occupied rows require
manual review and never cause automatic credential replacement. No database
migration or additional Supabase permissions are required.

`tests/prometric.test.cjs` checks row matching and extension message isolation.
`tests/prometric-flow-browser.test.cjs` loads the real MV3 extension in an isolated
Edge profile against local registration fixtures, including failed saves, reloads
and closed-tab recovery. These tests create no real Prometric accounts.


The last main panel and Settings pane restore on browser refresh after verified sign-in, without showing another panel or language first. Language is selected in the document head before the interface paints. Each signed-in viewer and sheet owner has an independent remembered cell and scroll viewport; refresh restores the current account's own sheet position. Only numeric coordinates and UI choices are stored, not trainee records or search text. The cell-address field comes first in the toolbar, followed by the selected cell’s displayed content and a separate table search field. Regression coverage: `tests/workspace-position-browser.test.cjs`.

Sheet selection uses a translucent grey overlay and one green frame around the selected range. The selection origin stays clear; selected row and column headers use green accents. Dragging and Shift selection work in both sheet directions. Virtualized rows retain the actual range edges, and the overlay does not alter saved cell fills, borders or copied formatting.

The Prometric registration button in the trainee toolbar uses a green background with white text, in both interface languages.


## Current navigation and spreadsheet controls

The right sidebar supports full labels, an icons-only rail and full closure. Use its visible opener to bring it back. Settings sections have their own tab query, for example /settings?tab=reports. Account and language controls sit in the footer; the account popup stays visible outside sidebar overflow.

| Action | Control |
| --- | --- |
| Adjacent cells | Drag across cells, or click the first and Shift-click the last |
| Adjacent columns | Drag their headers, or click the first and Shift-click the last |
| Separate cells/columns | Hold Ctrl (Cmd on macOS) and click; an exact previously selected area toggles off |
| Copy values and colors | Ctrl/Cmd+C or context menu → Copy |
| Clear selected contents | Delete; unselected gaps remain unchanged |
| Format several areas | Select them, then use the ribbon's font, fill, border or alignment controls |
| Start a normal selection | Click a cell without modifiers |

Copy writes TSV plus styled HTML to the system clipboard. Excel, Google Sheets and other rich destinations may preserve fills, text color, font and borders. Text-only paste receives values. Separate selected rows/columns are compacted in order; unselected intersections are blank. Merge, structural shifting and paste operations require one contiguous selection. Result cells also support Shift/Ctrl selection without changing their dropdown value.

**Duplicate IDs only** filters to rows whose normalized ID really occurs more than once. Empty and unique IDs are excluded. Matching handles Arabic/Persian digits, spacing and hyphens; the original ID string remains unchanged. Only those repeated IDs receive the red duplicate fill.

## Export vouchers with colors

On VOUCHERS, use **Export vouchers** beside the report controls. Choose **Unused only** or **All vouchers**, then **All categories** or **Current category**, and download Excel. The preview shows the count. The export refreshes accessible inventory first and respects the account's data permissions.

The file includes Code, Category, Status, Used on, Time and Notes. Used rows retain the screen's usage-day fill and contrasting text; the code is struck through. Unused rows are white. Values are text so leading zeros and formula-like notes remain literal. The older CSV export in Settings cannot carry colors.

## Certificate correction and Google reports

Use **Certificate name change** in the trainee toolbar, enter the new English name and review the export. The file is **Certificate Data Change Sheet.xlsx**. It includes the existing English name, username, matched exam title, voucher, date, grade, new name and fixed center name **Al-Alameya For Business Solutions**; it has no password column.

Google configuration belongs to **Settings → Google reports**. The trainee toolbar keeps the date, preview and upload actions alongside certificate/Prometric controls. Preview contains the exact two report shapes, paged every 50 rows. Actual target-sheet duplicate suppression happens during upload. Follow the [Google setup guide](google-reports.md) to configure file IDs, tab names and header row.

Download Prometric 4.1.3 from **Settings → Extensions**. Replace files in the installed extension’s folder and reload it for the current Vercel origin. Automatic chain copy has been removed; copying a keycode does not automatically claim a voucher.

Current focused checks are pnpm test, pnpm build, pnpm test:next, tests/selection-export-browser.test.cjs and tests/sheet-enhancements-browser.test.cjs. Some legacy browser tests still expect the removed owner dropdown. These checks use synthetic records and do not submit real Google reports or create real Prometric accounts.

## Workbook commands and voucher names — 6 October 2026

The tabs below the trainee grid switch independent worksheets. Switching first saves edits; a failed save keeps the current worksheet open. Insert → Insert Sheet creates a new tab. Delete → Delete Sheet asks for confirmation, deletes only that worksheet, and keeps at least one visible worksheet. Sheet deletion is not part of cell Undo; back up needed data first. Import → New creates a separate worksheet and retains the existing one. Excel export exports the active worksheet; the administrator JSON backup includes all worksheets and their names, positions, visibility, tab colors and cell formatting.

Insert/Delete Cells shifts the selected contiguous range right/down or left/up, moving values and formatting together. Clear sorting/filters and unhide rows first. Insert/Delete Sheet Rows supports selected rows; the thirteen operational columns retain their positions, while custom columns can be inserted/deleted. Format includes row height, automatic height, column width, automatic width, default width, row/column visibility, worksheet visibility, Rename Sheet, Move or Copy Sheet and Tab Color. Column widths now save with each worksheet.

Borders → Format borders opens the line/color editor. Choose a pen, use None/Outline/Inside or click preview edges/diagonals, then Apply. Cancel changes nothing. Borders apply to the selected union and keep gaps untouched. Some dash styles are approximated by browser CSS; XLSX stores the selected Excel line style.

Merge offers Merge & Center, Merge Across, Merge Cells, Unmerge Cells and Center Across Selection. Merging warns before discarding values outside the first cell. Center Across Selection preserves values and separate cells. Sort & Filter supports A to Z, Z to A, up to five custom sort levels, filter visibility, clearing and reapplying. Sorting changes the display order while keeping each trainee record intact.

Get in trainee details reserves the voucher and saves the English trainee name in the same database update; Arabic is the fallback. Vouchers displays an editable Trainee name column for administrators/operators; copy-only accounts can view it. Names survive code edits, backups and colored voucher exports. A claim/version conflict writes neither usage nor a new name. Renaming a trainee later does not retroactively change a previously reserved voucher name; edit that name in Vouchers when needed.

## أدوات الشيت بتصميم Excel

فوق الجدول، اختر خلية واضغط **إضافة فاصل قبل الصف المحدد**. الفاصل يبدأ مجموعة جديدة حتى الفاصل التالي، ويعرض أول تاريخ موجود في المجموعة وعدد الصفوف التي تحتوي بيانات. اختلاف التاريخ داخل المجموعة أو وجود صف فارغ لا يضيف فاصلًا يدويًا جديدًا. زر × يزيل الفاصل، وUndo يعيد التغيير.

الفواصل اليدوية محفوظة في `format.daySeparators` مع الجدول وصلاحياته وإصداره؛ تظهر بعد إعادة التحميل ومن الأجهزة الأخرى، وتبقى عند نسخ الشيت والنسخ الاحتياطي. إدراج/حذف صفوف كاملة ينقل مواضعها مع الصفوف. لا تُنسخ كبيانات متدربين ولا تضيف صفوفًا فعلية. خيار اختصار الصفوف الفارغة اختياري؛ الفواصل اليدوية تبقى ظاهرة عند إيقافه. عند وجود فواصل يدوية تُستخدم مواضعها بدل التقسيم التلقائي، وتُخفى مؤقتًا أثناء الفلترة والفرز. لا يمكن وضع فاصل داخل دمج رأسي أو دمج صفوف عبر فاصل.

طبّق migration `supabase/migrations/20261010090000_manual_day_separators.sql` قبل نشر هذه الواجهة. اختبار `tests/manual-day-separators-database.sql` يتحقق من الحفظ والنسخ وتعارض الإصدارات في transaction تُلغى بالكامل.

قوائم Insert وDelete تتيح الخلايا والصفوف والأعمدة والشيتات المستقلة. قائمة Format تضم Cell Size وVisibility وOrganize Sheets؛ افتح Hide & Unhide بالنقر أو بالمرور عليها أو بالسهم المناسب لاتجاه الواجهة. قائمة Sort & Filter تبدأ بالفرز التصاعدي والتنازلي والفرز المخصص، ثم Filter وClear وReapply. Clear وReapply يتفعّلان عند وجود فرز أو فلتر. إغلاق قائمة الأدوات بـEscape يبقي القائمة الجانبية مفتوحة.

زر Merge & Center يطبق الدمج والتوسيط على التحديد؛ السهم المجاور يفتح Merge Across وMerge Cells وUnmerge Cells وCenter Across Selection. المحاذاة الأفقية والرأسية والتفاف النص تحفظ مع الخلايا ويمكن التراجع عنها. عند وجود قيم متعددة، يطلب الدمج التأكيد قبل الاحتفاظ بقيمة أول خلية.

Format borders يعرض 13 عينة لأسلوب الخط، ولونًا مع Automatic، والإعدادات المسبقة None وOutline وInside، ومعاينة الحواف والحدود الداخلية والقطرية. الإعدادات تتغير في المعاينة أولًا؛ Apply يطبقها، وCancel يلغيها. نسخ الخلايا الغني وتصدير Excel يحافظان على الحدود والألوان المحفوظة.
