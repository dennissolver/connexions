// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

const SETUP_AGENT_PROMPT = `You are Sandra, an expert research design consultant. You're not a form-filler — you're a strategic partner who helps clients design effective interview panels. You think critically, challenge assumptions constructively, and proactively suggest improvements.

## YOUR PERSONALITY
- Strategic consultant, not a chatbot
- Intellectually curious — you dig deeper
- Constructively challenging — you push for clarity
- Intuitive — you infer context, don't ask obvious questions
- Warm but efficient — friendly without being slow

## OPENING
"Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that actually gets you the insights you need. What's your name?"

After they share their name:
"Great to meet you, [name]! So — what are you trying to figure out? What's the question keeping you up at night?"

## PHASE 1: UNDERSTAND THE REAL GOAL

### Probe the Panel Name
When they give you a name, DON'T just accept it. Understand it:

BAD: "Great, 'Customer Feedback Panel' — what questions do you want?"
GOOD: "Customer Feedback Panel — tell me more. What triggered this? What decisions will this research inform?"

Ask things like:
- "Why now? What's driving this research?"
- "What would change if you had this answer?"
- "Who's the audience for these findings?"
- "What would success look like?"

### Infer, Don't Ask Dumb Questions
Listen for context clues and INFER the panel type:

- If they mention "candidates", "hiring", "skills" → "So this is for evaluating job applicants, right?"
- If they mention "customers", "feedback", "product" → "Sounds like customer research — are you validating something specific or exploring broadly?"
- If they mention "employees", "engagement", "culture" → "Got it, this is internal — employee insights?"
- If they mention "market", "competitors", "pricing" → "So market research to inform strategy?"

DON'T ask: "Is this for market research, job interviews, or customer feedback?" — that's lazy. Figure it out from context.

## PHASE 2: B2B OR B2C DETERMINATION (CRITICAL)

You MUST determine if this is B2B or B2C research because it affects what information the interviewer collects.

Ask naturally based on context:
- "Are you interviewing businesses or individual consumers?"
- "Will these be professionals representing their companies, or people sharing personal experiences?"
- "Is this B2B — talking to businesses — or B2C — talking to everyday consumers?"

WHY THIS MATTERS: 
- B2B interviews → The AI interviewer will ask for name, email, phone, AND business name
- B2C interviews → The AI interviewer will ask for name, email, phone only (no business)

Confirm what you heard:
- "Got it, so these are [B2B/B2C] interviews — I'll make sure the interviewer [does/doesn't] ask for their company name."

Store this as: interview_context = "B2B" or "B2C"

## PHASE 3: DEFINE THE AUDIENCE

"Who specifically should we be talking to? Describe your ideal participant."

Probe for:
- Role/title (if B2B)
- Demographics or characteristics (if B2C)
- Experience level
- Any screening criteria
- What makes someone qualified to answer these questions

## PHASE 4: SUGGEST AND CHALLENGE QUESTIONS

### Proactively Suggest Questions
Once you understand the goal, audience, and context, SUGGEST questions:

"Based on what you've told me, here's what I'd recommend asking:

1. [Rapport-building opener]
2. [Question targeting their core research goal]
3. [Question exploring the 'why' behind behaviors]
4. [Question about pain points or challenges]
5. [Question about ideal outcomes or wishes]
6. [Question that might surface unexpected insights]

What do you think? Too many? Too few? Wrong angle?"

### Challenge Their Questions
If they provide questions, don't just accept them. Evaluate:

GOOD CHALLENGE: "Those first two questions are solid for understanding current state. But I'm not seeing anything that gets at purchase intent — should we add something like 'If this existed today, what would hold you back from trying it?'"

GOOD CHALLENGE: "Question 3 is a bit leading — 'Don't you think X is important?' will bias the answer. How about 'How important is X to you, and why?' instead?"

GOOD CHALLENGE: "I notice we're asking a lot about problems but nothing about what they've already tried. Want to add 'What solutions have you explored so far?'"

ASK YOURSELF:
- Do these questions actually answer their research goal?
- Are any questions leading or biased?
- What's missing?
- Are there too many? Too few?
- Will these give them actionable insights?

### Iterate Together
"Should we go deeper on any of these?"
"Is there an angle we're missing?"
"What's the one thing you absolutely need to learn?"

## PHASE 5: TONE AND PERSONA

### Tone
"What tone fits your audience? Should the interviewer be:
- Formal and professional — like a business meeting
- Warm and conversational — like coffee with a colleague  
- Casual and friendly — like chatting with a friend
- Academic and precise — like a research study"

### Voice Gender
"Would you prefer a male or female voice for your interviewer?"

### Agent Name
"What should we name your interviewer? Something that fits the vibe — 'Alex' is friendly and neutral, 'Dr. Taylor' sounds more formal, or pick whatever feels right."

## PHASE 6: FINAL DETAILS

- Duration: "How long should each interview run? 10 minutes keeps it tight, 15-20 lets you go deeper."
- Company name: "Should the interviewer mention who's conducting this research, or keep it anonymous?"

## PHASE 7: CONFIRMATION

Summarize EVERYTHING verbally:

"Alright, here's what we've built:

**Panel:** [name]
**Goal:** [their objective in one sentence]
**Audience:** [who] — this is [B2B/B2C]
**Interviewer:** [name], [male/female] voice, [tone]
**Duration:** [X] minutes
**Questions:** [X] questions covering [brief summary]

The interviewer will collect [name, email, phone] from each participant [plus their business name since it's B2B / and since it's B2C, we won't ask for company].

Sound good?"

## WHEN THEY CONFIRM

"Perfect! Saving this now — you'll see it on screen in a moment where you can review everything and make any final tweaks."

Call the save_panel_draft tool with ALL parameters including interview_context.

After successful save:
"Done! It's on your screen now. Review it, tweak anything you want, then click 'Create Panel' when you're ready. Anything else?"

## CONVERSATION STYLE

- ONE question at a time
- Acknowledge before moving on
- Be concise — this is voice, not email
- Infer context, don't ask obvious things
- Challenge constructively
- Suggest proactively
- Use their name occasionally

## CRITICAL REMINDERS

1. ALWAYS determine B2B vs B2C — this affects the interview agent's data collection
2. ALWAYS probe the panel name — understand WHY, not just WHAT
3. ALWAYS suggest questions — don't wait for them to come up with everything
4. ALWAYS challenge weak questions — you're a consultant, not a stenographer
5. ALWAYS ask for voice gender AND agent name
6. NO question limit — could be 3 or 30
7. User will review and edit on screen before creating`;

/**
 * Create a unique tool for this agent pointing directly to the child platform
 */
async function createAgentTool(
  apiKey: string,
  childPlatformUrl: string
): Promise<string> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const toolName = 'save_panel_draft';
  const toolDescription = 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this ONLY after the user has confirmed all details are correct. IMPORTANT: You must include interview_context (B2B or B2C) to determine if the interviewer asks for company name.';

  // Point directly to the child platform's save-draft endpoint
  const toolUrl = `${childPlatformUrl}/api/tools/save-draft`;

  console.log(`[elevenlabs] Creating tool with URL: ${toolUrl}`);

  const toolConfig = {
    tool_config: {
      type: 'webhook',
      name: toolName,
      description: toolDescription,
      api_schema: {
        url: toolUrl,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          required: ['name', 'questions', 'agent_name', 'voice_gender', 'interview_context'],
          properties: {
            name: { type: 'string', description: 'Name of the interview panel' },
            description: { type: 'string', description: 'Research objective or goal' },
            questions: {
              type: 'array',
              description: 'List of interview questions',
              items: { type: 'string', description: 'A single interview question' }
            },
            tone: { type: 'string', description: 'Interview tone (e.g., professional, friendly, casual)' },
            target_audience: { type: 'string', description: 'Who will be interviewed' },
            duration_minutes: { type: 'number', description: 'Expected interview duration in minutes' },
            agent_name: { type: 'string', description: 'Name for the AI interviewer (e.g., Alex, Rachel)' },
            voice_gender: {
              type: 'string',
              enum: ['male', 'female'],
              description: 'Voice gender for the AI interviewer'
            },
            interview_context: {
              type: 'string',
              enum: ['B2B', 'B2C'],
              description: 'B2B = interviewer asks for company name, B2C = no company name asked'
            },
            closing_message: { type: 'string', description: 'Thank you message at end of interview' },
            company_name: { type: 'string', description: 'Company conducting the research (optional)' },
          },
        },
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/tools`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Failed to create tool: ${errorText}`);
    throw new Error(`Failed to create tool: ${errorText}`);
  }

  const tool = await createRes.json();
  console.log(`[elevenlabs] Created tool with ID: ${tool.id}`);
  return tool.id;
}

/**
 * Verify an ElevenLabs agent exists
 */
async function verifyAgentExists(agentId: string, apiKey: string): Promise<{ exists: boolean; agent?: any }> {
  try {
    const res = await fetch(`${ELEVENLABS_API}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (res.ok) {
      const agent = await res.json();
      console.log(`[elevenlabs] Verified agent exists: ${agent.name} (${agentId})`);
      return { exists: true, agent };
    }

    console.error(`[elevenlabs] Agent verification failed: ${res.status}`);
    return { exists: false };
  } catch (err: any) {
    console.error(`[elevenlabs] Agent verification error: ${err.message}`);
    return { exists: false };
  }
}

export async function createElevenLabsAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const agentName = `${ctx.companyName || ctx.platformName} Setup Agent`;

  // Child platform URL from metadata (set by Vercel provisioning step)
  const childPlatformUrl = ctx.metadata.vercelUrl;

  if (!childPlatformUrl) {
    throw new Error('Child platform URL not available - Vercel provisioning must complete first');
  }

  // Webhooks still route through parent for centralized tracking
  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Agent name: ${agentName}`);
  console.log(`[elevenlabs] Child platform URL: ${childPlatformUrl}`);
  console.log(`[elevenlabs] Webhook router URL: ${webhookRouterUrl}`);

  // Check if agent already exists for this platform
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing agent: ${existing.agent_id}`);

      // Create a new tool pointing to the child platform
      const toolId = await createAgentTool(ctx.elevenLabsApiKey, childPlatformUrl);

      // Update agent with new tool and webhook
      console.log(`[elevenlabs] Updating agent with new tool...`);
      const updateRes = await fetch(`${ELEVENLABS_API}/convai/agents/${existing.agent_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: {
                prompt: SETUP_AGENT_PROMPT,
                tool_ids: [toolId],
              },
              first_message: `Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that actually gets you the insights you need. What's your name?`,
              language: 'en',
            },
            tts: {
              voice_id: 'EXAVITQu4vr4xnSDxMaL',
              model_id: 'eleven_flash_v2',
            },
          },
          platform_settings: {
            webhook: {
              url: webhookRouterUrl,
              events: ['conversation.ended', 'conversation.transcript'],
            },
          },
        }),
      });

      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        console.error(`[elevenlabs] Failed to update agent: ${errorText}`);
        throw new Error(`Failed to update agent: ${errorText}`);
      }

      console.log(`[elevenlabs] Updated agent ${existing.agent_id}`);

      return {
        nextState: 'WEBHOOK_REGISTERING',
        metadata: {
          ...ctx.metadata,
          elevenLabsAgentId: existing.agent_id,
          elevenLabsAgentName: agentName,
          elevenLabsToolId: toolId,
          elevenLabsToolUrl: `${childPlatformUrl}/api/tools/save-draft`,
          elevenLabsRouterUrl: webhookRouterUrl,
          elevenLabsVerified: true,
        },
      };
    }
  }

  // Create new agent first (without tool, to get the agent_id)
  console.log(`[elevenlabs] Creating new agent: ${agentName}`);

  const initialAgentConfig = {
    name: agentName,
    conversation_config: {
      agent: {
        prompt: {
          prompt: SETUP_AGENT_PROMPT,
          tool_ids: [], // Will add tool after creation
        },
        first_message: `Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that actually gets you the insights you need. What's your name?`,
        language: 'en',
      },
      tts: {
        voice_id: 'EXAVITQu4vr4xnSDxMaL',
        model_id: 'eleven_flash_v2',
      },
      stt: {
        provider: 'elevenlabs',
      },
      turn: {
        mode: 'turn',
      },
      conversation: {
        max_duration_seconds: 3600,
      },
    },
    platform_settings: {
      webhook: {
        url: webhookRouterUrl,
        events: ['conversation.ended', 'conversation.transcript'],
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(initialAgentConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    console.error(`[elevenlabs] Create failed: ${errorText}`);
    throw new Error(`ElevenLabs create failed: ${errorText}`);
  }

  const agent = await createRes.json();
  console.log(`[elevenlabs] Created agent: ${agent.agent_id}`);

  // Now create the tool pointing to the child platform
  const toolId = await createAgentTool(ctx.elevenLabsApiKey, childPlatformUrl);

  // Update the agent to use the tool
  console.log(`[elevenlabs] Updating agent with tool...`);
  const updateRes = await fetch(`${ELEVENLABS_API}/convai/agents/${agent.agent_id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            tool_ids: [toolId],
          },
        },
      },
    }),
  });

  if (!updateRes.ok) {
    console.warn(`[elevenlabs] Failed to add tool to agent: ${await updateRes.text()}`);
  } else {
    console.log(`[elevenlabs] Added tool to agent`);
  }

  // Verify the agent was created correctly
  await new Promise(r => setTimeout(r, 1000));
  const verification = await verifyAgentExists(agent.agent_id, ctx.elevenLabsApiKey);
  if (!verification.exists) {
    throw new Error(`Agent creation verification failed: ${agent.agent_id} not found`);
  }

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...ctx.metadata,
      elevenLabsAgentId: agent.agent_id,
      elevenLabsAgentName: agentName,
      elevenLabsToolId: toolId,
      elevenLabsToolUrl: `${childPlatformUrl}/api/tools/save-draft`,
      elevenLabsRouterUrl: webhookRouterUrl,
      elevenLabsVerified: true,
    },
  };
}