// app/api/admin/bulk-cleanup/route.ts
import { NextResponse } from 'next/server';
import { bulkCleanup } from '@/lib/provisioning/bulk-cleanup';

export async function POST() {
  try {
    const results = await bulkCleanup();
    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
