// app/api/insights/generate-embeddings/route.ts
// Generates vector embeddings for interviews that don't have them yet
// Can be called via cron job or manually after evaluations complete

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION & GUARDS
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[generate-embeddings] Missing Supabase configuration');
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

const EMBEDDING_DIMENSIONS = 1024;
const BATCH_SIZE = 10;

// ============================================================================
// TYPES
// ============================================================================

interface PainPoint {
  point?: string;
  [key: string]: unknown;
}

interface Desire {
  desire?: string;
  [key: string]: unknown;
}

interface Quote {
  quote?: string;
  context?: string;
  theme?: string;
  [key: string]: unknown;
}

interface Evaluation {
  id: string;
  summary?: string;
  sentiment?: string;
  sentiment_score?: number;
  quality_score?: number;
  topics?: string[];
  pain_points?: (string | PainPoint)[];
  desires?: (string | Desire)[];
  key_quotes?: (string | Quote)[];
}

interface Agent {
  name?: string;
}

interface Interview {
  id: string;
  panel_id: string;
  participant_name?: string;
  participant_company?: string;
  completed_at?: string;
  agents?: Agent[];
  interview_evaluations?: Evaluation[];
}

interface InterviewContent {
  panel_name?: string;
  participant_name?: string;
  participant_company?: string;
  summary?: string;
  sentiment?: string;
  topics?: string[];
  pain_points?: (string | PainPoint)[];
  desires?: (string | Desire)[];
  key_quotes?: (string | Quote)[];
}

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  const sanitizedText = text.slice(0, 8000).trim();

  if (voyageApiKey) {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: sanitizedText,
        model: 'voyage-3.5',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage API error: ${error}`);
    }

    const data = await response.json();

    if (!data?.data?.[0]?.embedding) {
      throw new Error('Invalid response from Voyage API');
    }

    return data.data[0].embedding;
  }

  if (openaiApiKey) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: sanitizedText,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();

    if (!data?.data?.[0]?.embedding) {
      throw new Error('Invalid response from OpenAI API');
    }

    return data.data[0].embedding;
  }

  throw new Error('No embedding API key configured (VOYAGE_API_KEY or OPENAI_API_KEY)');
}

// ============================================================================
// BUILD EMBEDDING CONTENT
// ============================================================================

function buildInterviewContent(interview: InterviewContent): string {
  const parts: string[] = [];

  if (interview.panel_name) {
    parts.push(`Panel: ${interview.panel_name}`);
  }
  if (interview.participant_name) {
    parts.push(`Participant: ${interview.participant_name}`);
  }
  if (interview.participant_company) {
    parts.push(`Company: ${interview.participant_company}`);
  }
  if (interview.summary) {
    parts.push(`Summary: ${interview.summary}`);
  }
  if (interview.sentiment) {
    parts.push(`Sentiment: ${interview.sentiment}`);
  }

  // Add topics
  if (interview.topics && Array.isArray(interview.topics) && interview.topics.length > 0) {
    const validTopics = interview.topics.filter(t => typeof t === 'string' && t.trim());
    if (validTopics.length > 0) {
      parts.push(`Topics: ${validTopics.join(', ')}`);
    }
  }

  // Add pain points
  if (interview.pain_points && Array.isArray(interview.pain_points) && interview.pain_points.length > 0) {
    const painStrings = interview.pain_points
      .map((p) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object' && 'point' in p) return p.point;
        return null;
      })
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0);

    if (painStrings.length > 0) {
      parts.push(`Pain points: ${painStrings.join(', ')}`);
    }
  }

  // Add desires
  if (interview.desires && Array.isArray(interview.desires) && interview.desires.length > 0) {
    const desireStrings = interview.desires
      .map((d) => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object' && 'desire' in d) return d.desire;
        return null;
      })
      .filter((d): d is string => typeof d === 'string' && d.trim().length > 0);

    if (desireStrings.length > 0) {
      parts.push(`Desires: ${desireStrings.join(', ')}`);
    }
  }

  // Add key quotes
  if (interview.key_quotes && Array.isArray(interview.key_quotes) && interview.key_quotes.length > 0) {
    const quoteStrings = interview.key_quotes
      .slice(0, 5)
      .map((q) => {
        if (typeof q === 'string') return q;
        if (q && typeof q === 'object' && 'quote' in q) return q.quote;
        return null;
      })
      .filter((q): q is string => typeof q === 'string' && q.trim().length > 0);

    if (quoteStrings.length > 0) {
      parts.push(`Key quotes: ${quoteStrings.join(' | ')}`);
    }
  }

  return parts.join('. ');
}

// ============================================================================
// HELPER: Get panel name safely
// ============================================================================

function getPanelName(agents: Agent[] | undefined | null): string | undefined {
  if (!agents || !Array.isArray(agents) || agents.length === 0) {
    return undefined;
  }
  const firstAgent = agents[0];
  if (!firstAgent || typeof firstAgent !== 'object') {
    return undefined;
  }
  return firstAgent.name || undefined;
}

// ============================================================================
// HELPER: Get first evaluation safely
// ============================================================================

function getFirstEvaluation(evaluations: Evaluation[] | undefined | null): Evaluation | undefined {
  if (!evaluations || !Array.isArray(evaluations) || evaluations.length === 0) {
    return undefined;
  }
  return evaluations[0];
}

// ============================================================================
// HELPER: Get embedding model name
// ============================================================================

function getEmbeddingModelName(): string {
  if (process.env.VOYAGE_API_KEY) return 'voyage-3.5';
  if (process.env.OPENAI_API_KEY) return 'text-embedding-3-small';
  return 'unknown';
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Guard: Check Supabase client
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured', details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      limit = BATCH_SIZE,
      panel_id,
      force_regenerate = false
    } = body;

    // Guard: Validate limit
    const safeLimit = Math.min(Math.max(1, Number(limit) || BATCH_SIZE), 100);

    console.log('[generate-embeddings] Starting batch, limit:', safeLimit);

    // Find interviews needing embeddings
    let query = supabase
      .from('interviews')
      .select(`
        id,
        panel_id,
        participant_name,
        participant_company,
        completed_at,
        agents!interviews_panel_id_fkey (
          name
        ),
        interview_evaluations (
          id,
          summary,
          sentiment,
          sentiment_score,
          quality_score,
          topics,
          pain_points,
          desires,
          key_quotes
        )
      `)
      .eq('status', 'completed')
      .not('interview_evaluations', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(safeLimit);

    // Guard: Validate panel_id if provided
    if (panel_id && typeof panel_id === 'string' && panel_id.trim()) {
      query = query.eq('panel_id', panel_id.trim());
    }

    const { data: interviews, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch interviews: ${fetchError.message}`);
    }

    if (!interviews || !Array.isArray(interviews) || interviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No interviews to process',
        processed: 0,
      });
    }

    // Filter to only those without embeddings (unless force_regenerate)
    let interviewsToProcess: Interview[] = interviews as Interview[];

    if (!force_regenerate) {
      const interviewIds = interviews
        .map((i) => i?.id)
        .filter((id): id is string => typeof id === 'string');

      if (interviewIds.length > 0) {
        const { data: existingEmbeddings } = await supabase
          .from('interview_embeddings')
          .select('interview_id')
          .in('interview_id', interviewIds);

        const existingIds = new Set(
          (existingEmbeddings || [])
            .map((e) => e?.interview_id)
            .filter((id): id is string => typeof id === 'string')
        );

        interviewsToProcess = (interviews as Interview[]).filter(
          (i) => i?.id && !existingIds.has(i.id)
        );
      }
    }

    console.log('[generate-embeddings] Processing', interviewsToProcess.length, 'interviews');

    const results = {
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each interview
    for (const interview of interviewsToProcess) {
      // Guard: Validate interview object
      if (!interview || !interview.id || !interview.panel_id) {
        console.log('[generate-embeddings] Skipping invalid interview object');
        results.skipped++;
        continue;
      }

      try {
        const evaluation = getFirstEvaluation(interview.interview_evaluations);

        // Guard: Check evaluation exists and has summary
        if (!evaluation) {
          console.log('[generate-embeddings] Skipping interview without evaluation:', interview.id);
          results.skipped++;
          continue;
        }

        if (!evaluation.summary || typeof evaluation.summary !== 'string' || evaluation.summary.trim().length === 0) {
          console.log('[generate-embeddings] Skipping interview without summary:', interview.id);
          results.skipped++;
          continue;
        }

        // Build content for embedding
        const content = buildInterviewContent({
          panel_name: getPanelName(interview.agents),
          participant_name: interview.participant_name,
          participant_company: interview.participant_company,
          summary: evaluation.summary,
          sentiment: evaluation.sentiment,
          topics: evaluation.topics,
          pain_points: evaluation.pain_points,
          desires: evaluation.desires,
          key_quotes: evaluation.key_quotes,
        });

        // Guard: Check content length
        if (content.length < 50) {
          console.log('[generate-embeddings] Content too short for:', interview.id, '- length:', content.length);
          results.skipped++;
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Guard: Validate embedding
        if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
          throw new Error('Invalid embedding returned');
        }

        // Store interview embedding
        const { error: insertError } = await supabase
          .from('interview_embeddings')
          .upsert({
            interview_id: interview.id,
            panel_id: interview.panel_id,
            content_text: content,
            embedding: embedding,
            sentiment: evaluation.sentiment || null,
            quality_score: evaluation.quality_score || null,
            model_used: getEmbeddingModelName(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'interview_id',
          });

        if (insertError) {
          throw new Error(`Failed to store embedding: ${insertError.message}`);
        }

        // Generate quote embeddings
        if (evaluation.key_quotes && Array.isArray(evaluation.key_quotes) && evaluation.key_quotes.length > 0) {
          const quotesToProcess = evaluation.key_quotes.slice(0, 10);

          for (const quote of quotesToProcess) {
            // Guard: Validate quote
            if (!quote) continue;

            const quoteText = typeof quote === 'string' ? quote : quote.quote;

            // Guard: Check quote text
            if (!quoteText || typeof quoteText !== 'string' || quoteText.trim().length < 10) {
              continue;
            }

            try {
              const quoteEmbedding = await generateEmbedding(quoteText);

              // Guard: Validate quote embedding
              if (!quoteEmbedding || !Array.isArray(quoteEmbedding) || quoteEmbedding.length === 0) {
                console.error('[generate-embeddings] Invalid quote embedding for interview:', interview.id);
                continue;
              }

              const quoteContext = typeof quote === 'object' && quote.context ? quote.context : null;
              const quoteTheme = typeof quote === 'object' && quote.theme ? quote.theme : null;

              await supabase
                .from('quote_embeddings')
                .insert({
                  interview_id: interview.id,
                  evaluation_id: evaluation.id,
                  panel_id: interview.panel_id,
                  quote_text: quoteText.trim(),
                  context: quoteContext,
                  theme: quoteTheme,
                  embedding: quoteEmbedding,
                  model_used: getEmbeddingModelName(),
                });
            } catch (quoteErr) {
              console.error('[generate-embeddings] Quote embedding failed:', quoteErr);
              // Continue with other quotes
            }
          }
        }

        results.processed++;
        console.log('[generate-embeddings] Processed:', interview.id);

      } catch (err) {
        results.failed++;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${interview.id}: ${errorMsg}`);
        console.error('[generate-embeddings] Error processing interview:', interview.id, err);
      }
    }

    console.log('[generate-embeddings] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error) {
    console.error('[generate-embeddings] Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Embedding generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Status check
// ============================================================================

export async function GET(): Promise<NextResponse> {
  // Guard: Check Supabase client
  if (!supabase) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Database not configured',
        details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
      },
      { status: 500 }
    );
  }

  try {
    // Count interviews with and without embeddings
    const { count: totalInterviews, error: interviewsError } = await supabase
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');

    if (interviewsError) {
      console.error('[generate-embeddings] Error fetching interview count:', interviewsError);
    }

    const { count: withEmbeddings, error: embeddingsError } = await supabase
      .from('interview_embeddings')
      .select('id', { count: 'exact', head: true });

    if (embeddingsError) {
      console.error('[generate-embeddings] Error fetching embeddings count:', embeddingsError);
    }

    const { count: totalEvaluations, error: evaluationsError } = await supabase
      .from('interview_evaluations')
      .select('id', { count: 'exact', head: true });

    if (evaluationsError) {
      console.error('[generate-embeddings] Error fetching evaluations count:', evaluationsError);
    }

    const { count: totalQuoteEmbeddings, error: quoteEmbeddingsError } = await supabase
      .from('quote_embeddings')
      .select('id', { count: 'exact', head: true });

    if (quoteEmbeddingsError) {
      console.error('[generate-embeddings] Error fetching quote embeddings count:', quoteEmbeddingsError);
    }

    const safeTotal = totalInterviews ?? 0;
    const safeWithEmbeddings = withEmbeddings ?? 0;

    return NextResponse.json({
      status: 'active',
      endpoint: 'insights/generate-embeddings',
      stats: {
        total_completed_interviews: safeTotal,
        interviews_with_embeddings: safeWithEmbeddings,
        interviews_needing_embeddings: Math.max(0, safeTotal - safeWithEmbeddings),
        total_evaluations: totalEvaluations ?? 0,
        total_quote_embeddings: totalQuoteEmbeddings ?? 0,
      },
      embedding_provider: process.env.VOYAGE_API_KEY
        ? 'voyage'
        : (process.env.OPENAI_API_KEY ? 'openai' : 'none'),
      model: getEmbeddingModelName(),
    });

  } catch (error) {
    console.error('[generate-embeddings] GET error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Failed to fetch stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}