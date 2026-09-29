# IBTA Ops — shared Supabase edition

Connected project: `xaeffreqwtozsgqajzpc` (IBTA Ops). The existing Muhimmat project was not changed.

## First sign-in

Open the live application at <https://ibta-ops.pages.dev/>. The administrator account for `salah@gmail.ru` already exists; sign in with its password. New team members must first be allowlisted by an administrator, then create their own accounts and confirm their email addresses.

Supabase Auth's Site URL is configured as <https://ibta-ops.pages.dev/> for confirmation and recovery emails. This application does not need access to your email password.

The Settings screen uses separate tabs for account details, system data, Prometric details, preferences, and team/sync tools. System-data and Prometric-edit tabs are visible only to administrators; the database enforces those permissions independently of the interface.

Administrators add exams and categories under **Settings → System data**. The Keycodes screen remains focused on viewing and using keycodes.

The interface and sign-in page share the IBM Plex Sans Arabic font, loaded from Google Fonts with local system-font fallbacks.

Administrators can allowlist another email from **إدارة البيانات والمستخدمين**. That person then creates an account and confirms the same address. Other signups cannot access operational data. Operators can copy codes, edit notes, and release their own codes. Only administrators can add/delete codes, manage categories, and allowlist users. Membership can be deactivated in the Supabase `ibta_members` table by setting `active=false`.

## Data

- `ibta_codes`: one row per unique code, notes, usage date, actor, and optimistic version.
- `ibta_settings`: shared keycode catalog, category labels/ordering/overrides, Prometric credentials, and Zoom/Prometric links. RLS restricts reads to approved users; these values are not embedded in public HTML/JavaScript. Administrators can edit existing categories, exams, codes, and the shared connection details from Settings. Category names are editable display labels; the underlying category IDs stay stable so existing codes and links remain attached.
- `ibta_members`: approved email addresses, immutable Auth user IDs, and roles. Confirming a new sign-in email updates the membership email while retaining the same role.
- `ibta_audit`: database-generated actor/action/time log. Audit entries deliberately do not include passwords or note contents.

The original 36 codes and 25 keycodes were seeded to the new database. Operational data is not stored in browser localStorage anymore. Only language and auto-chain preferences remain local. Authentication is stored in sessionStorage and requires logging in again when the browser session ends.

The deployed HTML and JavaScript contain interface code, the Supabase project URL, and a publishable key. They contain no operational codes, Prometric credentials, or secret/service-role key. Browser source is public by nature, so authorization depends on Supabase Auth and database RLS rather than hiding JavaScript. An approved user can inspect any values the application sends to their browser; a different access model would require a server-side API with narrower per-user responses.

Each signed-in team member can edit their own name, sign-in email, and password under **Settings → My account**. The display name is stored in Supabase Auth user metadata and never grants access. Email changes require confirmation from the new inbox; authorization remains attached to the Auth user ID. Password changes ask for the current password and are handled by Supabase Auth without storing either password in app settings. Administrators cannot read team members' passwords.

## Existing browser data

Old localStorage was not erased. Sign in as administrator **in the browser and at the same original file location used previously**, then click **استيراد بيانات المتصفح القديمة**. This merges added codes, notes, usage marks, and custom categories. Existing nonempty cloud notes and usage marks win. This import never deletes cloud codes and does not mirror old deletions or override cloud category ordering/assignments. A hosted HTTPS site or the HTTP preview cannot read storage belonging to the original file URL.

Verify the merged counts and marks before putting the team into operation. The original embedded seed did not contain browser-only usage history.

**تنزيل نسخة احتياطية** exports the shared configuration and codes. The resulting JSON includes Prometric credentials and the Zoom meeting link; keep it private. There is no scheduled backup service configured.

## Concurrent use

The server atomically claims a code before copying it. Another user with a stale version cannot claim or overwrite it. If clipboard access fails, the code stays reserved for the same user; they can retry copying or release it. Previously used codes require confirmation before recopying, and operators cannot recopy another person's used code.

The Codes page has a collapsible remaining-code summary for every category, with a button to copy it as a multiline message. A second collapsible report lets the user choose a date and see only the categories and individual codes used that day, plus their counts. Opening the Codes page refreshes the shared data first. On the Prometric page, the login-link card is the first item; clicking it copies the link directly. All Prometric values use the same typography.

Changes are transactional and version-checked. On conflict, the UI reloads current server data and asks the user to repeat the operation; it never silently overwrites a colleague. Data refreshes on changes, manually, and approximately every two minutes while the page is visible and the user has no unsaved input or selected rows. Rate-limited or unavailable background requests pause for five minutes. This is polling, not push realtime. This version loads the current code inventory into memory, with paginated API reads; a very large inventory should use server-side search and paginated UI.

The database rejects change batches over 250 operations, settings payloads over 64 KiB, notes over 2,000 characters, and claim targets over 200 characters. These limits reduce accidental or abusive database work; they do not stop a distributed denial-of-service attack against the public Supabase endpoint. Before public deployment, review Supabase Auth rate limits and enable Auth CAPTCHA. Protecting the Data API from high-volume traffic would require a server-side gateway with per-client limits and an architecture that prevents direct access to the same operations.

Existing-code edits use an administrator-only atomic database operation. It preserves the recorded user and date when changing a code's value or category, and checks the row version before committing. The live project has migration `migrations/20260929_edit_code.sql` applied; fresh installations can use the matching function in `database.sql`.

Membership identity migrations `migrations/20260929_member_identity.sql` and `migrations/20260929_member_identity_skip_noop.sql` have also been applied to the live project. They keep access stable after a confirmed email change without writing an audit entry at every sign-in.

## Hosting

For Cloudflare Pages Git integration, use `main` as the production branch, `node tools/build-site.cjs` as the build command, and `dist` as the output directory. The build publishes only `ibta-ops.html` (as `index.html`) and `cloud.js`; SQL files, tests, and backups are not included in the website. The Supabase publishable key in `cloud.js` is intended for public clients; no secret/service-role key is used. The client library is pinned to Supabase JS 2.116.0 on jsDelivr. After deployment, set the Supabase Auth Site URL to the final HTTPS address.

## Verification

Run `node tests/cloud.test.cjs` for frontend storage and reservation regression checks. `database-tests.sql` checks RLS, claims, stale updates, role restrictions, and audit inside a transaction that rolls back all fixtures. `database.sql` records the schema already applied to this project; it is not an idempotent setup script and should not be rerun on the provisioned database.

