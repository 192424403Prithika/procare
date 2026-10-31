-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_maintenance_forecasts.sql
-- Description: Creates maintenance_forecasts table storing Weibull degradation
--              projections, critical quarters, cost comparisons, and RLS policies.
-- ==============================================================================

-- 1. Create public.maintenance_forecasts table
CREATE TABLE IF NOT EXISTS public.maintenance_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  current_risk_score NUMERIC(5, 2) NOT NULL,
  five_year_projected_risk NUMERIC(5, 2) NOT NULL,
  projected_critical_quarter TEXT,
  quarters JSONB NOT NULL DEFAULT '[]'::jsonb,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  proactive_cost_estimate NUMERIC(10, 2) NOT NULL,
  reactive_failure_cost NUMERIC(10, 2) NOT NULL,
  savings_delta NUMERIC(10, 2) NOT NULL,
  calculation_basis TEXT NOT NULL,
  statutory_warning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_maintenance_forecasts_property_id ON public.maintenance_forecasts(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_forecasts_created_at ON public.maintenance_forecasts(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.maintenance_forecasts ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies
CREATE POLICY "Admins have full access to forecasts"
ON public.maintenance_forecasts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Managers can view and manage forecasts"
ON public.maintenance_forecasts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Inspectors can view forecasts"
ON public.maintenance_forecasts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

