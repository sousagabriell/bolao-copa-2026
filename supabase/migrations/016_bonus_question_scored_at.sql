-- Marca quando uma pergunta extra foi de fato pontuada (não só quando a
-- resposta certa foi definida) — sinal usado pelo aviso de resultado
-- exibido na tela de Ranking.

alter table public.bonus_questions add column scored_at timestamptz;
