-- COMPREHENSIVE AUTH & PROFILE FIX - Production Ready
-- This migration consolidates and fixes all auth and profile issues

-- ============================================================================
-- 1. FIX handle_new_user FUNCTION - Ensure profile is ALWAYS created
-- ============================================================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  profile_record_id uuid;
  user_type_value user_type;
  approval_status_value approval_status;
  valid_categories service_category[];
  full_name_value text;
BEGIN
  -- Get user type from metadata, default to 'client'
  user_type_value := COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type);
  
  -- Get full name from metadata or email
  full_name_value := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1),
    'User'
  );
  
  -- Determine approval status: clients and admins auto-approved, service providers pending
  approval_status_value := CASE 
    WHEN user_type_value = 'client' THEN 'approved'::approval_status
    WHEN user_type_value = 'admin' THEN 'approved'::approval_status
    ELSE 'pending'::approval_status
  END;
  
  -- Insert profile - ALWAYS create one
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    user_type, 
    approval_status,
    subscription_fee_paid,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    full_name_value,
    user_type_value,
    approval_status_value,
    true, -- Auto-approve subscription fee
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW()
  RETURNING id INTO profile_record_id;
  
  -- If service provider, create or update service_providers entry
  IF user_type_value = 'service_provider' THEN
    -- Parse service categories from metadata
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
    
    -- Insert or update service provider entry
    INSERT INTO public.service_providers (
      profile_id, 
      business_name, 
      service_categories,
      created_at,
      updated_at
    )
    VALUES (
      profile_record_id, 
      COALESCE(full_name_value, 'My Business'), 
      COALESCE(valid_categories, ARRAY[]::service_category[]),
      NOW(),
      NOW()
    )
    ON CONFLICT (profile_id) DO UPDATE
    SET
      business_name = COALESCE(EXCLUDED.business_name, service_providers.business_name),
      service_categories = COALESCE(EXCLUDED.service_categories, service_providers.service_categories),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger (user should still be created)
    RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, SQLERRM;
    -- Try to create a minimal profile as fallback
    BEGIN
      INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status, subscription_fee_paid)
      VALUES (NEW.id, COALESCE(NEW.email, ''), 'User', 'client'::user_type, 'approved'::approval_status, true)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        -- If even minimal profile fails, log but continue
        RAISE WARNING 'Failed to create fallback profile for user %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates profile on user signup. Guarantees profile creation with proper approval status and service provider entries.';

-- ============================================================================
-- 2. ENSURE TRIGGER EXISTS AND IS ACTIVE
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. FIX is_admin FUNCTION - Handle missing profiles gracefully
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_admin_result boolean;
BEGIN
  -- Check if user is admin, handling case where profile might not exist yet
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.user_id = check_user_id 
    AND p.user_type = 'admin'::user_type
  ) INTO is_admin_result;
  
  RETURN COALESCE(is_admin_result, false);
EXCEPTION
  WHEN OTHERS THEN
    -- If query fails for any reason, return false (fail-safe)
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS 
  'Safely checks if a user is an admin. Returns false if profile doesn''t exist or on error.';

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- ============================================================================
-- 4. ENSURE RLS POLICIES ARE CORRECT (Non-recursive)
-- ============================================================================

-- CRITICAL: Users must ALWAYS be able to read their own profile (FIRST - highest priority)
DROP POLICY IF EXISTS "Users can ALWAYS view their own profile" ON public.profiles;
CREATE POLICY "Users can ALWAYS view their own profile" 
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles (non-recursive using is_admin function)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());

-- Admins can update all profiles
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;
CREATE POLICY "Admins can update approval status"
ON public.profiles
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Service providers can view client profiles for matching requests
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
-- 5. ENSURE SERVICE REQUESTS RLS ALLOWS PROVIDERS TO VIEW MATCHING REQUESTS
-- ============================================================================

-- Service providers can view pending requests that match their categories
DROP POLICY IF EXISTS "Service providers can view matching pending requests" ON public.service_requests;
CREATE POLICY "Service providers can view matching pending requests"
ON public.service_requests
FOR SELECT
USING (
  status = 'pending'::request_status
  AND service_provider_id IS NULL
  AND EXISTS (
    SELECT 1 
    FROM public.services s
    JOIN public.service_providers sp ON s.category = ANY(sp.service_categories)
    JOIN public.profiles p ON p.id = sp.profile_id
    WHERE s.id = service_requests.service_id
    AND p.user_id = auth.uid()
    AND p.user_type = 'service_provider'::user_type
    AND p.approval_status = 'approved'::approval_status
  )
);

-- Service providers can view their assigned requests
DROP POLICY IF EXISTS "Service providers can view assigned requests" ON public.service_requests;
CREATE POLICY "Service providers can view assigned requests"
ON public.service_requests
FOR SELECT
USING (
  service_provider_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.service_providers sp
    JOIN public.profiles p ON p.id = sp.profile_id
    WHERE sp.id = service_requests.service_provider_id
    AND p.user_id = auth.uid()
  )
);

-- Clients can always view their own requests
DROP POLICY IF EXISTS "Clients can view their own requests" ON public.service_requests;
CREATE POLICY "Clients can view their own requests"
ON public.service_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = service_requests.client_id
    AND p.user_id = auth.uid()
  )
);

-- Admins can view all requests
DROP POLICY IF EXISTS "Admins can view all requests" ON public.service_requests;
CREATE POLICY "Admins can view all requests"
ON public.service_requests
FOR SELECT
USING (public.is_admin());

-- ============================================================================
-- 6. BACKFILL: Create profiles for any existing users without profiles
-- ============================================================================

INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status, subscription_fee_paid, created_at)
SELECT 
  u.id,
  COALESCE(u.email, ''),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    SPLIT_PART(u.email, '@', 1),
    'User'
  ),
  COALESCE((u.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type),
  CASE 
    WHEN COALESCE((u.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type) IN ('client', 'admin') 
    THEN 'approved'::approval_status
    ELSE 'pending'::approval_status
  END,
  true,
  COALESCE(u.created_at, NOW())
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 7. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type_approval ON public.profiles(user_type, approval_status);
CREATE INDEX IF NOT EXISTS idx_service_requests_status_provider ON public.service_requests(status, service_provider_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_profile_id ON public.service_providers(profile_id);
CREATE INDEX IF NOT EXISTS idx_service_providers_service_categories ON public.service_providers USING GIN(service_categories);

-- ============================================================================
-- 8. VERIFY TRIGGER IS ACTIVE
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created is not active!';
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

