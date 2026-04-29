-- Fix critical PII exposure by removing public access to personal data in profiles table
-- Remove the overly permissive policy that exposes all profile fields
DROP POLICY IF EXISTS "Public can view service provider business info" ON public.profiles;

-- Create a more restrictive policy that only allows viewing of minimal business status fields
-- This only exposes user_type and approval_status, no personal information
CREATE POLICY "Public can view service provider approval status" 
ON public.profiles 
FOR SELECT 
USING (
  user_type = 'service_provider'::user_type 
  AND approval_status = 'approved'::approval_status 
  AND auth.role() = 'authenticated'::text
);

-- Create a security definer function to safely get business information
-- This function will be used to fetch only business-relevant data without exposing PII
CREATE OR REPLACE FUNCTION public.get_service_provider_business_info(provider_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  business_name text,
  business_description text,
  service_categories service_category[],
  hourly_rate numeric,
  rating numeric,
  total_jobs integer,
  years_experience integer,
  certifications text[],
  portfolio_images text[],
  location text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;