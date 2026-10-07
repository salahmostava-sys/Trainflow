import { handleNextApi } from '../../../../server/api';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Keep the original API's ownership, validation and caller JWT checks.
async function proxy(request: Request): Promise<Response> {
  return handleNextApi(request);
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
