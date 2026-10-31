-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_work_orders.sql
-- Description: Creates work_orders table linking properties, pathology_reports,
--              and contractors, with Row Level Security (RLS) policies and indexes.
-- ==============================================================================

-- 1. Create public.work_orders table
CREATE TABLE IF NOT EXISTS public.work_orders (
  id TEXT PRIMARY KEY, -- e.g. 'WO-8821'
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.pathology_reports(id) ON DELETE SET NULL,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  contractor_name TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Emergency 24h', 'Urgent 7d', 'Standard 14d')),
  status TEXT NOT NULL DEFAULT 'Pending Dispatch' 
    CHECK (status IN ('Pending Dispatch', 'In Progress', 'Awaiting Signoff', 'Completed')),
  issue_description TEXT NOT NULL,
  cost_estimate NUMERIC(10, 2) NOT NULL DEFAULT 0.0,
  actual_cost NUMERIC(10, 2) DEFAULT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deadline_date TIMESTAMPTZ NOT NULL,
  completed_date TIMESTAMPTZ DEFAULT NULL,
  completion_evidence TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for rapid lookup and performance reporting
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON public.work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_report_id ON public.work_orders(report_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_contractor_name ON public.work_orders(contractor_name);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON public.work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_work_orders_deadline_date ON public.work_orders(deadline_date);

-- Enable Row Level Security (RLS)
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- 2. Row Level Security Policies for work_orders

-- Policy A: Admins have full access
CREATE POLICY "Admins have full access to work orders"
ON public.work_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy B: Property Managers can view and manage work orders
CREATE POLICY "Managers can view work orders"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers can insert work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "Managers can update work orders"
ON public.work_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  )
);

-- Policy C: Field Inspectors can view work orders and link inspections
CREATE POLICY "Inspectors can view work orders"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

CREATE POLICY "Inspectors can create work orders from inspections"
ON public.work_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'inspector')
  )
);

-- Policy D: Contractors can view and update work orders assigned to their company
CREATE POLICY "Contractors can view assigned work orders"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        work_orders.contractor_id = auth.uid()
        OR work_orders.contractor_name = profiles.contractor_company
      )
  )
);

CREATE POLICY "Contractors can update assigned work orders"
ON public.work_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        work_orders.contractor_id = auth.uid()
        OR work_orders.contractor_name = profiles.contractor_company
      )
  )
);

-- 3. Automatic updated_at trigger
DROP TRIGGER IF EXISTS update_work_orders_updated_at ON public.work_orders;

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
