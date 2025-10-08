alter table public.projects enable row level security;
alter table public.members enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

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
      and members.user_id = current_user_id()
    )
  );

create policy "Users can create projects"
  on public.projects for insert
  with check (created_by = current_user_id());

create policy "Project admins can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = current_user_id()
      and members.role = 'admin'
    )
  );

create policy "Project admins can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = current_user_id()
      and members.role = 'admin'
    )
  );

drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Project admins can add members" on public.members;
drop policy if exists "Project admins can update member roles" on public.members;
drop policy if exists "Project admins can remove members" on public.members;

create policy "Users can view all members"
  on public.members for select
  using (true);

create policy "Project creators can add initial member"
  on public.members for insert
  with check (user_id = current_user_id());

create policy "Users can update their own membership"
  on public.members for update
  using (user_id = current_user_id());

create policy "Users can delete their own membership"
  on public.members for delete
  using (user_id = current_user_id());

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
      and members.user_id = current_user_id()
    )
  );

create policy "Project members can create chats"
  on public.chats for insert
  with check (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = current_user_id()
    )
    and created_by = current_user_id()
  );

create policy "Chat creators and admins can update chats"
  on public.chats for update
  using (
    created_by = current_user_id()
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = current_user_id()
      and members.role = 'admin'
    )
  );

create policy "Chat creators and admins can delete chats"
  on public.chats for delete
  using (
    created_by = current_user_id()
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = current_user_id()
      and members.role = 'admin'
    )
  );

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
      and members.user_id = current_user_id()
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
      and members.user_id = current_user_id()
    )
  );

create policy "Message authors can update their messages"
  on public.messages for update
  using (user_id = current_user_id());
