# TrainFlow — Prometric 4.2.8

Integrated from the user's Prometric Auto Register 4.0 source (Salah Mostafa,
ISC license). Its original popup, registration steps, generation pattern,
address defaults and import/export tools are retained.

Production origin: **https://trainf.vercel.app/**. Updated 14 October 2026. Configured exclusively for the Vercel production origin.

The toolbar, extension manager, notifications and popup use the same TrainFlow
logo. Replace the installed extension files in their existing folder and reload
the extension to update cached Chrome icons while keeping saved settings.

The popup opens in Light mode on first use. Switching Light/Dark saves your choice for later openings.

## Fetch exam results

Select trainee rows, then choose **Fetch Prometric results → Fetch selected results**.
Only those selected rows with a voucher code, complete saved credentials and an exam
title are eligible. The dedicated tab signs in to each account and reads Review Scores;
it does not launch a test. TCNet's explicit Pass/Fail and score are written to the
result column and an **Exam percentage** column immediately after **AnyDesk ID**.
Results must match the selected row's complete exam name and language. When several
attempts match, version 4.2.7 selects the unique newest test date, regardless of
Pass/Fail or percentage. Dates use TCNet's named-month format, such as `October 7, 2026`.
Missing, invalid or unsupported dates, or a tie for the newest date, require manual
review. Attempts on the same day cannot be ordered from a date without a time.
Existing score columns are moved into
that position while preserving custom columns and saved scores for other rows.
Each account's credentials are removed from this results queue after it
finishes. Confirmed scores remain recoverable until TrainFlow acknowledges its cloud save.

Repeated trainee identities do not prevent fetching results for selected rows. A
live fetch tracks the explicitly selected immutable row, including identical copies,
and follows that row if it moves. Other copies are not updated. If the selected
duplicate is replaced or edited during fetching, its result remains visible for
manual review. After a page reload, recovery may match repeated identities by an
unambiguous voucher and account; indistinguishable copies still require manual
review. New-account registration retains its separate duplicate-identity checks.

Results follow **Candidate → Take Test → History / Review Scores**, using the site's
navigation links or its History / Review Scores buttons, including submit inputs.
If clicking History leaves the page unchanged, the extension rechecks the active
job and signed-in account, then opens the score-history page directly after 2.5 seconds.
History postbacks that reload the Candidate page also resume at score history.
Unrecognized Candidate navigation also falls back to that same read-only scores page.
This direct fallback runs once per account attempt; redirects back to Candidate require manual review.
Take and Resume exam buttons are never used. An expired session is reported separately from a mismatched account.
The last failed account tab remains open for inspection; retrying closes that old tab.
Previously visited documents cannot receive the next trainee's credentials.

Attempts without a uniquely identifiable newest date, paginated histories, unavailable reports and
unconfirmed scores require manual review. They do not change the existing result.
Changes to a row's identity, voucher, credentials or result also prevent automatic writes.
Use **Do not write** for a reviewed conflict, or restore pending scores from the same
sheet after closing the original app tab. Registration and results jobs cannot run
at the same time. The Prometric site session in that Chrome profile may switch
between the selected accounts while this batch runs.

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

## Password generation (4.2.8)

At the user's request, new registrations default to `{F}@{f}#$1970`: `{F}` is the trainee's first initial uppercase and `{f}` is the same initial lowercase, so `Ahmed Student` produces `A@a#$1970`. This template is used literally and is no longer converted to random generation. Updating from 4.2.6 or 4.2.7 replaces their saved exact `{random}` setting with this default; other custom templates remain unchanged. `{random}` remains available as an explicit setting afterward. Existing provider accounts, saved registration history and queued accounts with confirmed credentials are not changed. Replace the installed files in the same extension folder and reload version 4.2.8, then reload TrainFlow and Prometric tabs.
