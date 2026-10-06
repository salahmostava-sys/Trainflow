# JavaScript API behind Next.js

Updated 6 October 2026. Vercel runs the Next.js application; the shared operational API remains in server/worker.mjs.

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

app/api/data/[...path]/route.ts delegates to lib/server-api.ts. The adapter removes routing parameters injected by Vercel before forwarding query parameters to the shared handler. app/api/health/route.ts reports runtime nextjs and status ok. The compatibility static build can still package the shared handler as a worker, but that is not the production address.

## Access and validation

The handler verifies tokens with Auth, checks active membership against immutable user IDs, restricts endpoint names and HTTP methods, validates JSON writes and administrator privileges, and forwards the user's token so database RLS still applies. It never forwards a service-role key. Claim dates are generated using Riyadh time, and operational responses are not cached.

SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY can override the existing public project configuration through deployment environment variables. A publishable key identifies the project; it does not grant administrative privileges. Transactional SQL functions implement atomic claims, version checks and owner isolation.

Supabase's REST endpoint remains directly reachable by authenticated clients, including the Google report connector. Server checks complement RLS; they do not replace database policies or disable direct access. Changing that boundary requires a separate reviewed database/API migration.

## Verification

pnpm test covers authentication, inactive users, role checks, forwarded identity, allowed endpoints, origins, write validation, claim dates, no-cache behavior and upstream errors. pnpm build validates the Next wrapper and TypeScript. pnpm test:next runs the production workspace with a mocked data client.

Mocked checks do not establish successful live authentication or production writes. Use a separately authorized test account and configured integrations for live verification. A plain file/static preview cannot execute this API.

See [deployment](deployment.md) and [architecture](../ARCHITECTURE.md).
