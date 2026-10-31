-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_building_zones.sql
-- Description: Creates building_zones table mapping spatial coordinates,
--              floor levels, telemetry metrics, and work order counts for Digital Twin.
-- ==============================================================================

-- 1. Create public.building_zones table
CREATE TABLE IF NOT EXISTS public.building_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL, -- e.g. "FL03-BATH-14", "RISER-04B", "ROOF-WEST"
  zone_name TEXT NOT NULL,
  floor_number INTEGER NOT NULL DEFAULT 0,
  zone_type TEXT NOT NULL 
    CHECK (zone_type IN ('bathroom', 'kitchen', 'riser_shaft', 'subfloor', 'roof_envelope', 'external_wall', 'communal')),
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('critical', 'high', 'moderate', 'low')),
  moisture_index NUMERIC(5, 2) DEFAULT NULL,
  acoustic_freq_hz NUMERIC(8, 2) DEFAULT NULL,
  spatial_coordinates JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "width": 100, "height": 100}'::jsonb,
  active_work_orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_building_zones_property_id ON public.building_zones(property_id);
CREATE INDEX IF NOT EXISTS idx_building_zones_floor ON public.building_zones(floor_number);
CREATE INDEX IF NOT EXISTS idx_building_zones_risk ON public.building_zones(risk_level);

-- Enable Row Level Security (RLS)
ALTER TABLE public.building_zones ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies
CREATE POLICY "Admins have full access to building zones"
ON public.building_zones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Managers can view and update building zones"
ON public.building_zones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Inspectors can view building zones"
ON public.building_zones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

CREATE POLICY "Contractors can view building zones"
ON public.building_zones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  )
);

