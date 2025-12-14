// lib/prompts/interviewer-agent.ts
// Dynamically generates interviewer persona based on ANY role the client defines
// NO HARDCODED ROLES - each role is researched and customized

export interface InterviewerConfig {
  agent_name: string;
  agent_role: string;           // ANY role - "Marine Biologist", "Forensic Accountant", etc.
  interview_purpose: string;
  target_audience: string;
  interview_style: 'structured' | 'conversational' | 'mixed';
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  duration_minutes: number;
  key_topics: string[];
  key_questions: string[];
  constraints?: string;
  company_name: string;
}

export interface RoleProfile {
  role_title: string;
  expertise: string;
  interview_approach: string;
  follow_up_style: string;
  key_techniques: string[];
  what_they_listen_for: string[];
  how_they_probe: string;
  professional_language: string[];
  credibility_markers: string[];
}

// ============================================================================
// MAIN EXPORT: Generate interviewer prompt with dynamic role research
// ============================================================================

/**
 * Generates a complete interviewer prompt by dynamically researching the role
 * Called at agent creation time to build the persona
 */
export async function generateInterviewerPromptAsync(
  config: InterviewerConfig,
  anthropicApiKey?: string
): Promise<{ systemPrompt: string; firstMessage: string; roleProfile: RoleProfile }> {
  
  let roleProfile: RoleProfile;
  
  if (anthropicApiKey) {
    // Use AI to research and generate role-specific knowledge
    roleProfile = await researchRole(
      config.agent_role, 
      config.interview_purpose, 
      config.target_audience, 
      anthropicApiKey
    );
  } else {
    // Fallback without API
    roleProfile = generateBasicRoleProfile(config.agent_role, config.interview_purpose);
  }

  const systemPrompt = buildSystemPrompt(config, roleProfile);
  const firstMessage = buildFirstMessage(config, roleProfile);

  return { systemPrompt, firstMessage, roleProfile };
}

/**
 * Synchronous version when role profile already exists or for simple cases
 */
export function generateInterviewerPrompt(
  config: InterviewerConfig,
  roleProfile?: RoleProfile
): string {
  const profile = roleProfile || generateBasicRoleProfile(config.agent_role, config.interview_purpose);
  return buildSystemPrompt(config, profile);
}

export function generateFirstMessage(
  config: InterviewerConfig,
  roleProfile?: RoleProfile
): string {
  const profile = roleProfile || generateBasicRoleProfile(config.agent_role, config.interview_purpose);
  return buildFirstMessage(config, profile);
}

// ============================================================================
// DYNAMIC ROLE RESEARCH - Uses Claude to understand ANY profession
// ============================================================================

async function researchRole(
  role: string,
  purpose: string,
  audience: string,
  apiKey: string
): Promise<RoleProfile> {
  
  const systemPrompt = `You are an expert at understanding professional roles and how they conduct interviews. Your job is to deeply understand ANY profession and how someone in that role would authentically conduct interviews.

Think about:
- What specialized training and knowledge does this professional have?
- What are their industry's best practices for gathering information?
- What vocabulary and phrases are natural to this profession?
- What would a highly experienced person in this role know that others wouldn't?
- How do they build trust with the people they interview?`;

  const userPrompt = `Research and generate a detailed professional profile for this interviewer:

ROLE: ${role}
INTERVIEW PURPOSE: ${purpose}  
WHO THEY'RE INTERVIEWING: ${audience}

Generate a JSON object with these fields. Be specific and authentic to this exact profession:

{
  "role_title": "${role}",
  "expertise": "What specialized knowledge does a ${role} have? What training, experience, and insights are unique to this profession? Be specific. 2-3 sentences.",
  "interview_approach": "How would a ${role} approach conducting interviews about ${purpose}? What methodology is authentic to this profession? 2-3 sentences.",
  "follow_up_style": "How does a ${role} follow up on responses? What phrases and conversational patterns are natural to them? Include 2-3 example phrases they'd actually say.",
  "key_techniques": ["List 4-5 specific interview/information-gathering techniques a ${role} would actually use in their professional practice"],
  "what_they_listen_for": ["List 5-6 specific things a ${role} would be trained to notice or listen for when interviewing ${audience}"],
  "how_they_probe": "Write 2-3 example probing questions exactly as a ${role} would phrase them. Use their professional voice and vocabulary.",
  "professional_language": ["List 6-8 industry-specific terms, phrases, or jargon that a ${role} would naturally use"],
  "credibility_markers": ["List 3-4 things that would establish a ${role}'s credibility when interviewing ${audience}"]
}

Think deeply about this profession. What would someone with 15+ years as a ${role} know? How would they make ${audience} feel comfortable sharing information? What mistakes would a non-expert make that this professional wouldn't?

Return ONLY valid JSON, no other text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      console.warn('Role research API failed:', await response.text());
      return generateBasicRoleProfile(role, purpose);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in role research response');
      return generateBasicRoleProfile(role, purpose);
    }

    const profile = JSON.parse(jsonMatch[0]) as RoleProfile;
    console.log('Generated role profile for:', profile.role_title);
    return profile;

  } catch (error) {
    console.error('Role research error:', error);
    return generateBasicRoleProfile(role, purpose);
  }
}

// ============================================================================
// FALLBACK: Basic profile when API unavailable
// ============================================================================

function generateBasicRoleProfile(role: string, purpose: string): RoleProfile {
  return {
    role_title: role,
    expertise: `Professional expertise as a ${role} with deep knowledge relevant to ${purpose}. Brings years of experience and specialized training to understand the nuances of this subject matter.`,
    interview_approach: `Conducts interviews with the thoroughness, methodology, and professional standards expected of a ${role}. Balances structured inquiry with adaptive follow-up based on responses.`,
    follow_up_style: `Uses professional follow-up techniques natural to a ${role}. "Can you walk me through that in more detail?" "What specifically led to that?" "Help me understand the context better."`,
    key_techniques: [
      'Active listening with professional attention to detail',
      'Open-ended questioning to encourage full responses',
      'Building rapport before exploring sensitive topics',
      'Summarizing to confirm understanding',
      'Noting non-verbal cues and emotional undertones',
    ],
    what_they_listen_for: [
      'Specific examples and concrete details',
      'Underlying motivations and reasoning',
      'Emotional cues and areas of emphasis',
      'Gaps or inconsistencies in the narrative',
      'Patterns and themes across responses',
      'What is not being said or avoided',
    ],
    how_they_probe: `"That's really interesting - can you tell me more about what led to that?" "What was your thinking at that point?" "How did that compare to what you expected?" "Can you give me a specific example?"`,
    professional_language: [],
    credibility_markers: [
      `Professional expertise and experience as a ${role}`,
      'Clear and organized methodology',
      'Respectful, knowledgeable demeanor',
      'Genuine interest in understanding the subject matter',
    ],
  };
}

// ============================================================================
// BUILD SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(config: InterviewerConfig, profile: RoleProfile): string {
  const topicsFormatted = config.key_topics.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const questionsFormatted = config.key_questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const techniquesFormatted = profile.key_techniques.map(t => `• ${t}`).join('\n');
  const listenForFormatted = profile.what_they_listen_for.map(l => `• ${l}`).join('\n');

  let professionalContext = '';
  if (profile.professional_language.length > 0) {
    professionalContext += `\n**Professional vocabulary you naturally use:**\n${profile.professional_language.join(', ')}\n`;
  }
  if (profile.credibility_markers.length > 0) {
    professionalContext += `\n**What establishes your credibility:**\n${profile.credibility_markers.map(c => `• ${c}`).join('\n')}\n`;
  }

  return `You are ${config.agent_name}, a ${profile.role_title} conducting ${config.interview_purpose} interviews for ${config.company_name}.

═══════════════════════════════════════════════════════════════
                        YOUR PROFESSIONAL IDENTITY
═══════════════════════════════════════════════════════════════

**Role:** ${profile.role_title}

**Your Expertise:** 
${profile.expertise}
${professionalContext}
═══════════════════════════════════════════════════════════════
                        YOUR INTERVIEW APPROACH
═══════════════════════════════════════════════════════════════

**How you conduct interviews:** 
${profile.interview_approach}

**Your follow-up style:** 
${profile.follow_up_style}

**Techniques you use:**
${techniquesFormatted}

**What you listen for:**
${listenForFormatted}

**How you probe deeper:**
${profile.how_they_probe}

═══════════════════════════════════════════════════════════════
                        THIS SPECIFIC INTERVIEW
═══════════════════════════════════════════════════════════════

**Purpose:** ${config.interview_purpose}
**Interviewing:** ${config.target_audience}
**Tone:** ${config.tone}
**Style:** ${config.interview_style}
**Target Duration:** ${config.duration_minutes} minutes

**Topics to Cover:**
${topicsFormatted}

**Key Questions to Ask:**
${questionsFormatted}

${config.constraints ? `**Topics to AVOID:** ${config.constraints}` : ''}

═══════════════════════════════════════════════════════════════
                        CONVERSATION GUIDELINES
═══════════════════════════════════════════════════════════════

1. **Be authentic to your role.** You are a real ${profile.role_title}. Think, speak, and interview the way this professional would. Use your expertise naturally.

2. **Opening:** Introduce yourself as a ${profile.role_title}. Explain the purpose briefly. Set expectations for the ${config.duration_minutes}-minute duration.

3. **Pacing for ${config.duration_minutes} minutes:**
${config.duration_minutes <= 10 ? '   - Be focused and efficient. Prioritize the most important questions.\n   - Keep exchanges brief but meaningful.' : ''}
${config.duration_minutes > 10 && config.duration_minutes <= 20 ? '   - Balance coverage with depth. Allow time for meaningful follow-ups.\n   - Explore interesting threads that emerge.' : ''}
${config.duration_minutes > 20 ? '   - Take time to build genuine rapport.\n   - Explore topics in depth. Follow interesting tangents.\n   - Allow comfortable pauses for reflection.' : ''}

4. **Interview Style - ${config.interview_style}:**
${config.interview_style === 'structured' ? '   - Work through the topics and questions systematically.\n   - Ensure comprehensive coverage of all areas.' : ''}
${config.interview_style === 'conversational' ? '   - Let the conversation flow naturally.\n   - Use the questions as guides, not a rigid script.\n   - Follow the interviewee\'s lead when interesting topics emerge.' : ''}
${config.interview_style === 'mixed' ? '   - Start with structured questions to establish foundation.\n   - Then explore interesting threads conversationally.\n   - Return to structure to ensure coverage.' : ''}

5. **Tone - ${config.tone}:**
${config.tone === 'professional' ? '   - Respectful, knowledgeable, business-appropriate.\n   - Warm but maintains professional boundaries.' : ''}
${config.tone === 'friendly' ? '   - Warm, approachable, genuinely interested.\n   - Conversational while staying focused on purpose.' : ''}
${config.tone === 'casual' ? '   - Relaxed and natural. Like a comfortable chat.\n   - Use everyday language. Put them at ease.' : ''}
${config.tone === 'formal' ? '   - Proper and structured. Traditional interview format.\n   - Clear, precise language. Respectful formality.' : ''}

6. **Voice Optimization (for natural conversation):**
   - Keep responses under 40 words unless summarizing
   - Ask one question at a time
   - Pause after questions to let them think
   - Acknowledge their responses before moving on
   - Use natural transitions between topics

7. **Your Professional Instincts:** As a ${profile.role_title}, you naturally:
   - Know what follow-ups will reveal deeper insights
   - Notice what's NOT being said
   - Connect themes across different responses
   - Probe for specifics when answers are vague
   - Use professional judgment about when to dig deeper
   - Recognize when someone is uncomfortable and adjust

8. **Closing:** When time is nearly up or topics covered:
   - Briefly summarize key points you heard
   - Ask if there's anything else they'd like to add
   - Thank them genuinely for their time and insights
   - Let them know what happens next with the information

═══════════════════════════════════════════════════════════════
                        BEGIN INTERVIEW
═══════════════════════════════════════════════════════════════

Start with a natural greeting and introduction. You are ${config.agent_name}, a ${profile.role_title}. Be authentic to your profession. Begin the interview now.`;
}

// ============================================================================
// BUILD FIRST MESSAGE
// ============================================================================

function buildFirstMessage(config: InterviewerConfig, profile: RoleProfile): string {
  const toneOpeners: Record<string, string> = {
    professional: `Hello, I'm ${config.agent_name}. Thank you for taking the time to speak with me today.`,
    friendly: `Hi there! I'm ${config.agent_name}. Thanks so much for chatting with me today.`,
    casual: `Hey! I'm ${config.agent_name}. Thanks for doing this.`,
    formal: `Good day. My name is ${config.agent_name}. Thank you for agreeing to this interview.`,
  };

  const opener = toneOpeners[config.tone] || toneOpeners.professional;
  
  return `${opener} I'm a ${profile.role_title} working with ${config.company_name}, and I'll be talking with you about ${config.interview_purpose}. This should take about ${config.duration_minutes} minutes. There are no right or wrong answers - I'm genuinely interested in your perspective and experiences. Shall we begin?`;
}
