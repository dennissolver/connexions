// app/api/insights/quotes/route.ts
// Retrieve specific quotes filtered by theme, sentiment, or panel
// Used by Kira (Insights Agent) to find supporting evidence

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuotesRequest {
  theme?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  panel_id?: string;
  panel_name?: string;
  keyword?: string;
  limit?: number;
  sort_by?: 'impact' | 'recency' | 'relevance';
}

interface Quote {
  quote: string;
  participant_name: string | null;
  participant_company: string | null;
  panel_name: string;
  interview_date: string | null;
  interview_id: string;
  theme: string | null;
  sentiment: string | null;
  context: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: QuotesRequest = await request.json();
    const {
      theme,
      sentiment,
      panel_id,
      panel_name,
      keyword,
      limit = 10,
      sort_by = 'impact'
    } = body;

    console.log('[insights/quotes] Request:', body);

    // Build query for evaluations with quotes
    let query = supabase
      .from('interview_evaluations')
      .select(`
        id,
        interview_id,
        panel_id,
        sentiment,
        quality_score,
        key_quotes,
        topics,
        created_at,
        interviews!inner (
          participant_name,
          participant_company,
          completed_at,
          panel_id
        ),
        agents!interview_evaluations_panel_id_fkey (
          name
        )
      `)
      .not('key_quotes', 'is', null);

    // Apply filters
    if (panel_id) {
      query = query.eq('panel_id', panel_id);
    }

    if (sentiment) {
      query = query.eq('sentiment', sentiment);
    }

    // Fetch evaluations
    const { data: evaluations, error } = await query.limit(100); // Fetch more, filter later

    if (error) {
      console.error('[insights/quotes] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500 }
      );
    }

    // Filter by panel_name if specified (requires post-fetch filtering)
    let filteredEvaluations = evaluations || [];

    if (panel_name) {
      const panelNameLower = panel_name.toLowerCase();
      filteredEvaluations = filteredEvaluations.filter((e: any) =>
        e.agents?.name?.toLowerCase().includes(panelNameLower)
      );
    }

    // Extract and filter quotes
    const allQuotes: Quote[] = [];

    for (const evaluation of filteredEvaluations) {
      const quotes = evaluation.key_quotes as any[];
      if (!quotes || !Array.isArray(quotes)) continue;

      const interview = evaluation.interviews as any;
      const panel = evaluation.agents as any;

      for (const q of quotes) {
        const quoteText = typeof q === 'string' ? q : q.quote;
        if (!quoteText) continue;

        const quoteTheme = typeof q === 'object' ? q.theme : null;
        const quoteContext = typeof q === 'object' ? q.context : null;

        // Filter by theme if specified
        if (theme) {
          const themeLower = theme.toLowerCase();
          const matchesTheme =
            (quoteTheme && quoteTheme.toLowerCase().includes(themeLower)) ||
            quoteText.toLowerCase().includes(themeLower) ||
            (evaluation.topics && evaluation.topics.some((t: string) =>
              t.toLowerCase().includes(themeLower)
            ));

          if (!matchesTheme) continue;
        }

        // Filter by keyword if specified
        if (keyword) {
          const keywordLower = keyword.toLowerCase();
          if (!quoteText.toLowerCase().includes(keywordLower)) continue;
        }

        allQuotes.push({
          quote: quoteText,
          participant_name: interview?.participant_name || null,
          participant_company: interview?.participant_company || null,
          panel_name: panel?.name || 'Unknown Panel',
          interview_date: interview?.completed_at || null,
          interview_id: evaluation.interview_id,
          theme: quoteTheme,
          sentiment: evaluation.sentiment,
          context: quoteContext,
        });
      }
    }

    // Sort quotes
    let sortedQuotes = [...allQuotes];

    switch (sort_by) {
      case 'recency':
        sortedQuotes.sort((a, b) => {
          if (!a.interview_date) return 1;
          if (!b.interview_date) return -1;
          return new Date(b.interview_date).getTime() - new Date(a.interview_date).getTime();
        });
        break;
      case 'relevance':
        // If theme or keyword specified, quotes that match are already filtered
        // Just keep order as-is (by evaluation order)
        break;
      case 'impact':
      default:
        // Prioritize longer quotes (more substance) and those with context
        sortedQuotes.sort((a, b) => {
          const aScore = a.quote.length + (a.context ? 50 : 0) + (a.theme ? 20 : 0);
          const bScore = b.quote.length + (b.context ? 50 : 0) + (b.theme ? 20 : 0);
          return bScore - aScore;
        });
        break;
    }

    // Take top N quotes
    const topQuotes = sortedQuotes.slice(0, limit);

    // Calculate stats
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const themeCounts: Record<string, number> = {};

    for (const quote of topQuotes) {
      if (quote.sentiment) {
        sentimentCounts[quote.sentiment as keyof typeof sentimentCounts]++;
      }
      if (quote.theme) {
        themeCounts[quote.theme] = (themeCounts[quote.theme] || 0) + 1;
      }
    }

    console.log('[insights/quotes] Returning', topQuotes.length, 'quotes');

    return NextResponse.json({
      success: true,
      filters_applied: {
        theme: theme || null,
        sentiment: sentiment || null,
        panel_name: panel_name || null,
        keyword: keyword || null,
      },
      total_quotes: allQuotes.length,
      returned_quotes: topQuotes.length,
      quotes: topQuotes,
      stats: {
        sentiment_breakdown: sentimentCounts,
        themes_found: Object.keys(themeCounts),
      },
    });

  } catch (error) {
    console.error('[insights/quotes] Error:', error);
    return NextResponse.json(
      { error: 'Quote retrieval failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Health check
export async function GET(): Promise<NextResponse> {
  // Get sample themes from recent evaluations
  const { data: evaluations } = await supabase
    .from('interview_evaluations')
    .select('topics')
    .not('topics', 'is', null)
    .limit(20);

  const allTopics = new Set<string>();
  for (const e of evaluations || []) {
    if (e.topics && Array.isArray(e.topics)) {
      e.topics.forEach((t: string) => allTopics.add(t));
    }
  }

  return NextResponse.json({
    status: 'active',
    endpoint: 'insights/quotes',
    description: 'Retrieve quotes filtered by theme, sentiment, or panel',
    usage: 'POST with { theme?, sentiment?, panel_name?, keyword?, limit? }',
    available_themes: Array.from(allTopics).slice(0, 20),
    sentiment_options: ['positive', 'neutral', 'negative'],
  });
}