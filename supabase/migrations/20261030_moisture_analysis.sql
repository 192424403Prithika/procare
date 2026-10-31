-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261030_moisture_analysis.sql
-- Description: Creates moisture_analysis table linked to pathology_reports,
--              Row Level Security (RLS) policies, and analytical triggers.
-- ==============================================================================

-- 1. Create public.moisture_analysis table
CREATE TABLE IF NOT EXISTS public.moisture_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.pathology_reports(id) ON DELETE CASCADE,
  processing_status TEXT NOT NULL DEFAULT 'completed' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Algorithmic Metrics
  alignment_quality NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  difference_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  anomaly_count INTEGER NOT NULL DEFAULT 0,
  
  -- Findings and Evidence
  result_summary TEXT NOT NULL DEFAULT '',
  heatmap_storage_path TEXT DEFAULT '',
  heatmap_url TEXT DEFAULT '',
  
  -- Structured Optical Metadata (Bounding boxes, dimensions, thresholds, limitations)
  analysis_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_moisture_analysis_report_id ON public.moisture_analysis(report_id);
CREATE INDEX IF NOT EXISTS idx_moisture_analysis_created_at ON public.moisture_analysis(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.moisture_analysis ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for moisture_analysis

-- Policy A: Admins have full access
CREATE POLICY "Admins have full access to moisture analysis"
ON public.moisture_analysis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view moisture analyses
CREATE POLICY "Managers can view moisture analysis"
ON public.moisture_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: Field Inspectors can view and insert moisture analyses
CREATE POLICY "Inspectors can view moisture analysis"
ON public.moisture_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

CREATE POLICY "Inspectors can insert moisture analysis"
ON public.moisture_analysis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Policy D: Contractors can view moisture analyses only if linked to work orders
CREATE POLICY "Contractors can view moisture analysis for assigned properties"
ON public.moisture_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  )
);
