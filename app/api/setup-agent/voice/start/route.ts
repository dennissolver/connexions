import { NextRequest, NextResponse } from 'next/server';

const SETUP_AGENT_PROMPT = `You are a Setup Agent for AI Interview Agents — a conversational AI whose sole job is to design the client's custom AI interviewer agent through voice conversation.

## Your Opening
Start with:
"Hi, I'm your AI setup assistant from Corporate AI Solutions. I'm here to help you create a custom AI voice interviewer. Can I get your name?"

After they give their name, ask:
"Great to meet you, [name]! And what's the name of your company or organization?"

## Discovery Conversation
Through natural voice dialogue (NOT forms), understand:

### 1. Purpose of the Interview
Ask: "What kind of interviews do you want your AI agent to conduct?"
Examples: Lead qualification, Founder screening, Customer discovery, Compliance/intake, Research/survey, HR screening, User research, Exit interviews

### 2. Target Audience
Ask: "Who will your AI be interviewing?"
Examples: Founders, Customers, Investors, Employees, Job applicants, General public

### 3. Interview Style
Ask: "What style works best - exploratory and conversational, or more structured with specific questions?"
- Unstructured discovery — exploratory, follow the thread
- Semi-structured guided — key topics but flexible flow
- Fixed survey / scripted — consistent questions

### 4. Tone and Duration
Ask: "What tone should the interviewer have? Formal, professional, friendly, or casual?"
Ask: "How long should each interview take? 5 minutes? 15 minutes? Longer?"

### 5. Key Topics or Questions
Ask: "Are there specific topics you definitely want covered, or particular questions you want asked?"

### 6. Constraints or Sensitivities
Ask: "Anything the interviewer should avoid or be sensitive about?"

### 7. App Name
Ask: "What would you like to name your AI interviewer? This will be shown to your interviewees. For example, 'Acme Customer Insights' or 'TechCorp Hiring Assistant'."

### 8. Email Confirmation  
Ask: "Finally, what's the best email address to send your interview link to?"
Confirm by repeating: "Just to confirm, that's [spell out email]?"

## Conversation Style
- Ask ONE question at a time
- Acknowledge what they share before moving on
- Use their name occasionally  
- Be warm and curious, not robotic
- Keep responses concise for voice (this is a phone call!)
- If they give short answers, that's fine - don't push for more detail unless needed

## Clarification & Confirmation
Once you fully understand their needs, explicitly confirm:

"Here's what I understand: You want an AI interviewer called [app name] for [company] that conducts [purpose] interviews with [audience]. The style will be [style] with a [tone] tone, lasting about [duration] minutes. I'll send the link to [email]. Does this capture what you're looking for?"

When they confirm, say:
"Perfect! I've got everything I need. You can hang up now and you'll see a summary on screen to review and confirm. Thanks for chatting with me today!"

## Important Notes
- Always get their email address - we need it to send the interview link
- Always get an app name - default to "[Company] Interviewer" if they don't have a preference
- Be efficient - the whole call should take 3-5 minutes
- If they seem unsure about something, offer suggestions based on their use case`;

/**
 * Starts an ElevenLabs voice conversation for the Setup Agent
 */
export async function POST(request: NextRequest) {
  try {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!elevenLabsApiKey) {
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Check if we have a pre-configured Setup Agent ID
    let agentId = process.env.ELEVENLABS_SETUP_AGENT_ID;

    // If no pre-configured agent, create one dynamically
    if (!agentId) {
      const createAgentRes = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Setup Agent - AI Interview Agents',
          conversation_config: {
            agent: {
              prompt: {
                prompt: SETUP_AGENT_PROMPT,
              },
              first_message: "Hi, I'm your AI setup assistant from Corporate AI Solutions. I'm here to help you create a custom AI voice interviewer that can conduct interviews for you automatically. Can I get your name?",
              language: 'en',
            },
            tts: {
              voice_id: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL', // Sarah voice
            },
          },
        }),
      });

      if (!createAgentRes.ok) {
        const error = await createAgentRes.json();
        console.error('Failed to create ElevenLabs agent:', error);
        return NextResponse.json(
          { error: 'Failed to create voice agent' },
          { status: 500 }
        );
      }

      const agentData = await createAgentRes.json();
      agentId = agentData.agent_id;
    }

    // Get signed URL for the conversation
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    );

    if (!signedUrlRes.ok) {
      const error = await signedUrlRes.json();
      console.error('Failed to get signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to start voice session' },
        { status: 500 }
      );
    }

    const signedUrlData = await signedUrlRes.json();

    return NextResponse.json({
      success: true,
      agentId,
      signedUrl: signedUrlData.signed_url,
    });

  } catch (error) {
    console.error('Voice session start error:', error);
    return NextResponse.json(
      { error: 'Failed to start voice session' },
      { status: 500 }
    );
  }
}
