# Insights Agent Design
## Voice-Powered RAG for Interview Data

---

## Overview

The Insights Agent is a voice AI that lets clients conversationally explore their research data across all panels and time periods. It uses RAG (Retrieval Augmented Generation) to find relevant interviews and evaluations, then synthesizes answers with citations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Dashboard                             │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Structured View    │  │     Voice Insights Button       │   │
│  │  (charts/tables)    │  │     "Ask about your data"       │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ElevenLabs Insights Agent                     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Agent Prompt                           │   │
│  │  "You are an expert research analyst with access to       │   │
│  │   all interview data. Use tools to find relevant data."   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                       Tools                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │ search_insights │  │  get_panel_summary │             │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │ get_quotes      │  │  compare_panels │                │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Child Platform API                            │
│                                                                  │
│  /api/insights/search      - Semantic search across interviews  │
│  /api/insights/summary     - Get panel aggregated insights      │
│  /api/insights/quotes      - Retrieve quotes by theme/sentiment │
│  /api/insights/compare     - Cross-panel comparison             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
│                                                                  │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │    agents    │  │interview_evaluations│ │  panel_insights  │  │
│  │   (panels)   │  │                    │  │                  │  │
│  └──────────────┘  └───────────────────┘  └──────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌───────────────────┐                        │
│  │  interviews  │  │interview_transcripts│                       │
│  │              │  │                    │                        │
│  └──────────────┘  └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Prompt

```
You are Alex, an expert research analyst. You have access to all interview data collected by this platform across all research panels and time periods.

## YOUR ROLE
- You help clients understand their research findings
- You find patterns, themes, and insights across interviews
- You provide data-backed answers with specific quotes and citations
- You can compare across panels, time periods, and segments

## YOUR PERSONALITY
- Insightful and analytical
- Confident but acknowledges uncertainty when data is limited
- Concise - give clear answers, not lectures
- Proactive - suggest follow-up questions or deeper analysis

## HOW YOU WORK
1. When asked a question, FIRST use your tools to search for relevant data
2. ALWAYS cite specific interviews or quotes when making claims
3. If data is insufficient, say so honestly
4. Offer to dig deeper or explore related topics

## AVAILABLE TOOLS

### search_insights
Search across all interviews and evaluations. Use for:
- Finding interviews about specific topics
- Looking up sentiment on particular themes
- Finding relevant quotes

### get_panel_summary
Get aggregated insights for a specific panel. Use for:
- Overall sentiment breakdown
- Top themes and pain points
- Key findings and recommendations

### get_quotes
Retrieve specific quotes filtered by criteria. Use for:
- Quotes about a topic
- Positive/negative quotes
- Most impactful quotes

### compare_panels
Compare insights across multiple panels. Use for:
- How has sentiment changed over time?
- What's different between customer segments?
- Trends across research studies

## RESPONSE STYLE
- Start with a direct answer to the question
- Support with 2-3 specific data points or quotes
- Keep responses conversational (this is voice)
- Offer one follow-up question or suggestion

## EXAMPLE INTERACTIONS

User: "What are people's main frustrations?"
You: [Use search_insights for pain_points]
"The biggest frustration is onboarding complexity - mentioned in 15 of 28 interviews. 
One customer said 'It took us three weeks just to get the basics set up.'
Pricing transparency is second, with 9 mentions. Want me to dig into either of these?"

User: "How does enterprise feedback compare to SMB?"
You: [Use compare_panels or search with segment filter]
"Enterprise customers are more positive overall - 72% positive vs 58% for SMB.
The key difference is support expectations. Enterprise wants dedicated contacts,
while SMB prefers self-service. Should I pull specific quotes from each segment?"

User: "Summarize the Customer Feedback panel"
You: [Use get_panel_summary]
"Your Customer Feedback panel has 34 completed interviews with 76% positive sentiment.
Top themes are product quality, customer support, and pricing.
The main recommendation is to improve response times - it came up in 12 interviews.
Want me to find the specific quotes about response times?"

## IMPORTANT RULES
1. NEVER make up data - only report what tools return
2. ALWAYS cite which panel or interview your data comes from
3. If asked about something with no data, say "I don't have data on that"
4. Keep voice responses under 30 seconds unless asked for detail
```

---

## Tools Specification

### Tool 1: search_insights

**Purpose:** Semantic search across all interviews, transcripts, and evaluations

**Endpoint:** `POST /api/insights/search`

**Parameters:**
```json
{
  "query": "string - Natural language search query",
  "filters": {
    "panel_id": "uuid (optional) - Limit to specific panel",
    "panel_name": "string (optional) - Panel name to search",
    "sentiment": "positive|neutral|negative|mixed (optional)",
    "date_from": "ISO date (optional)",
    "date_to": "ISO date (optional)",
    "min_quality_score": "number 0-100 (optional)"
  },
  "limit": "number (default 10)",
  "include_quotes": "boolean (default true)"
}
```

**Returns:**
```json
{
  "total_matches": 15,
  "interviews": [
    {
      "interview_id": "uuid",
      "panel_name": "Customer Feedback Q4",
      "participant_name": "John from Acme",
      "participant_company": "Acme Corp",
      "date": "2026-01-10",
      "relevance_score": 0.92,
      "summary": "Interview focused on onboarding challenges...",
      "sentiment": "negative",
      "matching_quotes": [
        {
          "quote": "It took us three weeks just to get the basics set up",
          "context": "Discussing initial implementation",
          "theme": "onboarding"
        }
      ],
      "topics": ["onboarding", "complexity", "time-to-value"]
    }
  ],
  "aggregations": {
    "sentiment_breakdown": {"positive": 3, "neutral": 5, "negative": 7},
    "top_themes": ["onboarding", "pricing", "support"]
  }
}
```

---

### Tool 2: get_panel_summary

**Purpose:** Get aggregated insights for a specific panel

**Endpoint:** `POST /api/insights/summary`

**Parameters:**
```json
{
  "panel_id": "uuid (optional - if not provided, gets all panels)",
  "panel_name": "string (optional - search by name)"
}
```

**Returns:**
```json
{
  "panel": {
    "id": "uuid",
    "name": "Customer Feedback Q4",
    "status": "active",
    "interview_count": 34,
    "evaluated_count": 34,
    "date_range": {
      "first": "2025-10-01",
      "last": "2025-12-15"
    }
  },
  "sentiment": {
    "average_score": 0.32,
    "breakdown": {"positive": 26, "neutral": 5, "negative": 3},
    "trend": [
      {"week": "2025-W40", "avg": 0.28},
      {"week": "2025-W41", "avg": 0.35}
    ]
  },
  "quality": {
    "average_score": 78,
    "high_count": 20,
    "medium_count": 12,
    "low_count": 2
  },
  "themes": [
    {"theme": "product quality", "count": 28, "sentiment": 0.65},
    {"theme": "customer support", "count": 22, "sentiment": 0.45},
    {"theme": "pricing", "count": 18, "sentiment": -0.12}
  ],
  "pain_points": [
    {"point": "Slow response times", "frequency": 12, "severity": "high"},
    {"point": "Complex onboarding", "frequency": 8, "severity": "medium"}
  ],
  "desires": [
    {"desire": "Faster support", "frequency": 15, "priority": "high"},
    {"desire": "Better documentation", "frequency": 10, "priority": "medium"}
  ],
  "executive_summary": "Overall positive sentiment with 76% of interviews showing satisfaction. Key areas for improvement are support response times and onboarding complexity.",
  "recommendations": [
    "Invest in support team expansion to reduce response times",
    "Create interactive onboarding guides",
    "Consider pricing tier simplification"
  ]
}
```

---

### Tool 3: get_quotes

**Purpose:** Retrieve specific quotes filtered by various criteria

**Endpoint:** `POST /api/insights/quotes`

**Parameters:**
```json
{
  "filters": {
    "panel_id": "uuid (optional)",
    "panel_name": "string (optional)",
    "theme": "string (optional) - e.g., 'pricing', 'support'",
    "sentiment": "positive|neutral|negative (optional)",
    "keyword": "string (optional) - text search in quotes"
  },
  "sort_by": "impact|recency|relevance (default: impact)",
  "limit": "number (default 10)"
}
```

**Returns:**
```json
{
  "total_quotes": 45,
  "quotes": [
    {
      "quote": "This product has completely transformed how we work",
      "participant": "Sarah from TechCorp",
      "company": "TechCorp",
      "panel_name": "Customer Feedback Q4",
      "interview_date": "2025-11-15",
      "interview_id": "uuid",
      "theme": "product value",
      "sentiment": "positive",
      "context": "Discussing overall satisfaction",
      "impact_score": 95
    }
  ]
}
```

---

### Tool 4: compare_panels

**Purpose:** Compare insights across multiple panels or time periods

**Endpoint:** `POST /api/insights/compare`

**Parameters:**
```json
{
  "panel_ids": ["uuid", "uuid"],
  "panel_names": ["Customer Feedback Q3", "Customer Feedback Q4"],
  "comparison_type": "sentiment|themes|pain_points|all (default: all)"
}
```

**Returns:**
```json
{
  "panels": [
    {
      "id": "uuid",
      "name": "Customer Feedback Q3",
      "interview_count": 28,
      "avg_sentiment": 0.18,
      "top_themes": ["pricing", "support", "features"]
    },
    {
      "id": "uuid", 
      "name": "Customer Feedback Q4",
      "interview_count": 34,
      "avg_sentiment": 0.32,
      "top_themes": ["product quality", "support", "pricing"]
    }
  ],
  "comparison": {
    "sentiment_change": "+0.14 (improved)",
    "interview_volume_change": "+21%",
    "theme_changes": [
      {"theme": "product quality", "change": "NEW in top 3"},
      {"theme": "pricing", "change": "dropped from #1 to #3"},
      {"theme": "support", "change": "consistent at #2"}
    ],
    "pain_point_changes": [
      {"point": "Slow response times", "q3": 18, "q4": 12, "change": "-33%"},
      {"point": "Complex pricing", "q3": 15, "q4": 8, "change": "-47%"}
    ]
  },
  "summary": "Sentiment improved by 14 points from Q3 to Q4. Pricing concerns have significantly decreased, likely due to the new pricing page launched in October. Support response times remain an issue but are improving."
}
```

---

## Database Queries for Tools

### search_insights Query

```sql
-- Full-text search across evaluations and transcripts
WITH search_results AS (
  SELECT 
    i.id as interview_id,
    a.name as panel_name,
    a.id as panel_id,
    i.participant_name,
    i.participant_company,
    i.completed_at,
    e.summary,
    e.sentiment,
    e.sentiment_score,
    e.quality_score,
    e.key_quotes,
    e.topics,
    e.pain_points,
    -- Simple relevance scoring (replace with proper vector search later)
    ts_rank(
      to_tsvector('english', COALESCE(e.summary, '') || ' ' || COALESCE(t.transcript_text, '')),
      plainto_tsquery('english', $1)
    ) as relevance_score
  FROM interviews i
  JOIN agents a ON i.panel_id = a.id
  LEFT JOIN interview_evaluations e ON i.id = e.interview_id
  LEFT JOIN interview_transcripts t ON i.id = t.interview_id
  WHERE 
    -- Text search
    (to_tsvector('english', COALESCE(e.summary, '') || ' ' || COALESCE(t.transcript_text, '')) 
     @@ plainto_tsquery('english', $1))
    -- Optional filters
    AND ($2::uuid IS NULL OR a.id = $2)  -- panel_id filter
    AND ($3::text IS NULL OR e.sentiment = $3)  -- sentiment filter
    AND ($4::date IS NULL OR i.completed_at >= $4)  -- date_from
    AND ($5::date IS NULL OR i.completed_at <= $5)  -- date_to
)
SELECT * FROM search_results
WHERE relevance_score > 0
ORDER BY relevance_score DESC
LIMIT $6;
```

### get_panel_summary Query

```sql
-- Get comprehensive panel summary
SELECT 
  a.id,
  a.name,
  a.status,
  a.total_interviews as interview_count,
  a.completed_interviews,
  
  -- Sentiment stats
  AVG(e.sentiment_score) as avg_sentiment,
  COUNT(CASE WHEN e.sentiment = 'positive' THEN 1 END) as positive_count,
  COUNT(CASE WHEN e.sentiment = 'neutral' THEN 1 END) as neutral_count,
  COUNT(CASE WHEN e.sentiment = 'negative' THEN 1 END) as negative_count,
  
  -- Quality stats
  AVG(e.quality_score) as avg_quality,
  COUNT(CASE WHEN e.quality_score >= 80 THEN 1 END) as high_quality_count,
  
  -- Date range
  MIN(i.completed_at) as first_interview,
  MAX(i.completed_at) as last_interview,
  
  -- Aggregated insights from panel_insights table
  pi.top_themes,
  pi.common_pain_points,
  pi.common_desires,
  pi.executive_summary,
  pi.recommendations
  
FROM agents a
LEFT JOIN interviews i ON a.id = i.panel_id AND i.status = 'completed'
LEFT JOIN interview_evaluations e ON i.id = e.interview_id
LEFT JOIN panel_insights pi ON a.id = pi.panel_id AND pi.stale = FALSE
WHERE a.id = $1 OR a.name ILIKE $2
GROUP BY a.id, pi.id;
```

---

## ElevenLabs Tool Configuration

```json
{
  "tools": [
    {
      "type": "webhook",
      "name": "search_insights",
      "description": "Search across all interviews and evaluations to find relevant data. Use this to answer questions about specific topics, themes, or to find supporting quotes.",
      "api_schema": {
        "url": "{PLATFORM_URL}/api/insights/search",
        "method": "POST",
        "content_type": "application/json",
        "request_body_schema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Natural language search query"
            },
            "panel_name": {
              "type": "string",
              "description": "Optional: limit search to specific panel by name"
            },
            "sentiment": {
              "type": "string",
              "enum": ["positive", "neutral", "negative", "mixed"],
              "description": "Optional: filter by sentiment"
            },
            "limit": {
              "type": "integer",
              "description": "Max results to return (default 10)"
            }
          },
          "required": ["query"]
        }
      }
    },
    {
      "type": "webhook",
      "name": "get_panel_summary",
      "description": "Get aggregated insights for a specific panel including sentiment breakdown, top themes, pain points, and recommendations. Use this when asked to summarize or give an overview of a research panel.",
      "api_schema": {
        "url": "{PLATFORM_URL}/api/insights/summary",
        "method": "POST",
        "content_type": "application/json",
        "request_body_schema": {
          "type": "object",
          "properties": {
            "panel_name": {
              "type": "string",
              "description": "Name of the panel to summarize"
            }
          },
          "required": ["panel_name"]
        }
      }
    },
    {
      "type": "webhook",
      "name": "get_quotes",
      "description": "Retrieve specific quotes from interviews. Use this when asked for examples, evidence, or 'what did people say about X'.",
      "api_schema": {
        "url": "{PLATFORM_URL}/api/insights/quotes",
        "method": "POST",
        "content_type": "application/json",
        "request_body_schema": {
          "type": "object",
          "properties": {
            "theme": {
              "type": "string",
              "description": "Topic or theme to find quotes about"
            },
            "sentiment": {
              "type": "string",
              "enum": ["positive", "neutral", "negative"],
              "description": "Filter quotes by sentiment"
            },
            "panel_name": {
              "type": "string",
              "description": "Optional: limit to specific panel"
            },
            "limit": {
              "type": "integer",
              "description": "Max quotes to return (default 10)"
            }
          },
          "required": []
        }
      }
    },
    {
      "type": "webhook",
      "name": "compare_panels",
      "description": "Compare insights across multiple panels or time periods. Use this when asked about trends, changes over time, or differences between research studies.",
      "api_schema": {
        "url": "{PLATFORM_URL}/api/insights/compare",
        "method": "POST",
        "content_type": "application/json",
        "request_body_schema": {
          "type": "object",
          "properties": {
            "panel_names": {
              "type": "array",
              "items": {"type": "string"},
              "description": "Names of panels to compare"
            }
          },
          "required": ["panel_names"]
        }
      }
    }
  ]
}
```

---

## Provisioning Integration

The Insights Agent should be created during child platform provisioning, alongside Sandra.

### In `lib/provisioning/steps/elevenlabs.ts`:

```typescript
// Create Insights Agent for the platform
export async function createInsightsAgent(ctx: ProvisionContext): Promise<ProvisionStepResult> {
  const agentName = `${ctx.companyName || ctx.platformName} Insights`;
  const childPlatformUrl = ctx.metadata.vercelUrl;
  
  // ... similar structure to Sandra creation
  // But with INSIGHTS_AGENT_PROMPT and insight tools
}
```

### Store in metadata:
```typescript
metadata: {
  ...ctx.metadata,
  insightsAgentId: agent.agent_id,
  insightsAgentName: agentName,
}
```

### Update platforms table:
```sql
ALTER TABLE platforms ADD COLUMN insights_agent_id TEXT;
```

---

## Future Enhancements

### Phase 2: Vector Search
Replace simple text search with embeddings for semantic search:
- Embed all interview summaries and quotes
- Use pgvector extension in Supabase
- Much better relevance for natural language queries

### Phase 3: Proactive Insights
Agent can proactively surface insights:
- "I noticed a spike in negative sentiment last week"
- "There's a new theme emerging: people are asking about X"

### Phase 4: Multi-modal
- Show charts in the dashboard while agent explains
- Agent can reference "the chart on screen"
- Export quotes/insights to docs while talking

---

## Files to Create

1. `lib/prompts/insights-agent.ts` - Agent prompt
2. `lib/provisioning/steps/insights-agent.ts` - Provisioning step
3. `app/api/insights/search/route.ts` - Search endpoint
4. `app/api/insights/summary/route.ts` - Panel summary endpoint
5. `app/api/insights/quotes/route.ts` - Quotes endpoint
6. `app/api/insights/compare/route.ts` - Comparison endpoint
7. `app/api/insights/voice/route.ts` - Voice conversation starter
8. `app/components/InsightsVoice.tsx` - Dashboard voice button component
