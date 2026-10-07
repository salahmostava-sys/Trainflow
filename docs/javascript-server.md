# TypeScript API behind Next.js

Updated 7 October 2026 for the local migration. Vercel compiles the operational handler from server/api.ts. server/worker.mjs provides a compatibility entry to its compiled output for local Node checks.

## Request path

~~~mermaid
sequenceDiagram
    participant UI as Browser workspace
    participant Next as Next API adapter
    participant API as Shared handler
    participant Auth as Supabase Auth
    participant DB as PostgreSQL
    UI->>Next: /api/data request with user JWT
    Next->>API: Validated route and original request
    API->>Auth: Verify user identity
    API->>DB: Active membership and permitted operation
    DB-->>API: RLS-protected response
    API-->>UI: Uncached result
~~~

app/api/data/[...path]/route.ts imports server/api.ts directly. The adapter removes routing parameters injected by Vercel before forwarding query parameters. app/api/health/route.ts reports runtime nextjs and status ok.

## Access and validation

The handler verifies tokens with Auth, checks active membership against immutable user IDs, restricts endpoint names and HTTP methods, validates JSON writes and administrator privileges, and forwards the user's token so database RLS still applies. It never forwards a service-role key. Claim dates are generated using Riyadh time, and operational responses are not cached.

Writes require an Origin matching the application. Membership filters quote and escape identity/email literals. copy_only members cannot edit codes or voucher names through this API; they retain claims and their own worksheet operations, matching the existing SQL policy. Non-admin worksheet writes must target the caller's owner ID. The cloud client does not retry API failures directly through PostgREST.

SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY can override the existing public project configuration through deployment environment variables. A publishable key identifies the project; it does not grant administrative privileges. Transactional SQL functions implement atomic claims, version checks and owner isolation.

Supabase's REST endpoint remains directly reachable by authenticated clients, including the Google report connector. Server checks complement RLS; they do not replace database policies or disable direct access. Changing that boundary requires a separate reviewed database/API migration.

## Verification

pnpm test covers authentication, inactive users, role/owner checks, forwarded identity, allowed endpoints, required write origins, literal filters, write validation, claim dates and upstream errors. pnpm build checks TypeScript and builds the TSX pages. pnpm test:next runs a production build with a third-party SDK fixture while the real Cloud and UI modules execute.

Mocked checks do not establish successful live authentication or production writes. Use a separately authorized test account and configured integrations for live verification. A plain file/static preview cannot execute this API.

See [deployment](deployment.md) and [architecture](../ARCHITECTURE.md).
