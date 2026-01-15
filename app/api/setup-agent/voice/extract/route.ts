// app/api/setup-agent/voice/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, conversationId } = await request.json();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // Use Claude to extract the platform configuration from Sandra's conversation
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Extract the interview panel configuration from this setup conversation with Sandra. Return ONLY valid JSON matching this exact structure:

{
  "clientName": "string - the person's name",
  "companyName": "string - their company/organization name",
  "interviewPurpose": "string - what they want to learn/achieve",
  "targetAudience": "string - who they want to interview",
  "interviewStyle": "string - conversational, structured, or mixed",
  "tone": "string - professional, friendly, casual, etc.",
  "timeLimit": number or null - interview duration in minutes,
  "outputsRequired": ["array of strings - what deliverables they need"],
  "keyTopics": ["array of strings - main topics to cover"],
  "keyQuestions": ["array of strings - specific questions to ask"],
  "constraints": ["array of strings - any limitations or requirements"],
  "conversationComplete": true,
  "summary": "string - 2-3 sentence summary of what was configured"
}

For any fields not mentioned in the conversation, use reasonable defaults or null.
Set conversationComplete to true if enough information was gathered to create a basic interview panel.

Transcript:
${transcript}`
        }
      ],
    });

    // Parse Claude's response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to extract configuration from transcript' },
        { status: 422 }
      );
    }

    const config = JSON.parse(jsonMatch[0]);

    // Ensure conversationComplete is set
    if (config.conversationComplete === undefined) {
      config.conversationComplete = true;
    }

    return NextResponse.json({
      success: true,
      config,
      conversationId,
    });

  } catch (error) {
    console.error('Extract config error:', error);
    return NextResponse.json(
      { error: 'Failed to extract configuration' },
      { status: 500 }
    );
  }
}