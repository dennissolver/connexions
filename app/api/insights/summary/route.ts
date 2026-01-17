// app/api/insights/summary/route.ts
// Get aggregated insights for a specific panel
// Used by Kira (Insights Agent) to summarize research panels

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SummaryRequest {
  panel_id?: string;
  panel_name?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SummaryRequest = await request.json();
    const { panel_id, panel_name } = body;

    console.log('[insights/summary] Request:', { panel_id, panel_name });

    // Find the panel
    let panelQuery = supabase
      .from('agents')
      .select('*')
      .eq('archived', false);

    if (panel_id) {
      panelQuery = panelQuery.eq('id', panel_id);
    } else if (panel_name) {
      panelQuery = panelQuery.ilike('name', `%${panel_name}%`);
    } else {
      // No filter - return list of available panels
      const { data: panels, error } = await supabase
        .from('agents')
        .select('id, name, status, total_interviews, completed_interviews, created_at')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch panels' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'No panel specified. Here are available panels:',
        panels: panels?.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          interview_count: p.total_interviews || 0,
          completed_count: p.completed_interviews || 0,
        })),
      });
    }

    const { data: panels, error: panelError } = await panelQuery.limit(1);

    if (panelError || !panels || panels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Panel not found',
        suggestion: 'Try searching with a different name or check available panels.',
      }, { status: 404 });
    }

    const panel = panels[0];
    console.log('[insights/summary] Found panel:', panel.name);

    // Get all evaluations for this panel
    const { data: evaluations, error: evalError } = await supabase
      .from('interview_evaluations')
      .select(`
        id,
        interview_id,
        summary,
        sentiment,
        sentiment_score,
        quality_score,
        engagement_level,
        key_quotes,
        topics,
        pain_points,
        desires,
        surprises,
        follow_up_worthy,
        follow_up_reason,
        created_at
      `)
      .eq('panel_id', panel.id);

    // Get interview dates for time range
    const { data: interviews } = await supabase
      .from('interviews')
      .select('id, completed_at, participant_name, participant_company')
      .eq('panel_id', panel.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    const evalCount = evaluations?.length || 0;
    const interviewCount = interviews?.length || 0;

    // If no evaluations yet
    if (evalCount === 0) {
      return NextResponse.json({
        success: true,
        panel: {
          id: panel.id,
          name: panel.name,
          status: panel.status,
          interview_count: interviewCount,
          evaluated_count: 0,
        },
        message: interviewCount > 0
          ? `This panel has ${interviewCount} interviews but none have been evaluated yet.`
          : 'This panel has no completed interviews yet.',
        sentiment: null,
        themes: [],
        pain_points: [],
        desires: [],
        recommendations: [],
      });
    }

    // Calculate sentiment breakdown
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    let totalSentimentScore = 0;
    let sentimentScoreCount = 0;

    // Calculate quality stats
    let totalQualityScore = 0;
    let qualityScoreCount = 0;
    const qualityDistribution = { high: 0, medium: 0, low: 0 };

    // Aggregate themes, pain points, desires
    const themeCounts: Record<string, number> = {};
    const painPointCounts: Record<string, { count: number; quotes: string[] }> = {};
    const desireCounts: Record<string, { count: number; quotes: string[] }> = {};
    const allQuotes: Array<{ quote: string; sentiment: string; theme?: string; interview_id: string }> = [];

    // Follow-up tracking
    const followUpInterviews: Array<{ interview_id: string; reason: string }> = [];

    for (const evaluation of evaluations || []) {
      // Sentiment
      if (evaluation.sentiment) {
        sentimentCounts[evaluation.sentiment as keyof typeof sentimentCounts]++;
      }
      if (evaluation.sentiment_score != null) {
        totalSentimentScore += evaluation.sentiment_score;
        sentimentScoreCount++;
      }

      // Quality
      if (evaluation.quality_score != null) {
        totalQualityScore += evaluation.quality_score;
        qualityScoreCount++;

        if (evaluation.quality_score >= 80) qualityDistribution.high++;
        else if (evaluation.quality_score >= 50) qualityDistribution.medium++;
        else qualityDistribution.low++;
      }

      // Topics/Themes
      if (evaluation.topics && Array.isArray(evaluation.topics)) {
        for (const topic of evaluation.topics) {
          themeCounts[topic] = (themeCounts[topic] || 0) + 1;
        }
      }

      // Pain points
      if (evaluation.pain_points && Array.isArray(evaluation.pain_points)) {
        for (const pain of evaluation.pain_points) {
          const pointText = typeof pain === 'string' ? pain : pain.point || String(pain);
          const quote = typeof pain === 'object' ? pain.quote : null;

          if (!painPointCounts[pointText]) {
            painPointCounts[pointText] = { count: 0, quotes: [] };
          }
          painPointCounts[pointText].count++;
          if (quote) painPointCounts[pointText].quotes.push(quote);
        }
      }

      // Desires
      if (evaluation.desires && Array.isArray(evaluation.desires)) {
        for (const desire of evaluation.desires) {
          const desireText = typeof desire === 'string' ? desire : desire.desire || String(desire);
          const quote = typeof desire === 'object' ? desire.quote : null;

          if (!desireCounts[desireText]) {
            desireCounts[desireText] = { count: 0, quotes: [] };
          }
          desireCounts[desireText].count++;
          if (quote) desireCounts[desireText].quotes.push(quote);
        }
      }

      // Quotes
      if (evaluation.key_quotes && Array.isArray(evaluation.key_quotes)) {
        for (const q of evaluation.key_quotes.slice(0, 3)) {
          const quoteText = typeof q === 'string' ? q : q.quote;
          if (quoteText) {
            allQuotes.push({
              quote: quoteText,
              sentiment: evaluation.sentiment || 'neutral',
              theme: typeof q === 'object' ? q.theme : undefined,
              interview_id: evaluation.interview_id,
            });
          }
        }
      }

      // Follow-ups
      if (evaluation.follow_up_worthy) {
        followUpInterviews.push({
          interview_id: evaluation.interview_id,
          reason: evaluation.follow_up_reason || 'Marked for follow-up',
        });
      }
    }

    // Sort and format themes
    const topThemes = Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([theme, count]) => ({
        theme,
        count,
        percentage: Math.round((count / evalCount) * 100),
      }));

    // Sort and format pain points
    const topPainPoints = Object.entries(painPointCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([point, data]) => ({
        point,
        frequency: data.count,
        percentage: Math.round((data.count / evalCount) * 100),
        example_quote: data.quotes[0] || null,
      }));

    // Sort and format desires
    const topDesires = Object.entries(desireCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([desire, data]) => ({
        desire,
        frequency: data.count,
        percentage: Math.round((data.count / evalCount) * 100),
        example_quote: data.quotes[0] || null,
      }));

    // Select curated quotes (diverse sentiment, high impact)
    const curatedQuotes = allQuotes
      .slice(0, 10)
      .map(q => ({
        quote: q.quote,
        sentiment: q.sentiment,
        theme: q.theme,
      }));

    // Calculate date range
    const dateRange = interviews && interviews.length > 0 ? {
      first: interviews[0].completed_at,
      last: interviews[interviews.length - 1].completed_at,
    } : null;

    // Generate executive summary
    const avgSentiment = sentimentScoreCount > 0
      ? (totalSentimentScore / sentimentScoreCount).toFixed(2)
      : null;

    const avgQuality = qualityScoreCount > 0
      ? Math.round(totalQualityScore / qualityScoreCount)
      : null;

    const positivePercent = Math.round((sentimentCounts.positive / evalCount) * 100);
    const topPain = topPainPoints[0]?.point || 'none identified';
    const topDesire = topDesires[0]?.desire || 'none identified';

    const executiveSummary = `${panel.name} has ${interviewCount} completed interviews with ${evalCount} evaluated. Overall sentiment is ${positivePercent}% positive. The top pain point is "${topPain}" and the most common desire is "${topDesire}".`;

    // Generate recommendations based on data
    const recommendations: string[] = [];

    if (topPainPoints.length > 0) {
      recommendations.push(`Address "${topPainPoints[0].point}" - mentioned in ${topPainPoints[0].percentage}% of interviews`);
    }
    if (topDesires.length > 0) {
      recommendations.push(`Consider "${topDesires[0].desire}" - requested by ${topDesires[0].percentage}% of participants`);
    }
    if (followUpInterviews.length > 0) {
      recommendations.push(`Follow up with ${followUpInterviews.length} participants flagged for deeper conversation`);
    }
    if (sentimentCounts.negative > sentimentCounts.positive) {
      recommendations.push(`Investigate negative sentiment drivers - ${sentimentCounts.negative} negative vs ${sentimentCounts.positive} positive interviews`);
    }

    // Check for existing panel_insights
    const { data: existingInsights } = await supabase
      .from('panel_insights')
      .select('executive_summary, key_findings, recommendations')
      .eq('panel_id', panel.id)
      .eq('stale', false)
      .order('created_at', { ascending: false })
      .limit(1);

    // Use AI-generated insights if available
    const aiInsights = existingInsights?.[0];

    console.log('[insights/summary] Returning summary for:', panel.name);

    return NextResponse.json({
      success: true,
      panel: {
        id: panel.id,
        name: panel.name,
        status: panel.status,
        interview_count: interviewCount,
        evaluated_count: evalCount,
        date_range: dateRange,
      },
      sentiment: {
        average_score: avgSentiment ? parseFloat(avgSentiment) : null,
        breakdown: sentimentCounts,
        positive_percentage: positivePercent,
      },
      quality: {
        average_score: avgQuality,
        distribution: qualityDistribution,
      },
      themes: topThemes,
      pain_points: topPainPoints,
      desires: topDesires,
      curated_quotes: curatedQuotes,
      follow_up_needed: followUpInterviews.length,
      executive_summary: aiInsights?.executive_summary || executiveSummary,
      key_findings: aiInsights?.key_findings || null,
      recommendations: aiInsights?.recommendations || recommendations,
    });

  } catch (error) {
    console.error('[insights/summary] Error:', error);
    return NextResponse.json(
      { error: 'Summary generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Health check and list panels
export async function GET(): Promise<NextResponse> {
  const { data: panels, error } = await supabase
    .from('agents')
    .select('id, name, status, total_interviews, completed_interviews')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    status: 'active',
    endpoint: 'insights/summary',
    description: 'Get aggregated insights for a panel',
    usage: 'POST with { panel_name } or { panel_id }',
    available_panels: panels?.map(p => ({ id: p.id, name: p.name, interviews: p.total_interviews || 0 })) || [],
  });
}