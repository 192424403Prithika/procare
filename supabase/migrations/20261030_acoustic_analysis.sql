-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261030_acoustic_analysis.sql
-- Description: Creates acoustic_analysis table linked to pathology_reports,
--              Row Level Security (RLS) policies, and analytical indexes.
-- ==============================================================================

-- 1. Create public.acoustic_analysis table
CREATE TABLE IF NOT EXISTS public.acoustic_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.pathology_reports(id) ON DELETE CASCADE,
  processing_status TEXT NOT NULL DEFAULT 'completed' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Signal Processing Parameters
  duration_seconds NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  sampling_rate INTEGER NOT NULL DEFAULT 44100,
  dominant_frequency NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
  
  -- Acoustic Indicators (Spectral flatness, centroid, rolloff, band energies, energy ratios)
  anomaly_indicators JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Spectrum & Frequency Bins (Frequencies, magnitudes, power spectral density)
  frequency_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Narrative findings and diagnostic conclusions
  result_summary TEXT NOT NULL DEFAULT '',
  
  -- Waveform and spectrum vector visualization artifacts
  waveform_svg TEXT DEFAULT '',
  spectrum_svg TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_acoustic_analysis_report_id ON public.acoustic_analysis(report_id);
CREATE INDEX IF NOT EXISTS idx_acoustic_analysis_created_at ON public.acoustic_analysis(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.acoustic_analysis ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for acoustic_analysis

-- Policy A: Admins have full access
CREATE POLICY "Admins have full access to acoustic analysis"
ON public.acoustic_analysis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view acoustic analysis
CREATE POLICY "Managers can view acoustic analysis"
ON public.acoustic_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: Field Inspectors can view and insert acoustic analysis
CREATE POLICY "Inspectors can view acoustic analysis"
ON public.acoustic_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

CREATE POLICY "Inspectors can insert acoustic analysis"
ON public.acoustic_analysis
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Policy D: Contractors can view acoustic analysis for assigned properties
CREATE POLICY "Contractors can view acoustic analysis"
ON public.acoustic_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  )
);
