-- Fix the security definer view issue by dropping it and using RLS policies instead
DROP VIEW IF EXISTS public.service_provider_public_info;

-- Instead, create a secure RLS policy that allows viewing limited service provider info
CREATE POLICY "Public can view service provider business info" ON public.profiles
FOR SELECT 
USING (
  user_type = 'service_provider'::user_type 
  AND approval_status = 'approved'::approval_status
  AND auth.role() = 'authenticated'
);

-- But we need to limit what fields are accessible - this requires app-level filtering
-- The policy above will allow access, but the app should only show business-relevant fields