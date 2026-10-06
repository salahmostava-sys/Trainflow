# TrainFlow architecture

TrainFlow manages the work between receiving exam vouchers, assigning them to a team member, preparing trainees, registering Prometric accounts and reporting results. This document describes the implemented system, rather than a proposed redesign.

Updated 6 October 2026. Production: [TrainFlow on Vercel](https://trainf.vercel.app/).

## System overview

```mermaid
flowchart TB
    Team[Approved team members]
    UI[TrainFlow browser workspace]
    Auth[Supabase Auth]
    API[Next.js adapter and shared JavaScript API]
    DB[(Supabase PostgreSQL)]
    WA[WhatsApp Web extension]
    WhatsApp[WhatsApp Web]
    PRO[Prometric registration extension]
    Prometric[Prometric website]
    XLSX[Local Excel worker]
    Files[Excel and JSON files]
    Reports[Google Apps Script report bridge]
    Sheets[Google Sheets]

    Team --> UI
    UI -->|Sign-in and refresh| Auth
    UI -->|JWT and operational requests| API
    API -->|Verify identity| Auth
    API -->|User JWT, RLS and transactional RPCs| DB
    UI <-->|Selected registration jobs and results| PRO
    PRO --> Prometric
    UI <-->|Inventory configuration and fresh reports| WA
    WA --> WhatsApp
    UI <-->|Import and export| XLSX
    XLSX <--> Files
    UI -->|User-triggered report submission| Reports
    Reports -->|User JWT and RLS| DB
    Reports --> Sheets
```

The browser is the working surface. The server checks operational requests, while PostgreSQL policies and functions enforce ownership and atomic updates. Extensions execute only the external website actions that need a logged-in browser.

## Repository map

| Path | Responsibility |
| --- | --- |
| `app/`, `components/`, `lib/` | Next.js routes, React/TypeScript workspace adapter and native History navigation |
| `codes-export.js` | Visible voucher-export dialog and colored XLSX preparation |
| `trainflow.html` | Local application entry point, layout, shared styles and Arabic/English interface strings |
| `cloud.js` | Authentication, same-origin data adapter, codes, stock, membership, backups and trainee persistence |
| `ops-ui.js` | Administrative import, restore and settings interactions |
| `trainees.js`, `trainees.css` | Private trainee workspace and virtualized grid rendering |
| `trainees-core.js` | Trainee values, validation and matching logic |
| `trainees-excel.js` | Selection, formatting, formulas and spreadsheet commands |
| `trainees-xlsx.js`, `trainees-xlsx-worker.js`, `trainees-files.js` | Local Excel import/export and file previews |
| `certificate-name.js` | Certificate name correction preview and export |
| `prometric-core.js`, `prometric-registration.js` | Registration eligibility, job preview and extension coordination |
| `inventory-delivery.js` | Inventory reporting and scheduled delivery controls |
| `trainee-reports.js` | Daily report preparation and Google report submission |
| `session-policy.js` | Shared daily sign-in policy used by browser and API |
| `server/worker.mjs` | Validated shared API called by the Next TypeScript adapter |
| `extension/prometric/` | Manifest V3 registration extension and TrainFlow page bridge |
| `extension/whatsapp-web/` | Manifest V3 schedule, inventory bridge and WhatsApp sender |
| `tools/build-site.cjs` | Production assets, worker, asset hashes and extension ZIP packages |
| `tools/design-preview.cjs` | UI preview with synthetic data; no production writes |
| `tools/google-reports.gs` | Google Apps Script bridge for existing report spreadsheets |
| `database.sql`, `migrations/`, `supabase/migrations/` | Original schema and incremental database changes |
| `tests/`, `database-tests.sql` | Unit, API, browser and SQL regression checks |
| `docs/` | Operations, deployment and integration documentation |
| `.github/workflows/ci.yml` | Automated unit checks and production build |
| `dist/` | Generated deployment output; ignored by Git |

## Data ownership

The existing database keeps its stable `ibta_*` object names. TrainFlow is the product name; these identifiers are a compatibility contract with deployed database functions and integrations.

| Table | Purpose and ownership |
| --- | --- |
| `ibta_members` | Approved accounts, active state and `admin`, `operator` or `copy_only` role |
| `ibta_settings` | Shared exam catalog, category labels, service connection details and configuration |
| `ibta_codes` | Unique vouchers, owner, usage timestamp, notes and optimistic version |
| `ibta_trainee_sheets` | Owner-specific trainee cells, formatting and save version |
| `ibta_supervisor_stock` | Unallocated supervisor stock per category |
| `ibta_supervisor_stock_events` | Stock adjustments and allocations |
| `ibta_audit` | Database-generated action, actor and timestamp records |
| `private.ibta_inventory_delivery` | Delivery configuration exposed through authorized RPCs |
| `private.ibta_inventory_delivery_log` | Server delivery history, separate from browser extension state |

Additional delivery objects are defined in the inventory migrations. Read their policies and functions before extending delivery behavior. Auth accounts are managed separately from application backups.

## Main workflows

### Allocate and claim a voucher

```mermaid
sequenceDiagram
    actor Admin
    participant UI as TrainFlow
    participant API as JavaScript API
    participant DB as PostgreSQL
    Admin->>UI: Import received vouchers into a category
    UI->>API: Authenticated import request
    API->>DB: Import RPC using caller JWT
    DB->>DB: Validate duplicates and supervisor balance
    DB->>DB: Insert codes, debit stock and record events atomically
    DB-->>UI: Committed result through API
    Admin->>UI: Assign voucher to team member
    UI->>API: Assignment RPC
    API->>DB: Authorize and assign
    Note over UI,DB: Claiming a code checks its expected version before copying.
```

Concurrent requests use server-side checks and optimistic versions. A clipboard failure retains the reservation for the same user, so they can retry or release it. Import, allocation and restore are database transactions.

### Edit a trainee sheet

The browser loads the signed-in account's private sheet and version; the page has no owner selector. Editing, sorting, formatting and Undo/Redo operate locally. Save submits cells and format with the expected version; a conflicting save is rejected. Virtual rendering draws the visible part of the sheet. Blank trailing rows do not expand the persisted matrix until populated.

### Register Prometric accounts

The application previews selected trainees, validates required values and skips existing credentials. The extension receives only selected names, emails and matching metadata, then processes registration jobs sequentially in a dedicated tab. Confirmed results fill blank matching credential cells. Pending results survive in extension storage until the application acknowledges a successful sheet save. Uncertain outcomes require checking Prometric before retrying.

### Send an inventory report

The administrator configures a destination and Riyadh send time. The extension prepares a fresh report before sending, validates the destination and message and records the outcome. The computer, Chrome, WhatsApp Web and a valid application session must be available. Enable automatic sending on one device. The separate manual WhatsApp link opens a draft that a person sends themselves.

### Exchange files and daily reports

Excel conversion uses a local Web Worker and bundled ExcelJS. JSON application backups use `trainflow-backup` and version 4; the restore path also accepts `ibta-ops-backup`. Google report submission uses the Apps Script bridge, reads authorized source data and appends matching report columns with voucher-based deduplication.

## API and trust boundaries

| Route | Behavior |
| --- | --- |
| `GET /api/health` | Public runtime status including the TrainFlow application name |
| `/api/data/<table>` | Allowlisted table operations with membership checks |
| `POST /api/data/rpc/<function>` | Allowlisted transactional operations; administrative functions require an administrator |

The worker rejects foreign origins, missing/invalid tokens, inactive memberships, disallowed routes, unsuitable methods and malformed/oversized JSON. It forwards the caller's JWT rather than using a service-role key. Operational responses use `Cache-Control: no-store`.

Supabase REST remains reachable by authenticated clients, including the report bridge. Database RLS remains necessary even with the worker. Display names in Auth metadata do not grant privileges. Extension bridges validate the page origin, message source and channel.

Only device preferences remain in browser local storage. Authentication uses session storage and daily sign-in rules. Registration results and scheduled delivery state also have extension-local storage. Operational records are persisted in PostgreSQL.

## Interface and selection

React mounts the original interface directly, without an iframe. A native History bridge updates the six page URLs and settings query while preserving the mounted sheet and its unsaved work. The physical sidebar remains on the right, with full, 60 px compact and closed states. Its opener is outside the closed sidebar. The account popup is portalled outside the scrolling sidebar and positioned inside the viewport.

Selections consist of an active rectangle plus additive rectangles. Coordinates refer to the displayed view; stored rows are resolved through its mapping. Drag/Shift extend adjacent cells or entire columns. Ctrl/Cmd adds or toggles separate areas. Union iteration visits overlaps once. Formatting, clearing and selected-row registration respect that union. Structural shifts, multi-cell paste and merges require one contiguous region so gaps are not changed accidentally.

Clipboard output contains both TSV and a styled HTML table. Separate rows/columns are compacted in displayed order and unselected intersections are blank. Stored colors and automatic result/duplicate-ID colors are copied; temporary selection overlays are excluded. Rich-paste support depends on the destination. Voucher export writes an XLSX workbook with the same usage-day palette and used-code strike-through. Standard category names remain English in both UI languages.

## Build and deployment

~~~mermaid
flowchart LR
    Source[GitHub main] --> CI[Unit checks and build]
    Source --> Vercel[Vercel Next deployment]
    Vercel --> Build[pnpm build]
    Build --> Assets[Versioned workspace assets and extension ZIPs]
    Build --> Manifest[Generated TypeScript UI manifest]
    Build --> Next[Next production output]
    Manifest --> Next
    Assets --> Next
    Next --> Live[trainf.vercel.app]
~~~

The build generates public/workspace, generated/classic-ui.ts and .next. Both extension ZIPs are packaged from the checked-in source. Prometric 4.1.3 and WhatsApp Web 1.0.4 trust the current Vercel origin; installed older versions must be updated. Operational records, SQL and private backups are not embedded in public assets.

Cloudflare-domain references have been removed from active integrations. The static build helper remains for compatibility. Remote account/domain deletion is separate and is not performed by changing these repository files. See [deployment](docs/deployment.md).

## Compatibility decisions

| Identifier | Reason it remains stable |
| --- | --- |
| Supabase project reference and API URL | Existing database and users stay attached to the same project |
| `ibta_*` tables/RPCs and SQL history | Existing schema, policies and deployed integrations depend on them |
| `IBTA_*` extension channels and internal error codes | Older extensions and server errors remain compatible |
| Existing storage keys | Saved preferences, pending jobs and extension state remain readable |
| `IBTAMEAF-…` voucher examples | Actual exam provider format, separate from product branding |
| `ibta-ops-backup` | Older backups remain restorable |

Rename these contracts only through a separately planned migration that updates all producers, consumers and stored data together.

## Verification and recovery

Run `pnpm test`, `pnpm test:browser` and `pnpm build` before publishing changes to runtime behavior. Browser suites require Microsoft Edge; SQL suites need a separately authenticated test database and are not part of JavaScript CI. A UI preview uses synthetic data and does not prove live sign-in or database writes.

For a faulty frontend deployment, roll back through Vercel or revert the Git commit and let the integration redeploy. Database migrations require their own recovery plan; a frontend rollback does not reverse schema changes. Application JSON exports supplement database backups and contain sensitive operational data, including configured credentials.

## Further reading

- [Operations guide](docs/operations-guide.md)
- [Deployment and maintenance](docs/deployment.md)
- [JavaScript API details](docs/javascript-server.md)
- [WhatsApp Web setup](docs/whatsapp-web.md)
- [Google reports setup](docs/google-reports.md)
- [Documentation index](docs/README.md)
