-- 1) Create trigger to auto-create profile on new user signup
CREATE TRIGGER IF NOT EXISTS on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill profiles for existing users missing a profile
INSERT INTO public.profiles (user_id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);

-- 3) Fix recursive RLS policies on profiles causing 42P17 errors
DROP POLICY IF EXISTS "Clients can view assigned service provider details" ON public.profiles;
DROP POLICY IF EXISTS "Service providers can view assigned client details" ON public.profiles;

-- Keep existing safe policies like "Users can view their own profile" and public provider info.
-- Optionally, future work can reintroduce cross-access via SECURITY DEFINER functions or views without recursion.