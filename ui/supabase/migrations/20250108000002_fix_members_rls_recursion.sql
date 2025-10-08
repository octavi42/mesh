drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Project admins can add members" on public.members;
drop policy if exists "Project admins can update member roles" on public.members;
drop policy if exists "Project admins can remove members" on public.members;
drop policy if exists "Users can view all members" on public.members;
drop policy if exists "Project creators can add initial member" on public.members;
drop policy if exists "Users can update their own membership" on public.members;
drop policy if exists "Users can delete their own membership" on public.members;

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
