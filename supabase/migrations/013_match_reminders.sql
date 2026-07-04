-- Segundo tipo de notificação: lembrete de palpite 1h antes do jogo.
-- Reaproveita a tabela notifications (antes só usada para reações),
-- tornando actor_id/message_id opcionais e adicionando match_id.

alter table public.notifications
  add column type text not null default 'reaction' check (type in ('reaction', 'match_reminder')),
  add column match_id bigint references public.matches(id) on delete cascade,
  alter column actor_id drop not null,
  alter column message_id drop not null;

alter table public.notifications add constraint notifications_type_shape_check check (
  (type = 'reaction' and message_id is not null and match_id is null)
  or
  (type = 'match_reminder' and match_id is not null and actor_id is null and message_id is null)
);

-- Evita lembrete duplicado do mesmo jogo pro mesmo usuário
create unique index notifications_match_reminder_unique_idx
  on public.notifications (user_id, match_id)
  where type = 'match_reminder';

-- Gera os lembretes para jogos que começam entre 55 e 65 minutos a partir de agora
-- e cujo usuário ainda não salvou o palpite.
create or replace function public.create_match_reminder_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, match_id, created_at)
  select p.id, 'match_reminder', m.id, now()
  from public.matches m
  join public.profiles p on p.payment_status = 'paid'
  where m.starts_at - now() between interval '55 minutes' and interval '65 minutes'
    and m.status not in ('POSTPONED', 'CANCELLED', 'FINISHED')
    and not exists (
      select 1 from public.predictions pr
      where pr.match_id = m.id and pr.user_id = p.id
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id and n.match_id = m.id and n.type = 'match_reminder'
    );
end;
$$;

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'match-reminder-notifications',
  '*/5 * * * *',
  $$ select public.create_match_reminder_notifications(); $$
);
