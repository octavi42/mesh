-- Create chat_memberships table for tracking which users are in which chats
create table if not exists public.chat_memberships (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references public.chats(id) on delete cascade not null,
  user_id text references public.users(id) on delete cascade not null,
  is_accepted boolean default false not null,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(chat_id, user_id)
);

-- Enable RLS
alter table public.chat_memberships enable row level security;

-- Chat memberships policies
drop policy if exists "Users can view chat memberships" on public.chat_memberships;
drop policy if exists "Chat members can add users" on public.chat_memberships;
drop policy if exists "Users can accept their own invitations" on public.chat_memberships;
drop policy if exists "Chat members can remove users" on public.chat_memberships;

create policy "Users can view chat memberships"
  on public.chat_memberships for select
  using (
    user_id = current_user_id()
    or exists (
      select 1 from public.chat_memberships cm
      where cm.chat_id = chat_memberships.chat_id
      and cm.user_id = current_user_id()
    )
  );

create policy "Chat members can add users"
  on public.chat_memberships for insert
  with check (
    exists (
      select 1 from public.chats
      where chats.id = chat_memberships.chat_id
      and chats.created_by = current_user_id()
    )
  );

create policy "Users can accept their own invitations"
  on public.chat_memberships for update
  using (user_id = current_user_id());

create policy "Chat creators can remove users"
  on public.chat_memberships for delete
  using (
    exists (
      select 1 from public.chats
      where chats.id = chat_memberships.chat_id
      and chats.created_by = current_user_id()
    )
  );

-- Create index for faster lookups
create index if not exists idx_chat_memberships_chat_id on public.chat_memberships(chat_id);
create index if not exists idx_chat_memberships_user_id on public.chat_memberships(user_id);
