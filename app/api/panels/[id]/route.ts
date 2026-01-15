// app/api/panels/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: panel, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !panel) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    return NextResponse.json(panel);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}