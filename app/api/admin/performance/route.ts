// app/api/admin/performance/route.ts.ts
// SUPERADMIN: Platform-wide performance across ALL clients and agents
// This is for the master template operator (you), not for clients

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple admin auth check - replace with your actual auth
function isAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_SECRET_KEY;
}

export async function GET(request: NextRequest) {
  // Protect admin endpoint
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use service role for full access across all clients
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const clientFilter = searchParams.get('client_id'); // Optional: filter to specific client

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all clients with their agent counts
    const { data: clients } = await supabase
      .from('clients')
      .select('id, email, name, company_name, subscription_tier, created_at');

    // Get all agents with client info
    let agentsQuery = supabase
      .from('agents')
      .select(`
        id,
        client_id,
        name,
        slug,
        company_name,
        status,
        total_interviews,
        completed_interviews,
        created_at,
        clients:client_id (id, email, name, company_name)
      `);

    if (clientFilter) {
      agentsQuery = agentsQuery.eq('client_id', clientFilter);
    }

    const { data: agents } = await agentsQuery;

    // Get evaluations for the period
    const { data: evaluations } = await supabase
      .from('interview_evaluations')
      .select('agent_id, overall_score, goal_achievement_score, conversation_quality_score, user_engagement_score, prompt_adherence_score, issues, created_at')
      .gte('created_at', startDate.toISOString());

    // Get all open alerts
    const { data: openAlerts } = await supabase
      .from('evaluation_alerts')
      .select('*, agents:agent_id (name, slug, client_id)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Aggregate per agent
    const agentPerformance = (agents || []).map(agent => {
      const agentEvals = (evaluations || []).filter(e => e.agent_id === agent.id);
      const agentAlerts = (openAlerts || []).filter(a => a.agent_id === agent.id);

      const avgScore = agentEvals.length > 0
        ? Math.round(agentEvals.reduce((sum, e) => sum + e.overall_score, 0) / agentEvals.length)
        : null;

      let health: 'healthy' | 'needs_attention' | 'critical' | 'no_data' = 'no_data';
      if (avgScore !== null) {
        if (avgScore >= 80) health = 'healthy';
        else if (avgScore >= 60) health = 'needs_attention';
        else health = 'critical';
      }

      // Count issues by type
      const issueCounts: Record<string, number> = {};
      for (const eval_ of agentEvals) {
        for (const issue of (eval_.issues || []) as any[]) {
          issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        company_name: agent.company_name,
        status: agent.status,
        client: agent.clients || undefined,
        total_interviews: agent.total_interviews,
        completed_interviews: agent.completed_interviews,
        evaluated_interviews: agentEvals.length,
        avg_score: avgScore,
        health,
        open_alerts: agentAlerts.length,
        issue_summary: issueCounts,
        score_breakdown: agentEvals.length > 0 ? {
          goal_achievement: Math.round(agentEvals.reduce((s, e) => s + (e.goal_achievement_score || 0), 0) / agentEvals.length),
          conversation_quality: Math.round(agentEvals.reduce((s, e) => s + (e.conversation_quality_score || 0), 0) / agentEvals.length),
          user_engagement: Math.round(agentEvals.reduce((s, e) => s + (e.user_engagement_score || 0), 0) / agentEvals.length),
          prompt_adherence: Math.round(agentEvals.reduce((s, e) => s + (e.prompt_adherence_score || 0), 0) / agentEvals.length),
        } : null,
      };
    });

    // Aggregate per client
    const clientPerformance = (clients || []).map(client => {
      const clientAgents = agentPerformance.filter(a => a.client?.[0]?.id === client.id);
      const activeAgents = clientAgents.filter(a => a.status === 'active');
      const totalEvals = clientAgents.reduce((sum, a) => sum + a.evaluated_interviews, 0);
      const totalAlerts = clientAgents.reduce((sum, a) => sum + a.open_alerts, 0);
      
      const agentsWithScores = clientAgents.filter(a => a.avg_score !== null);
      const avgScore = agentsWithScores.length > 0
        ? Math.round(agentsWithScores.reduce((sum, a) => sum + (a.avg_score || 0), 0) / agentsWithScores.length)
        : null;

      return {
        id: client.id,
        email: client.email,
        name: client.name,
        company_name: client.company_name,
        subscription_tier: client.subscription_tier,
        total_agents: clientAgents.length,
        active_agents: activeAgents.length,
        total_evaluations: totalEvals,
        avg_score: avgScore,
        open_alerts: totalAlerts,
        health: avgScore === null ? 'no_data' 
          : avgScore >= 80 ? 'healthy' 
          : avgScore >= 60 ? 'needs_attention' 
          : 'critical',
        agents: clientAgents,
      };
    });

    // Platform-wide stats
    const allEvals = evaluations || [];
    const platformStats = {
      total_clients: clients?.length || 0,
      total_agents: agents?.length || 0,
      active_agents: agents?.filter(a => a.status === 'active').length || 0,
      total_evaluations: allEvals.length,
      total_interviews: agents?.reduce((sum, a) => sum + a.total_interviews, 0) || 0,
      platform_avg_score: allEvals.length > 0
        ? Math.round(allEvals.reduce((sum, e) => sum + e.overall_score, 0) / allEvals.length)
        : null,
      health_breakdown: {
        healthy: agentPerformance.filter(a => a.health === 'healthy').length,
        needs_attention: agentPerformance.filter(a => a.health === 'needs_attention').length,
        critical: agentPerformance.filter(a => a.health === 'critical').length,
        no_data: agentPerformance.filter(a => a.health === 'no_data').length,
      },
      total_open_alerts: openAlerts?.length || 0,
    };

    // Top issues platform-wide
    const platformIssues: Record<string, number> = {};
    for (const agent of agentPerformance) {
      for (const [type, count] of Object.entries(agent.issue_summary)) {
        platformIssues[type] = (platformIssues[type] || 0) + count;
      }
    }
    const topPlatformIssues = Object.entries(platformIssues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return NextResponse.json({
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      platform: {
        ...platformStats,
        top_issues: topPlatformIssues,
      },
      clients: clientPerformance.sort((a, b) => b.open_alerts - a.open_alerts),
      agents: agentPerformance.sort((a, b) => {
        // Critical first, then by score
        if (a.health === 'critical' && b.health !== 'critical') return -1;
        if (b.health === 'critical' && a.health !== 'critical') return 1;
        return (b.avg_score || 0) - (a.avg_score || 0);
      }),
      alerts: {
        open: openAlerts || [],
        by_severity: {
          critical: openAlerts?.filter(a => a.severity === 'critical').length || 0,
          warning: openAlerts?.filter(a => a.severity === 'warning').length || 0,
          info: openAlerts?.filter(a => a.severity === 'info').length || 0,
        },
      },
    });

  } catch (error) {
    console.error('Admin performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform performance' },
      { status: 500 }
    );
  }
}

