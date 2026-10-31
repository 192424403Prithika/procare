-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261031_strict_auth_unassigned_roles.sql
-- Description: Enforces strict role assignment. Modifies public.profiles so that
--              unassigned roles remain NULL rather than defaulting to 'manager'.
--              Provides administrative role assignment and secure trigger logic.
-- ==============================================================================

-- 1. Allow profiles.role to be NULL for pending/unassigned user accounts
ALTER TABLE public.profiles 
ALTER COLUMN role DROP NOT NULL;

ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT NULL;

-- 2. Update automated user creation trigger to not grant default manager permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  assigned_role public.user_role;
  raw_role TEXT;
BEGIN
  raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', ''));
  
  -- Only assign a role if valid enum value was explicitly supplied
  IF raw_role IN ('admin', 'manager', 'inspector', 'contractor') THEN
    assigned_role := raw_role::public.user_role;
  ELSE
    assigned_role := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    organization,
    role,
    title,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'organization', 'PropCare NW Partner'),
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'title', 'Officer'),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    organization = CASE WHEN EXCLUDED.organization <> '' THEN EXCLUDED.organization ELSE public.profiles.organization END,
    role = CASE WHEN EXCLUDED.role IS NOT NULL THEN EXCLUDED.role ELSE public.profiles.role END,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- 3. Helper function for Administrators to securely assign or modify user roles
CREATE OR REPLACE FUNCTION public.assign_user_role(
  target_user_id UUID,
  new_role public.user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify calling user is an authorized platform administrator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Authorization denied: Only Platform Administrators can assign roles.';
  END IF;

  -- Update target user's role in public.profiles
  UPDATE public.profiles
  SET 
    role = new_role,
    updated_at = timezone('utc'::text, now())
  WHERE id = target_user_id;

  -- Also synchronize into auth.users metadata for JWT claims
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role::text)
  )
  WHERE id = target_user_id;
END;
$$;

-- Grant execution to authenticated users (internal admin check guards execution)
GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, public.user_role) TO authenticated;

