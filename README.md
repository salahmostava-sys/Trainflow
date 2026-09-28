# IBTA Ops — shared Supabase edition

Connected project: `xaeffreqwtozsgqajzpc` (IBTA Ops). The existing Muhimmat project was not changed.

## First sign-in

Open `ibta-ops.html` with `cloud.js` beside it and an internet connection, or use the local HTTP preview. Choose **إنشاء حساب**, using `salah@gmail.ru`, choose your own password, and confirm your email. Return to the app and sign in. The administrator email is already allowlisted; its authentication account still needs to be created by its owner.

Supabase's email confirmation redirect should be configured to the final HTTPS website URL before publishing. If verification redirects to the default localhost address, return to this app after confirming the email and sign in here. This application does not need access to your email password.

Administrators can allowlist another email from **إدارة البيانات والمستخدمين**. That person then creates an account and confirms the same address. Other signups cannot access operational data. Operators can copy codes, edit notes, and release their own codes. Only administrators can add/delete codes, manage categories, and allowlist users. Membership can be deactivated in the Supabase `ibta_members` table by setting `active=false`.

## Data

- `ibta_codes`: one row per unique code, notes, usage date, actor, and optimistic version.
- `ibta_settings`: shared keycode catalog, category ordering/overrides, and Prometric credentials. RLS restricts reads to approved users; these credentials are no longer in public HTML/JavaScript.
- `ibta_members`: approved email addresses and roles.
- `ibta_audit`: database-generated actor/action/time log. Audit entries deliberately do not include passwords or note contents.

The original 36 codes and 25 keycodes were seeded to the new database. Operational data is not stored in browser localStorage anymore. Only language and auto-chain preferences remain local. Authentication is stored in sessionStorage and requires logging in again when the browser session ends.

## Existing browser data

Old localStorage was not erased. Sign in as administrator **in the browser and at the same original file location used previously**, then click **استيراد بيانات المتصفح القديمة**. This merges added codes, notes, usage marks, and custom categories. Existing nonempty cloud notes and usage marks win. This import never deletes cloud codes and does not mirror old deletions or override cloud category ordering/assignments. A hosted HTTPS site or the HTTP preview cannot read storage belonging to the original file URL.

Verify the merged counts and marks before putting the team into operation. The original embedded seed did not contain browser-only usage history.

**تنزيل نسخة احتياطية** exports the shared configuration and codes. The resulting JSON includes Prometric credentials; keep it private. There is no scheduled backup service configured.

## Concurrent use

The server atomically claims a code before copying it. Another user with a stale version cannot claim or overwrite it. If clipboard access fails, the code stays reserved for the same user; they can retry copying or release it. Previously used codes require confirmation before recopying, and operators cannot recopy another person's used code.

Changes are transactional and version-checked. On conflict, the UI reloads current server data and asks the user to repeat the operation; it never silently overwrites a colleague. Data refreshes on changes, manually, and approximately every two minutes while the page is visible and the user has no unsaved input or selected rows. Rate-limited or unavailable background requests pause for five minutes. This is polling, not push realtime. This version loads the current code inventory into memory, with paginated API reads; a very large inventory should use server-side search and paginated UI.

The database rejects change batches over 250 operations, settings payloads over 64 KiB, notes over 2,000 characters, and claim targets over 200 characters. These limits reduce accidental or abusive database work; they do not stop a distributed denial-of-service attack against the public Supabase endpoint. Before public deployment, review Supabase Auth rate limits and enable Auth CAPTCHA. Protecting the Data API from high-volume traffic would require a server-side gateway with per-client limits and an architecture that prevents direct access to the same operations.

## Hosting

For Cloudflare Pages Git integration, use `main` as the production branch, `node tools/build-site.cjs` as the build command, and `dist` as the output directory. The build publishes only `ibta-ops.html` (as `index.html`) and `cloud.js`; SQL files, tests, and backups are not included in the website. The Supabase publishable key in `cloud.js` is intended for public clients; no secret/service-role key is used. The client library is pinned to Supabase JS 2.116.0 on jsDelivr. After deployment, set the Supabase Auth Site URL to the final HTTPS address.

## Verification

Run `node tests/cloud.test.cjs` for frontend storage and reservation regression checks. `database-tests.sql` checks RLS, claims, stale updates, role restrictions, and audit inside a transaction that rolls back all fixtures. `database.sql` records the schema already applied to this project; it is not an idempotent setup script and should not be rerun on the provisioned database.
