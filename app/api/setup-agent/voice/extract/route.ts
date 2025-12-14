import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const EXTRACTION_PROMPT = `You are analyzing a transcript of a voice conversation between a Setup Agent and a client who wants to create an AI interviewer.

Extract the following information from the transcript and return it as JSON:

{
  "conversationComplete": boolean (true if the client confirmed the summary),
  "clientName": "their name or null",
  "clientEmail": "their email address - THIS IS REQUIRED",
  "companyName": "company name or null",
  "appName": "the name they want for their AI interviewer",
  "interviewPurpose": "what the interviews are for",
  "targetAudience": "who will be interviewed",
  "interviewStyle": "unstructured|semi-structured|structured",
  "tone": "formal|professional|friendly|casual",
  "timeLimit": number in minutes or null,
  "outputsRequired": ["array of outputs they mentioned"],
  "keyTopics": ["main areas/topics to explore"],
  "keyQuestions": ["specific questions they want asked"],
  "constraints": ["things to avoid or handle carefully"],
  "summary": "A complete description of the AI interviewer to be created, written as instructions for the interviewer agent"
}

IMPORTANT:
- clientEmail is critical - look for any email address mentioned in the conversation
- appName defaults to "[companyName] Interviewer" if not explicitly stated
- Only include fields you can confidently extract from the conversation. If something wasn't discussed, use null or empty array.

The summary should be comprehensive enough to create an effective AI interviewer prompt.`;

/**
 * Extracts agent configuration from a voice conversation transcript
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || !Array.isArray(transcript)) {
      return NextResponse.json(
        { error: 'Transcript array required' },
        { status: 400 }
      );
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Anthropic API not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Join transcript into text
    const transcriptText = transcript.join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the transcript of the setup conversation:\n\n${transcriptText}\n\nExtract the agent configuration as JSON.`,
        },
      ],
    });

    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Parse JSON from response
    let config = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        config = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('Failed to parse extracted config');
    }

    // Generate a default summary if none exists
    if (config && !config.summary && config.interviewPurpose) {
      config.summary = generateSummary(config);
    }

    // Default app name if not provided
    if (config && !config.appName && config.companyName) {
      config.appName = `${config.companyName} Interviewer`;
    }

    return NextResponse.json({
      success: true,
      config,
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract configuration' },
      { status: 500 }
    );
  }
}

function generateSummary(config: any): string {
  const parts = [];

  if (config.interviewPurpose) {
    parts.push(`This AI interviewer conducts ${config.interviewPurpose} interviews.`);
  }

  if (config.targetAudience) {
    parts.push(`Target interviewees: ${config.targetAudience}.`);
  }

  if (config.interviewStyle) {
    const styles: Record<string, string> = {
      'unstructured': 'The interview style is exploratory and conversational, following the natural flow of discussion.',
      'semi-structured': 'The interview follows key topics but adapts based on responses.',
      'structured': 'The interview follows a consistent set of questions for comparability.',
    };
    parts.push(styles[config.interviewStyle] || '');
  }

  if (config.tone) {
    parts.push(`Maintain a ${config.tone} tone throughout.`);
  }

  if (config.timeLimit) {
    parts.push(`Target duration: ${config.timeLimit} minutes.`);
  }

  if (config.keyTopics && config.keyTopics.length > 0) {
    parts.push(`Key topics to explore: ${config.keyTopics.join(', ')}.`);
  }

  if (config.keyQuestions && config.keyQuestions.length > 0) {
    parts.push(`Specific questions to ask: ${config.keyQuestions.join('; ')}`);
  }

  if (config.constraints && config.constraints.length > 0) {
    parts.push(`Constraints: ${config.constraints.join('; ')}`);
  }

  if (config.outputsRequired && config.outputsRequired.length > 0) {
    parts.push(`Required outputs: ${config.outputsRequired.join(', ')}.`);
  }

  return parts.join('\n\n');
}
