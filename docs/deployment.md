# TrainFlow deployment and maintenance

## Next.js deployment with the classic UI

Vercel uses `framework: nextjs`, `pnpm install --frozen-lockfile`, `npm run build`, and `.next` output. The build generates the classic UI and its versioned assets before compiling the TypeScript/React entry point. Generated `public/workspace` assets and `generated/classic-ui.ts` are excluded from Git and regenerated for every build.

Run `pnpm dev` for Next.js development, or `pnpm build` followed by `pnpm start` for production review. After building, run `pnpm test:next` to check the original layout, trainee data operations, file assets, refresh preferences and API protection using synthetic records. The API route forwards to `server/worker.mjs`; database ownership and permissions continue to be enforced by the existing project and policies.

The Next workspace uses `/keycodes`, `/prometric`, `/vouchers`, `/inventory`, `/trainees` and `/settings` URLs. Settings sections use `?tab=reports` (or the selected section). The TypeScript navigation bridge preserves the mounted sheet while updating Next history; direct URLs take priority over saved page preferences, and browser Back/Forward restores the matching panel.

`pnpm build:cloudflare` retains the original static Pages build described below. Changing the web framework does not create a new Supabase project or replace the existing records.

## Local workspace

Use Node.js 20 or newer and pnpm. The local entry file is `trainflow.html`.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:browser
pnpm build
```

For interface review using synthetic records:

```sh
node tools/design-preview.cjs
```

Open `http://127.0.0.1:4174`. This preview deliberately replaces production data calls. A plain file/static server does not implement `/api/data`; use the deployed site or a Cloudflare runtime to exercise the production API.

## GitHub and production

Repository: [salahmostava-sys/trainflow](https://github.com/salahmostava-sys/trainflow). The default and production branch is `main`. GitHub Actions runs the unit suites and build. Cloudflare Pages uses its Git integration to publish pushes to `main`.

| Cloudflare setting | Value |
| --- | --- |
| Project name | `trainflow` |
| Production hostname | `ibta-ops.pages.dev` |
| Build command | `node tools/build-site.cjs` |
| Output directory | `dist` |
| API runtime | Pages advanced-mode `_worker.js` |
| Worker routes | `/api/*` |

The hostname predates the product rename. Cloudflare project renames preserve hostnames; the existing URL is kept so authentication callbacks and extension origin checks continue to work.

Optional runtime variables are `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The existing public defaults target the current project. Never put a service-role key in browser assets. `dist`, browser test artifacts, dependency folders and backups are excluded from Git.

## Verify a deployment

1. Check that the Pages deployment targets the intended Git commit and has completed successfully.
2. Open the production login screen and verify the TrainFlow title in Arabic and English.
3. Request `/api/health` and confirm `app: "TrainFlow"` and `runtime: "javascript-server"`.
4. Check that both TrainFlow extension download URLs return ZIP files.
5. With an approved test account, verify the relevant authenticated workflow before declaring a data-path change validated.

After updating either extension, extract its ZIP into the same permanent folder, reload it in `chrome://extensions` and reload the TrainFlow/target website tabs. Existing message channels and extension-local storage remain compatible.

## Backups and rollback

Export a private JSON application backup from Settings before operational data changes. Current exports use `trainflow-backup`; restore also supports existing `ibta-ops-backup` files. Application backups contain codes, shared settings, stock and trainee sheets; Auth accounts are separate. Keep database backups as well.

For a frontend issue, roll back the deployment in Cloudflare Pages or revert the faulty commit and redeploy. Do not rerun `database.sql` against the provisioned project. Apply database migrations individually after reviewing their policy and function changes.
