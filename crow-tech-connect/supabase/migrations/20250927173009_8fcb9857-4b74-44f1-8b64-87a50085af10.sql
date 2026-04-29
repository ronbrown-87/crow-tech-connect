-- Fix Security Definer View issue by recreating the function without SECURITY DEFINER
-- The function will now use SECURITY INVOKER (default) which respects the caller's permissions

-- Drop the existing security definer function
DROP FUNCTION IF EXISTS public.get_service_provider_business_info(uuid);

-- Recreate the function without SECURITY DEFINER (using SECURITY INVOKER by default)
-- This will now respect the RLS policies on the underlying tables
CREATE OR REPLACE FUNCTION public.get_service_provider_business_info(provider_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, business_name text, business_description text, service_categories service_category[], hourly_rate numeric, rating numeric, total_jobs integer, years_experience integer, certifications text[], portfolio_images text[], location text)
 LANGUAGE sql
 STABLE SECURITY INVOKER  -- Explicitly use SECURITY INVOKER instead of DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    sp.id,
    sp.business_name,
    sp.business_description,
    sp.service_categories,
    sp.hourly_rate,
    sp.rating,
    sp.total_jobs,
    sp.years_experience,
    sp.certifications,
    sp.portfolio_images,
    p.location -- Only business location, no personal contact info
  FROM public.service_providers sp
  JOIN public.profiles p ON p.id = sp.profile_id
  WHERE p.user_type = 'service_provider'::user_type 
    AND p.approval_status = 'approved'::approval_status
    AND (provider_id IS NULL OR sp.id = provider_id);
$function$;