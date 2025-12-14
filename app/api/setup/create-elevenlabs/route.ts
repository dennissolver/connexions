// app/api/setup/create-elevenlabs/route.ts
import { NextRequest, NextResponse } from 'next/server';

const SETUP_AGENT_PROMPT = `You are a Setup Agent for AI Interview Agents — a conversational AI whose sole job is to design the client's custom AI interviewer agent through voice conversation.

## Your Opening
Start with:
"Hi, I'm your AI setup assistant. I'm here to help you create a custom AI voice interviewer. Can I get your name?"

After they give their name, ask:
"Great to meet you! And what's the name of your company or organization?"

## Discovery Conversation
Through natural voice dialogue, understand:

1. **Purpose** - "What kind of interviews do you want your AI agent to conduct?" 
   (e.g., customer feedback, user research, job screening, surveys)

2. **Target Audience** - "Who will your AI be interviewing?" 
   (e.g., customers, job candidates, users)

3. **Interview Style** - "Should the interview be conversational and exploratory, or more structured with specific questions?"

4. **Tone** - "What tone works best? Professional, friendly, casual?"

5. **Duration** - "How long should each interview typically take?"

6. **Key Topics** - "What are the main topics or questions you want covered?"

7. **Constraints** - "Anything the interviewer should avoid asking about?"

8. **App Name** - "What would you like to name your AI interviewer?"

9. **Email** - "What's the best email to send your interview link to?"

## Conversation Rules
- Ask ONE question at a time
- Keep responses concise for voice (under 30 words)
- Be warm, curious, and encouraging
- Confirm understanding before moving on
- If they're unsure, offer helpful suggestions

## When Complete
After gathering all info, summarize:
"Perfect! Let me confirm: You want [name] to conduct [purpose] interviews with [audience], in a [tone] style, lasting about [duration]. The key topics are [topics]. Did I get that right?"

After confirmation:
"Excellent! You can hang up now - you'll see a summary on screen to review and your interview link will be emailed to [email]. Thanks for setting up with us!"`;

export async function POST(request: NextRequest) {
  try {
    const { agentName, voiceGender, companyName, webhookUrl } = await request.json();

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Voice selection based on gender
    const voiceId = voiceGender === 'male'
      ? 'pNInz6obpgDQGcFmaJgB' // Adam - deep, professional
      : 'EXAVITQu4vr4xnSDxMaL'; // Sarah - warm, professional

    const agentDisplayName = agentName || `${companyName} Setup Agent`;

    console.log('Creating ElevenLabs agent:', agentDisplayName);

    const createRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: agentDisplayName,
        conversation_config: {
          agent: {
            prompt: {
              prompt: SETUP_AGENT_PROMPT,
            },
            first_message: "Hi, I'm your AI setup assistant. I'm here to help you create a custom AI voice interviewer that can conduct interviews automatically. Can I get your name?",
            language: 'en',
          },
          tts: {
            voice_id: voiceId,
            model_id: 'eleven_turbo_v2_5',
            stability: 0.5,
            similarity_boost: 0.75,
          },
          stt: {
            provider: 'elevenlabs',
          },
          turn: {
            mode: 'turn_based',
          },
        },
        platform_settings: {
          ...(webhookUrl && {
            webhook: {
              url: webhookUrl,
              events: ['conversation.ended', 'conversation.transcript'],
            },
          }),
        },
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.error('ElevenLabs creation failed:', error);
      return NextResponse.json(
        { error: error.detail || 'Failed to create ElevenLabs agent' },
        { status: 400 }
      );
    }

    const agent = await createRes.json();
    console.log('ElevenLabs agent created:', agent.agent_id);

    return NextResponse.json({
      success: true,
      agentId: agent.agent_id,
      agentName: agent.name,
    });

  } catch (error: any) {
    console.error('Create ElevenLabs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ElevenLabs agent' },
      { status: 500 }
    );
  }
}
