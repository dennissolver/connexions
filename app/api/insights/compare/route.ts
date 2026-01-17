// app/api/insights/compare/route.ts
// Compare insights across multiple panels or time periods
// Used by Kira (Insights Agent) for trend analysis and comparisons

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CompareRequest {
  panel_names?: string[];
  panel_ids?: string[];
  comparison_type?: 'sentiment' | 'themes' | 'pain_points' | 'all';
}

interface PanelStats {
  id: string;
  name: string;
  interview_count: number;
  evaluated_count: number;
  avg_sentiment: number | null;
  avg_quality: number | null;
  sentiment_breakdown: { positive: number; neutral: number; negative: number; mixed: number };
  top_themes: string[];
  top_pain_points: string[];
  top_desires: string[];
  date_range: { first: string | null; last: string | null };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CompareRequest = await request.json();
    const { panel_names, panel_ids, comparison_type = 'all' } = body;

    console.log('[insights/compare] Request:', body);

    // Need at least panel_names or panel_ids
    if ((!panel_names || panel_names.length === 0) && (!panel_ids || panel_ids.length === 0)) {
      // Return list of available panels for comparison
      const { data: panels } = await supabase
        .from('agents')
        .select('id, name, total_interviews, completed_interviews, created_at')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      return NextResponse.json({
        success: false,
        error: 'Please specify panels to compare',
        message: 'Provide panel_names (array of panel names) to compare',
        available_panels: panels?.map(p => ({
          id: p.id,
          name: p.name,
          interviews: p.total_interviews || 0,
        })) || [],
      });
    }

    // Find panels
    let panelsQuery = supabase
      .from('agents')
      .select('*')
      .eq('archived', false);

    if (panel_ids && panel_ids.length > 0) {
      panelsQuery = panelsQuery.in('id', panel_ids);
    } else if (panel_names && panel_names.length > 0) {
      // Build OR filter for partial name matching
      const orConditions = panel_names.map(name => `name.ilike.%${name}%`).join(',');
      panelsQuery = panelsQuery.or(orConditions);
    }

    const { data: panels, error: panelsError } = await panelsQuery;

    if (panelsError || !panels || panels.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No matching panels found',
        searched_for: panel_names || panel_ids,
      }, { status: 404 });
    }

    if (panels.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Need at least 2 panels to compare',
        found_panels: panels.map(p => p.name),
        suggestion: 'Try specifying more panel names',
      });
    }

    console.log('[insights/compare] Comparing panels:', panels.map(p => p.name));

    // Gather stats for each panel
    const panelStats: PanelStats[] = [];

    for (const panel of panels) {
      // Get evaluations for this panel
      const { data: evaluations } = await supabase
        .from('interview_evaluations')
        .select('sentiment, sentiment_score, quality_score, topics, pain_points, desires, created_at')
        .eq('panel_id', panel.id);

      // Get interview dates
      const { data: interviews } = await supabase
        .from('interviews')
        .select('completed_at')
        .eq('panel_id', panel.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });

      const evalCount = evaluations?.length || 0;
      const interviewCount = interviews?.length || 0;

      // Calculate sentiment
      const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      let totalSentiment = 0;
      let sentimentCount = 0;
      let totalQuality = 0;
      let qualityCount = 0;

      const themeCounts: Record<string, number> = {};
      const painCounts: Record<string, number> = {};
      const desireCounts: Record<string, number> = {};

      for (const e of evaluations || []) {
        if (e.sentiment) {
          sentimentBreakdown[e.sentiment as keyof typeof sentimentBreakdown]++;
        }
        if (e.sentiment_score != null) {
          totalSentiment += e.sentiment_score;
          sentimentCount++;
        }
        if (e.quality_score != null) {
          totalQuality += e.quality_score;
          qualityCount++;
        }

        // Themes
        if (e.topics && Array.isArray(e.topics)) {
          for (const t of e.topics) {
            themeCounts[t] = (themeCounts[t] || 0) + 1;
          }
        }

        // Pain points
        if (e.pain_points && Array.isArray(e.pain_points)) {
          for (const p of e.pain_points) {
            const point = typeof p === 'string' ? p : p.point || String(p);
            painCounts[point] = (painCounts[point] || 0) + 1;
          }
        }

        // Desires
        if (e.desires && Array.isArray(e.desires)) {
          for (const d of e.desires) {
            const desire = typeof d === 'string' ? d : d.desire || String(d);
            desireCounts[desire] = (desireCounts[desire] || 0) + 1;
          }
        }
      }

      const topThemes = Object.entries(themeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([t]) => t);

      const topPainPoints = Object.entries(painCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([p]) => p);

      const topDesires = Object.entries(desireCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([d]) => d);

      panelStats.push({
        id: panel.id,
        name: panel.name,
        interview_count: interviewCount,
        evaluated_count: evalCount,
        avg_sentiment: sentimentCount > 0 ? parseFloat((totalSentiment / sentimentCount).toFixed(2)) : null,
        avg_quality: qualityCount > 0 ? Math.round(totalQuality / qualityCount) : null,
        sentiment_breakdown: sentimentBreakdown,
        top_themes: topThemes,
        top_pain_points: topPainPoints,
        top_desires: topDesires,
        date_range: {
          first: interviews?.[0]?.completed_at || null,
          last: interviews?.[interviews.length - 1]?.completed_at || null,
        },
      });
    }

    // Sort panels by date (oldest first) for chronological comparison
    panelStats.sort((a, b) => {
      if (!a.date_range.first) return 1;
      if (!b.date_range.first) return -1;
      return new Date(a.date_range.first).getTime() - new Date(b.date_range.first).getTime();
    });

    // Generate comparison insights
    const comparison: Record<string, any> = {};

    // Sentiment comparison
    if (comparison_type === 'all' || comparison_type === 'sentiment') {
      const sentimentScores = panelStats
        .filter(p => p.avg_sentiment != null)
        .map(p => ({ name: p.name, score: p.avg_sentiment! }));

      if (sentimentScores.length >= 2) {
        const first = sentimentScores[0];
        const last = sentimentScores[sentimentScores.length - 1];
        const change = last.score - first.score;

        comparison.sentiment = {
          trend: change > 0.1 ? 'improving' : change < -0.1 ? 'declining' : 'stable',
          change: parseFloat(change.toFixed(2)),
          change_description: change > 0
            ? `+${(change * 100).toFixed(0)}% improvement from ${first.name} to ${last.name}`
            : change < 0
            ? `${(change * 100).toFixed(0)}% decline from ${first.name} to ${last.name}`
            : 'No significant change',
          by_panel: sentimentScores,
        };
      }
    }

    // Theme comparison
    if (comparison_type === 'all' || comparison_type === 'themes') {
      const allThemes = new Set<string>();
      for (const p of panelStats) {
        p.top_themes.forEach(t => allThemes.add(t));
      }

      const themeChanges: Array<{ theme: string; trend: string; panels: string[] }> = [];

      for (const theme of allThemes) {
        const panelsWithTheme = panelStats.filter(p => p.top_themes.includes(theme)).map(p => p.name);

        if (panelsWithTheme.length === panelStats.length) {
          themeChanges.push({ theme, trend: 'consistent', panels: panelsWithTheme });
        } else if (panelsWithTheme[0] === panelStats[panelStats.length - 1].name) {
          themeChanges.push({ theme, trend: 'emerging', panels: panelsWithTheme });
        } else if (panelsWithTheme[panelsWithTheme.length - 1] === panelStats[0].name) {
          themeChanges.push({ theme, trend: 'declining', panels: panelsWithTheme });
        }
      }

      comparison.themes = {
        all_themes: Array.from(allThemes),
        changes: themeChanges,
        consistent_themes: themeChanges.filter(t => t.trend === 'consistent').map(t => t.theme),
        emerging_themes: themeChanges.filter(t => t.trend === 'emerging').map(t => t.theme),
        declining_themes: themeChanges.filter(t => t.trend === 'declining').map(t => t.theme),
      };
    }

    // Pain point comparison
    if (comparison_type === 'all' || comparison_type === 'pain_points') {
      const painByPanel = panelStats.map(p => ({
        panel: p.name,
        pain_points: p.top_pain_points,
      }));

      // Find resolved vs persistent pain points
      const firstPanelPains = new Set(panelStats[0]?.top_pain_points || []);
      const lastPanelPains = new Set(panelStats[panelStats.length - 1]?.top_pain_points || []);

      const resolved = [...firstPanelPains].filter(p => !lastPanelPains.has(p));
      const persistent = [...firstPanelPains].filter(p => lastPanelPains.has(p));
      const newPains = [...lastPanelPains].filter(p => !firstPanelPains.has(p));

      comparison.pain_points = {
        by_panel: painByPanel,
        resolved: resolved,
        persistent: persistent,
        new_issues: newPains,
      };
    }

    // Volume comparison
    comparison.volume = {
      by_panel: panelStats.map(p => ({
        name: p.name,
        interviews: p.interview_count,
        evaluated: p.evaluated_count,
      })),
      total_interviews: panelStats.reduce((sum, p) => sum + p.interview_count, 0),
      total_evaluated: panelStats.reduce((sum, p) => sum + p.evaluated_count, 0),
    };

    // Generate summary
    const summaryParts: string[] = [];

    if (comparison.sentiment?.trend) {
      summaryParts.push(`Sentiment is ${comparison.sentiment.trend} (${comparison.sentiment.change_description}).`);
    }

    if (comparison.pain_points?.resolved?.length > 0) {
      summaryParts.push(`${comparison.pain_points.resolved.length} pain point(s) appear resolved: ${comparison.pain_points.resolved.slice(0, 2).join(', ')}.`);
    }

    if (comparison.pain_points?.new_issues?.length > 0) {
      summaryParts.push(`${comparison.pain_points.new_issues.length} new issue(s) emerged: ${comparison.pain_points.new_issues.slice(0, 2).join(', ')}.`);
    }

    if (comparison.themes?.emerging_themes?.length > 0) {
      summaryParts.push(`Emerging themes: ${comparison.themes.emerging_themes.slice(0, 3).join(', ')}.`);
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join(' ')
      : `Compared ${panelStats.length} panels with ${comparison.volume.total_interviews} total interviews.`;

    console.log('[insights/compare] Comparison complete');

    return NextResponse.json({
      success: true,
      panels_compared: panelStats.length,
      panels: panelStats.map(p => ({
        id: p.id,
        name: p.name,
        interview_count: p.interview_count,
        avg_sentiment: p.avg_sentiment,
        avg_quality: p.avg_quality,
        top_themes: p.top_themes.slice(0, 3),
        top_pain_points: p.top_pain_points.slice(0, 3),
        date_range: p.date_range,
      })),
      comparison,
      summary,
    });

  } catch (error) {
    console.error('[insights/compare] Error:', error);
    return NextResponse.json(
      { error: 'Comparison failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Health check
export async function GET(): Promise<NextResponse> {
  const { data: panels } = await supabase
    .from('agents')
    .select('id, name, total_interviews')
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    status: 'active',
    endpoint: 'insights/compare',
    description: 'Compare insights across multiple panels',
    usage: 'POST with { panel_names: ["Panel A", "Panel B"] }',
    available_panels: panels?.map(p => ({ id: p.id, name: p.name, interviews: p.total_interviews || 0 })) || [],
  });
}