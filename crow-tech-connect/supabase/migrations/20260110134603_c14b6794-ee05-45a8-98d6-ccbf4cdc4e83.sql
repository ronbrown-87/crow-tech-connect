-- Fix the handle_new_user function to properly reference the user_type enum from the public schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_type_text text := NULL;
  user_type_value public.user_type := 'client'::public.user_type;
BEGIN
  raw_type_text := NEW.raw_user_meta_data->>'user_type';

  IF raw_type_text IS NOT NULL THEN
    IF raw_type_text = ANY(ARRAY['client','service_provider','admin']) THEN
      user_type_value := raw_type_text::public.user_type;
    ELSE
      user_type_value := 'client'::public.user_type;
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, user_type, approval_status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      user_type_value,
      CASE 
        WHEN user_type_value = 'client' THEN 'approved'::public.approval_status
        WHEN user_type_value = 'admin' THEN 'approved'::public.approval_status
        ELSE 'pending'::public.approval_status
      END
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.user_signup_errors (auth_user_id, error_text)
    VALUES (NEW.id, SQLERRM);
  END;

  RETURN NEW;
END;
$$;