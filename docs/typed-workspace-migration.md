# Typed workspace migration — 7 October 2026

This change implements the supplied review against commit `93f5612`, retaining the newer worksheet, Excel, voucher-name, retake and mobile-dialog features. It changes application source and tests; it does not migrate, replace or reset the live database, accounts or intentional Prometric password settings.

## Maintained source

- `components/workspace/*.tsx` render login, navigation, settings and the six screen hosts. Next pages render these components with their initial panel. `trainflow.html` and the raw classic HTML injection are removed.
- `workspace.css` contains shared styles. `workspace.js` retains existing shared commands and translations for gradual conversion.
- `client/cloud.ts` owns the typed cloud boundary; `server/api.ts` owns the typed API. `lib/workspace-types.ts` describes roles, code records, worksheets, cells, settings and the grid engine interface.
- `client/navigation.ts` saves drafts before loading a new page document. Failed saves retain the current screen and editable data. Settings tabs use history inside their page. Grid selection/position continues to use the existing per-owner and per-sheet preferences.
- Builds compile browser assets and generate script metadata. Static/synthetic preview HTML is rendered from TSX, rather than used as maintained application source. `cloud.js`, `navigation.js`, generated metadata and packaged assets are ignored outputs.

The large grid, Excel, registration and report engines remain JavaScript behind the typed boundary. This is the requested gradual migration, with their existing tests and DOM contracts preserved.

## Report fixes and verified policy

API errors no longer retry database writes through direct Supabase REST. Writes require the application's Origin. Code/name editing by `copy_only` is rejected by the API; voucher claiming and the member's own worksheet operations remain permitted, matching the existing SQL. Non-admin worksheet writes reject another owner. Membership filters quote and escape their identity/email literals. Caller JWT forwarding and database RLS remain authoritative.

The extension requests Google Sheets host access only on an import click. Its CSV fetch accepts only the expected HTTPS export URL shape, without cookies. The feature is retained. The request follows the [Chrome optional-permission API](https://developer.chrome.com/docs/extensions/reference/api/permissions#method-request). The existing password-generation/default-password behavior is retained.

Mobile sheet tools start collapsed when no explicit preference exists; explicit expansion is retained. Voucher actions and category controls receive larger touch targets. The existing localized tool captions, local-preference explanation and grid focus restoration are preserved; the ribbon region label follows the selected language. Backup controls explain that exported files contain private operational data without changing the compatible JSON format.

During regression verification, cell deletion/shift was found to use `await` in a non-async function. The handler is now async. Its browser regression uses the actual in-app cancel/confirm buttons and verifies data, formatting and RTL shifts.

## Verification and limits

Run `npm test`, `npm run test:ui`, `npm run build`, `npm run test:next` and `npm run test:browser`.

The added checks cover API failure without direct retry, write Origin, copy-only/worksheet-owner rules, quoted membership filters, save failure blocking navigation, saved data after page reload, and mobile tool preferences/touch targets. Production Next checks use the real Cloud/UI modules with a third-party SDK fixture. Existing command suites also exercise the grid, Excel, reports, registration and clipboard.

Local verification completed on 7 October 2026:

| Check | Result |
| --- | --- |
| `npm test` | Passed; the subsequently added Google CSV URL/no-cookie regression also passed |
| `npx tsc --noEmit --pretty false` | Passed |
| `npm run build` | Passed |
| `npm run test:next` | Passed against the final production build |
| `npm run test:ui` | 6 passed, 1 existing skip for previously removed exam-order buttons |
| `npm run test:browser` | All 15 browser suite files passed |
| DOM contract comparison | No removed, added or duplicate IDs relative to the latest HTML shell |
| `git diff --check` | Passed |

Desktop and mobile screenshots were inspected. The regression checks run against synthetic records and do not create real Prometric accounts.

## UI/UX follow-up

The mobile drawer now contains keyboard focus and makes the covered workspace inert. Closing it, choosing compact mode or returning to a desktop viewport restores access. Shared prompts receive a visible localized label, linked validation messages and invalid-state feedback; record and worksheet dialogs announce their titles.

Coarse-pointer devices receive larger sheet controls and row/result targets, including at reduced zoom. Saved row-density and column-width preferences remain unchanged, and virtual scrolling uses the displayed row height. Report, certificate and registration actions wrap on narrow screens. Login guidance uses darker text, and sheet transitions list their properties explicitly.

Regression checks cover drawer keyboard cycling/release, Arabic/English prompt validation, touch target geometry, visible registration actions, unchanged density preferences and navigation to a distant row. Existing command regressions close the mobile drawer through its actual toggle before using covered workspace controls.

Follow-up validation passed: `npm test`, `npm run build`, `npm run test:next`, `npm run test:ui` (9 passed, 1 existing skip), and all 15 browser suite files. The dropdown regression waits for the browser's asynchronous popover event before asserting its expanded state. Desktop and touch screenshots were inspected again.

This is source review and functional regression validation with synthetic records. It does not establish the current live Supabase leaked-password-protection setting, live RLS configuration, or actual Google/Prometric uploads. Those remain separate live-account checks. Publication must be verified separately from a passing local build.
