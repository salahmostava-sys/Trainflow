# TrainFlow documentation

Updated 6 October 2026. Start with the [project overview](../README.md) or [live workspace](https://trainf.vercel.app/).

## Current guides

| Guide | Purpose |
| --- | --- |
| [Architecture](../ARCHITECTURE.md) | Next/React adapter, original UI, API boundaries and data ownership |
| [Operations](operations-guide.md) | Accounts, private sheets, multiple selections, colored copy/export and backups |
| [Deployment](deployment.md) | Vercel, local verification, extension updates, domain retirement and rollback |
| [JavaScript API](javascript-server.md) | Authentication, validation and the shared server handler |
| [Google reports](google-reports.md) | Apps Script properties, tab names, header rows and upload preview |
| [Prometric extension](../extension/prometric/README.md) | Chrome installation, selected-row registration and result recovery |

## Historical reviews

| Record | Date |
| --- | --- |
| [Worksheet regression audit](system-audit-2026-10-06.md) | 6 October 2026 |
| [System audit](system-audit-2026-10-02.md) | 2 October 2026 |
| [UI/UX audit](ui-ux-audit-2026-10-02.md) | 2 October 2026 |

These reviews retain their original observations and include current-status notes. They are not evidence of a new live database audit, Google upload, Prometric registration.

For a missing VOUCHER header, start with the Google guide. For a missing/clipped sidebar, verify the published commit and full/compact/closed modes using the deployment guide. For spreadsheet shortcuts and colored exports, use the operations guide.
