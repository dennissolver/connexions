// app/api/provision/delete/route.ts

import { NextResponse } from 'next/server';
import { deleteProvisionRunBySlug } from '@/lib/provisioning/store';

export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const projectSlug = body?.projectSlug;

  if (!projectSlug || typeof projectSlug !== 'string') {
    return NextResponse.json(
      { error: 'projectSlug is required and must be a string' },
      { status: 400 }
    );
  }

  await deleteProvisionRunBySlug(projectSlug);

  return NextResponse.json({ ok: true });
}
