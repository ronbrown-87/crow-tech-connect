-- Fix the remaining Security Definer function: handle_new_user
-- This function needs to be converted from SECURITY DEFINER to SECURITY INVOKER
-- However, this function needs special consideration because it's a trigger function
-- that needs to write to the profiles table when users sign up

-- Drop the existing security definer function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with SECURITY INVOKER
-- Note: This function will now use the permissions of the calling user
-- Since this is a trigger on auth.users, we need to ensure proper access
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER  -- Changed from SECURITY DEFINER to SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$function$;

-- Recreate the trigger since we dropped the function with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();