-- Drop existing tables and policies
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_updated_at() cascade;

drop table if exists public.messages cascade;
drop table if exists public.chats cascade;
drop table if exists public.project_members cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Integrations (master list)
create table public.integrations (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  icon_url text,
  mcp_server_config jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Users table (extends auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User integrations
create table public.user_integrations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  integration_id uuid references public.integrations(id) on delete cascade not null,
  credentials jsonb,
  config jsonb,
  connected_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, integration_id)
);

-- Projects
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Members (junction table: users ↔ projects)
create type member_role as enum ('admin', 'member');

create table public.members (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  role member_role not null default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, project_id)
);

-- Chats (channels/conversations in a project)
create table public.chats (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  is_private boolean default false,
  created_by uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Messages
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  parent_message_id uuid references public.messages(id) on delete cascade,
  is_llm_message boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone
);

-- Row Level Security (RLS) policies

-- Enable RLS
alter table public.integrations enable row level security;
alter table public.users enable row level security;
alter table public.user_integrations enable row level security;
alter table public.projects enable row level security;
alter table public.members enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

-- Integrations policies (public read)
create policy "Anyone can view integrations"
  on public.integrations for select
  using (true);

-- Users policies
create policy "Users can view their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);

-- User integrations policies
create policy "Users can view their own integrations"
  on public.user_integrations for select
  using (auth.uid() = user_id);

create policy "Users can manage their own integrations"
  on public.user_integrations for all
  using (auth.uid() = user_id);

-- Projects policies
create policy "Users can view projects they are members of"
  on public.projects for select
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = auth.uid()
    )
  );

create policy "Users can create projects"
  on public.projects for insert
  with check (auth.uid() = created_by);

create policy "Project admins can update projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = auth.uid()
      and members.role = 'admin'
    )
  );

create policy "Project admins can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.members
      where members.project_id = projects.id
      and members.user_id = auth.uid()
      and members.role = 'admin'
    )
  );

-- Members policies
create policy "Users can view members of their projects"
  on public.members for select
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = auth.uid()
    )
  );

create policy "Project admins can add members"
  on public.members for insert
  with check (
    exists (
      select 1 from public.members
      where members.project_id = members.project_id
      and members.user_id = auth.uid()
      and members.role = 'admin'
    )
  );

create policy "Project admins can update member roles"
  on public.members for update
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
    )
  );

create policy "Project admins can remove members"
  on public.members for delete
  using (
    exists (
      select 1 from public.members m
      where m.project_id = members.project_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
    )
  );

-- Chats policies
create policy "Users can view chats in their projects"
  on public.chats for select
  using (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = auth.uid()
    )
  );

create policy "Project members can create chats"
  on public.chats for insert
  with check (
    exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = auth.uid()
    )
  );

create policy "Chat creators and admins can update chats"
  on public.chats for update
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = auth.uid()
      and members.role = 'admin'
    )
  );

create policy "Chat creators and admins can delete chats"
  on public.chats for delete
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.members
      where members.project_id = chats.project_id
      and members.user_id = auth.uid()
      and members.role = 'admin'
    )
  );

-- Messages policies
create policy "Users can view messages in their project chats"
  on public.messages for select
  using (
    exists (
      select 1 from public.chats
      join public.members on members.project_id = chats.project_id
      where chats.id = messages.chat_id
      and members.user_id = auth.uid()
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
      and members.user_id = auth.uid()
    )
  );

create policy "Message authors can update their messages"
  on public.messages for update
  using (auth.uid() = user_id);

create policy "Message authors can soft delete their messages"
  on public.messages for update
  using (auth.uid() = user_id);

-- Functions and triggers

-- Function to create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to auto-add creator as admin when creating project
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.members (user_id, project_id, role)
  values (new.created_by, new.id, 'admin');
  return new;
end;
$$;

-- Trigger to auto-add creator as admin
create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.handle_new_project();

-- Function to update updated_at timestamp
create or replace function public.handle_message_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Trigger for message updated_at
create trigger handle_messages_updated_at
  before update on public.messages
  for each row execute procedure public.handle_message_updated_at();

-- Seed default integrations
insert into public.integrations (name, icon_url, mcp_server_config) values
  ('Figma', null, '{"server_type": "mcp", "capabilities": ["design_access", "comments"]}'::jsonb),
  ('Notion', null, '{"server_type": "mcp", "capabilities": ["pages", "databases"]}'::jsonb),
  ('GitHub', null, '{"server_type": "mcp", "capabilities": ["repos", "issues", "prs"]}'::jsonb),
  ('Linear', null, '{"server_type": "mcp", "capabilities": ["issues", "projects"]}'::jsonb),
  ('Slack', null, '{"server_type": "mcp", "capabilities": ["channels", "messages"]}'::jsonb);
