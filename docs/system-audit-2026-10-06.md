# Worksheet regression audit — 6 October 2026

The audit preserves the Next.js/TypeScript runtime, existing data, TF branding and requested right sidebar. It fixes regressions introduced while extending the original spreadsheet interface.

## Confirmed failures and corrections

| Failure | Cause | Correction |
| --- | --- | --- |
| Partial sheet initialization; Foundation copy appeared not to change color | Ribbon rebuilding discarded the new row-size control. Translation dereferenced its missing label during startup and cloud refresh, interrupting rendering | Preserve the control in the View group; exercise copying after opening Trainees |
| Get with a trainee name and independent sheet actions failed for signed-in users | Invoker RPCs lacked grants for newly added columns; existing grants covered older columns | Grant authenticated updates to trainee_name, worksheet metadata insertion/update and version insertion for restore. RLS, ownership guards and the ban on direct version updates remain in force |
| Row size selection had no effect and row estimates drifted | Control and final CSS used different variables and units | Apply the chosen point size to the rendered pixel height and use the same units for virtualization |
| Expanded sheet controls were covered; selection header disappeared at distant rows | Sidebar stacked above the full-screen sheet; new corner rule replaced sticky positioning | Hide the sidebar only during expanded view; retain sticky header and preserve visible row anchor |
| Closing an Excel menu also closed the sidebar | Both handlers consumed the same Escape key | Keep sidebar state when a command popover or expanded sheet handles Escape |
| Names/notes unreadable on voucher fills | Used rows forced white text on pale fills; notes and native placeholders also retained their own colors on dark fills | Make both inputs and placeholders inherit the calculated contrasting foreground; use dark text on the white editing surface |
| Large blank area beyond voucher action buttons | Fixed column widths left part of wide rows unused and cell padding differed between headers and body | Share grid column sizes between header and rows; let names and notes fill available width while actions stay compact |
| Google report source ambiguous after adding worksheets | Apps Script queried only the owner; multiple sheets yielded multiple records | Query owner and sheet ID together, retain first-sheet compatibility for old requests, fix preview date/sheet context and prevent duplicate concurrent upload clicks |

## Requested Excel menus

Insert/Delete display grid icons and four commands for cells, rows, columns and worksheets. Format groups Cell Size, Visibility and Organize Sheets; Hide & Unhide is a nested menu with pointer and RTL/LTR keyboard access. Merge & Center has a direct action and a separate dropdown for all five pictured modes. Horizontal/vertical alignment and wrapping apply to selection and support Undo. Sort & Filter follows the reference order, with unavailable Clear/Reapply disabled.

The border editor provides 13 graphical line choices, color/Automatic, None/Outline/Inside presets, eight edge controls and a staged Text preview. Apply persists borders; Cancel leaves the worksheet unchanged. Clipboard and XLSX tests inspect the actual resulting formatting.

## Verification

- All 14 unit-test script groups passed; production Next build and TypeScript checks passed.
- Browser checks cover editing, clipboard/color, selection/export, GET/name allocation, worksheet isolation, metadata, undo, file import/export, formulas, borders/merges, sorting, expanded view, 3068 × 500 virtualization, mobile bounds and language switching.
- Extension registration tests use routed synthetic Prometric pages; no real registrations are created.
- Google report tests use fake destinations/responses, including a Next runtime pass; no real report files are modified.
- Database integration runs as authenticated with the approved administrator JWT context and rolls back every fixture change. Worksheet create/copy/metadata/save/restore, named voucher claims, conflict handling and authentication checks passed.
- Aggregate live counts remained 148 vouchers, one worksheet and one active member. The two permission migrations change grants only.
- Stale browser fixtures were updated to use independent worksheet tabs and the current preview fixture initializer; tests open mobile navigation explicitly instead of forcing blocked clicks.

## External connector update

Existing Google Apps Script deployments need the new Code.gs downloaded from Settings, followed by New version in the existing deployment. Saving Script properties alone does not replace deployed code. This update is required for reports from independent worksheets; the frontend cannot publish the user's Google script.

See [operations](operations-guide.md), [Copy reports](copy-reports.md), [deployment](deployment.md) and the [documentation index](README.md).
