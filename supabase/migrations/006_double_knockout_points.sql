-- ============================================================
-- Dobra a pontuação a partir das oitavas de final (mata-mata)
-- ============================================================

create or replace function public.calculate_match_points(p_match_id bigint)
returns void language plpgsql security definer as $$
declare
  v_home_score integer;
  v_away_score integer;
  v_stage text;
  v_multiplier integer;
  v_home_result text;  -- 'home', 'away', 'draw'
  v_pred record;
  v_pred_result text;
  v_points integer;
begin
  -- Busca o resultado oficial nos 90 minutos e a fase do jogo
  select home_score_regular, away_score_regular, stage
  into v_home_score, v_away_score, v_stage
  from public.matches
  where id = p_match_id and status = 'FINISHED';

  if not found or v_home_score is null or v_away_score is null then
    return;
  end if;

  -- A partir das oitavas de final (mata-mata), a pontuação vale o dobro
  v_multiplier := case
    when v_stage in ('LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL') then 2
    else 1
  end;

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
    -- Placar exato = 3 pts (x2 no mata-mata)
    if v_pred.home_score_pred = v_home_score and v_pred.away_score_pred = v_away_score then
      v_points := 3 * v_multiplier;
    else
      -- Determina resultado do palpite
      if v_pred.home_score_pred > v_pred.away_score_pred then
        v_pred_result := 'home';
      elsif v_pred.away_score_pred > v_pred.home_score_pred then
        v_pred_result := 'away';
      else
        v_pred_result := 'draw';
      end if;

      -- Vencedor/empate correto = 1 pt (x2 no mata-mata)
      if v_pred_result = v_home_result then
        v_points := 1 * v_multiplier;
      else
        v_points := 0;
      end if;
    end if;

    update public.predictions set points = v_points where id = v_pred.id;
  end loop;
end;
$$;

-- ============================================================
-- VIEW: ranking
-- Recriada (mantendo a coluna bonus_points adicionada na migration
-- 004) para reconhecer os pontos dobrados do mata-mata
-- (placar exato = 3 ou 6 pts; resultado correto = 1 ou 2 pts)
-- ============================================================
create or replace view public.ranking as
select
  p.id,
  p.name,
  p.avatar_url,
  p.created_at as joined_at,
  coalesce((select sum(pr.points) from public.predictions pr where pr.user_id = p.id), 0) +
  coalesce((select sum(ba.points) from public.bonus_answers ba where ba.user_id = p.id), 0) as total_points,
  coalesce((select count(*) from public.predictions pr where pr.user_id = p.id and pr.points in (3, 6)), 0) as exact_scores,
  coalesce((select count(*) from public.predictions pr where pr.user_id = p.id and pr.points in (1, 2)), 0) as correct_results,
  coalesce((select count(*) from public.predictions pr where pr.user_id = p.id), 0) as total_predictions,
  coalesce((select sum(ba.points) from public.bonus_answers ba where ba.user_id = p.id), 0) as bonus_points
from public.profiles p
where p.payment_status = 'paid'
order by
  total_points desc,
  exact_scores desc,
  correct_results desc,
  p.created_at asc;

-- Recalcula os jogos já encerrados para aplicar o multiplicador retroativamente
do $$
declare
  v_match record;
begin
  for v_match in select id from public.matches where status = 'FINISHED' loop
    perform public.calculate_match_points(v_match.id);
  end loop;
end;
$$;
