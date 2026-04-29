-- Create trigger if missing to auto-create profiles for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill profiles for existing users missing a profile
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);

-- Drop recursive RLS policies that cause 42P17 errors
DROP POLICY IF EXISTS "Clients can view assigned service provider details" ON public.profiles;
DROP POLICY IF EXISTS "Service providers can view assigned client details" ON public.profiles;