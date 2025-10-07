-- Automatically add new users to a default project when they sign up
-- This ensures every user can immediately access the app

-- Function to add user to default projects
CREATE OR REPLACE FUNCTION public.add_user_to_default_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Add user to all existing projects as a member
  -- In production, you'd probably want to:
  -- 1. Create a personal project for them
  -- 2. Or add them to a specific "Welcome" project
  -- 3. Or require manual invitation

  -- For now, add them to all test projects
  INSERT INTO public.members (user_id, project_id, role)
  SELECT NEW.id, p.id, 'member'
  FROM public.projects p
  WHERE p.id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  )
  ON CONFLICT (user_id, project_id) DO NOTHING;

  RAISE NOTICE 'Added user % to default projects', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to add user % to default projects: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on public.users (after the sync trigger runs)
DROP TRIGGER IF EXISTS add_user_to_default_projects_trigger ON public.users;
CREATE TRIGGER add_user_to_default_projects_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.add_user_to_default_projects();

-- Add any existing users who don't have project memberships
INSERT INTO public.members (user_id, project_id, role)
SELECT u.id, p.id, 'member'
FROM public.users u
CROSS JOIN public.projects p
WHERE p.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
AND NOT EXISTS (
  SELECT 1 FROM public.members m
  WHERE m.user_id = u.id AND m.project_id = p.id
)
ON CONFLICT (user_id, project_id) DO NOTHING;
