# Deployment and maintenance

Updated 6 October 2026. The production workspace is [TrainFlow on Vercel](https://trainf.vercel.app/).

## Local development

Use Node.js 20+ and pnpm 10. CI uses Node.js 22. Install from the checked-in lockfile:

~~~sh
pnpm install --frozen-lockfile
pnpm dev
~~~

For production review, run pnpm test, pnpm test:ui, pnpm build, pnpm test:next, then pnpm start. pnpm build compiles the typed client and packages styles, feature modules and extensions into public/workspace. It creates generated/workspace-assets.ts containing script URLs and early language initialization, then builds the maintained TSX screens with Next type checking. Commit source files rather than generated directories.

The synthetic preview is node tools/design-preview.cjs at http://127.0.0.1:4174. It replaces the cloud data client and cannot verify real authentication, database writes or external uploads. A static server does not implement /api/data.

## Vercel configuration

| Setting | Value |
| --- | --- |
| Repository | salahmostava-sys/Trainflow |
| Production branch | main |
| Framework | Next.js |
| Build command | pnpm build |
| Install | pnpm install --frozen-lockfile |
| Production address | https://trainf.vercel.app/ |
| API health | /api/health |

vercel.json selects the Next deployment. The API route calls server/api.ts directly and preserves the existing user JWT and database authorization. Supabase URL and publishable-key overrides may be configured as SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. No service-role key is needed by this API. Browser database requests fail closed through /api/data; API errors are shown without retrying directly through Supabase REST.

The URLs /trainees, /keycodes, /prometric, /vouchers, /inventory and /settings render TSX screens directly. A native document navigation saves trainee drafts first; failed saves keep the current page editable. Settings sections use a tab query parameter, for example /settings?tab=reports. Back/Forward and refresh restore the selected page and saved sheet data. The root uses a server redirect to /trainees so the early language/sidebar initialization runs in the destination document.

The sidebar stays on the right in both languages, supports a 60 px compact rail and can be fully closed. Its opener remains visible outside the closed sidebar. The account popup is positioned outside the sidebar's overflow and clamped to the viewport.

## Verify the published version

1. Check the GitHub commit and Vercel deployment status; a local passing build does not prove publication.
2. Open /api/health. A Next deployment identifies runtime as nextjs.
3. Verify direct navigation, refresh and Back/Forward on the six page URLs.
4. Check the sidebar in full, compact and closed modes, including the account popup on mobile.
5. Use synthetic data for UI regression checks; test a real signed-in account separately when live writes are required.
6. Confirm the Prometric extension ZIP downloads from Settings → Extensions. Reinstall/reload existing unpacked extensions after an update.

The selection/export browser suite checks additive selections, rich clipboard MIME types and the actual colors inside downloaded XLSX files. External Google/Prometric actions need their own configured test accounts and are not exercised by that suite.

## Production Origin & Domain Configuration

Application links, extension host permissions, bridges and test fixtures exclusively use the Vercel production origin (`https://trainf.vercel.app/`).

Ensure Supabase Auth Site URL and allowed confirmation/recovery redirects are set to the intended Vercel origin in the existing project. Verify email redirects to guarantee seamless authentication.

## Backups and rollback

Download a private administrator backup before operational restores. Auth accounts are separate from app JSON exports, and frontend rollback does not restore database contents.

For a frontend regression, roll back the Vercel deployment or revert the faulty commit and let production redeploy. Review and apply database migrations individually; do not rerun database.sql against the existing project. A frontend rollback does not reverse SQL changes or external report uploads.

See [architecture](../ARCHITECTURE.md), [operations](operations-guide.md) and [server boundaries](javascript-server.md).

## Workbook schema prerequisites

Before deploying the workbook commands, apply the trainee_border_styles, trainee_worksheets, trainee_worksheet_integrity and voucher_trainee_names migrations in their checked-in order. The original trainee row becomes Sheet 1 in place. Legacy saves remain scoped to it. Frontend rollback retains the database changes; an old owner-only multi-row read cannot display a workbook with multiple worksheets, so restore a compatible frontend rather than dropping live sheet data. Verify create/copy/save/switch/delete and all-sheet backup restore with synthetic records.

## Worksheet owner quota

Apply `supabase/migrations/20261014090000_enforce_worksheet_quota.sql` after the existing workbook migrations. It enforces the 100-sheet owner limit on direct INSERT and owner transfers as well as RPC operations, using the same transaction lock. Existing sheets are preserved; saves of existing sheets remain allowed at the limit. Run `tests/worksheet-quota-database.sql` in a dedicated fully migrated local test database. Do not run fixture SQL against production.
