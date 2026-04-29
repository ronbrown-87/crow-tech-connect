
ALTER TABLE public.service_providers
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- Add index for spatial queries
CREATE INDEX idx_service_providers_location ON public.service_providers (latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
