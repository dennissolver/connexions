// app/api/insights/generate-embeddings/route.ts
// Generates vector embeddings for interviews that don't have them yet
// Can be called via cron job or manually after evaluations complete

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMBEDDING_DIMENSIONS = 1024;
const BATCH_SIZE = 10; // Process 10 interviews at a time

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  const voyageApiKey = process.env.VOYAGE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (voyageApiKey) {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${voyageApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.slice(0, 8000), // Voyage limit
        model: 'voyage-3.5',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage API error: ${error}`);
    }

    const data = await response.json();
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
        input: text.slice(0, 8000),
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  throw new Error('No embedding API key configured');
}

// ============================================================================
// BUILD EMBEDDING CONTENT
// ============================================================================

function buildInterviewContent(interview: any): string {
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
  if (interview.topics && Array.isArray(interview.topics)) {
    parts.push(`Topics: ${interview.topics.join(', ')}`);
  }

  // Add pain points
  if (interview.pain_points && Array.isArray(interview.pain_points)) {
    const painStrings = interview.pain_points.map((p: any) =>
      typeof p === 'string' ? p : p.point || JSON.stringify(p)
    );
    parts.push(`Pain points: ${painStrings.join(', ')}`);
  }

  // Add desires
  if (interview.desires && Array.isArray(interview.desires)) {
    const desireStrings = interview.desires.map((d: any) =>
      typeof d === 'string' ? d : d.desire || JSON.stringify(d)
    );
    parts.push(`Desires: ${desireStrings.join(', ')}`);
  }

  // Add key quotes
  if (interview.key_quotes && Array.isArray(interview.key_quotes)) {
    const quoteStrings = interview.key_quotes.slice(0, 5).map((q: any) =>
      typeof q === 'string' ? q : q.quote || ''
    ).filter(Boolean);
    if (quoteStrings.length > 0) {
      parts.push(`Key quotes: ${quoteStrings.join(' | ')}`);
    }
  }

  return parts.join('. ');
}

// ============================================================================
// MAIN ENDPOINT
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      limit = BATCH_SIZE,
      panel_id,
      force_regenerate = false
    } = body;

    console.log('[generate-embeddings] Starting batch, limit:', limit);

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
      .limit(limit);

    if (panel_id) {
      query = query.eq('panel_id', panel_id);
    }

    const { data: interviews, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch interviews: ${fetchError.message}`);
    }

    if (!interviews || interviews.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No interviews to process',
        processed: 0,
      });
    }

    // Filter to only those without embeddings (unless force_regenerate)
    let interviewsToProcess = interviews;

    if (!force_regenerate) {
      const interviewIds = interviews.map((i: any) => i.id);
      const { data: existingEmbeddings } = await supabase
        .from('interview_embeddings')
        .select('interview_id')
        .in('interview_id', interviewIds);

      const existingIds = new Set((existingEmbeddings || []).map((e: any) => e.interview_id));
      interviewsToProcess = interviews.filter((i: any) => !existingIds.has(i.id));
    }

    console.log('[generate-embeddings] Processing', interviewsToProcess.length, 'interviews');

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each interview
    for (const interview of interviewsToProcess) {
      try {
        const evaluation = interview.interview_evaluations?.[0];
        if (!evaluation?.summary) {
          console.log('[generate-embeddings] Skipping interview without summary:', interview.id);
          continue;
        }

        // Build content for embedding
        const content = buildInterviewContent({
          panel_name: interview.agents?.[0]?.name,
          participant_name: interview.participant_name,
          participant_company: interview.participant_company,
          summary: evaluation.summary,
          sentiment: evaluation.sentiment,
          topics: evaluation.topics,
          pain_points: evaluation.pain_points,
          desires: evaluation.desires,
          key_quotes: evaluation.key_quotes,
        });

        if (content.length < 50) {
          console.log('[generate-embeddings] Content too short for:', interview.id);
          continue;
        }

        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Store interview embedding
        const { error: insertError } = await supabase
          .from('interview_embeddings')
          .upsert({
            interview_id: interview.id,
            panel_id: interview.panel_id,
            content_text: content,
            embedding: embedding,
            sentiment: evaluation.sentiment,
            quality_score: evaluation.quality_score,
            model_used: process.env.VOYAGE_API_KEY ? 'voyage-large-2' : 'text-embedding-3-small',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'interview_id',
          });

        if (insertError) {
          throw new Error(`Failed to store embedding: ${insertError.message}`);
        }

        // Generate quote embeddings
        if (evaluation.key_quotes && Array.isArray(evaluation.key_quotes)) {
          for (const quote of evaluation.key_quotes.slice(0, 10)) {
            const quoteText = typeof quote === 'string' ? quote : quote.quote;
            if (!quoteText || quoteText.length < 10) continue;

            try {
              const quoteEmbedding = await generateEmbedding(quoteText);

              await supabase
                .from('quote_embeddings')
                .insert({
                  interview_id: interview.id,
                  evaluation_id: evaluation.id,
                  panel_id: interview.panel_id,
                  quote_text: quoteText,
                  context: quote.context || null,
                  theme: quote.theme || null,
                  embedding: quoteEmbedding,
                  model_used: process.env.VOYAGE_API_KEY ? 'voyage-large-2' : 'text-embedding-3-small',
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
      { error: 'Embedding generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Status check
// ============================================================================

export async function GET(): Promise<NextResponse> {
  // Count interviews with and without embeddings
  const { count: totalInterviews } = await supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: withEmbeddings } = await supabase
    .from('interview_embeddings')
    .select('id', { count: 'exact', head: true });

  const { count: totalEvaluations } = await supabase
    .from('interview_evaluations')
    .select('id', { count: 'exact', head: true });

  const { count: totalQuoteEmbeddings } = await supabase
    .from('quote_embeddings')
    .select('id', { count: 'exact', head: true });

  return NextResponse.json({
    status: 'active',
    endpoint: 'insights/generate-embeddings',
    stats: {
      total_completed_interviews: totalInterviews || 0,
      interviews_with_embeddings: withEmbeddings || 0,
      interviews_needing_embeddings: (totalInterviews || 0) - (withEmbeddings || 0),
      total_evaluations: totalEvaluations || 0,
      total_quote_embeddings: totalQuoteEmbeddings || 0,
    },
    embedding_provider: process.env.VOYAGE_API_KEY ? 'voyage' : (process.env.OPENAI_API_KEY ? 'openai' : 'none'),
  });
}