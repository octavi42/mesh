-- Enhanced trigger to automatically sync Better Auth users to public.users
-- This ensures every user who signs in gets an entry in public.users

DROP TRIGGER IF EXISTS sync_better_auth_user_trigger ON public.user;
DROP FUNCTION IF EXISTS public.sync_better_auth_user();

-- Improved sync function with better error handling
CREATE OR REPLACE FUNCTION public.sync_better_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update the user in public.users
  INSERT INTO public.users (id, email, display_name, avatar_url, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.name, NEW.email),
    NEW.image,
    COALESCE(NEW."createdAt", NOW())
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();

  RAISE NOTICE 'Synced user % to public.users', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to sync user % to public.users: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on Better Auth user table for INSERT and UPDATE
CREATE TRIGGER sync_better_auth_user_trigger
  AFTER INSERT OR UPDATE ON public.user
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_better_auth_user();

-- Sync any existing Better Auth users that aren't in public.users yet
INSERT INTO public.users (id, email, display_name, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.name, u.email) as display_name,
  u.image as avatar_url,
  COALESCE(u."createdAt", NOW()) as created_at
FROM public.user u
LEFT JOIN public.users pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
