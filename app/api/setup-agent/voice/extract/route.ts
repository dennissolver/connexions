// app/api/setup-agent/voice/extract/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { transcript, conversationId } = await request.json();

    if (!transcript) {
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
          content: `Extract the platform configuration from this setup conversation transcript. Return ONLY valid JSON with these fields:

{
  "platformName": "string - the name of their platform/company",
  "platformSlug": "string - URL-friendly version (lowercase, hyphens)",
  "adminEmail": "string - their email address",
  "adminName": "string - their name",
  "primaryColor": "string - hex color or null",
  "description": "string - brief description of what they're building",
  "agentType": "string - 'interview' | 'survey' | 'feedback' | 'screening'",
  "voicePreference": "string - 'male' | 'female' | null"
}

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