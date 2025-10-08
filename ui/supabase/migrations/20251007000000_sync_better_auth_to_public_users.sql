-- First, we need to change public.users.id from UUID to TEXT to match Better Auth
-- Drop all dependent objects first

-- Drop ALL policies that depend on user-related columns
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can manage their own integrations" ON public.user_integrations;
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view members of their projects" ON public.members;
DROP POLICY IF EXISTS "Project admins can add members" ON public.members;
DROP POLICY IF EXISTS "Project admins can update member roles" ON public.members;
DROP POLICY IF EXISTS "Project admins can remove members" ON public.members;
DROP POLICY IF EXISTS "Users can view chats in their projects" ON public.chats;
DROP POLICY IF EXISTS "Project members can create chats" ON public.chats;
DROP POLICY IF EXISTS "Chat creators and admins can update chats" ON public.chats;
DROP POLICY IF EXISTS "Chat creators and admins can delete chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view messages in their project chats" ON public.messages;
DROP POLICY IF EXISTS "Project members can create messages" ON public.messages;
DROP POLICY IF EXISTS "Message authors can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Message authors can soft delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view their own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can manage their own OAuth accounts" ON public.oauth_accounts;
DROP POLICY IF EXISTS "Users can view their own verification tokens" ON public.verification_tokens;

-- Drop foreign key constraints
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.user_integrations DROP CONSTRAINT IF EXISTS user_integrations_user_id_fkey;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_user_id_fkey;
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_created_by_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Drop Better Auth and old auth session foreign key temporarily
ALTER TABLE public.session DROP CONSTRAINT IF EXISTS session_userId_fkey;
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS fk_sessions_user_id;
ALTER TABLE public.oauth_accounts DROP CONSTRAINT IF EXISTS fk_oauth_accounts_user_id;
ALTER TABLE public.verification_tokens DROP CONSTRAINT IF EXISTS fk_verification_tokens_user_id;

-- Drop the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the current_user_id function so we can change its return type
DROP FUNCTION IF EXISTS public.current_user_id() CASCADE;

-- Change column types
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.user_integrations ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.projects ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.members ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.chats ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE public.messages ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.sessions ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.oauth_accounts ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.verification_tokens ALTER COLUMN user_id TYPE TEXT;

-- Recreate foreign key constraints
ALTER TABLE public.user_integrations ADD CONSTRAINT user_integrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.members ADD CONSTRAINT members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.chats ADD CONSTRAINT chats_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Update current_user_id() to return TEXT instead of UUID
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_text TEXT;
BEGIN
  -- Try to get user ID from request headers (set by middleware)
  user_id_text := current_setting('request.jwt.claims', true)::json->>'sub';

  RETURN user_id_text;
END;
$$;

-- Recreate policies with the new type
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (public.current_user_id() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (public.current_user_id() = id);

CREATE POLICY "Users can view their own integrations"
  ON public.user_integrations FOR SELECT
  USING (public.current_user_id() = user_id);

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations FOR ALL
  USING (public.current_user_id() = user_id);

-- Function to sync Better Auth user to public.users
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
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);

  RETURN NEW;
END;
$$;

-- Create trigger on Better Auth user table
DROP TRIGGER IF EXISTS sync_better_auth_user_trigger ON public.user;
CREATE TRIGGER sync_better_auth_user_trigger
  AFTER INSERT OR UPDATE ON public.user
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_better_auth_user();

-- Recreate Better Auth session foreign key
ALTER TABLE public.session ADD CONSTRAINT session_userId_fkey
  FOREIGN KEY ("userId") REFERENCES public.user(id) ON DELETE CASCADE;

-- Recreate old auth table foreign keys
ALTER TABLE public.sessions ADD CONSTRAINT fk_sessions_user_id
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.oauth_accounts ADD CONSTRAINT fk_oauth_accounts_user_id
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.verification_tokens ADD CONSTRAINT fk_verification_tokens_user_id
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Recreate ALL RLS policies with TEXT type
CREATE POLICY "Users can view projects they are members of"
  ON public.projects FOR SELECT
  USING (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.current_user_id() = created_by);

CREATE POLICY "Project admins can update projects"
  ON public.projects FOR UPDATE
  USING (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

CREATE POLICY "Project admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

CREATE POLICY "Users can view members of their projects"
  ON public.members FOR SELECT
  USING (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Project admins can add members"
  ON public.members FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.members
      where members.project_id = members.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

CREATE POLICY "Project admins can update member roles"
  ON public.members FOR UPDATE
  USING (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

CREATE POLICY "Project admins can remove members"
  ON public.members FOR DELETE
  USING (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

CREATE POLICY "Users can view chats in their projects"
  ON public.chats FOR SELECT
  USING (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Project members can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Chat creators and admins can update chats"
  ON public.chats FOR UPDATE
  USING (
    public.current_user_id() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

CREATE POLICY "Chat creators and admins can delete chats"
  ON public.chats FOR DELETE
  USING (
    public.current_user_id() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

CREATE POLICY "Users can view messages in their project chats"
  ON public.messages FOR SELECT
  USING (
    exists (
      select 1 from public.chats
      join public.members on members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and members.user_id = public.current_user_id()
      and messages.deleted_at is null
    )
  );

CREATE POLICY "Project members can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    exists (
      select 1 from public.chats
      join public.members on members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and members.user_id = public.current_user_id()
    )
  );

CREATE POLICY "Message authors can update their messages"
  ON public.messages FOR UPDATE
  USING (public.current_user_id() = user_id);

CREATE POLICY "Message authors can soft delete their messages"
  ON public.messages FOR UPDATE
  USING (public.current_user_id() = user_id);

-- Recreate policies for sessions, oauth_accounts, and verification_tokens
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (public.current_user_id() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (public.current_user_id() = user_id);

CREATE POLICY "Users can view their own OAuth accounts"
  ON public.oauth_accounts FOR SELECT
  USING (public.current_user_id() = user_id);

CREATE POLICY "Users can manage their own OAuth accounts"
  ON public.oauth_accounts FOR ALL
  USING (public.current_user_id() = user_id);

CREATE POLICY "Users can view their own verification tokens"
  ON public.verification_tokens FOR SELECT
  USING (public.current_user_id() = user_id);

-- Migrate existing Better Auth users to public.users
INSERT INTO public.users (id, email, display_name, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.name, u.email) as display_name,
  u.image as avatar_url,
  COALESCE(u."createdAt", NOW()) as created_at
FROM public.user u
ON CONFLICT (id) DO NOTHING;
