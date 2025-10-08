-- Add Better Auth user to public.users and all projects (if Better Auth table exists)
DO $$
DECLARE
  target_user_id TEXT;
  old_user_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- Check if Better Auth user table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE 'Better Auth user table does not exist yet, skipping migration';
    RETURN;
  END IF;

  -- Get the user ID from Better Auth
  EXECUTE 'SELECT id FROM public."user" WHERE email = $1'
    INTO target_user_id
    USING 'rein_sprites.5y@icloud.com';

  IF target_user_id IS NOT NULL THEN
    -- Check if email exists in users with different ID
    SELECT id INTO old_user_id FROM public.users
    WHERE email = 'rein_sprites.5y@icloud.com'
    AND id::text != target_user_id;

    IF old_user_id IS NOT NULL THEN
      -- Update old user's email to avoid conflict
      UPDATE public.users
      SET email = 'old_' || email
      WHERE id = old_user_id;

      RAISE NOTICE 'Updated old user % email to avoid conflict', old_user_id;
    END IF;

    -- Insert user into public.users
    INSERT INTO public.users (id, email)
    VALUES (target_user_id::uuid, 'rein_sprites.5y@icloud.com')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    RAISE NOTICE 'Added user % to public.users', target_user_id;

    -- Add user to all projects as admin
    INSERT INTO public.members (user_id, project_id, role)
    SELECT
      target_user_id::uuid as user_id,
      id as project_id,
      'admin' as role
    FROM public.projects
    ON CONFLICT (user_id, project_id) DO NOTHING;

    RAISE NOTICE 'Successfully added user to % projects', (SELECT COUNT(*) FROM public.projects);
  ELSE
    RAISE NOTICE 'User with email rein_sprites.5y@icloud.com not found';
  END IF;
END $$;
