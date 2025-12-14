// @ts-nocheck
// app/api/extract-setup-data/route.ts
// Layer 2: Extract structured data from voice transcript using Claude

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { REQUIRED_FIELDS, OPTIONAL_FIELDS } from '@/lib/prompts/setup-agent';

const EXTRACTION_PROMPT = `You are a data extraction expert. Extract structured setup data from this voice conversation transcript.

IMPORTANT: The transcript is from a voice call, so there may be:
- Misspellings from speech-to-text
- "dot" instead of "."
- "at" instead of "@"  
- Phonetic spellings like "B as in Bravo"
- Numbers as words

Your job is to:
1. Extract ALL fields mentioned in the conversation
2. Normalize the data (e.g., "acme dot com" → "acme.com")
3. Fix obvious speech-to-text errors
4. Return clean, validated JSON

REQUIRED FIELDS (all must be present):
- company_name: string
- contact_name: string  
- company_email: string (valid email format)
- company_website: string (valid URL, add https:// if missing)
- agent_name: string
- agent_role: string (the professional role/persona, e.g., "UX Researcher", "Detective Inspector", "HR Recruiter")
- interview_purpose: string
- target_audience: string
- interview_style: "structured" | "conversational" | "mixed"
- tone: "professional" | "friendly" | "casual" | "formal"
- duration_minutes: 5 | 10 | 15 | 20 | 30
- key_topics: string[] (minimum 3)
- key_questions: string[] (minimum 3)
- notification_email: string (valid email format)

OPTIONAL FIELDS:
- constraints: string (topics to avoid)
- voice_gender: "male" | "female"

RESPONSE FORMAT:
Return ONLY valid JSON with this structure:
{
  "extracted_data": {
    // all fields here
  },
  "validation": {
    "is_complete": boolean,
    "missing_fields": string[],
    "invalid_fields": string[],
    "warnings": string[],
    "confidence_score": number (0-100)
  },
  "corrections_made": [
    {"original": "...", "corrected": "...", "reason": "..."}
  ]
}

NORMALIZATION RULES:
- Emails: "john at acme dot com" → "john@acme.com"
- URLs: "acme dot com" → "https://acme.com"
- Phonetics: "B as in Bravo" → just use "B"
- Numbers: "fifteen" → 15
- Duration: "ten minutes" → 10
- Style: "conversation style" → "conversational"
- Tone: "professional and friendly" → pick primary: "professional"`;

export async function POST(request: NextRequest) {
  try {
    const { transcript, conversationId } = await request.json();

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

    // Extract data using Claude
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Extract setup data from this transcript:\n\n${transcript}`,
        },
      ],
      system: EXTRACTION_PROMPT,
    });

    const responseText = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Parse the JSON response
    let extractedResult;
    try {
      // Find JSON in response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse extraction result:', parseError);
      return NextResponse.json({
        error: 'Failed to parse extracted data',
        raw_response: responseText,
      }, { status: 500 });
    }

    // Additional validation
    const validation = validateExtractedData(extractedResult.extracted_data);
    
    // Merge our validation with Claude's
    const finalValidation = {
      ...extractedResult.validation,
      ...validation,
      missing_fields: [...new Set([
        ...(extractedResult.validation?.missing_fields || []),
        ...validation.missing_fields,
      ])],
      invalid_fields: [...new Set([
        ...(extractedResult.validation?.invalid_fields || []),
        ...validation.invalid_fields,
      ])],
    };

    return NextResponse.json({
      success: true,
      extracted_data: extractedResult.extracted_data,
      validation: finalValidation,
      corrections_made: extractedResult.corrections_made || [],
      ready_to_build: finalValidation.is_complete && finalValidation.invalid_fields.length === 0,
    });

  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Extraction failed' },
      { status: 500 }
    );
  }
}

function validateExtractedData(data: any): {
  is_complete: boolean;
  missing_fields: string[];
  invalid_fields: string[];
  field_errors: Record<string, string>;
} {
  const missing: string[] = [];
  const invalid: string[] = [];
  const errors: Record<string, string> = {};

  if (!data) {
    return {
      is_complete: false,
      missing_fields: Object.keys(REQUIRED_FIELDS),
      invalid_fields: [],
      field_errors: { _general: 'No data extracted' },
    };
  }

  // Check required fields
  for (const [field, rules] of Object.entries(REQUIRED_FIELDS)) {
    const value = data[field];

    // Check if missing
    if (value === undefined || value === null || value === '') {
      missing.push(field);
      continue;
    }

    // Validate by type
    switch (rules.type) {
      case 'email':
        if (!isValidEmail(value)) {
          invalid.push(field);
          errors[field] = `Invalid email format: ${value}`;
        }
        break;

      case 'url':
        if (!isValidUrl(value)) {
          invalid.push(field);
          errors[field] = `Invalid URL format: ${value}`;
        }
        break;

      case 'enum':
          if (!(rules.values as readonly (string | number)[]).includes(value)) {
          invalid.push(field);
          errors[field] = `Must be one of: ${rules.values.join(', ')}`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          invalid.push(field);
          errors[field] = 'Must be an array';
        } else if (value.length < (rules.min || 0)) {
          invalid.push(field);
          errors[field] = `Need at least ${rules.min} items, got ${value.length}`;
        }
        break;

      case 'string':
        if (typeof value !== 'string' || value.length < (rules.min || 0)) {
          invalid.push(field);
          errors[field] = `Must be at least ${rules.min} characters`;
        }
        break;
    }
  }

  return {
    is_complete: missing.length === 0,
    missing_fields: missing,
    invalid_fields: invalid,
    field_errors: errors,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url: string): boolean {
  // Accept with or without protocol
  if (!url.includes('.')) return false;
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`;
    new URL(withProtocol);
    return true;
  } catch {
    return false;
  }
}
