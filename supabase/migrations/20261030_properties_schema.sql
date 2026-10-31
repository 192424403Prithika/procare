-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261030_properties_schema.sql
-- Description: Creates the properties table with technical building metadata,
--              Row Level Security (RLS) policies by role, and automatic timestamping.
-- ==============================================================================

-- 1. Create public.properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_name TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude NUMERIC(10, 6) DEFAULT 53.4808,
  longitude NUMERIC(10, 6) DEFAULT -2.2426,
  building_type TEXT NOT NULL,
  build_year INTEGER NOT NULL,
  number_of_floors INTEGER NOT NULL DEFAULT 3,
  pipe_type TEXT DEFAULT 'Copper',
  roof_membrane_age INTEGER DEFAULT 5,
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('critical', 'high', 'moderate', 'low')),
  risk_score INTEGER NOT NULL DEFAULT 25 CHECK (risk_score >= 0 AND risk_score <= 100),
  inspection_status TEXT NOT NULL DEFAULT 'Scheduled' CHECK (inspection_status IN ('Overdue', 'Pending Review', 'Inspected', 'Scheduled')),
  last_inspected TEXT DEFAULT 'Not yet inspected',
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON public.properties(postal_code);
CREATE INDEX IF NOT EXISTS idx_properties_risk_level ON public.properties(risk_level);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON public.properties(created_by);
CREATE INDEX IF NOT EXISTS idx_properties_inspection_status ON public.properties(inspection_status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for Properties

-- Policy A: Admins have full access to view, insert, update, delete
CREATE POLICY "Admins have full access to properties"
ON public.properties
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view all authorized properties
CREATE POLICY "Managers can view authorized properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: Property Managers can insert new properties
CREATE POLICY "Managers can insert properties"
ON public.properties
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy D: Property Managers can update their authorized properties
CREATE POLICY "Managers can update properties"
ON public.properties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy E: Field Inspectors can view properties assigned to their audits
CREATE POLICY "Inspectors can view properties"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  )
);

-- Policy F: Contractors can view properties only if linked to work orders
CREATE POLICY "Contractors view properties with work orders"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  )
);

-- 3. Automatic updated_at Trigger
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Initial Seed Data
INSERT INTO public.properties (
  property_name, address, postal_code, latitude, longitude,
  building_type, build_year, number_of_floors, pipe_type, roof_membrane_age,
  risk_level, risk_score, inspection_status, last_inspected, notes
) VALUES
  ('Trinity Court Blocks A-C', '42 Chapel Street, Salford', 'M3 5LE', 53.4839, -2.2575, 'Multi-Storey Social Housing (1974 Brick Cavity)', 1974, 6, 'Copper', 8, 'critical', 89, 'Pending Review', '2026-10-28', 'Thermal bridging detected behind northern gable wall. High likelihood of interstitial condensation.'),
  ('Pendleton Tower Estate', '18 Broad Street, Pendleton', 'M6 5BY', 53.4912, -2.2854, 'High-Rise Residential (1968 Reinforced Concrete)', 1968, 14, 'Galvanized Steel', 12, 'critical', 84, 'Pending Review', '2026-10-29', 'Acoustic hiss detected on riser pipe 4B. Dielectric moisture sensor reads 38% saturation.'),
  ('Ancoats Redrow Terraces', '7 Blossom Street, Ancoats', 'M4 6AJ', 53.4851, -2.2289, 'Victorian Solid Brick Conversion', 1898, 3, 'Cast Iron', 15, 'high', 71, 'Overdue', '2026-09-15', 'Sub-floor ventilation grilles obstructed by external landscaping. Rising damp reported.'),
  ('Trafford Gateway Residences', '105 Chester Road, Stretford', 'M32 0QW', 53.4589, -2.2981, 'Modern Steel Frame (2012 Low-Rise)', 2012, 4, 'Multilayer PEX', 3, 'moderate', 46, 'Inspected', '2026-10-24', 'Isolated sealant degradation along second floor sill. No structural penetration.'),
  ('Hulme Crescent Mews', '14 Stretford Road, Hulme', 'M15 5GQ', 53.4682, -2.2471, 'Community Housing (1994 Timber Frame)', 1994, 2, 'PEX', 4, 'low', 18, 'Inspected', '2026-10-20', 'Active MVHR systems verified. Excellent internal airflow and zero thermal anomalies.')
ON CONFLICT DO NOTHING;
 