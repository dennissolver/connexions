// app/api/dashboard/agents/[agentId]/route.ts
// Returns detailed performance data for a specific agent (drill-down view)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { agentId } = params;
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Get all evaluations for this agent
    const { data: evaluations } = await supabase
      .from('interview_evaluations')
      .select(`
        id,
        interview_id,
        overall_score,
        goal_achievement_score,
        conversation_quality_score,
        user_engagement_score,
        prompt_adherence_score,
        metrics,
        issues,
        recommendations,
        transcript_summary,
        key_moments,
        created_at
      `)
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    // Get open alerts
    const { data: alerts } = await supabase
      .from('evaluation_alerts')
      .select('*')
      .eq('agent_id', agentId)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Get performance snapshots for trend chart
    const { data: snapshots } = await supabase
      .from('agent_performance_snapshots')
      .select('*')
      .eq('agent_id', agentId)
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    // Aggregate issues across all evaluations
    const allIssues: Record<string, { count: number; examples: any[] }> = {};
    const allRecommendations: Record<string, { count: number; examples: any[] }> = {};

    for (const evalItem of evaluations || []) {
      // Count issues by type
      for (const issue of (evalItem.issues || []) as any[]) {
        if (!allIssues[issue.type]) {
          allIssues[issue.type] = { count: 0, examples: [] };
        }
        allIssues[issue.type].count++;
        if (allIssues[issue.type].examples.length < 3) {
          allIssues[issue.type].examples.push({
            message: issue.message,
            severity: issue.severity,
            interview_id: evalItem.interview_id,
          });
        }
      }

      // Count recommendations by type
      for (const rec of (evalItem.recommendations || []) as any[]) {
        const key = `${rec.type}:${rec.suggestion.slice(0, 50)}`;
        if (!allRecommendations[key]) {
          allRecommendations[key] = { count: 0, examples: [] };
        }
        allRecommendations[key].count++;
        if (allRecommendations[key].examples.length < 1) {
          allRecommendations[key].examples.push(rec);
        }
      }
    }

    // Sort issues by frequency
    const topIssues = Object.entries(allIssues)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([type, data]) => ({
        type,
        count: data.count,
        percentage: Math.round((data.count / (evaluations?.length || 1)) * 100),
        examples: data.examples,
      }));

    // Get top recommendations
    const topRecommendations = Object.entries(allRecommendations)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([_, data]) => ({
        ...data.examples[0],
        frequency: data.count,
      }));

    // Calculate score distribution
    const scoreDistribution = {
      excellent: 0,
      good: 0,
      needs_improvement: 0,
      poor: 0,
    };

    for (const evalItem of evaluations || []) {
      if (evalItem.overall_score >= 90) scoreDistribution.excellent++;
      else if (evalItem.overall_score >= 70) scoreDistribution.good++;
      else if (evalItem.overall_score >= 50) scoreDistribution.needs_improvement++;
      else scoreDistribution.poor++;
    }

    // Calculate averages
    const evals = evaluations || [];
    const avgScores = evals.length > 0 ? {
      overall: Math.round(evals.reduce((s, e) => s + e.overall_score, 0) / evals.length),
      goal_achievement: Math.round(evals.reduce((s, e) => s + (e.goal_achievement_score || 0), 0) / evals.length),
      conversation_quality: Math.round(evals.reduce((s, e) => s + (e.conversation_quality_score || 0), 0) / evals.length),
      user_engagement: Math.round(evals.reduce((s, e) => s + (e.user_engagement_score || 0), 0) / evals.length),
      prompt_adherence: Math.round(evals.reduce((s, e) => s + (e.prompt_adherence_score || 0), 0) / evals.length),
    } : null;

    // Build daily score trend
    const dailyScores: Record<string, number[]> = {};
    for (const evalItem of evals) {
      const date = evalItem.created_at.split('T')[0];
      if (!dailyScores[date]) dailyScores[date] = [];
      dailyScores[date].push(evalItem.overall_score);
    }

    const scoreTrend = Object.entries(dailyScores)
      .map(([date, scores]) => ({
        date,
        avg_score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        company_name: agent.company_name,
        interview_purpose: agent.interview_purpose,
        target_interviewees: agent.target_interviewees,
        interviewer_tone: agent.interviewer_tone,
        total_interviews: agent.total_interviews,
        completed_interviews: agent.completed_interviews,
        status: agent.status,
      },
      period: {
        days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      summary: {
        evaluated_interviews: evals.length,
        avg_scores: avgScores,
        score_distribution: scoreDistribution,
        health: avgScores 
          ? avgScores.overall >= 80 ? 'healthy' 
          : avgScores.overall >= 60 ? 'needs_attention' 
          : 'critical'
          : 'no_data',
      },
      trends: {
        daily_scores: scoreTrend,
        snapshots: snapshots || [],
      },
      issues: {
        top_issues: topIssues,
        total_issues: Object.values(allIssues).reduce((sum, i) => sum + i.count, 0),
      },
      recommendations: topRecommendations,
      alerts: {
        open: alerts || [],
        count: alerts?.length || 0,
      },
      recent_evaluations: (evaluations || []).slice(0, 10).map(e => ({
        id: e.id,
        interview_id: e.interview_id,
        overall_score: e.overall_score,
        summary: e.transcript_summary,
        issues_count: (e.issues as any[])?.length || 0,
        created_at: e.created_at,
      })),
    });

  } catch (error) {
    console.error('Agent drill-down error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent details' },
      { status: 500 }
    );
  }
}
