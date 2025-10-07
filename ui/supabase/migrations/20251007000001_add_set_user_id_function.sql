-- Function to set user ID in session context
-- This allows RLS policies to access the current user via current_user_id()

CREATE OR REPLACE FUNCTION public.set_user_id(user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id)::text, true);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO anon;
