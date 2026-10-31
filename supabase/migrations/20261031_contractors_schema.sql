-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_contractors_schema.sql
-- Description: Creates contractors table for real contractor registration,
--              verification workflow, document storage bucket, and RLS policies.
-- ==============================================================================

-- 1. Create public.contractors table
CREATE TABLE IF NOT EXISTS public.contractors (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  trade TEXT NOT NULL,
  accreditation_details TEXT NOT NULL,
  accreditation_verified BOOLEAN NOT NULL DEFAULT FALSE,
  document_url TEXT DEFAULT '',
  document_path TEXT DEFAULT '',
  verification_status TEXT NOT NULL DEFAULT 'Pending Verification'
    CHECK (verification_status IN ('Pending Verification', 'Approved', 'Rejected')),
  admin_notes TEXT DEFAULT '',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ DEFAULT NULL,
  rating NUMERIC(3, 2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_contractors_verification_status ON public.contractors(verification_status);
CREATE INDEX IF NOT EXISTS idx_contractors_trade ON public.contractors(trade);
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON public.contractors(user_id);
CREATE INDEX IF NOT EXISTS idx_contractors_company_name ON public.contractors(company_name);
CREATE INDEX IF NOT EXISTS idx_contractors_created_at ON public.contractors(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for contractors

-- Policy A: Admins have full access to view, update, approve/reject, and delete
CREATE POLICY "Admins have full access to contractors"
ON public.contractors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view all contractors (to dispatch work orders and review status)
CREATE POLICY "Managers can view all contractors"
ON public.contractors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: All authenticated users can view Approved contractors
CREATE POLICY "Authenticated users can view approved contractors"
ON public.contractors
FOR SELECT
USING (verification_status = 'Approved');

-- Policy D: Users/contractors can submit a new registration (defaults to Pending Verification)
CREATE POLICY "Authenticated users can register contractor"
ON public.contractors
FOR INSERT
WITH CHECK (
  verification_status = 'Pending Verification'
  AND accreditation_verified = FALSE
);

-- Policy E: Contractors can view their own registration submission
CREATE POLICY "Contractors can view own registration"
ON public.contractors
FOR SELECT
USING (
  user_id = auth.uid()
  OR email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
);

-- Policy F: Contractors can update their own contact details (cannot self-approve)
CREATE POLICY "Contractors can update own contact details"
ON public.contractors
FOR UPDATE
USING (
  user_id = auth.uid()
  OR email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  -- Prevent non-admins from self-approving or self-verifying accreditation
  verification_status = (SELECT c.verification_status FROM public.contractors c WHERE c.id = contractors.id)
  AND accreditation_verified = (SELECT c.accreditation_verified FROM public.contractors c WHERE c.id = contractors.id)
);

-- 3. Storage Bucket Configuration for contractor supporting documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-documents',
  'contractor-documents',
  false,
  20971520, -- 20 MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

