-- ============================================================
-- Reações em emoji nas mensagens do chat (estilo WhatsApp/Slack)
-- ============================================================

create table public.chat_message_reactions (
  id          bigserial primary key,
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null check (emoji in ('🔥', '😂', '😱', '👏', '😭', '😡')),
  created_at  timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index chat_message_reactions_message_idx on public.chat_message_reactions(message_id);

alter table public.chat_message_reactions enable row level security;

create policy "Paid users can view message reactions"
  on public.chat_message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Paid users can react to messages"
  on public.chat_message_reactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Users can remove own message reactions"
  on public.chat_message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);
