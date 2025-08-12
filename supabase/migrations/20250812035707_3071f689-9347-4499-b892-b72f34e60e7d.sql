-- Fix function search path mutable warnings by setting search_path explicitly
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path TO 'public';
ALTER FUNCTION public.get_user_role(_user_id uuid) SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.set_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';