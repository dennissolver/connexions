// app/api/extract-setup-data/route.ts
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

    console.log('[extract-setup-data] Processing transcript for conversation:', conversationId);

    // Use Claude to extract structured data from the conversation
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: `Extract structured setup data from this conversation transcript with Sandra (the AI setup assistant). Return ONLY valid JSON matching this exact structure:

{
  "extracted_data": {
    "company_name": "string or null",
    "contact_name": "string or null",
    "company_email": "string or null - must be valid email format",
    "company_website": "string or null - should include https://",
    "agent_name": "string or null - the name of the AI interviewer",
    "agent_role": "string or null - e.g., UX Researcher, HR Recruiter",
    "interview_purpose": "string or null - what they want to learn",
    "target_audience": "string or null - who they want to interview",
    "interview_style": "structured | conversational | mixed | null",
    "tone": "professional | friendly | casual | formal | null",
    "duration_minutes": number or null,
    "key_topics": ["array of topic strings"] or [],
    "key_questions": ["array of question strings"] or [],
    "notification_email": "string or null - email for notifications",
    "constraints": "string or null - topics to avoid",
    "voice_gender": "female | male | null"
  },
  "validation": {
    "is_complete": boolean,
    "missing_fields": ["array of field names that are missing but required"],
    "invalid_fields": ["array of field names with invalid values"],
    "field_errors": {
      "field_name": "error description"
    },
    "confidence_score": number between 0 and 1
  },
  "corrections_made": [
    {
      "original": "what the user said",
      "corrected": "normalized/corrected value",
      "reason": "why it was corrected"
    }
  ]
}

Required fields for validation: company_name, contact_name, company_email, agent_name, interview_purpose, target_audience, interview_style, tone, duration_minutes, key_topics (min 3), key_questions (min 3), notification_email

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
      console.error('[extract-setup-data] No JSON found in response');
      return NextResponse.json(
        {
          error: 'Failed to extract data from transcript',
          extracted_data: {},
          validation: {
            is_complete: false,
            missing_fields: ['company_name', 'contact_name', 'company_email', 'agent_name', 'interview_purpose', 'target_audience', 'interview_style', 'tone', 'duration_minutes', 'key_topics', 'key_questions', 'notification_email'],
            invalid_fields: [],
            field_errors: {},
          },
          corrections_made: [],
        },
        { status: 200 } // Return 200 with empty data so UI can handle
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    console.log('[extract-setup-data] Extracted data:', JSON.stringify(result.extracted_data, null, 2));

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[extract-setup-data] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to extract setup data',
        extracted_data: {},
        validation: {
          is_complete: false,
          missing_fields: [],
          invalid_fields: [],
          field_errors: {},
        },
        corrections_made: [],
      },
      { status: 200 } // Return 200 so UI doesn't break
    );
  }
}