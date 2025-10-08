-- Convert existing UUID v4 IDs to UUID v7 format
-- This migration regenerates IDs for projects and chats while maintaining all relationships

-- Temporarily drop foreign key constraints
alter table public.members drop constraint if exists members_project_id_fkey;
alter table public.chats drop constraint if exists chats_project_id_fkey;
alter table public.messages drop constraint if exists messages_chat_id_fkey;

-- Update projects IDs
do $$
declare
  proj record;
  new_id uuid;
begin
  for proj in select * from public.projects loop
    new_id := uuid_generate_v7();

    -- Update foreign keys first
    update public.members set project_id = new_id where project_id = proj.id;
    update public.chats set project_id = new_id where project_id = proj.id;

    -- Update the project itself
    update public.projects set id = new_id where id = proj.id;
  end loop;
end $$;

-- Update chats IDs
do $$
declare
  chat_rec record;
  new_id uuid;
begin
  for chat_rec in select * from public.chats loop
    new_id := uuid_generate_v7();

    -- Update foreign keys first
    update public.messages set chat_id = new_id where chat_id = chat_rec.id;

    -- Update the chat itself
    update public.chats set id = new_id where id = chat_rec.id;
  end loop;
end $$;

-- Re-add foreign key constraints
alter table public.members
  add constraint members_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.chats
  add constraint chats_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

alter table public.messages
  add constraint messages_chat_id_fkey
  foreign key (chat_id) references public.chats(id) on delete cascade;
