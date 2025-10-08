-- Ensure set_user_id function has proper grants (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_user_id') THEN
    GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO anon;
    GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_id') THEN
    GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon;
    GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
  END IF;
END $$;
