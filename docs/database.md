# Database and migrations

The authoritative schema is the ordered set of files in `supabase/migrations/`. Applying them in filename order to a new Supabase project builds the complete database. `pnpm test` checks this: `tests/database-migrations.test.cjs` replays every migration on an in-process PostgreSQL (PGlite) with a small Supabase `auth` stub, then runs `database-tests.sql` and `database-security-tests.sql`. That test never connects to a live project.

`database.sql` is a readable reference for the core tables, policies and functions. It is not the setup path and must never be rerun on a provisioned project.

## Consolidated legacy migrations (October 2026)

The original project kept eight changes in a separate `migrations/` folder with date-only names, which the Supabase CLI does not apply. They now live in `supabase/migrations/` with 14-digit names, after a new base file:

| New file | Former file |
| --- | --- |
| `20260928000000_base_schema.sql` | Original `database.sql` (without the identity sync trigger, which `member_identity` creates, and without any seed) |
| `20260929000001_member_identity.sql` | `migrations/20260929_member_identity.sql` |
| `20260929000002_member_identity_skip_noop.sql` | `migrations/20260929_member_identity_skip_noop.sql` |
| `20260929000003_ops_hardening.sql` | `migrations/20260929_ops_hardening.sql` |
| `20260929000004_edit_code.sql` | `migrations/20260929_edit_code.sql` |
| `20260929000005_settings_shape.sql` | `migrations/20260929_settings_shape.sql` |
| `20260930000001_supervisor_stock.sql` | `migrations/20260930_supervisor_stock.sql` |
| `20260930000002_supervisor_stock_policy.sql` | `migrations/20260930_supervisor_stock_policy.sql` |
| `20260930000003_code_copy_time.sql` | `migrations/20260930_code_copy_time.sql` |

The file contents are unchanged. `code_copy_time` now runs after `supervisor_stock` so its `used_at`-aware `ibta_restore_backup` is the version that remains (later migrations replace that function again in any case).

**Production is not affected.** These changes were already applied to the live project by hand. Do not run them again. If the live project is ever linked to the Supabase CLI, first record them as applied without executing them:

```sh
supabase migration repair --status applied 20260928000000 20260929000001 20260929000002 20260929000003 20260929000004 20260929000005 20260930000001 20260930000002 20260930000003
```

Check `supabase migration list` before pushing, so only migrations that are genuinely new run.

## Pending for production: `20261015090000_security_hardening.sql`

This migration is in the repository but **has not been applied to production**. The owner must review and apply it (SQL editor or `supabase db push` after the repair above), and should deploy the matching frontend at the same time. The frontend still reads older databases where credentials remain in the settings payload.

It makes these changes:

- **Confirmed-email invites:** the `auth.users` trigger binds or renames a membership only when `email_confirmed_at` is set. A later confirmation (null → timestamp) fires the same trigger and binds the invite then. Memberships already bound to an unconfirmed account are unbound. `member_read` uses `private.ibta_confirmed_email()` instead of the JWT email.
- **Private Prometric credentials:** the shared account and password move from `ibta_settings.payload.credentials` to `private.ibta_prometric_credentials`, which has no client grants. `ibta_get_prometric_credentials()` returns them to admins and operators only (copy-only members get nothing). `ibta_set_prometric_credentials()` is admin-only and audited. A trigger strips `credentials` from any settings write or backup restore, capturing an admin's value.
- **Server-side voucher dates:** `ibta_claim_code` and `ibta_claim_trainee_voucher` ignore the client `use_date` and record the database's Asia/Riyadh day. They are `SECURITY DEFINER` with explicit owner-or-admin checks. `ibta_apply_changes` updates rows through `private.ibta_update_code`, which lets non-admins release a code or mark it used today, and leaves other usage days to administrators. The direct `UPDATE(used_on)` grant is revoked.
- **Audit index:** `ibta_audit(actor)`.
- **Settings row:** a fresh project gets the singleton settings row (no-op in production).

## First administrator

No administrator is seeded. After building a new project, create the first admin by hand in the Supabase SQL editor (it runs as the database owner):

```sql
insert into public.ibta_members(email, role) values ('owner@example.com', 'admin');
```

Then sign up in the app with that address and confirm the email. The confirmation binds the membership to the account. Keep **Confirm email** enabled in Supabase Auth; unconfirmed accounts never receive a role. Add further members from **Settings → Team**.
