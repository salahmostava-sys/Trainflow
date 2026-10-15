import { handleNextApi } from '../../../../server/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Keep the original API's ownership, validation and caller JWT checks.
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY override the built-in project (docs/deployment.md).
async function proxy(request: Request): Promise<Response> {
  return handleNextApi(request, {
    SUPABASE_URL: process.env.SUPABASE_URL || undefined,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || undefined,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
