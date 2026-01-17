-- ============================================================================
-- VECTOR SEARCH EXTENSION FOR INSIGHTS
-- ============================================================================
-- Adds pgvector support for semantic search across interviews
-- Run this AFTER the main schema migration
-- ============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- EMBEDDING TABLES
-- ============================================================================

-- Interview-level embeddings (summary + key content)
CREATE TABLE IF NOT EXISTS interview_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE UNIQUE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- The text that was embedded
  content_text TEXT NOT NULL,

  -- The embedding vector (1024 dimensions for voyage-3.5)
  embedding vector(1024),

  -- Metadata for filtering
  sentiment TEXT,
  quality_score INTEGER,

  -- Tracking
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote-level embeddings (for finding specific quotes)
CREATE TABLE IF NOT EXISTS quote_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  evaluation_id UUID REFERENCES interview_evaluations(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES agents(id) ON DELETE CASCADE,

  -- The quote content
  quote_text TEXT NOT NULL,
  context TEXT,
  theme TEXT,

  -- The embedding vector
  embedding vector(1024),

  -- Tracking
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR VECTOR SEARCH
-- ============================================================================

-- IVFFlat index for fast approximate nearest neighbor search
-- Lists = sqrt(n) where n is expected number of rows, minimum 100
CREATE INDEX IF NOT EXISTS idx_interview_embeddings_vector
ON interview_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_quote_embeddings_vector
ON quote_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Regular indexes for filtering
CREATE INDEX IF NOT EXISTS idx_interview_embeddings_panel ON interview_embeddings(panel_id);
CREATE INDEX IF NOT EXISTS idx_interview_embeddings_sentiment ON interview_embeddings(sentiment);
CREATE INDEX IF NOT EXISTS idx_quote_embeddings_interview ON quote_embeddings(interview_id);
CREATE INDEX IF NOT EXISTS idx_quote_embeddings_panel ON quote_embeddings(panel_id);

-- ============================================================================
-- SEARCH FUNCTIONS
-- ============================================================================

-- Search interviews by vector similarity
CREATE OR REPLACE FUNCTION search_interview_embeddings(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 10,
  filter_panel_id UUID DEFAULT NULL,
  filter_sentiment TEXT DEFAULT NULL,
  filter_date_from TIMESTAMPTZ DEFAULT NULL,
  filter_date_to TIMESTAMPTZ DEFAULT NULL,
  filter_min_quality INT DEFAULT NULL
)
RETURNS TABLE (
  interview_id UUID,
  panel_id UUID,
  panel_name TEXT,
  participant_name TEXT,
  participant_company TEXT,
  completed_at TIMESTAMPTZ,
  summary TEXT,
  sentiment TEXT,
  sentiment_score DECIMAL,
  quality_score INT,
  topics JSONB,
  pain_points JSONB,
  desires JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.interview_id,
    ie.panel_id,
    a.name AS panel_name,
    i.participant_name,
    i.participant_company,
    i.completed_at,
    ev.summary,
    ev.sentiment,
    ev.sentiment_score,
    ev.quality_score::INT,
    ev.topics,
    ev.pain_points,
    ev.desires,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM interview_embeddings ie
  JOIN interviews i ON ie.interview_id = i.id
  JOIN agents a ON ie.panel_id = a.id
  LEFT JOIN interview_evaluations ev ON i.id = ev.interview_id
  WHERE
    -- Similarity threshold
    1 - (ie.embedding <=> query_embedding) > match_threshold
    -- Optional filters
    AND (filter_panel_id IS NULL OR ie.panel_id = filter_panel_id)
    AND (filter_sentiment IS NULL OR ie.sentiment = filter_sentiment)
    AND (filter_date_from IS NULL OR i.completed_at >= filter_date_from)
    AND (filter_date_to IS NULL OR i.completed_at <= filter_date_to)
    AND (filter_min_quality IS NULL OR ie.quality_score >= filter_min_quality)
    AND i.status = 'completed'
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Search quotes by vector similarity
CREATE OR REPLACE FUNCTION search_quote_embeddings(
  query_embedding vector(1024),
  match_threshold FLOAT DEFAULT 0.25,
  match_count INT DEFAULT 10,
  filter_interview_id UUID DEFAULT NULL,
  filter_panel_id UUID DEFAULT NULL,
  filter_theme TEXT DEFAULT NULL
)
RETURNS TABLE (
  quote_id UUID,
  interview_id UUID,
  panel_id UUID,
  quote_text TEXT,
  context TEXT,
  theme TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qe.id AS quote_id,
    qe.interview_id,
    qe.panel_id,
    qe.quote_text,
    qe.context,
    qe.theme,
    1 - (qe.embedding <=> query_embedding) AS similarity
  FROM quote_embeddings qe
  WHERE
    1 - (qe.embedding <=> query_embedding) > match_threshold
    AND (filter_interview_id IS NULL OR qe.interview_id = filter_interview_id)
    AND (filter_panel_id IS NULL OR qe.panel_id = filter_panel_id)
    AND (filter_theme IS NULL OR qe.theme ILIKE '%' || filter_theme || '%')
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- EMBEDDING GENERATION TRACKING
-- ============================================================================

-- Track which interviews need embeddings generated
CREATE OR REPLACE VIEW v_interviews_needing_embeddings AS
SELECT
  i.id AS interview_id,
  i.panel_id,
  i.completed_at,
  ev.summary,
  ev.topics,
  ev.pain_points,
  ev.desires,
  ev.key_quotes
FROM interviews i
JOIN interview_evaluations ev ON i.id = ev.interview_id
LEFT JOIN interview_embeddings ie ON i.id = ie.interview_id
WHERE
  i.status = 'completed'
  AND ev.summary IS NOT NULL
  AND ie.id IS NULL
ORDER BY i.completed_at DESC;

-- Track which quotes need embeddings generated (fixed syntax)
CREATE OR REPLACE VIEW v_quotes_needing_embeddings AS
SELECT
  sub.evaluation_id,
  sub.interview_id,
  sub.panel_id,
  sub.quote,
  sub.context,
  sub.theme
FROM (
  SELECT
    ev.id AS evaluation_id,
    ev.interview_id,
    ev.panel_id,
    q.quote,
    q.context,
    q.theme
  FROM interview_evaluations ev
  CROSS JOIN LATERAL jsonb_to_recordset(ev.key_quotes) AS q(quote TEXT, context TEXT, theme TEXT)
  WHERE q.quote IS NOT NULL AND LENGTH(q.quote) > 10
) sub
LEFT JOIN quote_embeddings qe ON
  qe.evaluation_id = sub.evaluation_id
  AND qe.quote_text = sub.quote
WHERE qe.id IS NULL;

-- ============================================================================
-- HELPER FUNCTION: Build content for embedding
-- ============================================================================

CREATE OR REPLACE FUNCTION build_interview_embedding_content(
  p_interview_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  content TEXT := '';
  rec RECORD;
BEGIN
  SELECT
    i.participant_name,
    i.participant_company,
    a.name AS panel_name,
    ev.summary,
    ev.sentiment,
    ev.topics,
    ev.pain_points,
    ev.desires
  INTO rec
  FROM interviews i
  JOIN agents a ON i.panel_id = a.id
  LEFT JOIN interview_evaluations ev ON i.id = ev.interview_id
  WHERE i.id = p_interview_id;

  -- Build searchable content
  content := COALESCE(rec.panel_name, '') || '. ';
  content := content || COALESCE('Participant: ' || rec.participant_name, '') || '. ';
  content := content || COALESCE('Company: ' || rec.participant_company, '') || '. ';
  content := content || COALESCE('Summary: ' || rec.summary, '') || ' ';
  content := content || COALESCE('Sentiment: ' || rec.sentiment, '') || '. ';

  -- Add topics
  IF rec.topics IS NOT NULL THEN
    content := content || 'Topics: ' || (
      SELECT string_agg(topic, ', ')
      FROM jsonb_array_elements_text(rec.topics) AS topic
    ) || '. ';
  END IF;

  -- Add pain points
  IF rec.pain_points IS NOT NULL THEN
    content := content || 'Pain points: ' || (
      SELECT string_agg(
        COALESCE(pp->>'point', pp::TEXT),
        ', '
      )
      FROM jsonb_array_elements(rec.pain_points) AS pp
    ) || '. ';
  END IF;

  -- Add desires
  IF rec.desires IS NOT NULL THEN
    content := content || 'Desires: ' || (
      SELECT string_agg(
        COALESCE(d->>'desire', d::TEXT),
        ', '
      )
      FROM jsonb_array_elements(rec.desires) AS d
    ) || '. ';
  END IF;

  RETURN TRIM(content);
END;
$$;

-- ============================================================================
-- TRIGGER: Mark embeddings for regeneration when evaluation changes
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_embedding_for_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing embedding so it gets regenerated
  DELETE FROM interview_embeddings WHERE interview_id = NEW.interview_id;
  DELETE FROM quote_embeddings WHERE evaluation_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_evaluation_embedding_update ON interview_evaluations;
CREATE TRIGGER trg_evaluation_embedding_update
AFTER UPDATE ON interview_evaluations
FOR EACH ROW
WHEN (OLD.summary IS DISTINCT FROM NEW.summary OR OLD.key_quotes IS DISTINCT FROM NEW.key_quotes)
EXECUTE FUNCTION mark_embedding_for_update();