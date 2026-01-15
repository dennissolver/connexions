// app/api/agents/[agentId]/route.ts.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createClient();
    const agentId = params.agentId;

    // Try to find by ID first, then by slug
    let query = supabase
      .from('agents')
      .select('*')
      .or(`id.eq.${agentId},slug.eq.${agentId}`)
      .single();

    const { data: agent, error } = await query;

    if (error || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
