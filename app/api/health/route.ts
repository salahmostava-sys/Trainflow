export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(): Response {
  return Response.json({ app: 'TrainFlow', runtime: 'nextjs', status: 'ok' }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
