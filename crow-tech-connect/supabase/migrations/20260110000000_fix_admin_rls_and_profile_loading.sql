-- FIX ADMIN RLS POLICIES - Non-recursive, production-safe
-- This migration fixes the recursive RLS issue where admins cannot view pending service providers

-- ============================================================================
-- 1. CREATE SECURITY DEFINER FUNCTION FOR ADMIN CHECK (Non-recursive)
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- Create a security definer function that checks admin status without RLS
-- This function bypasses RLS by using SECURITY DEFINER and direct auth.users access
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = check_user_id 
    AND p.user_type = 'admin'::user_type
    -- This query bypasses RLS because the function is SECURITY DEFINER
    -- We read directly from profiles without RLS restrictions
  );
$$;

-- Add comment for clarity
COMMENT ON FUNCTION public.is_admin(uuid) IS 
  'Checks if a user is an admin. Uses SECURITY DEFINER to bypass RLS and prevent recursion.';

-- ============================================================================
-- 2. FIX RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

-- Drop existing admin policies that may be recursive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;

-- CRITICAL: Users must ALWAYS be able to read their own profile
-- Ensure this policy exists (it should already exist from previous migration)
DROP POLICY IF EXISTS "Users can ALWAYS view their own profile" ON public.profiles;
CREATE POLICY "Users can ALWAYS view their own profile" 
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- New non-recursive admin policy using the security definer function
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Admins can update approval status (non-recursive)
CREATE POLICY "Admins can update approval status"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure service providers can view client profiles for matching requests
-- (This should already exist, but we ensure it's correct)
DROP POLICY IF EXISTS "Service providers can view client profiles for matching requests" ON public.profiles;
CREATE POLICY "Service providers can view client profiles for matching requests"
ON public.profiles
FOR SELECT
USING (
  user_type = 'client'::user_type
  AND EXISTS (
    SELECT 1 FROM public.service_requests sr
    JOIN public.service_providers sp ON sp.profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'service_provider'::user_type
    )
    JOIN public.services s ON s.id = sr.service_id
    WHERE sr.client_id = profiles.id
    AND (
      (sr.status = 'pending'::request_status AND s.category = ANY(sp.service_categories))
      OR sr.service_provider_id = sp.id
    )
  )
);

-- Approved service providers are publicly viewable
DROP POLICY IF EXISTS "Approved service providers are publicly viewable" ON public.profiles;
CREATE POLICY "Approved service providers are publicly viewable"
ON public.profiles
FOR SELECT
USING (
  user_type = 'service_provider'::user_type 
  AND approval_status = 'approved'::approval_status
);

-- ============================================================================
-- 3. VERIFY POLICIES ARE CORRECTLY ORDERED
-- ============================================================================

-- Policy precedence matters in PostgreSQL. We want:
-- 1. Users can always view their own profile (highest priority)
-- 2. Admins can view all profiles
-- 3. Service providers can view client profiles for matching requests
-- 4. Approved service providers are publicly viewable

-- The policies above are created in the correct order.
-- PostgreSQL evaluates policies with OR logic, so all matching policies apply.

-- ============================================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_approval ON public.profiles(user_type, approval_status);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Ensure the function is executable by authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon;

