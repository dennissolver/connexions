// app/api/insights/search/route.ts
// Vector-based semantic search across all interviews and evaluations
// Uses pgvector for embedding similarity search
// Used by Insights Agent to find relevant data for answering questions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Voyage AI for embeddings (or use OpenAI)
const EMBEDDING_API = 'https://api.voyageai.com/v1/embeddings';
const EMBEDDING_MODEL = 'voyage-3.5'; // 1536 dimensions
const EMBEDDING_DIMENSIONS = 1024;

interface SearchRequest {
  query: string;
  filters?: {
    panel_id?: string;
    panel_name?: string;
    sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
    date_from?: string;
    date_to?: string;
    min_quality_score?: number;
  };
  limit?: number;
  include_quotes?: boolean;
  similarity_threshold?: number;
}

interface SearchResult {
  interview_id: string;
  panel_id: string;
  panel_name: string;
  participant_name: string | null;
  participant_company: string | null;
  date: string | null;
  similarity_score: number;
  summary: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  quality_score: number | null;
  matching_quotes: Array<{
    quote: string;
    context: string | null;
    theme: string | null;
    similarity?: number;
  }>;
  topics: string[];
  pain_points: string[];
  desires: string[];
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;

  if (voyageApiKey) {
    // Use Voyage AI (recommended for quality)
    const response = await fetch(EMBEDDING_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: EMBEDDING_MODEL,
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // Fallback: Use OpenAI embeddings
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  throw new Error('No embedding API key configured (VOYAGE_API_KEY or OPENAI_API_KEY)');
}

// ============================================================================
// MAIN SEARCH ENDPOINT
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: SearchRequest = await request.json();
    const {
      query,
      filters = {},
      limit = 10,
      include_quotes = true,
      similarity_threshold = 0.3
    } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('[insights/search] Query:', query, 'Filters:', filters);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter conditions for the RPC call
    const filterConditions: Record<string, any> = {};

    if (filters.panel_id) {
      filterConditions.filter_panel_id = filters.panel_id;
    }
    if (filters.sentiment) {
      filterConditions.filter_sentiment = filters.sentiment;
    }
    if (filters.date_from) {
      filterConditions.filter_date_from = filters.date_from;
    }
    if (filters.date_to) {
      filterConditions.filter_date_to = filters.date_to;
    }
    if (filters.min_quality_score) {
      filterConditions.filter_min_quality = filters.min_quality_score;
    }

    // Call the vector similarity search function
    const { data: searchResults, error: searchError } = await supabase.rpc(
      'search_interview_embeddings',
      {
        query_embedding: queryEmbedding,
        match_threshold: similarity_threshold,
        match_count: limit * 2, // Fetch extra for post-filtering
        ...filterConditions,
      }
    );

    if (searchError) {
      console.error('[insights/search] Vector search error:', searchError);

      // Fallback to basic search if vector search fails
      return fallbackTextSearch(query, filters, limit, include_quotes);
    }

    // If panel_name filter, apply it (requires join data)
    let filteredResults = searchResults || [];

    if (filters.panel_name) {
      const panelNameLower = filters.panel_name.toLowerCase();
      filteredResults = filteredResults.filter((r: any) =>
        r.panel_name?.toLowerCase().includes(panelNameLower)
      );
    }

    // Take top results after filtering
    filteredResults = filteredResults.slice(0, limit);

    // Enrich results with additional data if needed
    const enrichedResults: SearchResult[] = await Promise.all(
      filteredResults.map(async (result: any) => {
        // Get matching quotes using quote embeddings
        let matchingQuotes: SearchResult['matching_quotes'] = [];

        if (include_quotes) {
          matchingQuotes = await findMatchingQuotes(
            result.interview_id,
            queryEmbedding,
            3 // max quotes per interview
          );
        }

        return {
          interview_id: result.interview_id,
          panel_id: result.panel_id,
          panel_name: result.panel_name,
          participant_name: result.participant_name,
          participant_company: result.participant_company,
          date: result.completed_at,
          similarity_score: result.similarity,
          summary: result.summary,
          sentiment: result.sentiment,
          sentiment_score: result.sentiment_score,
          quality_score: result.quality_score,
          matching_quotes: matchingQuotes,
          topics: result.topics || [],
          pain_points: extractStrings(result.pain_points),
          desires: extractStrings(result.desires),
        };
      })
    );

    // Calculate aggregations
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
    const themeCounts: Record<string, number> = {};
    const painPointCounts: Record<string, number> = {};

    for (const result of enrichedResults) {
      if (result.sentiment) {
        sentimentCounts[result.sentiment as keyof typeof sentimentCounts]++;
      }
      for (const topic of result.topics) {
        themeCounts[topic] = (themeCounts[topic] || 0) + 1;
      }
      for (const pain of result.pain_points) {
        painPointCounts[pain] = (painPointCounts[pain] || 0) + 1;
      }
    }

    const topThemes = Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme]) => theme);

    const topPainPoints = Object.entries(painPointCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([point]) => point);

    console.log('[insights/search] Returning', enrichedResults.length, 'results');

    return NextResponse.json({
      success: true,
      query,
      search_type: 'vector',
      total_matches: enrichedResults.length,
      interviews: enrichedResults,
      aggregations: {
        sentiment_breakdown: sentimentCounts,
        top_themes: topThemes,
        top_pain_points: topPainPoints,
      },
    });

  } catch (error) {
    console.error('[insights/search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FIND MATCHING QUOTES USING VECTOR SIMILARITY
// ============================================================================

async function findMatchingQuotes(
  interviewId: string,
  queryEmbedding: number[],
  maxQuotes: number
): Promise<SearchResult['matching_quotes']> {
  try {
    const { data: quotes, error } = await supabase.rpc(
      'search_quote_embeddings',
      {
        query_embedding: queryEmbedding,
        filter_interview_id: interviewId,
        match_threshold: 0.25,
        match_count: maxQuotes,
      }
    );

    if (error || !quotes) {
      // Fallback: get quotes from evaluation without similarity
      const { data: evaluation } = await supabase
        .from('interview_evaluations')
        .select('key_quotes')
        .eq('interview_id', interviewId)
        .single();

      if (evaluation?.key_quotes) {
        return (evaluation.key_quotes as any[]).slice(0, maxQuotes).map(q => ({
          quote: q.quote || q,
          context: q.context || null,
          theme: q.theme || null,
        }));
      }
      return [];
    }

    return quotes.map((q: any) => ({
      quote: q.quote_text,
      context: q.context,
      theme: q.theme,
      similarity: q.similarity,
    }));

  } catch (err) {
    console.error('[insights/search] Error finding quotes:', err);
    return [];
  }
}

// ============================================================================
// FALLBACK TEXT SEARCH (if vector search unavailable)
// ============================================================================

async function fallbackTextSearch(
  query: string,
  filters: SearchRequest['filters'],
  limit: number,
  includeQuotes: boolean
): Promise<NextResponse> {
  console.log('[insights/search] Using fallback text search');

  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  let dbQuery = supabase
    .from('interviews')
    .select(`
      id,
      panel_id,
      participant_name,
      participant_company,
      completed_at,
      status,
      agents!interviews_panel_id_fkey (
        id,
        name
      ),
      interview_evaluations (
        summary,
        sentiment,
        sentiment_score,
        quality_score,
        key_quotes,
        topics,
        pain_points,
        desires
      ),
      interview_transcripts (
        transcript_text,
        summary
      )
    `)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit * 3);

  if (filters?.panel_id) {
    dbQuery = dbQuery.eq('panel_id', filters.panel_id);
  }
  if (filters?.date_from) {
    dbQuery = dbQuery.gte('completed_at', filters.date_from);
  }
  if (filters?.date_to) {
    dbQuery = dbQuery.lte('completed_at', filters.date_to);
  }

  const { data: interviews, error } = await dbQuery;

  if (error) {
    return NextResponse.json(
      { error: 'Fallback search failed', details: error.message },
      { status: 500 }
    );
  }

  let filteredInterviews = interviews || [];

  if (filters?.panel_name) {
    const panelNameLower = filters.panel_name.toLowerCase();
    filteredInterviews = filteredInterviews.filter((i: any) =>
      i.agents?.name?.toLowerCase().includes(panelNameLower)
    );
  }

  if (filters?.sentiment) {
    filteredInterviews = filteredInterviews.filter((i: any) =>
      i.interview_evaluations?.[0]?.sentiment === filters.sentiment
    );
  }

  // Score by text matching
  const scoredResults = filteredInterviews.map((interview: any) => {
    const evaluation = interview.interview_evaluations?.[0];
    const transcript = interview.interview_transcripts?.[0];

    const searchableText = [
      evaluation?.summary || '',
      transcript?.transcript_text || '',
      (evaluation?.topics || []).join(' '),
      (evaluation?.pain_points || []).map((p: any) => p.point || p).join(' '),
    ].join(' ').toLowerCase();

    let relevanceScore = 0;
    for (const term of searchTerms) {
      const matches = (searchableText.match(new RegExp(term, 'gi')) || []).length;
      relevanceScore += matches;
    }

    let matchingQuotes: any[] = [];
    if (includeQuotes && evaluation?.key_quotes) {
      matchingQuotes = (evaluation.key_quotes as any[])
        .slice(0, 3)
        .map((q: any) => ({
          quote: q.quote || q,
          context: q.context || null,
          theme: q.theme || null,
        }));
    }

    return {
      interview_id: interview.id,
      panel_id: interview.panel_id,
      panel_name: interview.agents?.name || 'Unknown Panel',
      participant_name: interview.participant_name,
      participant_company: interview.participant_company,
      date: interview.completed_at,
      similarity_score: relevanceScore / 10, // Normalize
      summary: evaluation?.summary || transcript?.summary || null,
      sentiment: evaluation?.sentiment || null,
      sentiment_score: evaluation?.sentiment_score || null,
      quality_score: evaluation?.quality_score || null,
      matching_quotes: matchingQuotes,
      topics: evaluation?.topics || [],
      pain_points: extractStrings(evaluation?.pain_points),
      desires: extractStrings(evaluation?.desires),
    };
  });

  const sortedResults = scoredResults
    .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
    .slice(0, limit);

  return NextResponse.json({
    success: true,
    query,
    search_type: 'text_fallback',
    total_matches: sortedResults.length,
    interviews: sortedResults,
    aggregations: {
      sentiment_breakdown: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
      top_themes: [],
      top_pain_points: [],
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractStrings(arr: any[] | null | undefined): string[] {
  if (!arr) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    if (item.point) return item.point;
    if (item.desire) return item.desire;
    return String(item);
  });
}

// ============================================================================
// GET - Health check
// ============================================================================

export async function GET(): Promise<NextResponse> {
  // Check if vector search is available
  const { data, error } = await supabase.rpc('search_interview_embeddings', {
    query_embedding: new Array(EMBEDDING_DIMENSIONS).fill(0),
    match_threshold: 0.9,
    match_count: 1,
  });

  const vectorSearchAvailable = !error;

  return NextResponse.json({
    status: 'active',
    endpoint: 'insights/search',
    description: 'Semantic vector search across interviews and evaluations',
    vector_search_available: vectorSearchAvailable,
    embedding_model: EMBEDDING_MODEL,
    usage: 'POST with { query, filters?, limit?, similarity_threshold? }',
  });
}