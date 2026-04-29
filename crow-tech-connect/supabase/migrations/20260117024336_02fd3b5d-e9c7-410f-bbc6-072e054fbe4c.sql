-- Allow reading basic profile info for approved service providers
-- This enables the service_providers RLS policy to work correctly
CREATE POLICY "Public can read approved service provider profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM service_providers sp
    WHERE sp.profile_id = profiles.id
  )
  AND approval_status = 'approved'::approval_status
  AND user_type = 'service_provider'::user_type
);