-- Update RLS policies for proper access control

-- Allow service providers to view pending requests with client profile info (for matching service categories)
-- This is handled by the service_providers policy for viewing their own data
-- And by a new policy that allows viewing pending requests where service category matches

-- Drop existing service_requests policies that might be too restrictive
DROP POLICY IF EXISTS "Service providers can view assigned requests" ON public.service_requests;
DROP POLICY IF EXISTS "Service providers can view available requests by category" ON public.service_requests;

-- Allow service providers to view pending requests that match their service categories
-- This policy allows approved service providers to see pending requests for services they offer
CREATE POLICY "Service providers can view matching pending requests" 
ON public.service_requests
FOR SELECT
USING (
  status = 'pending'::request_status 
  AND service_provider_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.service_providers sp
    JOIN public.profiles p ON p.id = sp.profile_id
    JOIN public.services s ON s.id = service_requests.service_id
    WHERE p.user_id = auth.uid()
    AND p.approval_status = 'approved'::approval_status
    AND s.category = ANY(sp.service_categories)
  )
);

-- Allow service providers to view requests assigned to them with client info
CREATE POLICY "Service providers can view their assigned requests" 
ON public.service_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers sp
    JOIN public.profiles p ON p.id = sp.profile_id
    WHERE sp.id = service_requests.service_provider_id 
    AND p.user_id = auth.uid()
  )
);

-- Allow service providers to update requests assigned to them
CREATE POLICY "Service providers can update assigned requests"
ON public.service_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_providers sp
    JOIN public.profiles p ON p.id = sp.profile_id
    WHERE sp.id = service_requests.service_provider_id 
    AND p.user_id = auth.uid()
  )
);

-- Allow clients to update their own requests (mark as finished, etc.)
CREATE POLICY "Clients can update their own requests"
ON public.service_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = service_requests.client_id 
    AND profiles.user_id = auth.uid()
  )
);

-- Allow clients to delete their own requests
CREATE POLICY "Clients can delete their own requests"
ON public.service_requests
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = service_requests.client_id 
    AND profiles.user_id = auth.uid()
    AND (service_requests.status = 'pending'::request_status OR service_requests.status = 'cancelled'::request_status)
  )
);

-- Allow service providers to view client profiles for assigned/pending requests they can respond to
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

-- Allow admins to view all profiles for approval management
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

-- Allow admins to update approval status
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

-- Ensure clients don't need approval (they should be auto-approved)
-- Update the handle_new_user function to auto-approve clients
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type_value user_type;
BEGIN
  user_type_value := COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type);
  
  INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    user_type_value,
    CASE 
      WHEN user_type_value = 'client' THEN 'approved'::approval_status
      WHEN user_type_value = 'admin' THEN 'approved'::approval_status
      ELSE 'pending'::approval_status
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

