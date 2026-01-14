// app/api/demo/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, company, email, website } = body;

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: 'Name, company, and email are required' },
        { status: 400 }
      );
    }

    // Store lead in database
    const { data: lead, error } = await supabase
      .from('demo_leads')
      .insert({
        name,
        company,
        email,
        website: website || null,
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store lead:', error);
      return NextResponse.json(
        { error: 'Failed to create demo session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      redirectUrl: `/demo?leadId=${lead.id}`,
    });

  } catch (error: any) {
    console.error('Demo start error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start demo' },
      { status: 500 }
    );
  }
}
