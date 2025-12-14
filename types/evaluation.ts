// types/evaluation.ts
// Type definitions for the evaluation system

export interface EvaluationResult {
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

export interface EvaluationMetrics {
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

export type IssueSeverity = 'critical' | 'warning' | 'info';
export type IssueType = 'goal_missed' | 'off_topic' | 'tone_violation' | 'engagement_drop' | 'technical_error';

export interface EvaluationIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  timestamp_seconds?: number;
  context?: string;
}

export type RecommendationType = 'prompt_improvement' | 'config_change' | 'training_data';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  type: RecommendationType;
  priority: RecommendationPriority;
  suggestion: string;
  expected_impact: string;
}

export type KeyMomentType = 'insight' | 'objection' | 'breakthrough' | 'confusion' | 'engagement_peak';

export interface KeyMoment {
  timestamp_seconds: number;
  type: KeyMomentType;
  description: string;
  quote?: string;
}

// Database record types

export interface InterviewEvaluation {
  id: string;
  interview_id: string;
  agent_id: string;
  overall_score: number;
  goal_achievement_score: number | null;
  conversation_quality_score: number | null;
  user_engagement_score: number | null;
  prompt_adherence_score: number | null;
  metrics: EvaluationMetrics;
  issues: EvaluationIssue[];
  recommendations: Recommendation[];
  transcript_summary: string | null;
  key_moments: KeyMoment[];
  eval_model: string;
  eval_duration_ms: number | null;
  eval_version: string;
  created_at: string;
}

export type AgentHealth = 'healthy' | 'needs_attention' | 'critical' | 'no_data';
export type ScoreTrend = 'improving' | 'stable' | 'declining';

export interface AgentPerformanceSnapshot {
  id: string;
  agent_id: string;
  snapshot_date: string;
  total_interviews: number;
  completed_interviews: number;
  avg_overall_score: number | null;
  avg_goal_achievement: number | null;
  avg_conversation_quality: number | null;
  avg_user_engagement: number | null;
  avg_prompt_adherence: number | null;
  score_distribution: {
    excellent: number;
    good: number;
    needs_improvement: number;
    poor: number;
  };
  issue_counts: Record<string, number>;
  top_issues: Array<{ type: string; count: number }>;
  score_trend: ScoreTrend | null;
  trend_percentage: number | null;
  created_at: string;
}

export type AlertType = 'score_drop' | 'repeated_issue' | 'critical_failure' | 'engagement_crisis' | 'system_error';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export interface EvaluationAlert {
  id: string;
  agent_id: string;
  interview_id: string | null;
  evaluation_id: string | null;
  alert_type: AlertType;
  severity: IssueSeverity;
  title: string;
  description: string;
  context: Record<string, any>;
  status: AlertStatus;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

// API Response types

export interface PerformanceDashboardResponse {
  period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  platform: {
    total_agents: number;
    healthy: number;
    needs_attention: number;
    critical: number;
    avg_score: number | null;
    open_alerts: number;
  };
  agents: Array<{
    id: string;
    name: string;
    slug: string;
    company_name: string;
    total_interviews: number;
    completed_interviews: number;
    evaluated_interviews: number;
    avg_score: number | null;
    health: AgentHealth;
    trend: ScoreTrend | null;
    open_alerts: number;
    last_evaluation: string | null;
    score_breakdown: {
      goal_achievement: number;
      conversation_quality: number;
      user_engagement: number;
      prompt_adherence: number;
    } | null;
  }>;
}

export interface AgentDrilldownResponse {
  agent: {
    id: string;
    name: string;
    slug: string;
    company_name: string;
    interview_purpose: string;
    target_interviewees: string;
    interviewer_tone: string;
    total_interviews: number;
    completed_interviews: number;
    status: string;
  };
  period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  summary: {
    evaluated_interviews: number;
    avg_scores: {
      overall: number;
      goal_achievement: number;
      conversation_quality: number;
      user_engagement: number;
      prompt_adherence: number;
    } | null;
    score_distribution: {
      excellent: number;
      good: number;
      needs_improvement: number;
      poor: number;
    };
    health: AgentHealth;
  };
  trends: {
    daily_scores: Array<{
      date: string;
      avg_score: number;
      count: number;
    }>;
    snapshots: AgentPerformanceSnapshot[];
  };
  issues: {
    top_issues: Array<{
      type: string;
      count: number;
      percentage: number;
      examples: Array<{
        message: string;
        severity: IssueSeverity;
        interview_id: string;
      }>;
    }>;
    total_issues: number;
  };
  recommendations: Array<Recommendation & { frequency: number }>;
  alerts: {
    open: EvaluationAlert[];
    count: number;
  };
  recent_evaluations: Array<{
    id: string;
    interview_id: string;
    overall_score: number;
    summary: string;
    issues_count: number;
    created_at: string;
  }>;
}

export interface AlertsResponse {
  alerts: Array<EvaluationAlert & {
    agents: {
      id: string;
      name: string;
      slug: string;
      company_name: string;
    };
  }>;
  summary: {
    critical: number;
    warning: number;
    info: number;
    total: number;
  };
}
