-- Migration to make database Better Auth compatible while keeping Supabase Auth working
-- This allows easy migration to Better Auth in the future

-- Step 1: Make users table independent (no longer reference auth.users directly)
-- Add new columns that Better Auth needs
alter table public.users add column if not exists password_hash text;
alter table public.users add column if not exists email_verified boolean default false;
alter table public.users add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Step 2: Create Better Auth compatible tables (will be used when switching)
-- These tables are ready but not used yet while on Supabase Auth

-- Sessions table (for Better Auth)
create table if not exists public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  token text unique not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add foreign key that will work with Better Auth
alter table public.sessions
  add constraint fk_sessions_user_id
  foreign key (user_id) references public.users(id) on delete cascade;

-- Verification tokens table (for email verification with Better Auth)
create table if not exists public.verification_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  token text unique not null,
  type text not null check (type in ('email_verification', 'password_reset')),
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.verification_tokens
  add constraint fk_verification_tokens_user_id
  foreign key (user_id) references public.users(id) on delete cascade;

-- OAuth accounts table (for social login with Better Auth)
create table if not exists public.oauth_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  provider text not null check (provider in ('google', 'github', 'discord', 'twitter')),
  provider_account_id text not null,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(provider, provider_account_id)
);

alter table public.oauth_accounts
  add constraint fk_oauth_accounts_user_id
  foreign key (user_id) references public.users(id) on delete cascade;

-- Step 3: Create custom auth helper function
-- This abstracts away Supabase's auth.uid() so we can swap it later
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  -- For now, use Supabase's auth.uid()
  -- When migrating to Better Auth, replace this with session-based lookup
  select auth.uid();
$$;

-- Step 4: Add indexes for Better Auth performance
create index if not exists idx_sessions_user_id on public.sessions(user_id);
create index if not exists idx_sessions_token on public.sessions(token);
create index if not exists idx_sessions_expires_at on public.sessions(expires_at);
create index if not exists idx_verification_tokens_token on public.verification_tokens(token);
create index if not exists idx_verification_tokens_user_id on public.verification_tokens(user_id);
create index if not exists idx_oauth_accounts_user_id on public.oauth_accounts(user_id);
create index if not exists idx_oauth_accounts_provider on public.oauth_accounts(provider, provider_account_id);

-- Step 5: Add RLS for new tables
alter table public.sessions enable row level security;
alter table public.verification_tokens enable row level security;
alter table public.oauth_accounts enable row level security;

-- Sessions policies
create policy "Users can view their own sessions"
  on public.sessions for select
  using (user_id = public.current_user_id());

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (user_id = public.current_user_id());

-- Verification tokens policies
create policy "Users can view their own verification tokens"
  on public.verification_tokens for select
  using (user_id = public.current_user_id());

-- OAuth accounts policies
create policy "Users can view their own OAuth accounts"
  on public.oauth_accounts for select
  using (user_id = public.current_user_id());

create policy "Users can manage their own OAuth accounts"
  on public.oauth_accounts for all
  using (user_id = public.current_user_id());

-- Step 6: Update trigger for updated_at on users
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger handle_users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger handle_sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.handle_updated_at();

-- Step 7: Add comments for future migration
comment on table public.sessions is 'Better Auth session table - ready for migration from Supabase Auth';
comment on table public.verification_tokens is 'Better Auth verification tokens - ready for migration';
comment on table public.oauth_accounts is 'Better Auth OAuth accounts - ready for migration';
comment on function public.current_user_id() is 'Abstraction over auth system - currently uses Supabase auth.uid(), can be swapped to Better Auth session lookup';

-- Step 8: Create migration helper function for future Better Auth switch
create or replace function public.migrate_to_better_auth_sessions()
returns void
language plpgsql
security definer
as $$
begin
  -- This function will be called when migrating from Supabase Auth to Better Auth
  -- It will create sessions from existing Supabase auth users
  raise notice 'Run this function when ready to migrate to Better Auth';

  -- Example migration logic (commented out for now):
  -- insert into public.sessions (user_id, token, expires_at)
  -- select id, gen_random_uuid()::text, now() + interval '30 days'
  -- from public.users
  -- where id not in (select user_id from public.sessions);
end;
$$;

comment on function public.migrate_to_better_auth_sessions() is 'Helper function to migrate from Supabase Auth to Better Auth - run when switching auth providers';
