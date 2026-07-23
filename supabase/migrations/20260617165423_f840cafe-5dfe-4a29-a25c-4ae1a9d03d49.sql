create type public.chat_channel_type as enum ('general', 'direct', 'site');

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_type public.chat_channel_type not null,
  channel_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  content text not null,
  source_lang text not null default 'ru',
  created_at timestamptz not null default now()
);

create index chat_messages_channel_idx on public.chat_messages (channel_type, channel_id, created_at);

grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;

alter table public.chat_messages enable row level security;

create policy "Authenticated can read chat messages" on public.chat_messages for select to authenticated using (true);
create policy "Authenticated can write own chat messages" on public.chat_messages for insert to authenticated with check (auth.uid() = author_id);

alter publication supabase_realtime add table public.chat_messages;