-- Update all RLS policies to use public.current_user_id() instead of auth.uid()
-- This allows easy migration to Better Auth in the future

-- Drop and recreate all policies with the new function

-- Users policies
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;

create policy "Users can view their own profile"
  on public.users for select
  using (public.current_user_id() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (public.current_user_id() = id);

-- User integrations policies
drop policy if exists "Users can view their own integrations" on public.user_integrations;
drop policy if exists "Users can manage their own integrations" on public.user_integrations;

create policy "Users can view their own integrations"
  on public.user_integrations for select
  using (public.current_user_id() = user_id);

create policy "Users can manage their own integrations"
  on public.user_integrations for all
  using (public.current_user_id() = user_id);

-- Projects policies
drop policy if exists "Users can view projects they are members of" on public.projects;
drop policy if exists "Users can create projects" on public.projects;
drop policy if exists "Project admins can update projects" on public.projects;
drop policy if exists "Project admins can delete projects" on public.projects;

create policy "Users can view projects they are members of"
  on public.projects for select
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
    )
  );

create policy "Users can create projects"
  on public.projects for insert
  with check (public.current_user_id() = created_by);

create policy "Project admins can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

create policy "Project admins can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

-- Members policies
drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Project admins can add members" on public.members;
drop policy if exists "Project admins can update member roles" on public.members;
drop policy if exists "Project admins can remove members" on public.members;

create policy "Users can view members of their projects"
  on public.members for select
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
    )
  );

create policy "Project admins can add members"
  on public.members for insert
  with check (
    exists (
      select 1 from public.members
      where members.project_id = members.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

create policy "Project admins can update member roles"
  on public.members for update
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

create policy "Project admins can remove members"
  on public.members for delete
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

-- Chats policies
drop policy if exists "Users can view chats in their projects" on public.chats;
drop policy if exists "Project members can create chats" on public.chats;
drop policy if exists "Chat creators and admins can update chats" on public.chats;
drop policy if exists "Chat creators and admins can delete chats" on public.chats;

create policy "Users can view chats in their projects"
  on public.chats for select
  using (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
    )
  );

create policy "Project members can create chats"
  on public.chats for insert
  with check (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
    )
  );

create policy "Chat creators and admins can update chats"
  on public.chats for update
  using (
    public.current_user_id() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

create policy "Chat creators and admins can delete chats"
  on public.chats for delete
  using (
    public.current_user_id() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = public.current_user_id()
      and members.role = 'admin'
    )
  );

-- Messages policies
drop policy if exists "Users can view messages in their project chats" on public.messages;
drop policy if exists "Project members can create messages" on public.messages;
drop policy if exists "Message authors can update their messages" on public.messages;
drop policy if exists "Message authors can soft delete their messages" on public.messages;

create policy "Users can view messages in their project chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      join public.members on members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and members.user_id = public.current_user_id()
      and messages.deleted_at is null
    )
  );

create policy "Project members can create messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.chats
      join public.members on members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and members.user_id = public.current_user_id()
    )
  );

create policy "Message authors can update their messages"
  on public.messages for update
  using (public.current_user_id() = user_id);

create policy "Message authors can soft delete their messages"
  on public.messages for update
  using (public.current_user_id() = user_id);

-- Add comment explaining the abstraction
comment on function public.current_user_id() is
'Abstraction layer for current user ID. Currently uses Supabase auth.uid().
When migrating to Better Auth, update this function to:
  select user_id from public.sessions
  where token = current_setting(''request.jwt.claims'', true)::json->>''session_token''
  and expires_at > now()
  limit 1;';
