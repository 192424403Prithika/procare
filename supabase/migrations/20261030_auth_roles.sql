-- ==============================================================================
-- PROPCARE NW — SUPABASE DATABASE MIGRATION
-- Migration: 20261030_auth_roles.sql
-- Description: Creates user profiles table linked to auth.users, role constraints,
--              automated profile creation trigger, and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Create custom user role enum type
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'inspector', 'contractor');
  END IF;
END $$;

-- 2. Create public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  organization TEXT NOT NULL DEFAULT 'PropCare NW Partner',
  role public.user_role NOT NULL DEFAULT 'manager',
  title TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies for profiles

-- Policy A: Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Policy B: Platform Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy C: Users can update their own non-role profile details
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  -- Prevent non-admins from self-escalating role
  (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR 
   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
);

-- Policy D: Admins can update all profiles (e.g., assign roles)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy E: Insert policy for profile creation via trigger
CREATE POLICY "Service can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- 4. Automated User Profile Creation Trigger
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
  raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'manager'));
  
  -- Validate and cast role
  IF raw_role IN ('admin', 'manager', 'inspector', 'contractor') THEN
    assigned_role := raw_role::public.user_role;
  ELSE
    assigned_role := 'manager'::public.user_role;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    organization,
    role,
    title
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'organization', 'Greater Manchester Housing Trust'),
    assigned_role,
    COALESCE(
      NEW.raw_user_meta_data->>'title',
      CASE assigned_role
        WHEN 'admin' THEN 'System Administrator'
        WHEN 'manager' THEN 'Property Portfolio Manager'
        WHEN 'inspector' THEN 'Field Diagnostic Surveyor'
        WHEN 'contractor' THEN 'Lead Remediation Contractor'
      END
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Updated timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 6. Helper Security Function for Server Queries
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;
