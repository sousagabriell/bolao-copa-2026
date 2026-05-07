-- ============================================================
-- BOLÃO COPA 2026 — Schema inicial (idempotente)
-- ============================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: profiles
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  avatar_url    text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'pending_approval', 'paid', 'rejected', 'revoked')),
  payment_proof_url text,
  paid_at       timestamptz,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Trigger para updated_at
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Trigger: criar profile automaticamente após signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TABELA: settings
-- Configurações globais do bolão (chave/valor)
-- ============================================================
create table if not exists public.settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.handle_updated_at();

-- Valores padrão (ignora se já existem)
insert into public.settings (key, value) values
  ('entry_fee', '50.00'),
  ('bolao_name', 'Bolão Copa 2026'),
  ('pix_key', '')
on conflict (key) do nothing;

-- ============================================================
-- TABELA: matches
-- Partidas da Copa do Mundo sincronizadas da API
-- ============================================================
create table if not exists public.matches (
  id                bigserial primary key,
  external_id       integer not null unique,  -- ID da football-data.org
  home_team         text not null,
  away_team         text not null,
  home_team_crest   text,
  away_team_crest   text,
  stadium           text,
  city              text,
  starts_at         timestamptz not null,
  status            text not null default 'SCHEDULED'
    check (status in ('SCHEDULED','TIMED','IN_PLAY','PAUSED','FINISHED','POSTPONED','SUSPENDED','CANCELLED')),
  home_score        integer,  -- null até o jogo terminar
  away_score        integer,  -- null até o jogo terminar
  -- Resultado nos 90 minutos (base para pontuação)
  home_score_regular integer,
  away_score_regular integer,
  stage             text not null,  -- GROUP_STAGE, LAST_16, QUARTER_FINALS, etc.
  group_name        text,           -- Grupo A, B... (apenas na fase de grupos)
  matchday          integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists matches_updated_at on public.matches;
create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.handle_updated_at();

create index if not exists matches_starts_at_idx on public.matches(starts_at);
create index if not exists matches_status_idx on public.matches(status);

-- ============================================================
-- TABELA: predictions
-- Palpites dos usuários por partida
-- ============================================================
create table if not exists public.predictions (
  id                  bigserial primary key,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  match_id            bigint not null references public.matches(id) on delete cascade,
  home_score_pred     integer not null check (home_score_pred >= 0),
  away_score_pred     integer not null check (away_score_pred >= 0),
  points              integer,  -- null = não calculado, 0/1/3 após o jogo
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, match_id)
);

drop trigger if exists predictions_updated_at on public.predictions;
create trigger predictions_updated_at
  before update on public.predictions
  for each row execute function public.handle_updated_at();

create index if not exists predictions_user_id_idx on public.predictions(user_id);
create index if not exists predictions_match_id_idx on public.predictions(match_id);

-- ============================================================
-- TABELA: webhook_logs
-- Log de webhooks recebidos do Mercado Pago
-- ============================================================
create table if not exists public.webhook_logs (
  id          bigserial primary key,
  payload     jsonb not null,
  status      text not null default 'received',
  processed_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- FUNÇÃO: calculate_points
-- Calcula pontos de todas as predictions de uma partida
-- Chamada após update do match com status = FINISHED
-- ============================================================
create or replace function public.calculate_match_points(p_match_id bigint)
returns void language plpgsql security definer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_home_result text;  -- 'home', 'away', 'draw'
  v_pred record;
  v_pred_result text;
  v_points integer;
begin
  -- Busca o resultado oficial nos 90 minutos
  select home_score_regular, away_score_regular
  into v_home_score, v_away_score
  from public.matches
  where id = p_match_id and status = 'FINISHED';

  if not found or v_home_score is null or v_away_score is null then
    return;
  end if;

  -- Determina o resultado do jogo
  if v_home_score > v_away_score then
    v_home_result := 'home';
  elsif v_away_score > v_home_score then
    v_home_result := 'away';
  else
    v_home_result := 'draw';
  end if;

  -- Percorre todas as predictions desse jogo
  for v_pred in
    select id, home_score_pred, away_score_pred
    from public.predictions
    where match_id = p_match_id
  loop
    -- Placar exato = 3 pts
    if v_pred.home_score_pred = v_home_score and v_pred.away_score_pred = v_away_score then
      v_points := 3;
    else
      -- Determina resultado do palpite
      if v_pred.home_score_pred > v_pred.away_score_pred then
        v_pred_result := 'home';
      elsif v_pred.away_score_pred > v_pred.home_score_pred then
        v_pred_result := 'away';
      else
        v_pred_result := 'draw';
      end if;

      -- Vencedor/empate correto = 1 pt
      if v_pred_result = v_home_result then
        v_points := 1;
      else
        v_points := 0;
      end if;
    end if;

    update public.predictions set points = v_points where id = v_pred.id;
  end loop;
end;
$$;

-- Trigger que dispara o cálculo quando um jogo termina
create or replace function public.trigger_calculate_points()
returns trigger language plpgsql as $$
begin
  -- Só calcula quando o status muda para FINISHED e há placar
  if new.status = 'FINISHED'
     and new.home_score_regular is not null
     and new.away_score_regular is not null
     and (old.status != 'FINISHED' or old.home_score_regular is distinct from new.home_score_regular or old.away_score_regular is distinct from new.away_score_regular)
  then
    perform public.calculate_match_points(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists matches_calculate_points on public.matches;
create trigger matches_calculate_points
  after update on public.matches
  for each row execute function public.trigger_calculate_points();

-- ============================================================
-- VIEW: ranking
-- Ranking dos participantes com pontuação total
-- ============================================================
create or replace view public.ranking as
select
  p.id,
  p.name,
  p.avatar_url,
  p.created_at as joined_at,
  coalesce(sum(pr.points), 0) as total_points,
  count(case when pr.points = 3 then 1 end) as exact_scores,
  count(case when pr.points = 1 then 1 end) as correct_results,
  count(pr.id) as total_predictions
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
where p.payment_status = 'paid'
group by p.id, p.name, p.avatar_url, p.created_at
order by
  total_points desc,
  exact_scores desc,
  correct_results desc,
  p.created_at asc;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by all paid users" on public.profiles;
create policy "Profiles are viewable by all paid users"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- matches
alter table public.matches enable row level security;

drop policy if exists "Matches are viewable by authenticated users" on public.matches;
create policy "Matches are viewable by authenticated users"
  on public.matches for select
  to authenticated
  using (true);

drop policy if exists "Only service role can modify matches" on public.matches;
create policy "Only service role can modify matches"
  on public.matches for all
  to service_role
  using (true);

-- predictions
alter table public.predictions enable row level security;

drop policy if exists "Users can view own predictions" on public.predictions;
create policy "Users can view own predictions"
  on public.predictions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own predictions before match starts" on public.predictions;
create policy "Users can insert own predictions before match starts"
  on public.predictions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and payment_status = 'paid'
    )
    and exists (
      select 1 from public.matches
      where id = match_id and starts_at > now()
    )
  );

drop policy if exists "Users can update own predictions before match starts" on public.predictions;
create policy "Users can update own predictions before match starts"
  on public.predictions for update
  to authenticated
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.matches
      where id = match_id and starts_at > now()
    )
  );

-- settings
alter table public.settings enable row level security;

drop policy if exists "Settings are viewable by authenticated users" on public.settings;
create policy "Settings are viewable by authenticated users"
  on public.settings for select
  to authenticated
  using (true);

drop policy if exists "Only service role can modify settings" on public.settings;
create policy "Only service role can modify settings"
  on public.settings for all
  to service_role
  using (true);

-- webhook_logs
alter table public.webhook_logs enable row level security;

drop policy if exists "Only service role can access webhook logs" on public.webhook_logs;
create policy "Only service role can access webhook logs"
  on public.webhook_logs for all
  to service_role
  using (true);
