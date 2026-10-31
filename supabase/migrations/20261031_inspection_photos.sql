-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_inspection_photos.sql
-- Description: Extends public.pathology_reports with multi-photo arrays and
--              metadata columns while reusing existing tables and storage buckets.
-- ==============================================================================

ALTER TABLE public.pathology_reports
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS images_metadata JSONB DEFAULT '[]'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.pathology_reports.image_paths IS 'Array of private storage paths in inspection-images bucket';
COMMENT ON COLUMN public.pathology_reports.images_metadata IS 'JSONB array of photographic evidence metadata (id, url, storage_path, file_name, file_size)';

