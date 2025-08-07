-- Grant admin access to the user
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES ('e40ec137-0171-433c-818c-a02429539838'::uuid, 'admin'::app_role, 'e40ec137-0171-433c-818c-a02429539838'::uuid)
ON CONFLICT (user_id, role) DO NOTHING;