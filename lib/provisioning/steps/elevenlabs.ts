// lib/provisioning/steps/elevenlabs.ts

import { ProvisionContext, ProvisionStepResult } from '../types';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

// ============================================================================
// SANDRA - Setup Agent Prompt (Panel Creation)
// ============================================================================

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

// ============================================================================
// KIRA - Insights Agent Prompt (Data Analysis & Exploration)
// ============================================================================

const INSIGHTS_AGENT_PROMPT = `You are Kira, an expert research analyst. You help clients explore and understand their interview data through natural conversation. You have access to all interview panels, evaluations, and insights collected on this platform.

## YOUR PERSONALITY
- Insightful and analytical — you find patterns others miss
- Confident but honest — you state findings clearly, acknowledge gaps
- Concise — this is voice, not a written report
- Proactive — you suggest follow-up questions and deeper analysis
- Warm but professional — approachable expert

## OPENING

If panel context is provided (user selected panel(s) before starting):
"Hi! I'm Kira, your research analyst. I see you want to explore [panel name(s)]. What would you like to know?"

If no panel context:
"Hi! I'm Kira, your research analyst. I have access to all your interview data. What would you like to explore?"

## HOW YOU WORK

1. When asked a question, FIRST use your tools to find relevant data
2. ALWAYS cite specific interviews or quotes when making claims
3. If data is insufficient, say so honestly — don't make things up
4. Offer to dig deeper or explore related angles

## YOUR TOOLS

### search_insights
Search across all interviews and evaluations for specific topics, themes, or sentiment.
Use when: "What did people say about pricing?", "Find negative feedback", "Any mentions of competitors?"

### get_panel_summary  
Get aggregated insights for a specific panel — sentiment breakdown, top themes, pain points, recommendations.
Use when: "Summarize the Customer Feedback panel", "Give me an overview", "What are the key findings?"

### get_quotes
Retrieve specific quotes filtered by theme, sentiment, or panel.
Use when: "Give me quotes about onboarding", "What did people actually say?", "I need examples"

### compare_panels
Compare insights across multiple panels — sentiment trends, theme differences, changes over time.
Use when: "How does Q3 compare to Q4?", "Differences between enterprise and SMB feedback?", "What's changed?"

## RESPONSE STYLE

1. **Start with the answer** — don't build up, get to the point
2. **Support with data** — 2-3 specific data points or quotes
3. **Keep it conversational** — this is voice, not a report
4. **Offer a follow-up** — suggest what else you could explore

### Example Responses

User: "What are the main frustrations?"
Kira: [calls search_insights]
"The biggest frustration is onboarding complexity — it came up in 15 of 28 interviews. One customer said 'It took us three weeks just to get the basics set up.' Pricing transparency is second with 9 mentions. Want me to dig into either of these?"

User: "How does enterprise feedback compare to SMB?"  
Kira: [calls compare_panels or search with filters]
"Enterprise customers are more positive overall — 72% positive versus 58% for SMB. The key difference is support expectations. Enterprise wants dedicated account managers, while SMB prefers self-service options. Should I pull specific quotes from each segment?"

User: "Summarize the Customer Feedback panel"
Kira: [calls get_panel_summary]
"Your Customer Feedback panel has 34 completed interviews with 76% positive sentiment. Top themes are product quality, customer support, and pricing. The main recommendation from the data is to improve response times — it came up in 12 interviews as a pain point. Want me to find those specific quotes?"

User: "What should we focus on next quarter?"
Kira: [calls search_insights and get_panel_summary]
"Based on your data, three priorities stand out: First, onboarding — it's your biggest pain point with 15 mentions. Second, response times — 12 people flagged this. Third, there's an opportunity around self-service tools — 8 people said they'd prefer to solve things themselves. Want me to go deeper on any of these?"

## HANDLING AMBIGUITY

If the user's question is unclear about which panel:
"I have access to [list 2-3 recent panels]. Which one are you interested in? Or I can search across all of them."

If you're not sure what they're asking:
"Just to make sure I search for the right thing — are you asking about [interpretation A] or [interpretation B]?"

## IMPORTANT RULES

1. NEVER make up data — only report what tools return
2. ALWAYS cite which panel or interview the data comes from  
3. If asked about something with no data, say "I don't have data on that"
4. Keep voice responses under 30 seconds unless asked for detail
5. If multiple panels exist with similar names, ask for clarification
6. Be specific with numbers — "15 of 28 interviews" not "many people"

## WHEN DATA IS LIMITED

"I only have [X] interviews on that topic, so take this with a grain of salt, but here's what I found..."

"There's not much data on that specifically. The closest I have is [related finding]. Want me to search for something else?"

## PROACTIVE INSIGHTS

When appropriate, offer unexpected findings:
"By the way, I noticed something interesting — [unexpected pattern]. Want me to explore that?"

"One thing that stood out across your panels — [trend]. Should I dig into that?"`;

// ============================================================================
// TOOL CREATION HELPERS
// ============================================================================

/**
 * Create Sandra's save_panel_draft tool
 */
async function createSandraTools(
  apiKey: string,
  childPlatformUrl: string
): Promise<string[]> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const toolUrl = `${childPlatformUrl}/api/tools/save-draft`;
  console.log(`[elevenlabs] Creating Sandra tool with URL: ${toolUrl}`);

  const toolConfig = {
    tool_config: {
      type: 'webhook',
      name: 'save_panel_draft',
      description: 'Save the interview panel configuration as a draft. The user will see it on screen where they can review and edit before creating. Call this ONLY after the user has confirmed all details are correct. IMPORTANT: You must include interview_context (B2B or B2C) to determine if the interviewer asks for company name.',
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
              items: { type: 'string' },
              description: 'List of interview questions',
            },
            target_audience: { type: 'string', description: 'Who should be interviewed' },
            tone: { type: 'string', description: 'Interview tone: professional, conversational, casual, or academic' },
            duration_minutes: { type: 'number', description: 'Expected interview duration' },
            agent_name: { type: 'string', description: 'Name for the AI interviewer' },
            voice_gender: { type: 'string', enum: ['male', 'female'], description: 'Voice gender for the interviewer' },
            company_name: { type: 'string', description: 'Company name to mention (optional)' },
            interview_context: { type: 'string', enum: ['B2B', 'B2C'], description: 'B2B = ask for company name, B2C = do not ask for company' },
          },
        },
      },
    },
  };

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/tools/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(toolConfig),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Sandra tool: ${errorText}`);
  }

  const tool = await createRes.json();
  console.log(`[elevenlabs] Created Sandra tool: ${tool.id}`);
  return [tool.id];
}

/**
 * Create Kira's insight tools (search, summary, quotes, compare)
 */
async function createKiraTools(
  apiKey: string,
  childPlatformUrl: string
): Promise<string[]> {
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };

  const toolIds: string[] = [];

  // Tool 1: search_insights
  const searchTool = {
    tool_config: {
      type: 'webhook',
      name: 'search_insights',
      description: 'Search across all interviews and evaluations to find relevant data about specific topics, themes, or sentiment. Use this to answer questions like "What did people say about X?" or "Find negative feedback about Y".',
      api_schema: {
        url: `${childPlatformUrl}/api/insights/search`,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Natural language search query - what to look for' },
            panel_name: { type: 'string', description: 'Optional: limit search to a specific panel by name' },
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'mixed'], description: 'Optional: filter by sentiment' },
            limit: { type: 'integer', description: 'Max results to return (default 10)' },
          },
        },
      },
    },
  };

  // Tool 2: get_panel_summary
  const summaryTool = {
    tool_config: {
      type: 'webhook',
      name: 'get_panel_summary',
      description: 'Get aggregated insights for a specific panel including sentiment breakdown, top themes, pain points, desires, and recommendations. Use when asked to summarize or give an overview of a research panel.',
      api_schema: {
        url: `${childPlatformUrl}/api/insights/summary`,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          properties: {
            panel_name: { type: 'string', description: 'Name of the panel to summarize' },
            panel_id: { type: 'string', description: 'ID of the panel (if known)' },
          },
        },
      },
    },
  };

  // Tool 3: get_quotes
  const quotesTool = {
    tool_config: {
      type: 'webhook',
      name: 'get_quotes',
      description: 'Retrieve specific quotes from interviews. Use when asked for examples, evidence, or "what did people actually say about X".',
      api_schema: {
        url: `${childPlatformUrl}/api/insights/quotes`,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          properties: {
            theme: { type: 'string', description: 'Topic or theme to find quotes about' },
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'], description: 'Filter quotes by sentiment' },
            panel_name: { type: 'string', description: 'Optional: limit to specific panel' },
            limit: { type: 'integer', description: 'Max quotes to return (default 10)' },
          },
        },
      },
    },
  };

  // Tool 4: compare_panels
  const compareTool = {
    tool_config: {
      type: 'webhook',
      name: 'compare_panels',
      description: 'Compare insights across multiple panels or time periods. Use when asked about trends, changes over time, or differences between research studies.',
      api_schema: {
        url: `${childPlatformUrl}/api/insights/compare`,
        method: 'POST',
        content_type: 'application/json',
        request_body_schema: {
          type: 'object',
          required: ['panel_names'],
          properties: {
            panel_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of panels to compare (at least 2)',
            },
          },
        },
      },
    },
  };

  // Create all tools
  const tools = [searchTool, summaryTool, quotesTool, compareTool];

  for (const toolConfig of tools) {
    const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/tools/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(toolConfig),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      console.error(`[elevenlabs] Failed to create Kira tool: ${errorText}`);
      continue;
    }

    const tool = await createRes.json();
    console.log(`[elevenlabs] Created Kira tool: ${toolConfig.tool_config.name} (${tool.id})`);
    toolIds.push(tool.id);
  }

  return toolIds;
}

// ============================================================================
// AGENT VERIFICATION
// ============================================================================

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

// ============================================================================
// CREATE SANDRA (Setup Agent)
// ============================================================================

export async function createSetupAgent(ctx: ProvisionContext): Promise<{
  agentId: string;
  agentName: string;
  toolIds: string[];
}> {
  const agentName = `${ctx.companyName || ctx.platformName} Setup Agent`;
  const childPlatformUrl = ctx.metadata.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('[elevenlabs] vercelUrl not found - Vercel provisioning must complete first');
  }
  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Creating Sandra (Setup Agent): ${agentName}`);

  // Check if agent already exists
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing Setup Agent: ${existing.agent_id}`);
      const toolIds = await createSandraTools(ctx.elevenLabsApiKey, childPlatformUrl);

      // Update with new tools
      await fetch(`${ELEVENLABS_API}/convai/agents/${existing.agent_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: { prompt: SETUP_AGENT_PROMPT, tool_ids: toolIds },
              first_message: "Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that actually gets you the insights you need. What's your name?",
              language: 'en',
            },
            tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL', model_id: 'eleven_flash_v2' },
          },
          platform_settings: {
            webhook: { url: webhookRouterUrl, events: ['conversation.ended', 'conversation.transcript'] },
          },
        }),
      });

      return { agentId: existing.agent_id, agentName, toolIds };
    }
  }

  // Create new agent
  const toolIds = await createSandraTools(ctx.elevenLabsApiKey, childPlatformUrl);

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: agentName,
      conversation_config: {
        agent: {
          prompt: { prompt: SETUP_AGENT_PROMPT, tool_ids: toolIds },
          first_message: "Hi! I'm Sandra, your research design partner. I'll help you create a custom AI interviewer that actually gets you the insights you need. What's your name?",
          language: 'en',
        },
        tts: { voice_id: 'EXAVITQu4vr4xnSDxMaL', model_id: 'eleven_flash_v2' },
        stt: { provider: 'elevenlabs' },
        turn: { mode: 'turn' },
        conversation: { max_duration_seconds: 3600 },
      },
      platform_settings: {
        webhook: { url: webhookRouterUrl, events: ['conversation.ended', 'conversation.transcript'] },
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Setup Agent: ${await createRes.text()}`);
  }

  const agent = await createRes.json();
  console.log(`[elevenlabs] Created Sandra: ${agent.agent_id}`);

  return { agentId: agent.agent_id, agentName, toolIds };
}

// ============================================================================
// CREATE KIRA (Insights Agent)
// ============================================================================

export async function createInsightsAgent(ctx: ProvisionContext): Promise<{
  agentId: string;
  agentName: string;
  toolIds: string[];
}> {
  const agentName = `${ctx.companyName || ctx.platformName} Insights Agent`;
  const childPlatformUrl = ctx.metadata.vercelUrl;
  if (!childPlatformUrl) {
    throw new Error('[elevenlabs] vercelUrl not found - Vercel provisioning must complete first');
  }
  const webhookRouterUrl = `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`;

  const headers = {
    'xi-api-key': ctx.elevenLabsApiKey,
    'Content-Type': 'application/json',
  };

  console.log(`[elevenlabs] Creating Kira (Insights Agent): ${agentName}`);

  // Check if agent already exists
  const listRes = await fetch(`${ELEVENLABS_API}/convai/agents`, { headers });

  if (listRes.ok) {
    const data = await listRes.json();
    const existing = data.agents?.find((a: any) => a.name === agentName);

    if (existing) {
      console.log(`[elevenlabs] Found existing Insights Agent: ${existing.agent_id}`);
      const toolIds = await createKiraTools(ctx.elevenLabsApiKey, childPlatformUrl);

      // Update with new tools
      await fetch(`${ELEVENLABS_API}/convai/agents/${existing.agent_id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          conversation_config: {
            agent: {
              prompt: { prompt: INSIGHTS_AGENT_PROMPT, tool_ids: toolIds },
              first_message: "Hi! I'm Kira, your research analyst. I have access to all your interview data. What would you like to explore?",
              language: 'en',
            },
            tts: { voice_id: 'XB0fDUnXU5powFXDhCwa', model_id: 'eleven_flash_v2' }, // Charlotte - warm, professional female
          },
          platform_settings: {
            webhook: { url: webhookRouterUrl, events: ['conversation.ended', 'conversation.transcript'] },
          },
        }),
      });

      return { agentId: existing.agent_id, agentName, toolIds };
    }
  }

  // Create new agent
  const toolIds = await createKiraTools(ctx.elevenLabsApiKey, childPlatformUrl);

  const createRes = await fetch(`${ELEVENLABS_API}/convai/agents/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: agentName,
      conversation_config: {
        agent: {
          prompt: { prompt: INSIGHTS_AGENT_PROMPT, tool_ids: toolIds },
          first_message: "Hi! I'm Kira, your research analyst. I have access to all your interview data. What would you like to explore?",
          language: 'en',
        },
        tts: { voice_id: 'XB0fDUnXU5powFXDhCwa', model_id: 'eleven_flash_v2' }, // Charlotte - warm, professional female
        stt: { provider: 'elevenlabs' },
        turn: { mode: 'turn' },
        conversation: { max_duration_seconds: 3600 },
      },
      platform_settings: {
        webhook: { url: webhookRouterUrl, events: ['conversation.ended', 'conversation.transcript'] },
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Insights Agent: ${await createRes.text()}`);
  }

  const agent = await createRes.json();
  console.log(`[elevenlabs] Created Kira: ${agent.agent_id}`);

  return { agentId: agent.agent_id, agentName, toolIds };
}

// ============================================================================
// MAIN PROVISIONING FUNCTION - Creates both agents
// ============================================================================

export async function createElevenLabsAgents(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const childPlatformUrl = ctx.metadata.vercelUrl;

  if (!childPlatformUrl) {
    throw new Error('Child platform URL not available - Vercel provisioning must complete first');
  }

  console.log(`[elevenlabs] Creating agents for: ${childPlatformUrl}`);

  // Create Sandra (Setup Agent)
  const sandra = await createSetupAgent(ctx);

  // Create Kira (Insights Agent)
  const kira = await createInsightsAgent(ctx);

  // Verify both agents
  await new Promise(r => setTimeout(r, 1000));

  const sandraVerified = await verifyAgentExists(sandra.agentId, ctx.elevenLabsApiKey);
  const kiraVerified = await verifyAgentExists(kira.agentId, ctx.elevenLabsApiKey);

  if (!sandraVerified.exists || !kiraVerified.exists) {
    throw new Error('Agent creation verification failed');
  }

  return {
    nextState: 'WEBHOOK_REGISTERING',
    metadata: {
      ...ctx.metadata,
      // Sandra (Setup Agent)
      elevenLabsAgentId: sandra.agentId,        // Keep for backward compatibility
      setupAgentId: sandra.agentId,
      setupAgentName: sandra.agentName,
      setupAgentToolIds: sandra.toolIds,
      // Kira (Insights Agent)
      insightsAgentId: kira.agentId,
      insightsAgentName: kira.agentName,
      insightsAgentToolIds: kira.toolIds,
      // General
      elevenLabsRouterUrl: `${ctx.publicBaseUrl}/api/webhooks/elevenlabs-router`,
      elevenLabsVerified: true,
    },
  };
}

// ============================================================================
// LEGACY EXPORT (for backward compatibility)
// ============================================================================

export const createElevenLabsAgent = createElevenLabsAgents;