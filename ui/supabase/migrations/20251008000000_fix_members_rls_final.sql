drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Users can view all members" on public.members;

create policy "Users can view all members"
  on public.members for select
  using (true);
