-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Projects table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Project members table
create table public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- Chats table
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Projects policies
create policy "Users can view projects they are members of"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = projects.id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Project owners can update their projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Project owners can delete their projects"
  on public.projects for delete
  using (auth.uid() = owner_id);

-- Project members policies
create policy "Users can view members of their projects"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
    )
  );

create policy "Project admins can add members"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_members.project_id = project_members.project_id
      and project_members.user_id = auth.uid()
      and project_members.role in ('owner', 'admin')
    )
  );

-- Chats policies
create policy "Users can view chats in their projects"
  on public.chats for select
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = chats.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Project members can create chats"
  on public.chats for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_members.project_id = chats.project_id
      and project_members.user_id = auth.uid()
    )
  );

-- Messages policies
create policy "Users can view messages in their project chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      join public.project_members on project_members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Users can create messages in their project chats"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.chats
      join public.project_members on project_members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and project_members.user_id = auth.uid()
    )
  );

-- Functions and triggers

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Triggers for updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_projects_updated_at
  before update on public.projects
  for each row execute procedure public.handle_updated_at();

create trigger handle_chats_updated_at
  before update on public.chats
  for each row execute procedure public.handle_updated_at();
