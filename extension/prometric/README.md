# Prometric Auto Register — TrainFlow 4.1.5

Integrated from the user's Prometric Auto Register 4.0 source (Salah Mostafa,
ISC license). Its original popup, registration steps, generation pattern,
address defaults and import/export tools are retained.

Production origin: **https://trainf.vercel.app/**. Updated 6 October 2026. Configured exclusively for the Vercel production origin.

## Update an installed unpacked extension

Download the new ZIP from **Settings → Extensions**. Replace its files inside the same permanent folder you previously loaded, then press **Reload ↻** in `chrome://extensions`. Reload TrainFlow and the Prometric tabs afterward. Updating once grants the extension access to the Vercel origin; ordinary website updates do not require reinstalling it. Keeping the same folder normally retains its extension ID and local settings.

## Install in Google Chrome

1. Extract this ZIP into a permanent folder.
2. Disable the old Prometric extension so only one registration extension runs.
3. Open `chrome://extensions`, enable Developer mode and choose Load unpacked.
4. Select the extracted folder. This package is ready to load; no npm build is needed.
5. Reload TrainFlow and any Prometric tabs in the same Chrome profile.
6. In TrainFlow's trainee sheet, select rows and click **Prometric registration**,
   review the ready/skipped rows, then click **Create accounts**. A single trainee's
   detail dialog also has **Prometric account options**. For a trainee who is testing
   again, choose either the saved account or **Create a new account with the same
   details**. The old username and password stay in the sheet until the new account
   is confirmed and the sheet save succeeds.

Keep the TrainFlow tab available until results are saved. After a reload, pending
results reconnect to the same tab's session. If that tab was closed, open the same
user's sheet, choose Prometric registration and Recover results from a closed tab.
Recovery is blocked while the original tab remains open. If saving fails, the extension keeps
the confirmed credentials until TrainFlow acknowledges a successful sheet save.
Clearing a session or queue cancels its pending TrainFlow rows and closes the
registration tab. Confirmed results remain recoverable until saved or manually
reviewed; save or review them before starting another batch. Late results from
the cleared registration tab are rejected. Clearing history keeps these unsaved
TrainFlow results as well as the extension settings.
Popup controls report a failed extension command instead of claiming it started,
paused or cleared a registration. Unsaved TrainFlow results must be saved or
reviewed before the popup can start another registration.
Review results manually when a row changed, was removed, has duplicate identity
data or has credentials changed after a retake was started. TrainFlow never
overwrites existing Username/Password automatically; replacement is available only
after explicitly choosing a new account for that same trainee and only while the
saved credentials remain unchanged. For changed/duplicate rows, copy the credentials
for manual review and use Reviewed — do not write to release that result without
claiming it was saved to the sheet. The extension's original History panel provides
a separate local copy of completed registrations.

Registration uses this extension's existing settings (password pattern, address,
city, country and security answers). Adjust those settings in its popup first.
Installing into a new folder may create a separate extension instance; configure
its settings if Chrome did not retain the previous ones.

Google Sheets host access is optional. Chrome requests it only when you click to
import a Google Sheet; declining leaves the import unavailable and keeps the
registration features usable. Shared sheets are fetched as CSV without cookies.

Only the dedicated registration tab runs automation. Results require matching
queue IDs and a registration submission marker before dashboard confirmation.
TrainFlow batches do not automatically retry uncertain failures. Check Prometric
before retrying a stopped or failed registration.

TrainFlow transfers only selected English names, emails and row matching metadata.
Supabase access tokens and shared Prometric supervisor credentials are not sent
to the extension. No new database permissions or public endpoints are introduced.

Browser tests use an isolated Chrome/Edge profile and local Prometric fixtures;
they do not register real accounts.

## Selection and updates

Download the current ZIP from **Settings → Extensions** or the registration dialog. Replace/reload the unpacked extension, then reload the Vercel page and Prometric tabs. A site refresh alone cannot update an installed unpacked extension.

Drag/Shift selects adjacent rows; Ctrl/Cmd selects separate cell or column areas. Registration collects each selected visible-view row once, including rows covered by separate selections. It does not include unselected rows between those areas. The preview remains the final check before creating accounts. Existing credentials are never replaced automatically; the explicit retake option requires extension 4.1.4 or later.

The Trust boundary remains the exact Vercel origin, the owning extension ID and its dedicated registration tab. A migrated frontend does not reset the same private sheet or pending result ownership. See the [operations guide](../../docs/operations-guide.md) and [deployment guide](../../docs/deployment.md).
