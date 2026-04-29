-- Insert all the new services
INSERT INTO public.services (name, description, category, base_price, duration_estimate, is_active) VALUES
-- Home & Construction (using existing categories)
('Plumber', 'Professional plumbing installation and repair services', 'plumbing', 50, '1-2 hours', true),
('Electrician', 'Electrical wiring, repairs and installations', 'electrical', 60, '1-3 hours', true),
('Carpenter', 'Custom woodwork, furniture repair and installations', 'carpentry', 70, '2-4 hours', true),
('Painter', 'Interior and exterior painting services', 'painting', 80, '1-2 days', true),
('Cleaner / Housekeeping', 'Professional cleaning and housekeeping services', 'maintenance', 40, '2-4 hours', true),
('Handyman', 'General home repairs and maintenance', 'maintenance', 50, '1-3 hours', true),

-- Automotive
('Mechanic', 'Vehicle repair and maintenance services', 'automotive', 100, '2-6 hours', true),
('Car Wash & Detailing', 'Professional car cleaning and detailing', 'automotive', 50, '1-2 hours', true),
('Towing Service', 'Vehicle towing and roadside assistance', 'automotive', 150, '1-2 hours', true),
('Motorcycle Repair', 'Motorcycle maintenance and repair services', 'automotive', 80, '1-3 hours', true),
('Mobile Tire Service', 'On-site tire repair and replacement', 'automotive', 60, '30 min - 1 hour', true),

-- Tech & Digital
('Web Developer', 'Website design and development services', 'tech', 500, '1-4 weeks', true),
('Mobile App Developer', 'iOS and Android app development', 'tech', 1000, '4-12 weeks', true),
('UI/UX Designer', 'User interface and experience design', 'tech', 400, '1-3 weeks', true),
('Graphic Designer', 'Logos, branding and graphic design', 'tech', 200, '2-5 days', true),
('Digital Marketer', 'Online marketing and advertising services', 'tech', 300, '1-4 weeks', true),
('Social Media Manager', 'Social media management and content creation', 'tech', 250, '1-4 weeks', true),
('Video Editor', 'Professional video editing services', 'tech', 150, '1-3 days', true),

-- Creative & Media
('Photographer', 'Professional photography services', 'creative', 200, '2-6 hours', true),
('Videographer', 'Video production and filming services', 'creative', 300, '3-8 hours', true),
('Content Creator', 'Digital content creation and production', 'creative', 150, '1-3 days', true),
('Event Coverage', 'Full event photography and videography', 'creative', 500, '4-8 hours', true),
('Animator', 'Animation and motion graphics', 'creative', 400, '1-2 weeks', true),
('Music Producer / DJ', 'Music production and DJ services', 'creative', 250, '2-6 hours', true),

-- Outdoor & Landscaping
('Gardener / Landscaping', 'Garden maintenance and landscaping services', 'landscaping', 80, '2-4 hours', true),

-- Education & Coaching
('Tutors (Math, Science, Languages)', 'Academic tutoring services', 'education', 40, '1-2 hours', true),
('Exam Prep Coaches', 'Exam preparation and coaching', 'education', 60, '1-2 hours', true),
('Fitness Trainers', 'Personal fitness training', 'education', 50, '1-2 hours', true),
('Life Coaches', 'Personal and professional life coaching', 'education', 100, '1-2 hours', true),
('Music Teachers', 'Music lessons and instruction', 'education', 45, '1 hour', true),

-- Events & Entertainment
('Event Planner', 'Professional event planning and coordination', 'events', 500, '1-4 weeks', true),
('Caterer', 'Catering and food services for events', 'events', 300, 'per event', true),
('Decorator', 'Event and venue decoration services', 'events', 200, '4-8 hours', true),
('MC / Host', 'Master of ceremonies and hosting services', 'events', 150, '2-6 hours', true),
('Sound & Lighting', 'Audio and lighting equipment rental and setup', 'events', 250, '3-8 hours', true);

-- Create storage bucket for profile and portfolio images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('provider-images', 'provider-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for provider-images bucket
CREATE POLICY "Anyone can view provider images"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-images');

CREATE POLICY "Authenticated users can upload provider images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'provider-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own provider images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'provider-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own provider images"
ON storage.objects FOR DELETE
USING (bucket_id = 'provider-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update the handle_new_user function to store user_type and create service_provider record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type),
    'approved'::approval_status
  );
  
  -- If the user is a service provider, also create a service_providers record
  IF (NEW.raw_user_meta_data->>'user_type') = 'service_provider' THEN
    INSERT INTO public.service_providers (profile_id, business_name, service_categories)
    SELECT p.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business'), ARRAY[]::service_category[]
    FROM public.profiles p WHERE p.user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;