-- Update the handle_new_user function to include service categories from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_record_id uuid;
  categories_text text[];
  valid_categories service_category[];
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'client'::user_type),
    'approved'::approval_status
  )
  RETURNING id INTO profile_record_id;
  
  -- If the user is a service provider, also create a service_providers record
  IF (NEW.raw_user_meta_data->>'user_type') = 'service_provider' THEN
    -- Parse service categories from user metadata
    SELECT ARRAY(
      SELECT trim(value::text, '"')::service_category
      FROM jsonb_array_elements_text(
        COALESCE(NEW.raw_user_meta_data->'service_categories', '[]'::jsonb)
      ) AS value
      WHERE trim(value::text, '"') IN (
        'automotive', 'carpentry', 'construction', 'creative', 'education',
        'electrical', 'events', 'landscaping', 'maintenance', 'outdoor',
        'painting', 'plumbing', 'roofing', 'surveying', 'tech', 'tiling'
      )
    ) INTO valid_categories;
    
    INSERT INTO public.service_providers (profile_id, business_name, service_categories)
    VALUES (
      profile_record_id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Business'), 
      COALESCE(valid_categories, ARRAY[]::service_category[])
    );
  END IF;
  
  RETURN NEW;
END;
$$;