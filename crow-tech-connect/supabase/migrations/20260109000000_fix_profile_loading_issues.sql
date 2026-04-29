-- FIX PROFILE LOADING ISSUES - CRITICAL FIXES
-- This migration fixes all profile loading and authentication issues

-- ============================================================================
-- 1. FIX RLS POLICIES - Ensure users can ALWAYS read their own profile
-- ============================================================================

-- Drop existing profile RLS policies that might be blocking
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service providers can view client profiles for matching requests" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view approved provider profiles" ON public.profiles;

-- CRITICAL: Users must ALWAYS be able to read their own profile
-- This is the most important policy for authentication to work
CREATE POLICY "Users can ALWAYS view their own profile" 
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own profile (fallback if trigger fails)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service providers can view client profiles for matching requests
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
CREATE POLICY "Approved service providers are publicly viewable"
ON public.profiles
FOR SELECT
USING (
  user_type = 'service_provider'::user_type 
  AND approval_status = 'approved'::approval_status
);

-- Admins can view all profiles for approval management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.user_type = 'admin'::user_type
  )
);

-- Admins can update approval status
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;
CREATE POLICY "Admins can update approval status"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.user_type = 'admin'::user_type
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.user_type = 'admin'::user_type
  )
);

-- ============================================================================
-- 2. FIX handle_new_user FUNCTION - Consolidated and correct version
-- ============================================================================

-- Drop and recreate the function to ensure it's correct
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record_id uuid;
  user_type_value user_type;
  approval_status_value approval_status;
  valid_categories service_category[];
BEGIN
  -- Determine user type from metadata or default to 'client'
  user_type_value := COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type);
  
  -- Determine approval status based on user type
  approval_status_value := CASE 
    WHEN user_type_value = 'client' THEN 'approved'::approval_status
    WHEN user_type_value = 'admin' THEN 'approved'::approval_status
    ELSE 'pending'::approval_status
  END;
  
  -- Insert profile with proper approval status
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    user_type, 
    approval_status,
    subscription_fee_paid
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User'),
    user_type_value,
    approval_status_value,
    true -- Auto-approve subscription fee
  )
  RETURNING id INTO profile_record_id;
  
  -- If the user is a service provider, create service_providers record
  IF user_type_value = 'service_provider' THEN
    -- Parse service categories from user metadata if provided
    IF NEW.raw_user_meta_data->'service_categories' IS NOT NULL THEN
      SELECT ARRAY(
        SELECT trim(value::text, '"')::service_category
        FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'service_categories') AS value
        WHERE trim(value::text, '"') IN (
          'construction', 'plumbing', 'electrical', 'roofing', 
          'tiling', 'surveying', 'maintenance'
        )
      ) INTO valid_categories;
    END IF;
    
    -- Insert service provider entry
    INSERT INTO public.service_providers (
      profile_id, 
      business_name, 
      service_categories
    )
    VALUES (
      profile_record_id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business'), 
      COALESCE(valid_categories, ARRAY[]::service_category[])
    )
    ON CONFLICT (profile_id) DO NOTHING; -- Prevent duplicate insert errors
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger (user should still be created)
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. ENSURE TRIGGER EXISTS AND IS ACTIVE
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. BACKFILL: Create profiles for existing auth.users without profiles
-- ============================================================================

INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status, subscription_fee_paid)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email, 'User'),
  COALESCE((u.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type),
  CASE 
    WHEN COALESCE((u.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type) IN ('client', 'admin') 
    THEN 'approved'::approval_status
    ELSE 'pending'::approval_status
  END,
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 5. VERIFY: Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates a profile when a new user signs up. Sets approval_status based on user_type: clients and admins are auto-approved, service_providers are pending.';

COMMENT ON POLICY "Users can ALWAYS view their own profile" ON public.profiles IS 
  'CRITICAL: This policy ensures authenticated users can always read their own profile. Do not remove or modify without careful consideration.';

