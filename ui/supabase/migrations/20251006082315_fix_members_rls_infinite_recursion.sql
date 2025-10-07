drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Project admins can add members" on public.members;
drop policy if exists "Project admins can update member roles" on public.members;
drop policy if exists "Project admins can remove members" on public.members;

create policy "Users can view members of their projects"
  on public.members for select
  using (user_id = public.current_user_id() or project_id in (
    select project_id from public.members where user_id = public.current_user_id()
  ));

create policy "Project admins can add members"
  on public.members for insert
  with check (
    project_id in (
      select m.project_id from public.members m
      where m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

create policy "Project admins can update member roles"
  on public.members for update
  using (
    project_id in (
      select m.project_id from public.members m
      where m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );

create policy "Project admins can remove members"
  on public.members for delete
  using (
    project_id in (
      select m.project_id from public.members m
      where m.user_id = public.current_user_id()
      and m.role = 'admin'
    )
  );
