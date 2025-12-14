# AI Interview Agents - Evaluation System

## Overview

This evaluation system automatically runs on **every completed interview**, feeding performance metrics back into a **superadmin dashboard** for platform-wide monitoring and improvement.

**This is for YOU (platform operator) - not for clients.** You manage the entire system from one view.

```
┌────────────────────────────────────────────────────────────────────┐
│                     SUPERADMIN DASHBOARD                           │
│                    (Master Template Level)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   YOU (Platform Operator)                                          │
│         │                                                          │
│         ▼                                                          │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │              /admin  (Protected)                          │    │
│   │  ┌─────────┬─────────┬─────────┬─────────┐               │    │
│   │  │Platform │ Clients │ Agents  │ Alerts  │               │    │
│   │  └─────────┴─────────┴─────────┴─────────┘               │    │
│   │                                                           │    │
│   │  Client A (Acme Corp)                                     │    │
│   │    ├─ Agent: Customer Feedback    [85%] ✓                │    │
│   │    └─ Agent: Exit Interviews      [62%] ⚠                │    │
│   │                                                           │    │
│   │  Client B (TechStart)                                     │    │
│   │    ├─ Agent: User Research        [91%] ✓                │    │
│   │    └─ Agent: Lead Qualification   [45%] ✗ 3 alerts       │    │
│   │                                                           │    │
│   │  Client C (GlobalFin)                                     │    │
│   │    └─ Agent: Compliance Screen    [78%] ✓                │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EVALUATION FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Interview Completes                                               │
│         │                                                           │
│         ▼                                                           │
│   ┌───────────────┐                                                 │
│   │ /api/interview│─────┐                                           │
│   │   /complete   │     │                                           │
│   └───────────────┘     │ Triggers (async)                          │
│                         │                                           │
│                         ▼                                           │
│              ┌───────────────────┐                                  │
│              │   Eval Runner     │                                  │
│              │   (Claude API)    │                                  │
│              └────────┬──────────┘                                  │
│                       │                                             │
│         ┌─────────────┼─────────────┐                               │
│         ▼             ▼             ▼                               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                           │
│   │ Scores   │ │ Issues   │ │ Alerts   │                           │
│   │ Stored   │ │ Logged   │ │ Created  │                           │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘                           │
│        │            │            │                                  │
│        └────────────┴────────────┘                                  │
│                     │                                               │
│                     ▼                                               │
│         ┌───────────────────────┐                                   │
│         │   Dashboard APIs      │                                   │
│         │  /api/dashboard/*     │                                   │
│         └───────────┬───────────┘                                   │
│                     │                                               │
│                     ▼                                               │
│         ┌───────────────────────┐                                   │
│         │   Performance        │                                    │
│         │   Dashboard UI       │                                    │
│         └───────────────────────┘                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Architecture

### Multi-Tenant Superadmin Model

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED INFRASTRUCTURE                     │
│                                                              │
│  Supabase (1 project)          Vercel (1 deployment)        │
│  ├─ clients table              └─ aiagentinterviews.com     │
│  ├─ agents table (client_id)       ├─ /admin (you only)     │
│  ├─ interviews table               ├─ /create (clients)     │
│  ├─ interview_evaluations ◄────────┤ /i/[slug] (public)     │
│  ├─ agent_performance_snapshots    └─ /api/...              │
│  └─ evaluation_alerts                                        │
│                                                              │
│  ElevenLabs (shared)                                         │
│  ├─ 1 Setup Agent (reused)                                  │
│  └─ N Interview Agents (per client agent)                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

Every interview completion triggers evaluation → results aggregate to your admin dashboard:

```
Client's User Takes Interview
         │
         ▼
   Interview Completes ───► /api/interview/complete
         │
         ▼
   Eval Runner (Claude) ───► Scores, Issues, Recommendations
         │
         ├──► interview_evaluations table
         ├──► evaluation_alerts (if critical)
         └──► agent_performance_snapshots (daily)
                    │
                    ▼
            /admin Dashboard ◄─── YOU monitor everything
```

### 1. Database Schema (`migrations/20241215100000_evaluation_system.sql`)

| Table | Purpose |
|-------|---------|
| `interview_evaluations` | Stores per-interview scores, metrics, issues, recommendations |
| `agent_performance_snapshots` | Daily aggregates per agent |
| `platform_performance_snapshots` | Daily platform-wide metrics |
| `evaluation_alerts` | Real-time alerts for critical issues |

### 2. Evaluation Runner (`lib/eval-runner.ts`)

The core service that:
- Fetches interview transcript and agent config
- Sends to Claude for comprehensive evaluation
- Stores results in database
- Creates alerts for critical issues
- Updates daily aggregates

**Evaluated Dimensions:**
| Dimension | What It Measures |
|-----------|------------------|
| Goal Achievement | Did the agent cover required topics? Extract insights? |
| Conversation Quality | Follow-up quality, relevance, flow |
| User Engagement | Response length, sentiment progression, dropout risk |
| Prompt Adherence | Tone match, stayed on topic, followed constraints |

### 3. API Routes

**Public/Client Routes:**
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/interview/complete` | POST | Marks interview done, triggers eval |

**Admin Routes (Protected):**
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/performance` | GET | Platform-wide stats, all clients, all agents |
| `/api/admin/agents/[id]` | GET | Detailed agent drill-down |
| `/api/admin/alerts` | GET/PATCH/POST | Manage alerts across all clients |

All admin routes require `x-admin-key` header matching `ADMIN_SECRET_KEY` env var.

### 5. Dashboard Components (Admin Only)

| Component | Purpose |
|-----------|---------|
| `SuperAdminDashboard` | Platform-wide view: all clients, all agents, alerts |
| `AgentDrilldown` | Detailed agent analysis with issues & recommendations |
| `AdminPage` | Protected login + dashboard wrapper |

Access at: `https://yourdomain.com/admin`

## Installation

### 1. Run the migration

```sql
-- In Supabase SQL Editor, run:
-- migrations/20241215100000_evaluation_system.sql
```

### 2. Copy files to your project

```
your-project/
├── lib/
│   └── eval-runner.ts           
├── app/
│   ├── api/
│   │   ├── interview/
│   │   │   └── complete/
│   │   │       └── route.ts     ← Replace existing
│   │   └── admin/               ← NEW admin routes
│   │       ├── performance/
│   │       │   └── route.ts     
│   │       ├── agents/
│   │       │   └── [agentId]/
│   │       │       └── route.ts 
│   │       └── alerts/
│   │           └── route.ts     
│   └── admin/                   ← NEW admin page
│       └── page.tsx             
└── components/
    ├── admin/
    │   └── SuperAdminDashboard.tsx
    └── dashboard/
        └── AgentDrilldown.tsx
```

### 3. Install dependencies

```bash
npm install @anthropic-ai/sdk
```

### 4. Environment variables

```env
# Already required
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# NEW - Admin access
ADMIN_SECRET_KEY=your-secure-random-key-here
```

**Generate a secure admin key:**
```bash
openssl rand -hex 32
```

### 5. Access your admin dashboard

1. Go to `https://yourdomain.com/admin`
2. Enter your `ADMIN_SECRET_KEY`
3. Monitor all clients and agents from one view

## How It Works

### Automatic Evaluation Flow

1. **Interview completes** → `/api/interview/complete` called
2. **Status updated** → Interview marked as `completed`
3. **Eval triggered** → `evalRunner.evaluateInterview()` runs async
4. **Claude analyzes** → Full transcript evaluated against agent config
5. **Results stored** → Scores, issues, recommendations saved
6. **Alerts created** → Critical issues trigger alerts
7. **Aggregates updated** → Daily snapshots refreshed

### Evaluation Criteria

The evaluation prompt instructs Claude to score on:

**Goal Achievement (0-100)**
- Were required topics covered?
- How many key insights extracted?
- What was missed?

**Conversation Quality (0-100)**
- Quality of follow-up questions
- Relevance of responses
- Natural conversation flow

**User Engagement (0-100)**
- User response length trends
- Sentiment progression
- Dropout risk detection

**Prompt Adherence (0-100)**
- Tone match (formal/casual)
- Stayed within topic bounds
- Followed constraints

### Issue Types

| Type | Description |
|------|-------------|
| `goal_missed` | Required topic not covered |
| `off_topic` | Agent strayed from interview purpose |
| `tone_violation` | Wrong tone for context |
| `engagement_drop` | User disengagement detected |
| `technical_error` | System/flow issues |

### Alert Types

| Type | Trigger |
|------|---------|
| `critical_failure` | Score below 50% |
| `repeated_issue` | Same issue 3+ times |
| `score_drop` | Sudden decline in scores |
| `engagement_crisis` | Multiple dropouts |

## Dashboard Features

### Platform View
- Health status of all agents (Healthy/Needs Attention/Critical)
- Platform average score
- Open alerts count
- Score trends

### Agent Drill-down
- Overall score with breakdown
- Score distribution (excellent/good/needs improvement/poor)
- Daily score trend chart
- Top issues with examples
- AI-generated recommendations
- Recent evaluation summaries
- Open alerts with resolve action

## Customization

### Adjust Evaluation Criteria

Edit the `EVALUATION_PROMPT` in `lib/eval-runner.ts`:

```typescript
const EVALUATION_PROMPT = `
  // Customize scoring guidelines
  // Add domain-specific criteria
  // Adjust issue types
`;
```

### Change Alert Thresholds

In `eval-runner.ts`, modify `checkForAlerts()`:

```typescript
// Currently: alerts if score < 50
if (evaluation.overall_score < 50) { ... }

// Change to 60:
if (evaluation.overall_score < 60) { ... }
```

### Add Custom Metrics

1. Extend the `metrics` JSONB column schema
2. Update the evaluation prompt to capture new metrics
3. Add UI components to display them

## API Reference

### GET /api/dashboard/performance

```typescript
// Query params
?days=7  // 7, 14, 30, or 90

// Response
{
  period: { days: 7, start_date: "...", end_date: "..." },
  platform: {
    total_agents: 10,
    healthy: 7,
    needs_attention: 2,
    critical: 1,
    avg_score: 78,
    open_alerts: 3
  },
  agents: [
    {
      id: "uuid",
      name: "Customer Feedback Agent",
      avg_score: 85,
      health: "healthy",
      trend: "improving",
      open_alerts: 0,
      score_breakdown: { ... }
    }
  ]
}
```

### GET /api/dashboard/agents/[agentId]

```typescript
// Query params
?days=30

// Response
{
  agent: { id, name, ... },
  summary: {
    evaluated_interviews: 50,
    avg_scores: { overall: 78, goal_achievement: 82, ... },
    score_distribution: { excellent: 10, good: 25, ... },
    health: "healthy"
  },
  trends: {
    daily_scores: [{ date: "2024-12-01", avg_score: 80, count: 5 }, ...]
  },
  issues: {
    top_issues: [
      { type: "goal_missed", count: 5, percentage: 10, examples: [...] }
    ]
  },
  recommendations: [
    { type: "prompt_improvement", priority: "high", suggestion: "...", expected_impact: "..." }
  ],
  alerts: { open: [...], count: 2 },
  recent_evaluations: [...]
}
```

## Cost Considerations

Each evaluation uses one Claude API call (~4K tokens input, ~2K output).

| Interviews/day | Eval calls/month | Est. cost/month |
|----------------|------------------|-----------------|
| 10 | 300 | ~$3 |
| 100 | 3,000 | ~$30 |
| 1,000 | 30,000 | ~$300 |

To reduce costs:
- Skip very short interviews (< 2 minutes)
- Batch evaluations during off-peak
- Use Haiku for initial triage, Sonnet for deep analysis

## Roadmap

- [ ] Webhook notifications for alerts
- [ ] Email digests of daily performance
- [ ] A/B testing for prompt improvements
- [ ] Automatic prompt suggestions based on issues
- [ ] Comparison view (agent vs agent)
- [ ] Export reports (PDF/CSV)
