-- Update current_user_id to read from request headers
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_text TEXT;
BEGIN
  -- Try to get from request header first
  BEGIN
    user_id_text := current_setting('request.headers', true)::json->>'x-user-id';
  EXCEPTION WHEN OTHERS THEN
    user_id_text := NULL;
  END;

  -- Fall back to session config
  IF user_id_text IS NULL THEN
    BEGIN
      user_id_text := current_setting('app.current_user_id', true);
    EXCEPTION WHEN OTHERS THEN
      user_id_text := NULL;
    END;
  END IF;

  RETURN user_id_text;
END;
$$;
