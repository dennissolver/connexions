// app/api/create-agent/route.ts
// Creates the actual interviewer agent with dynamically researched role persona

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  generateInterviewerPromptAsync, 
  InterviewerConfig,
  RoleProfile 
} from '@/lib/prompts/interviewer-agent';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const required = [
      'company_name', 'company_email', 'agent_name', 'agent_role',
      'interview_purpose', 'target_audience', 'interview_style',
      'tone', 'duration_minutes', 'key_topics', 'key_questions',
      'notification_email'
    ];

    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate slug from agent name
    const slug = generateSlug(data.agent_name, data.company_name);

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An agent with this name already exists' },
        { status: 400 }
      );
    }

    // Build interviewer config
    const config: InterviewerConfig = {
      agent_name: data.agent_name,
      agent_role: data.agent_role,
      interview_purpose: data.interview_purpose,
      target_audience: data.target_audience,
      interview_style: data.interview_style,
      tone: data.tone,
      duration_minutes: data.duration_minutes,
      key_topics: data.key_topics,
      key_questions: data.key_questions,
      constraints: data.constraints,
      company_name: data.company_name,
    };

    // DYNAMIC ROLE RESEARCH: Use AI to understand this specific role
    // This generates custom expertise, techniques, and approach for ANY profession
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    
    console.log(`Researching role profile for: ${data.agent_role}`);
    
    const { systemPrompt, firstMessage, roleProfile } = await generateInterviewerPromptAsync(
      config,
      anthropicApiKey
    );
    
    console.log(`Generated profile for: ${roleProfile.role_title}`);

    // Create ElevenLabs conversational agent
    let elevenlabsAgentId = null;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (elevenlabsApiKey) {
      try {
        // Voice selection
        const voiceId = data.voice_gender === 'male'
          ? 'pNInz6obpgDQGcFmaJgB' // Adam
          : 'EXAVITQu4vr4xnSDxMaL'; // Sarah

        const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenlabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${data.agent_name} - ${data.company_name}`,
            conversation_config: {
              agent: {
                prompt: {
                  prompt: systemPrompt,
                },
                first_message: firstMessage,
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
              webhook: {
                url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/elevenlabs`,
                events: ['conversation.ended', 'conversation.transcript'],
              },
            },
          }),
        });

        if (response.ok) {
          const agent = await response.json();
          elevenlabsAgentId = agent.agent_id;
          console.log('ElevenLabs agent created:', elevenlabsAgentId);
        } else {
          const error = await response.json();
          console.warn('ElevenLabs creation failed:', error);
        }
      } catch (err) {
        console.warn('ElevenLabs API error:', err);
      }
    }

    // Get or create client
    let clientId = data.client_id;
    
    if (!clientId) {
      // Check if client exists by email
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', data.company_email)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            email: data.company_email,
            company_name: data.company_name,
            company_website: data.company_website,
            name: data.contact_name,
          })
          .select()
          .single();

        if (clientError) {
          console.error('Failed to create client:', clientError);
          return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
        }

        clientId = newClient.id;
      }
    }

    // Create agent in database
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        client_id: clientId,
        name: data.agent_name,
        slug,
        status: 'active',
        company_name: data.company_name,
        interview_purpose: data.interview_purpose,
        target_interviewees: data.target_audience,
        agent_role: data.agent_role,
        interviewer_tone: data.tone,
        estimated_duration_mins: data.duration_minutes,
        elevenlabs_agent_id: elevenlabsAgentId,
        voice_id: data.voice_gender === 'male' ? 'pNInz6obpgDQGcFmaJgB' : 'EXAVITQu4vr4xnSDxMaL',
        key_topics: data.key_topics,
        key_questions: data.key_questions,
        constraints: data.constraints ? [data.constraints] : null,
        system_prompt: systemPrompt,
        first_message: firstMessage,
        role_profile: roleProfile,  // Store the researched role profile
      })
      .select()
      .single();

    if (agentError) {
      console.error('Failed to create agent:', agentError);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    // Update setup session if conversation_id provided
    if (data.conversation_id) {
      await supabase
        .from('setup_sessions')
        .update({
          status: 'built',
          agent_id: agent.id,
          confirmed_data: data,
          built_at: new Date().toISOString(),
        })
        .eq('conversation_id', data.conversation_id);
    }

    // Send notification email
    if (data.notification_email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: data.notification_email,
            subject: `Your AI Interviewer "${data.agent_name}" is Ready!`,
            template: 'agent-created',
            data: {
              agentName: data.agent_name,
              agentRole: data.agent_role,
              interviewUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/i/${slug}`,
              dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard`,
            },
          }),
        });
      } catch (err) {
        console.warn('Failed to send notification email:', err);
      }
    }

    return NextResponse.json({
      success: true,
      agentId: agent.id,
      slug: agent.slug,
      interviewUrl: `/i/${slug}`,
      elevenlabsAgentId,
    });

  } catch (error: any) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create agent' },
      { status: 500 }
    );
  }
}

function generateSlug(agentName: string, companyName: string): string {
  const base = `${companyName}-${agentName}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  // Add random suffix for uniqueness
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

// GET - Retrieve agent by ID or slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (!id && !slug) {
      return NextResponse.json({ error: 'ID or slug required' }, { status: 400 });
    }

    let query = supabase.from('agents').select('*');

    if (id) {
      query = query.eq('id', id);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    const { data: agent, error } = await query.single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
