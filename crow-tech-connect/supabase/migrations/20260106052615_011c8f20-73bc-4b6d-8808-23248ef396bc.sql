-- Add portfolio_captions column to service_providers table
ALTER TABLE public.service_providers 
ADD COLUMN portfolio_captions JSONB DEFAULT '{}'::jsonb;

-- This will store captions as: {"image_url": "caption text", ...}