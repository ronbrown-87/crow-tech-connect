-- Fix critical PII exposure by removing public access to personal data in profiles table
-- Remove the overly permissive policy that exposes all profile fields
DROP POLICY IF EXISTS "Public can view service provider business info" ON public.profiles;

-- Create a view for public service provider business information
-- This ensures only business-relevant data is exposed, not personal information
CREATE OR REPLACE VIEW public.service_provider_business_info AS
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
  p.user_type,
  p.approval_status,
  p.location -- Only location for business purposes, no personal contact info
FROM public.service_providers sp
JOIN public.profiles p ON p.id = sp.profile_id
WHERE p.user_type = 'service_provider'::user_type 
  AND p.approval_status = 'approved'::approval_status;