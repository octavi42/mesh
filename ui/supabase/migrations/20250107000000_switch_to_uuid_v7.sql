-- Migration to switch from UUID v4 to UUID v7
-- UUID v7 is time-sortable and provides better database performance

-- Enable pgcrypto extension for gen_random_bytes
create extension if not exists pgcrypto;

-- Create UUID v7 generation function
create or replace function uuid_generate_v7()
returns uuid
as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms = substring(int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);

  uuid_bytes = unix_ts_ms || extensions.gen_random_bytes(10);

  uuid_bytes = set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);

  return encode(uuid_bytes, 'hex')::uuid;
end
$$
language plpgsql
volatile;

-- Update default values for all tables to use UUID v7
alter table public.integrations alter column id set default uuid_generate_v7();
alter table public.user_integrations alter column id set default uuid_generate_v7();
alter table public.projects alter column id set default uuid_generate_v7();
alter table public.members alter column id set default uuid_generate_v7();
alter table public.chats alter column id set default uuid_generate_v7();
alter table public.messages alter column id set default uuid_generate_v7();
