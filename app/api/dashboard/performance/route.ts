// app/api/dashboard/performance/route.ts
// User-facing dashboard performance - requires logged-in session

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all agents
    const { data: agents } = await supabase
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
        created_at
      `);

    // Get evaluations for the period
    const { data: evaluations } = await supabase
      .from('interview_evaluations')
      .select('agent_id, overall_score, goal_achievement_score, conversation_quality_score, user_engagement_score, prompt_adherence_score, created_at')
      .gte('created_at', startDate.toISOString());

    // Get all open alerts
    const { data: openAlerts } = await supabase
      .from('evaluation_alerts')
      .select('*')
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

      // Determine trend (placeholder - would need historical data)
      let trend: 'improving' | 'stable' | 'declining' | null = null;
      if (agentEvals.length >= 2) {
        const recentEvals = agentEvals.slice(-5);
        const olderEvals = agentEvals.slice(0, -5);
        if (olderEvals.length > 0) {
          const recentAvg = recentEvals.reduce((s, e) => s + e.overall_score, 0) / recentEvals.length;
          const olderAvg = olderEvals.reduce((s, e) => s + e.overall_score, 0) / olderEvals.length;
          if (recentAvg > olderAvg + 5) trend = 'improving';
          else if (recentAvg < olderAvg - 5) trend = 'declining';
          else trend = 'stable';
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        company_name: agent.company_name,
        status: agent.status,
        total_interviews: agent.total_interviews || 0,
        completed_interviews: agent.completed_interviews || 0,
        evaluated_interviews: agentEvals.length,
        avg_score: avgScore,
        health,
        trend,
        open_alerts: agentAlerts.length,
        last_evaluation: agentEvals.length > 0
          ? agentEvals[agentEvals.length - 1].created_at
          : null,
        score_breakdown: agentEvals.length > 0 ? {
          goal_achievement: Math.round(agentEvals.reduce((s, e) => s + (e.goal_achievement_score || 0), 0) / agentEvals.length),
          conversation_quality: Math.round(agentEvals.reduce((s, e) => s + (e.conversation_quality_score || 0), 0) / agentEvals.length),
          user_engagement: Math.round(agentEvals.reduce((s, e) => s + (e.user_engagement_score || 0), 0) / agentEvals.length),
          prompt_adherence: Math.round(agentEvals.reduce((s, e) => s + (e.prompt_adherence_score || 0), 0) / agentEvals.length),
        } : null,
      };
    });

    // Platform-wide stats
    const allEvals = evaluations || [];
    const platformStats = {
      total_agents: agents?.length || 0,
      healthy: agentPerformance.filter(a => a.health === 'healthy').length,
      needs_attention: agentPerformance.filter(a => a.health === 'needs_attention').length,
      critical: agentPerformance.filter(a => a.health === 'critical').length,
      avg_score: allEvals.length > 0
        ? Math.round(allEvals.reduce((sum, e) => sum + e.overall_score, 0) / allEvals.length)
        : null,
      open_alerts: openAlerts?.length || 0,
    };

    return NextResponse.json({
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      platform: platformStats,
      agents: agentPerformance.sort((a, b) => {
        // Critical first, then by score
        if (a.health === 'critical' && b.health !== 'critical') return -1;
        if (b.health === 'critical' && a.health !== 'critical') return 1;
        return (b.avg_score || 0) - (a.avg_score || 0);
      }),
    });

  } catch (error) {
    console.error('Dashboard performance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}