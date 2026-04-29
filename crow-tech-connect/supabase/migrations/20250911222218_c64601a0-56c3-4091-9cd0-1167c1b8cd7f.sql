-- Fix critical security vulnerability: Remove ALL existing policies and recreate secure ones
DROP POLICY IF EXISTS "Approved service providers are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Clients can view assigned service provider details" ON public.profiles;
DROP POLICY IF EXISTS "Service providers can view assigned client details" ON public.profiles;

-- Create secure policies that only allow viewing personal information when there's a legitimate business need

-- 1. Clients can view service provider contact info only for their active service requests
CREATE POLICY "Clients can view assigned service provider details" ON public.profiles
FOR SELECT 
USING (
  user_type = 'service_provider'::user_type 
  AND approval_status = 'approved'::approval_status
  AND EXISTS (
    SELECT 1 FROM service_requests sr
    JOIN service_providers sp ON sp.id = sr.service_provider_id
    JOIN profiles client_profile ON client_profile.id = sr.client_id
    WHERE sp.profile_id = profiles.id
    AND client_profile.user_id = auth.uid()
    AND sr.status IN ('assigned', 'in_progress')
  )
);

-- 2. Service providers can view client contact info only for their assigned requests
CREATE POLICY "Service providers can view assigned client details" ON public.profiles  
FOR SELECT
USING (
  user_type = 'client'::user_type
  AND EXISTS (
    SELECT 1 FROM service_requests sr
    JOIN service_providers sp ON sp.id = sr.service_provider_id
    JOIN profiles sp_profile ON sp_profile.id = sp.profile_id
    WHERE sr.client_id = profiles.id
    AND sp_profile.user_id = auth.uid()
    AND sr.status IN ('assigned', 'in_progress', 'completed')
  )
);

-- 3. Create a secure view for public service provider information (business info only, no personal contact details)
CREATE OR REPLACE VIEW public.service_provider_public_info AS
SELECT 
  p.id,
  p.user_id,
  p.full_name,
  p.location,
  sp.business_name,
  sp.business_description,
  sp.service_categories,
  sp.hourly_rate,
  sp.rating,
  sp.total_jobs,
  sp.years_experience,
  sp.portfolio_images
FROM profiles p
JOIN service_providers sp ON sp.profile_id = p.id
WHERE p.user_type = 'service_provider'::user_type 
AND p.approval_status = 'approved'::approval_status;