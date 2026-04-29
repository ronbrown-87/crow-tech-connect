-- Add admin role to user_roles table for existing admin users
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'::app_role
FROM public.profiles p
WHERE p.user_type = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the insert worked
SELECT p.email, p.user_type, ur.role as user_role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.user_type = 'admin';