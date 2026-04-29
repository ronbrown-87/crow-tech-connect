-- Add social media and contact fields to service_providers
ALTER TABLE public.service_providers
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS twitter_url text,
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text;

-- Remove subscription_fee_paid requirement from profiles (no more payments)
ALTER TABLE public.profiles
ALTER COLUMN subscription_fee_paid SET DEFAULT true;

-- Update existing profiles to mark subscription as paid (removing payment barrier)
UPDATE public.profiles SET subscription_fee_paid = true WHERE subscription_fee_paid = false;

-- Allow public viewing of services without authentication
DROP POLICY IF EXISTS "Services are viewable by all authenticated users" ON public.services;
CREATE POLICY "Services are viewable by everyone" 
ON public.services 
FOR SELECT 
USING (is_active = true);

-- Allow public viewing of approved service providers
DROP POLICY IF EXISTS "Approved service providers are viewable" ON public.service_providers;
CREATE POLICY "Approved service providers are publicly viewable" 
ON public.service_providers 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = service_providers.profile_id 
  AND profiles.approval_status = 'approved'::approval_status
));

-- Allow public viewing of reviews
DROP POLICY IF EXISTS "Reviews are viewable by all authenticated users" ON public.reviews;
CREATE POLICY "Reviews are publicly viewable" 
ON public.reviews 
FOR SELECT 
USING (true);

-- Update profiles policy to allow viewing approved service provider profiles publicly
CREATE POLICY "Public can view approved provider profiles" 
ON public.profiles 
FOR SELECT 
USING (user_type = 'service_provider'::user_type AND approval_status = 'approved'::approval_status);