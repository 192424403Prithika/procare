-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_multi_defect_results.sql
-- Description: Creates multi_defect_analyses table linking pathology_reports
--              with cross-modal defect classification results, candidates, and RLS.
-- ==============================================================================

-- 1. Create public.multi_defect_analyses table
CREATE TABLE IF NOT EXISTS public.multi_defect_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.pathology_reports(id) ON DELETE CASCADE,
  primary_defect TEXT NOT NULL,
  primary_label TEXT NOT NULL,
  confidence_score NUMERIC(5, 2) NOT NULL,
  statutory_urgency TEXT NOT NULL CHECK (statutory_urgency IN ('Emergency 24h', 'Urgent 7d', 'Standard 14d')),
  recommended_trade TEXT NOT NULL,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  cross_modal_synthesis TEXT NOT NULL,
  limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_multi_defect_report_id ON public.multi_defect_analyses(report_id);
CREATE INDEX IF NOT EXISTS idx_multi_defect_primary ON public.multi_defect_analyses(primary_defect);
CREATE INDEX IF NOT EXISTS idx_multi_defect_created_at ON public.multi_defect_analyses(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.multi_defect_analyses ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies
CREATE POLICY "Admins have full access to multi-defect analysis"
ON public.multi_defect_analyses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Managers can view multi-defect analysis"
ON public.multi_defect_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Inspectors can view and insert multi-defect analysis"
ON public.multi_defect_analyses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

CREATE POLICY "Contractors can view multi-defect analysis"
ON public.multi_defect_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  )
);
