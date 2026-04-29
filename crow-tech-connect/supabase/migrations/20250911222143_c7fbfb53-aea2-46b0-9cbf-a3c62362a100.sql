-- Fix the security definer view warning by dropping and recreating as a regular view
DROP VIEW IF EXISTS public.service_provider_public_info;

-- Create a regular view (not security definer) for public service provider information
CREATE VIEW public.service_provider_public_info AS
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

-- Set up RLS for the view to allow authenticated users to access public info
CREATE POLICY "Public service provider info viewable by authenticated users" 
ON public.service_provider_public_info 
FOR SELECT 
TO authenticated 
USING (true);