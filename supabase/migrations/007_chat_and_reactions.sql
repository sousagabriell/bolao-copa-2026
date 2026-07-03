-- ============================================================
-- Chat público do bolão + reações em emoji (palpites e ranking)
-- ============================================================

-- ============================================================
-- TABELA: chat_messages
-- ============================================================
create table public.chat_messages (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  message     text not null check (char_length(trim(message)) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index chat_messages_created_at_idx on public.chat_messages(created_at);

alter table public.chat_messages enable row level security;

create policy "Paid users can view chat messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Paid users can send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Users can delete own chat messages"
  on public.chat_messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- TABELA: reactions
-- Reação em emoji a um palpite (predictions) ou a uma posição
-- no ranking (perfil de outro usuário). Exatamente um dos dois
-- alvos deve estar preenchido.
-- ============================================================
create table public.reactions (
  id                bigserial primary key,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  emoji             text not null check (emoji in ('🔥', '😂', '😱', '👏', '😭')),
  prediction_id     bigint references public.predictions(id) on delete cascade,
  ranking_user_id   uuid references public.profiles(id) on delete cascade,
  created_at        timestamptz not null default now(),
  check (
    (prediction_id is not null and ranking_user_id is null)
    or (prediction_id is null and ranking_user_id is not null)
  )
);

create unique index reactions_pred_uidx
  on public.reactions(user_id, emoji, prediction_id)
  where prediction_id is not null;

create unique index reactions_rank_uidx
  on public.reactions(user_id, emoji, ranking_user_id)
  where ranking_user_id is not null;

create index reactions_prediction_idx on public.reactions(prediction_id) where prediction_id is not null;
create index reactions_ranking_idx on public.reactions(ranking_user_id) where ranking_user_id is not null;

alter table public.reactions enable row level security;

create policy "Paid users can view reactions"
  on public.reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Paid users can react"
  on public.reactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
  );

create policy "Users can remove own reactions"
  on public.reactions for delete
  to authenticated
  using (auth.uid() = user_id);
