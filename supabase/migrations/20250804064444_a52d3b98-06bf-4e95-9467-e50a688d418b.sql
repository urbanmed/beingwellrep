-- Update the handle_new_user function to support phone signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    user_id, 
    first_name, 
    last_name,
    phone_number
  )
  VALUES (
    NEW.id,
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name', 
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone_number')
  );
  RETURN NEW;
END;
$$;