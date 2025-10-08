-- Ensure set_user_id function has proper grants
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.set_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
