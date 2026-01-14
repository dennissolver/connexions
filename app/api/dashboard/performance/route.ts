import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // TODO: replace with real implementation
  return NextResponse.json({
    ok: true,
    from,
    to,
    data: [],
  });
}
