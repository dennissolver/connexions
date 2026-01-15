// app/api/admin/alerts/route.ts.ts
// SUPERADMIN: Manage alerts across all clients

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

// GET - List all alerts platform-wide
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'open';
    const severity = searchParams.get('severity');
    const clientId = searchParams.get('client_id');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('evaluation_alerts')
      .select(`
        *,
        agents:agent_id (
          id, 
          name, 
          slug, 
          client_id,
          clients:client_id (id, name, company_name, email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data: alerts, error } = await query;

    if (error) throw error;

    // Filter by client if specified
    let filteredAlerts = alerts || [];
    if (clientId) {
      filteredAlerts = filteredAlerts.filter(a => a.agents?.client_id === clientId);
    }

    const summary = {
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      warning: filteredAlerts.filter(a => a.severity === 'warning').length,
      info: filteredAlerts.filter(a => a.severity === 'info').length,
      total: filteredAlerts.length,
    };

    return NextResponse.json({ alerts: filteredAlerts, summary });

  } catch (error) {
    console.error('Admin alerts error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

// PATCH - Update single alert
export async function PATCH(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { alertId, status, resolution_notes } = body;

    if (!alertId || !status) {
      return NextResponse.json({ error: 'Alert ID and status required' }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }
    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }

    const { data, error } = await supabase
      .from('evaluation_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ alert: data });

  } catch (error) {
    console.error('Admin alert update error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// POST - Bulk operations
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { action, alertIds, agentId, clientId } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 });
    }

    const newStatus = action === 'acknowledge' ? 'acknowledged' :
                      action === 'resolve' ? 'resolved' :
                      action === 'dismiss' ? 'dismissed' : 'open';

    let query = supabase
      .from('evaluation_alerts')
      .update({
        status: newStatus,
        ...(action === 'resolve' ? { resolved_at: new Date().toISOString() } : {}),
      });

    if (alertIds && alertIds.length > 0) {
      query = query.in('id', alertIds);
    } else if (agentId) {
      query = query.eq('agent_id', agentId).eq('status', 'open');
    } else if (clientId) {
      // Get all agent IDs for this client first
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .eq('client_id', clientId);
      
      if (agents && agents.length > 0) {
        query = query.in('agent_id', agents.map(a => a.id)).eq('status', 'open');
      }
    } else {
      // Resolve all open alerts (dangerous - require confirmation)
      if (!body.confirmAll) {
        return NextResponse.json({ error: 'Specify alertIds, agentId, clientId, or set confirmAll: true' }, { status: 400 });
      }
      query = query.eq('status', 'open');
    }

    const { error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin bulk alert error:', error);
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 });
  }
}

