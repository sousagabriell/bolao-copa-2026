-- Notificações de reações recebidas em palpites e no ranking.
-- Referencia a mensagem de reação em chat_messages (que já guarda o snapshot
-- reaction_data) em vez de duplicar os dados da reação nesta tabela.

create table public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.notifications.user_id is 'Quem recebe a notificação (alvo da reação)';
comment on column public.notifications.actor_id is 'Quem reagiu';

create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Usuários veem apenas suas notificações"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Usuários marcam como lida apenas sua própria notificação"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
