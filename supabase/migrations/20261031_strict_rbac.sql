-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_strict_rbac.sql
-- Description: Strict Role-Based Access Control (RBAC) and Row Level Security (RLS)
--              Enforces explicit record-level segregation for Admin, Manager,
--              Inspector, and Contractor roles across all data tables and storage.
-- ==============================================================================

-- 1. Ensure properties table has organization column for portfolio partitioning
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS organization TEXT DEFAULT 'Greater Manchester Housing Trust';

CREATE INDEX IF NOT EXISTS idx_properties_organization ON public.properties(organization);

-- ==============================================================================
-- 2. PROPERTIES TABLE RLS POLICIES
-- ==============================================================================
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Drop legacy/loose property policies
DROP POLICY IF EXISTS "Admins have full access to properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can view authorized properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can update properties" ON public.properties;
DROP POLICY IF EXISTS "Inspectors can view properties" ON public.properties;
DROP POLICY IF EXISTS "Contractors view properties with work orders" ON public.properties;
DROP POLICY IF EXISTS "strict_admin_properties_all" ON public.properties;
DROP POLICY IF EXISTS "strict_manager_properties_select" ON public.properties;
DROP POLICY IF EXISTS "strict_manager_properties_insert" ON public.properties;
DROP POLICY IF EXISTS "strict_manager_properties_update" ON public.properties;
DROP POLICY IF EXISTS "strict_inspector_properties_select" ON public.properties;
DROP POLICY IF EXISTS "strict_contractor_properties_select" ON public.properties;

-- ADMIN: Unrestricted access across all organizations and records
CREATE POLICY "strict_admin_properties_all"
ON public.properties
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- MANAGER: Can view properties belonging to their authorized organization or created by them
CREATE POLICY "strict_manager_properties_select"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
      AND (
        properties.organization = profiles.organization 
        OR properties.created_by = auth.uid() 
        OR properties.organization IS NULL
      )
  )
);

CREATE POLICY "strict_manager_properties_insert"
ON public.properties
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  )
);

CREATE POLICY "strict_manager_properties_update"
ON public.properties
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
      AND (
        properties.organization = profiles.organization 
        OR properties.created_by = auth.uid() 
        OR properties.organization IS NULL
      )
  )
);

-- INSPECTOR: Can only view properties that have inspections assigned to them
CREATE POLICY "strict_inspector_properties_select"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    EXISTS (
      SELECT 1 FROM public.pathology_reports 
      WHERE pathology_reports.property_id = properties.id 
        AND (pathology_reports.inspector_id = auth.uid() OR properties.created_by = auth.uid())
    )
  )
);

-- CONTRACTOR: Can only view properties that have active work orders assigned to them
CREATE POLICY "strict_contractor_properties_select"
ON public.properties
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        EXISTS (
          SELECT 1 FROM public.work_orders 
          WHERE work_orders.property_id = properties.id 
            AND (
              work_orders.contractor_id = auth.uid() 
              OR work_orders.contractor_name = profiles.organization
            )
        )
      )
  )
);


-- ==============================================================================
-- 3. PATHOLOGY REPORTS (INSPECTIONS) TABLE RLS POLICIES
-- ==============================================================================
ALTER TABLE public.pathology_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to inspections" ON public.pathology_reports;
DROP POLICY IF EXISTS "Managers can view authorized inspections" ON public.pathology_reports;
DROP POLICY IF EXISTS "Inspectors can create inspections" ON public.pathology_reports;
DROP POLICY IF EXISTS "Inspectors can view assigned inspections" ON public.pathology_reports;
DROP POLICY IF EXISTS "Inspectors can update own pending inspections" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_admin_reports_all" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_manager_reports_select" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_inspector_reports_select" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_inspector_reports_insert" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_inspector_reports_update" ON public.pathology_reports;
DROP POLICY IF EXISTS "strict_contractor_reports_select" ON public.pathology_reports;

-- ADMIN: Full unrestricted access
CREATE POLICY "strict_admin_reports_all"
ON public.pathology_reports
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- MANAGER: Can view inspections for properties in their authorized organization
CREATE POLICY "strict_manager_reports_select"
ON public.pathology_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  ) AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = pathology_reports.property_id 
      AND (
        properties.organization = (SELECT p.organization FROM public.profiles p WHERE p.id = auth.uid()) 
        OR properties.created_by = auth.uid()
        OR properties.organization IS NULL
      )
  )
);

-- INSPECTOR: Can only view, create, and update inspections assigned to themselves
CREATE POLICY "strict_inspector_reports_select"
ON public.pathology_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    pathology_reports.inspector_id = auth.uid()
  )
);

CREATE POLICY "strict_inspector_reports_insert"
ON public.pathology_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    pathology_reports.inspector_id = auth.uid() OR pathology_reports.inspector_id IS NULL
  )
);

CREATE POLICY "strict_inspector_reports_update"
ON public.pathology_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND (
    pathology_reports.inspector_id = auth.uid()
  )
);

-- CONTRACTOR: Can only view inspections linked to work orders assigned to them
CREATE POLICY "strict_contractor_reports_select"
ON public.pathology_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
  ) AND EXISTS (
    SELECT 1 FROM public.work_orders 
    WHERE work_orders.report_id = pathology_reports.id 
      AND (
        work_orders.contractor_id = auth.uid() 
        OR work_orders.contractor_name = (SELECT p.organization FROM public.profiles p WHERE p.id = auth.uid())
      )
  )
);


-- ==============================================================================
-- 4. WORK ORDERS TABLE RLS POLICIES
-- ==============================================================================
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Managers can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Managers can insert work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Managers can update work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Inspectors can view work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Inspectors can create work orders from inspections" ON public.work_orders;
DROP POLICY IF EXISTS "Contractors can view assigned work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Contractors can update assigned work orders" ON public.work_orders;
DROP POLICY IF EXISTS "strict_admin_work_orders_all" ON public.work_orders;
DROP POLICY IF EXISTS "strict_manager_work_orders_select" ON public.work_orders;
DROP POLICY IF EXISTS "strict_manager_work_orders_insert" ON public.work_orders;
DROP POLICY IF EXISTS "strict_manager_work_orders_update" ON public.work_orders;
DROP POLICY IF EXISTS "strict_inspector_work_orders_select" ON public.work_orders;
DROP POLICY IF EXISTS "strict_contractor_work_orders_select" ON public.work_orders;
DROP POLICY IF EXISTS "strict_contractor_work_orders_update" ON public.work_orders;

-- ADMIN: Full unrestricted access
CREATE POLICY "strict_admin_work_orders_all"
ON public.work_orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- MANAGER: Manage work orders within their authorized portfolio
CREATE POLICY "strict_manager_work_orders_select"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  ) AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = work_orders.property_id 
      AND (
        properties.organization = (SELECT p.organization FROM public.profiles p WHERE p.id = auth.uid()) 
        OR properties.created_by = auth.uid()
        OR properties.organization IS NULL
      )
  )
);

CREATE POLICY "strict_manager_work_orders_insert"
ON public.work_orders
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  ) AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = work_orders.property_id 
      AND (
        properties.organization = (SELECT p.organization FROM public.profiles p WHERE p.id = auth.uid()) 
        OR properties.created_by = auth.uid()
        OR properties.organization IS NULL
      )
  )
);

CREATE POLICY "strict_manager_work_orders_update"
ON public.work_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  ) AND EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = work_orders.property_id 
      AND (
        properties.organization = (SELECT p.organization FROM public.profiles p WHERE p.id = auth.uid()) 
        OR properties.created_by = auth.uid()
        OR properties.organization IS NULL
      )
  )
);

-- INSPECTOR: View work orders linked to inspections they surveyed
CREATE POLICY "strict_inspector_work_orders_select"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'inspector'
  ) AND EXISTS (
    SELECT 1 FROM public.pathology_reports 
    WHERE pathology_reports.id = work_orders.report_id 
      AND pathology_reports.inspector_id = auth.uid()
  )
);

-- CONTRACTOR: Can ONLY view work orders explicitly assigned to them
CREATE POLICY "strict_contractor_work_orders_select"
ON public.work_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        work_orders.contractor_id = auth.uid() 
        OR work_orders.contractor_name = profiles.organization
      )
  )
);

-- CONTRACTOR: Can update assigned work order status and upload completion evidence
CREATE POLICY "strict_contractor_work_orders_update"
ON public.work_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        work_orders.contractor_id = auth.uid() 
        OR work_orders.contractor_name = profiles.organization
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'contractor'
      AND (
        work_orders.contractor_id = auth.uid() 
        OR work_orders.contractor_name = profiles.organization
      )
  )
);


-- ==============================================================================
-- 5. CONTRACTORS TABLE RLS POLICIES
-- ==============================================================================
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to contractors" ON public.contractors;
DROP POLICY IF EXISTS "Managers can view all contractors" ON public.contractors;
DROP POLICY IF EXISTS "Authenticated users can view approved contractors" ON public.contractors;
DROP POLICY IF EXISTS "Authenticated users can register contractor" ON public.contractors;
DROP POLICY IF EXISTS "Contractors can view own registration" ON public.contractors;
DROP POLICY IF EXISTS "Contractors can update own contact details" ON public.contractors;
DROP POLICY IF EXISTS "strict_admin_contractors_all" ON public.contractors;
DROP POLICY IF EXISTS "strict_manager_contractors_select" ON public.contractors;
DROP POLICY IF EXISTS "strict_public_approved_contractors_select" ON public.contractors;
DROP POLICY IF EXISTS "strict_contractor_self_select" ON public.contractors;
DROP POLICY IF EXISTS "strict_contractor_self_insert" ON public.contractors;
DROP POLICY IF EXISTS "strict_contractor_self_update" ON public.contractors;

-- ADMIN: Full access to view, update, approve/reject registrations, set accreditation
CREATE POLICY "strict_admin_contractors_all"
ON public.contractors
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- MANAGER: View all approved contractors and pending ones (to review available network for assignments)
CREATE POLICY "strict_manager_contractors_select"
ON public.contractors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'manager'
  )
);

-- GENERAL / APPROVED: View approved contractor network
CREATE POLICY "strict_public_approved_contractors_select"
ON public.contractors
FOR SELECT
USING (
  verification_status = 'Approved'
);

-- CONTRACTOR: Can view own registration (including pending / rejected status)
CREATE POLICY "strict_contractor_self_select"
ON public.contractors
FOR SELECT
USING (
  user_id = auth.uid() 
  OR email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
);

-- CONTRACTOR: Can register new contractor (strictly defaults to Pending Verification)
CREATE POLICY "strict_contractor_self_insert"
ON public.contractors
FOR INSERT
WITH CHECK (
  verification_status = 'Pending Verification'
  AND accreditation_verified = FALSE
);

-- CONTRACTOR: Can update own contact details only (cannot alter verification status)
CREATE POLICY "strict_contractor_self_update"
ON public.contractors
FOR UPDATE
USING (
  user_id = auth.uid() 
  OR email = (SELECT profiles.email FROM public.profiles WHERE profiles.id = auth.uid())
)
WITH CHECK (
  -- Must match existing verification_status to prevent self-approval
  verification_status = (SELECT c.verification_status FROM public.contractors c WHERE c.id = contractors.id)
  AND accreditation_verified = (SELECT c.accreditation_verified FROM public.contractors c WHERE c.id = contractors.id)
);


-- ==============================================================================
-- 6. PROFILES TABLE RLS POLICIES (USER & ROLE MANAGEMENT)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "strict_admin_profiles_all" ON public.profiles;
DROP POLICY IF EXISTS "strict_user_profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "strict_user_profiles_update_own" ON public.profiles;

-- ADMIN: Can view and manage all profiles and assign roles
CREATE POLICY "strict_admin_profiles_all"
ON public.profiles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- NON-ADMINS: Can only view their own profile
CREATE POLICY "strict_user_profiles_select_own"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
);

-- NON-ADMINS: Can update their own profile details but CANNOT escalate role
CREATE POLICY "strict_user_profiles_update_own"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
  -- Role must remain unchanged unless user is admin
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

