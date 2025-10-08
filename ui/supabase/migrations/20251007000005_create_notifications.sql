create type notification_type as enum ('mention', 'reply', 'project_invite', 'system');

create table public.notifications (
  id text primary key not null default gen_random_uuid()::text,
  user_id text references public.users(id) on delete cascade not null,
  type notification_type not null,
  title text not null,
  message text not null,
  link text,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (current_user_id() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (current_user_id() = user_id);

create policy "System can create notifications"
  on public.notifications for insert
  with check (true);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read on public.notifications(read);
create index idx_notifications_created_at on public.notifications(created_at desc);
