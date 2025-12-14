-- =============================================================================
-- STORAGE BUCKETS AND POLICIES
-- Migration: 20241215000001_storage_buckets.sql
-- =============================================================================

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Transcripts bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts',
  'transcripts',
  false,
  10485760,  -- 10MB
  ARRAY['text/plain', 'application/json']
)
ON CONFLICT (id) DO NOTHING;

-- Recordings bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recordings',
  'recordings',
  false,
  104857600,  -- 100MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Exports bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exports',
  'exports',
  false,
  52428800,  -- 50MB
  ARRAY['text/csv', 'application/json', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Assets bucket (public - for logos, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880,  -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Helper function to extract client_id from path
-- Path format: {client_id}/{interview_id}/filename.ext
CREATE OR REPLACE FUNCTION storage.get_client_from_path(path TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN split_part(path, '/', 1);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRANSCRIPTS BUCKET POLICIES
-- =============================================================================

-- Service role full access
CREATE POLICY "Service role full access transcripts"
ON storage.objects FOR ALL
USING (bucket_id = 'transcripts' AND auth.jwt() ->> 'role' = 'service_role');

-- Clients can read their own transcripts
CREATE POLICY "Clients read own transcripts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'transcripts' 
  AND storage.get_client_from_path(name) = auth.uid()::text
);

-- Clients can upload to their own folder
CREATE POLICY "Clients upload own transcripts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'transcripts'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

-- =============================================================================
-- RECORDINGS BUCKET POLICIES
-- =============================================================================

CREATE POLICY "Service role full access recordings"
ON storage.objects FOR ALL
USING (bucket_id = 'recordings' AND auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Clients read own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

CREATE POLICY "Clients upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recordings'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

-- =============================================================================
-- EXPORTS BUCKET POLICIES
-- =============================================================================

CREATE POLICY "Service role full access exports"
ON storage.objects FOR ALL
USING (bucket_id = 'exports' AND auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Clients read own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'exports'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

CREATE POLICY "Clients upload own exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exports'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

-- =============================================================================
-- ASSETS BUCKET POLICIES (Public bucket)
-- =============================================================================

-- Public read access
CREATE POLICY "Public read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Service role upload
CREATE POLICY "Service role upload assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND auth.jwt() ->> 'role' = 'service_role');

-- Clients can upload to their own folder
CREATE POLICY "Clients upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets'
  AND storage.get_client_from_path(name) = auth.uid()::text
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON FUNCTION storage.get_client_from_path IS 'Extracts client_id from storage path for RLS policies';
