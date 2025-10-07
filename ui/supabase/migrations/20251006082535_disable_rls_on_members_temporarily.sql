drop policy if exists "Users can view members of their projects" on public.members;
drop policy if exists "Project admins can add members" on public.members;
drop policy if exists "Project admins can update member roles" on public.members;
drop policy if exists "Project admins can remove members" on public.members;

alter table public.members disable row level security;
