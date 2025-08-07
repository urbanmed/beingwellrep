-- Grant admin access to the current user
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES (auth.uid(), 'admin'::app_role, auth.uid())
ON CONFLICT (user_id, role) DO NOTHING;