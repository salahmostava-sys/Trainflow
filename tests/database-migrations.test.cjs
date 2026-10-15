// Rebuilds the database from supabase/migrations in an in-process PostgreSQL
// (PGlite) with a minimal Supabase auth stub, then runs the SQL test suites.
// Nothing here touches a live Supabase project.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase/migrations');

const authStub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, last_sign_in_at timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
grant usage on schema auth to authenticated, anon;
grant execute on all functions in schema auth to authenticated, anon;
`;

(async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(authStub);
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  assert(files.length > 0, 'No migrations found');
  for (const file of files) {
    assert.match(file, /^\d{14}_[a-z0-9_]+\.sql$/, 'Migration names need a 14-digit timestamp: ' + file);
    try {
      await db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    } catch (error) {
      throw new Error('Migration ' + file + ' failed on a fresh database: ' + error.message);
    }
  }
  for (const suite of ['database-tests.sql', 'database-security-tests.sql']) {
    const results = await db.exec(fs.readFileSync(path.join(root, suite), 'utf8'));
    const last = results.at(-1)?.rows?.[0]?.result || '';
    assert.match(last, /^PASS:/, suite + ' did not report PASS');
  }
  assert.equal(fs.existsSync(path.join(root, 'migrations')), false, 'Legacy migrations/ folder must stay merged into supabase/migrations');
  console.log('database migrations: ' + files.length + ' applied from scratch; SQL suites passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
