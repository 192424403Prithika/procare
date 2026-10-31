-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261030_inspection_workflow.sql
-- Description: Creates pathology_reports table with UUID foreign keys, constraints,
--              Row Level Security (RLS) policies by role, private storage buckets
--              for inspection-images and acoustic-recordings, and storage security policies.
-- ==============================================================================

-- 1. Create public.pathology_reports table
CREATE TABLE IF NOT EXISTS public.pathology_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Step 2: Zone & Location Metadata
  inspection_zone TEXT NOT NULL,
  room_name TEXT NOT NULL DEFAULT '',
  floor TEXT NOT NULL DEFAULT 'Ground Floor',
  inspection_location TEXT DEFAULT '',
  
  -- Workflow Status
  status TEXT NOT NULL DEFAULT 'Pending Review' 
    CHECK (status IN ('Pending Review', 'Requires Review', 'Completed', 'Approved', 'Flagged for Contractor')),
  
  -- Step 5: Symptoms & Observations
  symptom_tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT DEFAULT '',
  
  -- Step 3 & 4: Storage References (Paths and Signed URLs)
  ambient_img_url TEXT DEFAULT '',
  ambient_img_path TEXT DEFAULT '',
  flash_img_url TEXT DEFAULT '',
  flash_img_path TEXT DEFAULT '',
  audio_url TEXT DEFAULT '',
  audio_path TEXT DEFAULT '',
  audio_duration_seconds NUMERIC(6, 2) DEFAULT 0,
  audio_file_size INTEGER DEFAULT 0,

  -- Analytical Telemetry Metrics (Filled upon subsequent analysis)
  risk_level TEXT NOT NULL DEFAULT 'pending' 
    CHECK (risk_level IN ('critical', 'high', 'moderate', 'low', 'pending')),
  risk_score INTEGER NOT NULL DEFAULT 0 
    CHECK (risk_score >= 0 AND risk_score <= 100),
  ambient_moisture_index NUMERIC(5, 2) DEFAULT NULL,
  flash_reflection_score NUMERIC(5, 2) DEFAULT NULL,
  acoustic_leak_frequency_hz NUMERIC(8, 2) DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_pathology_reports_property_id ON public.pathology_reports(property_id);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_inspector_id ON public.pathology_reports(inspector_id);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_status ON public.pathology_reports(status);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_risk_level ON public.pathology_reports(risk_level);
CREATE INDEX IF NOT EXISTS idx_pathology_reports_created_at ON public.pathology_reports(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pathology_reports ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for pathology_reports

-- Policy A: Admins have full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to inspections"
ON public.pathology_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view inspections for all authorized properties
CREATE POLICY "Managers can view authorized inspections"
ON public.pathology_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: Field Inspectors can create inspections
CREATE POLICY "Inspectors can create inspections"
ON public.pathology_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Policy D: Field Inspectors can view assigned or recorded inspections
CREATE POLICY "Inspectors can view assigned inspections"
ON public.pathology_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    inspector_id = auth.uid() OR inspector_id IS NULL
  )
);

-- Policy E: Field Inspectors can update their own pending inspections
CREATE POLICY "Inspectors can update own pending inspections"
ON public.pathology_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    inspector_id = auth.uid() OR inspector_id IS NULL
  )
);

-- Policy F: Contractors have NO unrestricted inspection access
-- (Restricted by default as no policy grants contractor SELECT on pathology_reports)

-- 3. Automatic updated_at Trigger for pathology_reports
DROP TRIGGER IF EXISTS update_pathology_reports_updated_at ON public.pathology_reports;

CREATE TRIGGER update_pathology_reports_updated_at
  BEFORE UPDATE ON public.pathology_reports
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Supabase Storage Configuration (Private Buckets)
-- Create private storage buckets for inspection evidence if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'inspection-images',
    'inspection-images',
    false, -- Strictly private
    20971520, -- 20 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'acoustic-recordings',
    'acoustic-recordings',
    false, -- Strictly private
    52428800, -- 50 MB limit
    ARRAY['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg', 'audio/aac']
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. Row Level Security Policies for Storage Objects (Private Buckets)

-- Storage Policy A: Inspectors & Admins can upload to inspection-images
CREATE POLICY "Inspectors and Admins can upload inspection images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Storage Policy B: Inspectors & Admins can upload to acoustic-recordings
CREATE POLICY "Inspectors and Admins can upload acoustic recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'acoustic-recordings' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Storage Policy C: Admins, Managers, and Inspectors can read/download from inspection-images
CREATE POLICY "Authorized roles can read inspection images"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'inspection-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'inspector')
  )
);

-- Storage Policy D: Admins, Managers, and Inspectors can read/download from acoustic-recordings
CREATE POLICY "Authorized roles can read acoustic recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'acoustic-recordings' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'inspector')
  )
);

-- Storage Policy E: Admins can delete storage files
CREATE POLICY "Admins can delete inspection storage files"
ON storage.objects
FOR DELETE
USING (
  bucket_id IN ('inspection-images', 'acoustic-recordings') AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 6. Initial Seed Pathology Reports (Linked to Properties)
DO $$
DECLARE
  v_trinity_id UUID;
  v_pendleton_id UUID;
  v_ancoats_id UUID;
  v_trafford_id UUID;
BEGIN
  SELECT id INTO v_trinity_id FROM public.properties WHERE property_name LIKE 'Trinity Court%' LIMIT 1;
  SELECT id INTO v_pendleton_id FROM public.properties WHERE property_name LIKE 'Pendleton Tower%' LIMIT 1;
  SELECT id INTO v_ancoats_id FROM public.properties WHERE property_name LIKE 'Ancoats Redrow%' LIMIT 1;
  SELECT id INTO v_trafford_id FROM public.properties WHERE property_name LIKE 'Trafford Gateway%' LIMIT 1;

  IF v_trinity_id IS NOT NULL THEN
    INSERT INTO public.pathology_reports (
      property_id, inspection_zone, room_name, floor, inspection_location,
      status, symptom_tags, notes,
      ambient_img_url, flash_img_url, audio_url,
      risk_level, risk_score, ambient_moisture_index, flash_reflection_score, acoustic_leak_frequency_hz
    ) VALUES (
      v_trinity_id,
      'Bathroom ceiling & external wall',
      'Flat 14 Bathroom',
      'Floor 3',
      'Ceiling-to-gable wall junction behind extractor duct',
      'Flagged for Contractor',
      ARRAY['Musty odour', 'Damp patches', 'Visible mould', 'Cold draft'],
      'Cold surface draft observed on northern wall. Attenuation test shows heavy localized moisture saturation with surface mould biofilm.',
      '/sample-telemetry/ambient_raw_0914.jpg',
      '/sample-telemetry/flash_specular_0914.jpg',
      '/sample-telemetry/acoustic_pipe_scan_14.wav',
      'critical',
      88,
      76.5,
      64.2,
      2840.0
    );
  END IF;

  IF v_pendleton_id IS NOT NULL THEN
    INSERT INTO public.pathology_reports (
      property_id, inspection_zone, room_name, floor, inspection_location,
      status, symptom_tags, notes,
      ambient_img_url, flash_img_url, audio_url,
      risk_level, risk_score, ambient_moisture_index, flash_reflection_score, acoustic_leak_frequency_hz
    ) VALUES (
      v_pendleton_id,
      'Kitchen riser pipe enclosure',
      'Unit 8B Kitchen',
      'Floor 8',
      'Service vertical riser duct behind sink cabinetry',
      'Pending Review',
      ARRAY['Musty odour', 'Spongy surface', 'Other observations'],
      'High-frequency hiss detected at 4.2 kHz on hot-water return riser. Gypsum enclosure wallboard soft to touch.',
      '/sample-telemetry/ambient_raw_0422.jpg',
      '/sample-telemetry/flash_specular_0422.jpg',
      '/sample-telemetry/acoustic_pipe_scan_0422.wav',
      'critical',
      84,
      82.1,
      71.0,
      4200.0
    );
  END IF;

  IF v_ancoats_id IS NOT NULL THEN
    INSERT INTO public.pathology_reports (
      property_id, inspection_zone, room_name, floor, inspection_location,
      status, symptom_tags, notes,
      ambient_img_url, flash_img_url, audio_url,
      risk_level, risk_score, ambient_moisture_index, flash_reflection_score, acoustic_leak_frequency_hz
    ) VALUES (
      v_ancoats_id,
      'Sub-floor void & timber joists',
      'Ground Floor Hallway',
      'Ground Floor',
      'Perimeter brick footing beneath floorboards',
      'Requires Review',
      ARRAY['Musty odour', 'Peeling plaster', 'Damp patches'],
      'Rising damp salt crystallization evident on skirting board. Airbrick grilles obstructed externally.',
      '/sample-telemetry/ambient_raw_0118.jpg',
      '/sample-telemetry/flash_specular_0118.jpg',
      '/sample-telemetry/acoustic_pipe_scan_0118.wav',
      'high',
      71,
      68.4,
      52.8,
      0.0
    );
  END IF;

  IF v_trafford_id IS NOT NULL THEN
    INSERT INTO public.pathology_reports (
      property_id, inspection_zone, room_name, floor, inspection_location,
      status, symptom_tags, notes,
      ambient_img_url, flash_img_url, audio_url,
      risk_level, risk_score, ambient_moisture_index, flash_reflection_score, acoustic_leak_frequency_hz
    ) VALUES (
      v_trafford_id,
      'Living room northern cavity wall',
      'Apartment 204 Living Room',
      'Floor 2',
      'Sill reveal junction below double glazed sash',
      'Completed',
      ARRAY['Cold draft'],
      'External perimeter sealant slight shrinkage. Internal moisture levels within acceptable baseline bounds.',
      '/sample-telemetry/ambient_raw_0831.jpg',
      '/sample-telemetry/flash_specular_0831.jpg',
      '/sample-telemetry/acoustic_pipe_scan_0831.wav',
      'moderate',
      42,
      28.0,
      18.5,
      0.0
    );
  END IF;
END $$;
