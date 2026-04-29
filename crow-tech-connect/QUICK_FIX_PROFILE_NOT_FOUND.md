# Quick Fix: Profile Not Found Error

## 🚨 IMMEDIATE FIX NEEDED

The "Profile Not Found" error means **the database migration hasn't been run yet**. Here's how to fix it:

## Step 1: Run the Database Migration

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the ENTIRE contents of this file:
   ```
   supabase/migrations/20260109000000_fix_profile_loading_issues.sql
   ```
6. Click **Run** (or press Ctrl+Enter)
7. Wait for the migration to complete (should take a few seconds)
8. You should see: "Success. No rows returned"

### Option B: Copy-Paste SQL (If file access is difficult)

Copy this SQL and paste it directly into Supabase SQL Editor:

```sql
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
```

## Step 2: Verify the Migration Worked

After running the migration, verify it worked:

1. In Supabase SQL Editor, run this query:
```sql
-- Check if the critical RLS policy exists
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'Users can ALWAYS view their own profile';
```

You should see one row returned.

2. Check if your profile exists:
```sql
-- Replace 'your-email@example.com' with your actual email
SELECT * FROM profiles WHERE email = 'your-email@example.com';
```

If no profile exists, the migration should have created it (backfill step).

## Step 3: Clear Browser Cache

1. Open browser DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Clear site data** or manually:
   - Clear **Local Storage**
   - Clear **Session Storage**
   - Clear **Cookies**
4. Refresh the page (Ctrl+F5 or Cmd+Shift+R)

## Step 4: Test Login Again

1. Sign out (if logged in)
2. Sign in again
3. Profile should load correctly now

## Still Not Working?

### Option 1: Use the Diagnostics Tool

Click the **"Run Diagnostics"** button on the error screen. This will:
- Check if profile exists
- Check if RLS policies are correct
- Check for other errors
- Attempt to create profile if missing

### Option 2: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for errors starting with `[AuthContext]`
4. Share the error message for further debugging

### Option 3: Manual Profile Creation

If profile still doesn't exist, create it manually:

```sql
-- Replace these values with your actual user info
-- First, get your user_id:
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert profile (replace 'YOUR_USER_ID' with the id from above):
INSERT INTO public.profiles (
  user_id, 
  email, 
  full_name, 
  user_type, 
  approval_status,
  subscription_fee_paid
) VALUES (
  'YOUR_USER_ID'::uuid,
  'your-email@example.com',
  'Your Name',
  'client'::user_type,
  'approved'::approval_status,
  true
) ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;
```

## What This Migration Does

1. **Fixes RLS Policies**: Creates the critical policy "Users can ALWAYS view their own profile"
2. **Fixes Profile Creation**: Ensures `handle_new_user` function creates profiles correctly
3. **Backfills Existing Users**: Creates profiles for users who signed up before the trigger existed
4. **Ensures Trigger Exists**: Creates the trigger if it doesn't exist

## Expected Result

After running the migration:
- ✅ Users can read their own profile
- ✅ Profile is created automatically on signup
- ✅ Existing users get profiles created
- ✅ No more "Profile Not Found" errors

---

**If you're still having issues after following these steps, the diagnostics tool will help identify the exact problem.**

