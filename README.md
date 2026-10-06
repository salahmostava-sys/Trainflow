<div align="center">

# TrainFlow

### Training & Exam Operations

One workspace for trainees, exam vouchers, Prometric registration and daily reports.

**Arabic / English · Next.js + TypeScript · Supabase · Excel exchange**

[Open TrainFlow](https://trainf.vercel.app/) · [User guide](docs/operations-guide.md) · [Deployment](docs/deployment.md) · [All documentation](docs/README.md)

</div>

---

## Explore the workspace

| Page | Address | What you can do |
| --- | --- | --- |
| Trainees | /trainees | Edit private sheets, select cells, import Excel, prepare registrations and reports |
| Keycodes | /keycodes | Find and copy the keycode linked to an exam |
| Prometric | /prometric | Access the configured login link and shared exam credentials |
| Vouchers | /vouchers | Claim vouchers, review usage and download colored Excel inventories |
| Inventory | /inventory | Review team and supervisor balances and prepare the inventory message |
| Settings | /settings | Manage your account, integrations, extensions, backups and team access |

The sidebar stays on the **right** in both languages. Open or close it with the menu button, or reduce it to a **60 px icon rail**. A visible opener remains available after closing it. Page addresses update during navigation; direct links, refresh and browser Back/Forward restore the matching page. The account popup stays inside the screen in full and compact layouts.

## Features

| Area | Included |
| --- | --- |
| Spreadsheet editing | Virtual rows and columns, direct editing, search, filters, formulas, Undo/Redo and saved formatting |
| Multiple selections | Drag and Shift for adjacent cells or columns; Ctrl/Cmd for separate areas; formatting and clearing affect selected cells only |
| Clipboard | Plain text plus a styled HTML table, including saved fills, fonts, borders and automatic result/duplicate-ID colors |
| Excel import | Preview first; explicitly choose append to the current sheet or replace its contents with a fresh sheet |
| Voucher export | A visible Export vouchers button; unused only or all vouchers, all categories or the current category, with usage colors |
| Prometric | Preview selected trainees, register through the Chrome extension and recover confirmed results after interrupted saves |
| Certificate correction | Enter the new English name and download Certificate Data Change Sheet.xlsx without a password column |
| Google reports | Preview operations and successful-trainee rows before uploading through your configured Apps Script connector |
| Inventory | Supervisor balances, receipt allocations and an inventory message ready to copy to WhatsApp |
| Team and recovery | Approved accounts, role enforcement, audit history and private JSON backup/restore |

The standard category names **Foundation, Master, BIS, Corporate and CYBP** stay in English even when the interface is Arabic. Spreadsheet selection shading never changes the stored cell colors. Applications that accept rich clipboard content can retain colors; text-only destinations receive the values.

## Start locally

Use **Node.js 20 or newer** and **pnpm 10**. CI uses Node.js 22. Browser tests require Microsoft Edge.

~~~sh
pnpm install --frozen-lockfile
pnpm dev
~~~

Open the development address printed by Next.js. To review a production build:

~~~sh
pnpm test
pnpm build
pnpm test:next
pnpm start
~~~

For an interface preview with **synthetic records**, run:

~~~sh
node tools/design-preview.cjs
~~~

Open http://127.0.0.1:4174. This preview replaces the data client and performs no production writes. A plain static server does not implement the production API.

## How it works

~~~mermaid
flowchart LR
    Team[Approved team] --> UI[Original TrainFlow interface]
    UI --> Next[Next.js and TypeScript on Vercel]
    UI --> Auth[Supabase Auth]
    Next --> API[Validated JavaScript API]
    API --> DB[(Existing database with RLS)]
    UI --> Files[Local Excel worker and clipboard]
    UI --> Chrome[Prometric and WhatsApp extensions]
    UI --> Reports[Google Apps Script]
    Reports --> Sheets[Google Sheets]
~~~

The interface is mounted directly by React, without an iframe. Existing HTML/CSS and command modules preserve the established UI and data behavior. The TypeScript navigation bridge uses native browser history to keep the live sheet mounted. The server adapter reuses the validated JavaScript API and the signed-in user's JWT.

The existing Supabase project, accounts, ibta_* tables, sheet versions and permissions remain in use. These interface changes do not migrate or reset production records. RLS and transactional database functions enforce access independently of the UI.

## Repository map

| Location | Responsibility |
| --- | --- |
| app/, components/, lib/ | Next routes, React/TypeScript workspace adapter and navigation |
| trainflow.html, root JS/CSS | Original interface and feature commands |
| server/ | Shared authenticated API handler |
| extension/ | Prometric and WhatsApp Web Chrome extensions |
| tools/ | Asset packaging, synthetic preview and Google connector |
| database.sql, migrations/, supabase/migrations/ | Original schema and reviewed incremental SQL changes |
| tests/, .github/workflows/ | Unit, integration, browser and CI checks |
| docs/, ARCHITECTURE.md | User guides and technical documentation |
| generated/, public/workspace/, .next/ | Generated Next build artifacts; ignored by Git |

## Verification

~~~sh
pnpm test                              # Unit and API regressions
pnpm build                             # Assets, extensions, types and Next production build
pnpm test:next                         # Production Next workspace using synthetic data
node tests/selection-export-browser.test.cjs
node tests/sheet-enhancements-browser.test.cjs
node tests/daily-reports-browser.test.cjs
~~~

The broader pnpm test:browser command includes legacy preview suites; some older account-switch scenarios still reference the removed owner selector. Use the current focused suites above and review any legacy failures before treating the whole browser run as passing. SQL checks require a separate authenticated database session. Mocked browser checks do not prove a live Google upload, real Prometric registration or delivered WhatsApp message.

## Deploy and maintain

**Production:** [trainf.vercel.app](https://trainf.vercel.app/)
**Repository:** [salahmostava-sys/Trainflow](https://github.com/salahmostava-sys/Trainflow)
**Branch:** main · **Build:** pnpm build · **Framework:** Next.js

Cloudflare links have been removed from the application integrations. The retained static build helper is a compatibility tool, not the production address. Removing links and extension permissions does not delete an existing hosting account or its remote domain. See [deployment and domain retirement](docs/deployment.md).

Download extension updates from **Settings → Extensions**, extract them and reload the unpacked extension in the same Chrome profile. Prometric **4.1.3** and WhatsApp Web **1.0.4** target the current Vercel origin; older installed copies must be updated.

Current administrator backups use trainflow-backup; older ibta-ops-backup files remain supported. Backups may contain trainee credentials and shared configuration. Auth accounts are managed separately. Do not rerun the original database.sql against a provisioned project; use reviewed migrations.

## Documentation

| Need | Guide |
| --- | --- |
| Daily work and keyboard controls | [Operations guide](docs/operations-guide.md) |
| System design and ownership | [Architecture](ARCHITECTURE.md) |
| Local builds, Vercel and rollback | [Deployment](docs/deployment.md) |
| API authentication and limits | [JavaScript server](docs/javascript-server.md) |
| Google Sheets setup and missing headers | [Google reports](docs/google-reports.md) |
| Chrome registration and recovery | [Prometric extension](extension/prometric/README.md) |
| WhatsApp Web setup | [WhatsApp guide](docs/whatsapp-web.md) |
| Optional database-scheduled Meta delivery | [Inventory delivery](docs/whatsapp-inventory.md) |

Updated **6 October 2026**. Dated audit documents record earlier reviews; their observations are historical.
