# Prometric Auto Register — TrainFlow 4.1.2

Integrated from the user's Prometric Auto Register 4.0 source (Salah Mostafa,
ISC license). Its original popup, registration steps, generation pattern,
address defaults and import/export tools are retained.

## Install in Google Chrome

1. Extract this ZIP into a permanent folder.
2. Disable the old Prometric extension so only one registration extension runs.
3. Open `chrome://extensions`, enable Developer mode and choose Load unpacked.
4. Select the extracted folder. This package is ready to load; no npm build is needed.
5. Reload TrainFlow and any Prometric tabs in the same Chrome profile.
6. In TrainFlow's trainee sheet, select rows and click **Prometric registration**,
   review the ready/skipped rows, then click **Create accounts**. A single trainee's
   detail dialog also has **Create Prometric account** when both login fields are empty.

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
data or already contains different credentials. TrainFlow never overwrites existing
Username/Password automatically. For changed/duplicate rows, copy the credentials
for manual review and use Reviewed — do not write to release that result without
claiming it was saved to the sheet. The extension's original History panel provides
a separate local copy of completed registrations.

Registration uses this extension's existing settings (password pattern, address,
city, country and security answers). Adjust those settings in its popup first.
Installing into a new folder may create a separate extension instance; configure
its settings if Chrome did not retain the previous ones.

Only the dedicated registration tab runs automation. Results require matching
queue IDs and a registration submission marker before dashboard confirmation.
TrainFlow batches do not automatically retry uncertain failures. Check Prometric
before retrying a stopped or failed registration.

TrainFlow transfers only selected English names, emails and row matching metadata.
Supabase access tokens and shared Prometric supervisor credentials are not sent
to the extension. No new database permissions or public endpoints are introduced.

Browser tests use an isolated Chrome/Edge profile and local Prometric fixtures;
they do not register real accounts.
