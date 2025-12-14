// app/api/analyze-interview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { interviewId, transcript, agentPurpose } = await request.json();

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript required' }, { status: 400 });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });

    const systemPrompt = `You are an expert interview analyst. Analyze the following interview transcript and provide:

1. **Key Insights** - Main takeaways from the conversation
2. **Sentiment Analysis** - Overall tone and emotional indicators
3. **Topic Summary** - Main topics discussed with brief descriptions
4. **Notable Quotes** - 2-3 significant quotes from the interviewee
5. **Follow-up Suggestions** - Recommended actions or questions for follow-up
6. **Quality Assessment** - Rate the interview quality (depth, clarity, engagement)

${agentPurpose ? `Context: This interview was conducted for: ${agentPurpose}` : ''}

Be concise but thorough. Format your response with clear headers and bullet points where appropriate.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Please analyze this interview transcript:\n\n${transcript}`,
        },
      ],
      system: systemPrompt,
    });

    const analysis = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Save analysis to database
    if (interviewId) {
      const { data: interview } = await supabase
        .from('interviews')
        .select('extracted_data')
        .eq('id', interviewId)
        .single();

      const existingData = interview?.extracted_data || {};

      await supabase
        .from('interviews')
        .update({
          extracted_data: {
            ...existingData,
            ai_analysis: analysis,
            analyzed_at: new Date().toISOString(),
          },
        })
        .eq('id', interviewId);
    }

    return NextResponse.json({
      success: true,
      analysis,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint
export async function PUT(request: NextRequest) {
  try {
    const { interviewIds } = await request.json();

    if (!interviewIds || !Array.isArray(interviewIds)) {
      return NextResponse.json({ error: 'Interview IDs required' }, { status: 400 });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch all interviews
    const { data: interviews, error } = await supabase
      .from('interviews')
      .select('id, transcript, messages, agents(interview_purpose)')
      .in('id', interviewIds);

    if (error) throw error;

    const client = new Anthropic({ apiKey: anthropicApiKey });
    const results: Record<string, string> = {};

    for (const interview of interviews || []) {
      const transcript = interview.transcript || 
        (interview.messages || [])
          .map((m: any) => `${m.role}: ${m.content}`)
          .join('\n\n');

      if (!transcript) continue;

      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: `Analyze this interview briefly (key insights, sentiment, main topics):\n\n${transcript}`,
            },
          ],
        });

        const analysis = response.content[0].type === 'text'
          ? response.content[0].text
          : '';

        results[interview.id] = analysis;

        // Save to database
        await supabase
          .from('interviews')
          .update({
            extracted_data: {
              ai_analysis: analysis,
              analyzed_at: new Date().toISOString(),
            },
          })
          .eq('id', interview.id);

      } catch (err) {
        console.error(`Failed to analyze ${interview.id}:`, err);
        results[interview.id] = 'Analysis failed';
      }
    }

    return NextResponse.json({
      success: true,
      results,
      count: Object.keys(results).length,
    });

  } catch (error: any) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Batch analysis failed' },
      { status: 500 }
    );
  }
}
