-- Fix the user context functions to properly handle Better Auth sessions

-- Drop and recreate set_user_id to ensure it works correctly
DROP FUNCTION IF EXISTS public.set_user_id(TEXT);

CREATE OR REPLACE FUNCTION public.set_user_id(user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set a simple TEXT config variable instead of trying to use JWT format
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO anon;

-- Update current_user_id to use the simpler config variable
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_text TEXT;
BEGIN
  -- Get user ID from our custom config variable
  BEGIN
    user_id_text := current_setting('app.current_user_id', true);
  EXCEPTION WHEN OTHERS THEN
    user_id_text := NULL;
  END;

  RETURN user_id_text;
END;
$$;

-- Test the functions
DO $$
BEGIN
  PERFORM set_user_id('test-user-123');

  IF current_user_id() = 'test-user-123' THEN
    RAISE NOTICE 'User context functions working correctly!';
  ELSE
    RAISE WARNING 'User context functions not working correctly!';
  END IF;
END $$;
