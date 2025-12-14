// lib/eval-runner.ts
// Core evaluation service that runs after every interview completion

import Anthropic from '@anthropic-ai/sdk';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
interface EvaluationResult {
  overall_score: number;
  goal_achievement_score: number;
  conversation_quality_score: number;
  user_engagement_score: number;
  prompt_adherence_score: number;
  metrics: EvaluationMetrics;
  issues: EvaluationIssue[];
  recommendations: Recommendation[];
  transcript_summary: string;
  key_moments: KeyMoment[];
}

interface EvaluationMetrics {
  goal_achievement: {
    topics_covered: string[];
    topics_missed: string[];
    coverage_percentage: number;
    key_insights_extracted: number;
  };
  conversation_quality: {
    follow_up_quality: number;
    question_relevance: number;
    response_appropriateness: number;
    conversation_flow: number;
  };
  user_engagement: {
    response_length_avg: number;
    engagement_trend: 'increasing' | 'stable' | 'decreasing';
    dropout_risk_detected: boolean;
    sentiment_progression: string[];
  };
  prompt_adherence: {
    tone_match: number;
    stayed_on_topic: boolean;
    followed_constraints: boolean;
    used_appropriate_style: boolean;
  };
}

interface EvaluationIssue {
  id: string;
  type: 'goal_missed' | 'off_topic' | 'tone_violation' | 'engagement_drop' | 'technical_error';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp_seconds?: number;
  context?: string;
}

interface Recommendation {
  type: 'prompt_improvement' | 'config_change' | 'training_data';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  expected_impact: string;
}

interface KeyMoment {
  timestamp_seconds: number;
  type: 'insight' | 'objection' | 'breakthrough' | 'confusion' | 'engagement_peak';
  description: string;
  quote?: string;
}

interface AgentConfig {
  id: string;
  name: string;
  interview_purpose: string;
  target_interviewees: string;
  desired_outcomes: string[];
  themes: string[];
  interviewer_tone: string;
  system_prompt?: string;
  welcome_message?: string;
}

interface InterviewData {
  id: string;
  agent_id: string;
  transcript: string;
  messages: any[];
  duration_seconds?: number;
  status: string;
}

// Evaluation Prompt Template
const EVALUATION_PROMPT = `You are an expert AI interview evaluator. Analyze the following interview transcript and agent configuration to provide a comprehensive evaluation.

## Agent Configuration
<agent_config>
{{AGENT_CONFIG}}
</agent_config>

## Interview Transcript
<transcript>
{{TRANSCRIPT}}
</transcript>

## Your Task
Evaluate this interview across four dimensions and provide actionable feedback.

### Scoring Guidelines (0-100 scale)
- **90-100 (Excellent)**: Exceptional performance, exceeded expectations
- **70-89 (Good)**: Solid performance, met most objectives
- **50-69 (Needs Improvement)**: Partial success, missed key areas
- **0-49 (Poor)**: Failed to achieve core objectives

### Response Format
Respond with a JSON object matching this exact structure:

{
  "overall_score": <number 0-100>,
  "goal_achievement_score": <number 0-100>,
  "conversation_quality_score": <number 0-100>,
  "user_engagement_score": <number 0-100>,
  "prompt_adherence_score": <number 0-100>,
  "metrics": {
    "goal_achievement": {
      "topics_covered": ["topic1", "topic2"],
      "topics_missed": ["topic3"],
      "coverage_percentage": <number>,
      "key_insights_extracted": <number>
    },
    "conversation_quality": {
      "follow_up_quality": <number 0-100>,
      "question_relevance": <number 0-100>,
      "response_appropriateness": <number 0-100>,
      "conversation_flow": <number 0-100>
    },
    "user_engagement": {
      "response_length_avg": <number>,
      "engagement_trend": "increasing" | "stable" | "decreasing",
      "dropout_risk_detected": <boolean>,
      "sentiment_progression": ["sentiment1", "sentiment2"]
    },
    "prompt_adherence": {
      "tone_match": <number 0-100>,
      "stayed_on_topic": <boolean>,
      "followed_constraints": <boolean>,
      "used_appropriate_style": <boolean>
    }
  },
  "issues": [
    {
      "id": "<uuid>",
      "type": "goal_missed" | "off_topic" | "tone_violation" | "engagement_drop" | "technical_error",
      "severity": "critical" | "warning" | "info",
      "message": "<description>",
      "timestamp_seconds": <number or null>,
      "context": "<relevant quote or context>"
    }
  ],
  "recommendations": [
    {
      "type": "prompt_improvement" | "config_change" | "training_data",
      "priority": "high" | "medium" | "low",
      "suggestion": "<specific actionable suggestion>",
      "expected_impact": "<expected improvement>"
    }
  ],
  "transcript_summary": "<2-3 sentence summary of the interview>",
  "key_moments": [
    {
      "timestamp_seconds": <number>,
      "type": "insight" | "objection" | "breakthrough" | "confusion" | "engagement_peak",
      "description": "<what happened>",
      "quote": "<relevant quote if applicable>"
    }
  ]
}

Be thorough but fair. Focus on actionable insights that will help improve the agent's performance.`;

export class EvaluationRunner {
  private anthropic: Anthropic;
  private supabase: SupabaseClient;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Main entry point - evaluate a completed interview
   */
  async evaluateInterview(interviewId: string): Promise<EvaluationResult | null> {
    const startTime = Date.now();
    
    try {
      // 1. Fetch interview and agent data
      const { interview, agent } = await this.fetchInterviewData(interviewId);
      
      if (!interview || !agent) {
        console.error(`Interview or agent not found for ${interviewId}`);
        return null;
      }

      // 2. Build transcript from messages or use stored transcript
      const transcript = this.buildTranscript(interview);
      
      if (!transcript || transcript.length < 100) {
        console.log(`Skipping evaluation - transcript too short for ${interviewId}`);
        return null;
      }

      // 3. Run Claude evaluation
      const evaluation = await this.runEvaluation(agent, transcript);
      
      // 4. Store evaluation results
      await this.storeEvaluation(interviewId, interview.agent_id, evaluation, Date.now() - startTime);
      
      // 5. Check for alerts
      await this.checkForAlerts(interview.agent_id, interviewId, evaluation);
      
      // 6. Update daily aggregates (async, don't await)
      this.updateDailyAggregates(interview.agent_id).catch(console.error);

      return evaluation;
      
    } catch (error) {
      console.error(`Evaluation failed for interview ${interviewId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch interview and associated agent data
   */
  private async fetchInterviewData(interviewId: string): Promise<{
    interview: InterviewData | null;
    agent: AgentConfig | null;
  }> {
    const { data: interview, error: interviewError } = await this.supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (interviewError || !interview) {
      return { interview: null, agent: null };
    }

    const { data: agent, error: agentError } = await this.supabase
      .from('agents')
      .select('id, name, interview_purpose, target_interviewees, desired_outcomes, themes, interviewer_tone, system_prompt, welcome_message')
      .eq('id', interview.agent_id)
      .single();

    return { interview, agent: agentError ? null : agent };
  }

  /**
   * Build readable transcript from messages
   */
  private buildTranscript(interview: InterviewData): string {
    // If we have a pre-built transcript, use it
    if (typeof interview.transcript === 'string' && interview.transcript.length > 0) {
      return interview.transcript;
    }

    // Otherwise build from messages array
    const messages = interview.messages || [];
    
    return messages.map((msg: any) => {
      const role = msg.role === 'assistant' ? 'Interviewer' : 'Interviewee';
      const content = msg.content || msg.text || '';
      const timestamp = msg.timestamp ? `[${this.formatTimestamp(msg.timestamp)}] ` : '';
      return `${timestamp}${role}: ${content}`;
    }).join('\n\n');
  }

  private formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Run Claude evaluation
   */
  private async runEvaluation(agent: AgentConfig, transcript: string): Promise<EvaluationResult> {
    const prompt = EVALUATION_PROMPT
      .replace('{{AGENT_CONFIG}}', JSON.stringify(agent, null, 2))
      .replace('{{TRANSCRIPT}}', transcript);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON (handle potential markdown code blocks)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const evaluation: EvaluationResult = JSON.parse(jsonStr);
    
    // Validate scores are within range
    this.validateScores(evaluation);
    
    return evaluation;
  }

  private validateScores(evaluation: EvaluationResult): void {
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    
    evaluation.overall_score = clamp(evaluation.overall_score);
    evaluation.goal_achievement_score = clamp(evaluation.goal_achievement_score);
    evaluation.conversation_quality_score = clamp(evaluation.conversation_quality_score);
    evaluation.user_engagement_score = clamp(evaluation.user_engagement_score);
    evaluation.prompt_adherence_score = clamp(evaluation.prompt_adherence_score);
  }

  /**
   * Store evaluation in database
   */
  private async storeEvaluation(
    interviewId: string,
    agentId: string,
    evaluation: EvaluationResult,
    durationMs: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('interview_evaluations')
      .insert({
        interview_id: interviewId,
        agent_id: agentId,
        overall_score: evaluation.overall_score,
        goal_achievement_score: evaluation.goal_achievement_score,
        conversation_quality_score: evaluation.conversation_quality_score,
        user_engagement_score: evaluation.user_engagement_score,
        prompt_adherence_score: evaluation.prompt_adherence_score,
        metrics: evaluation.metrics,
        issues: evaluation.issues,
        recommendations: evaluation.recommendations,
        transcript_summary: evaluation.transcript_summary,
        key_moments: evaluation.key_moments,
        eval_duration_ms: durationMs,
      });

    if (error) {
      console.error('Failed to store evaluation:', error);
      throw error;
    }
  }

  /**
   * Check if evaluation triggers any alerts
   */
  private async checkForAlerts(
    agentId: string,
    interviewId: string,
    evaluation: EvaluationResult
  ): Promise<void> {
    const alerts: any[] = [];

    // Critical score alert
    if (evaluation.overall_score < 50) {
      alerts.push({
        agent_id: agentId,
        interview_id: interviewId,
        alert_type: 'critical_failure',
        severity: 'critical',
        title: 'Interview scored below 50%',
        description: `Overall score: ${evaluation.overall_score}%. ${evaluation.transcript_summary}`,
        context: { evaluation },
      });
    }

    // Critical issues alert
    const criticalIssues = evaluation.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      alerts.push({
        agent_id: agentId,
        interview_id: interviewId,
        alert_type: 'critical_failure',
        severity: 'warning',
        title: `${criticalIssues.length} critical issue(s) detected`,
        description: criticalIssues.map(i => i.message).join('; '),
        context: { issues: criticalIssues },
      });
    }

    // Check for repeated issues (same type 3+ times recently)
    await this.checkRepeatedIssues(agentId, evaluation.issues, alerts);

    // Insert alerts
    if (alerts.length > 0) {
      const { error } = await this.supabase
        .from('evaluation_alerts')
        .insert(alerts);
      
      if (error) {
        console.error('Failed to create alerts:', error);
      }
    }
  }

  private async checkRepeatedIssues(
    agentId: string,
    newIssues: EvaluationIssue[],
    alerts: any[]
  ): Promise<void> {
    // Get recent evaluations
    const { data: recentEvals } = await this.supabase
      .from('interview_evaluations')
      .select('issues')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentEvals || recentEvals.length < 2) return;

    // Count issue types
    const issueCounts: Record<string, number> = {};
    
    for (const evalItem of recentEvals) {
      const issues = evalItem.issues as EvaluationIssue[];
      for (const issue of issues) {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
      }
    }

    // Add current issues
    for (const issue of newIssues) {
      issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
    }

    // Alert on repeated issues
    for (const [type, count] of Object.entries(issueCounts)) {
      if (count >= 3) {
        alerts.push({
          agent_id: agentId,
          alert_type: 'repeated_issue',
          severity: 'warning',
          title: `Repeated issue: ${type}`,
          description: `This issue has occurred ${count} times in recent interviews. Consider updating the agent configuration.`,
          context: { issue_type: type, count },
        });
      }
    }
  }

  /**
   * Update daily performance aggregates
   */
  private async updateDailyAggregates(agentId: string): Promise<void> {
    await this.supabase.rpc('aggregate_daily_performance', {
      p_date: new Date().toISOString().split('T')[0],
    });
  }
}

// Export singleton instance
export const evalRunner = new EvaluationRunner();
