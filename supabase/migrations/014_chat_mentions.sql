-- Menções (@usuário) em mensagens de texto do chat.

create table public.chat_message_mentions (
  id                 bigserial primary key,
  message_id         bigint not null references public.chat_messages(id) on delete cascade,
  mentioned_user_id  uuid not null references public.profiles(id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (message_id, mentioned_user_id)
);

create index chat_message_mentions_message_idx on public.chat_message_mentions(message_id);

alter table public.chat_message_mentions enable row level security;

create policy "Paid users can view message mentions"
  on public.chat_message_mentions for select
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and payment_status = 'paid'));

-- Sem policy de insert pra authenticated — inserts só via createServiceClient()
-- dentro de sendMessage, igual a notifications já faz.

-- Terceiro tipo de notificação: menção em mensagem de chat.
-- Se o nome da constraint abaixo não existir (nome auto-gerado pode variar),
-- consultar antes: select conname from pg_constraint where conrelid = 'public.notifications'::regclass;
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('reaction', 'match_reminder', 'mention'));

alter table public.notifications drop constraint notifications_type_shape_check;
alter table public.notifications add constraint notifications_type_shape_check check (
  (type in ('reaction', 'mention') and message_id is not null and match_id is null)
  or
  (type = 'match_reminder' and match_id is not null and actor_id is null and message_id is null)
);
