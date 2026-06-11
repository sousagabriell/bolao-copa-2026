-- ============================================================
-- BOLÃO COPA 2026 — Migration 004: Perguntas Extras (Bonus)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bonus_questions (
  id           bigserial PRIMARY KEY,
  question     text NOT NULL,
  description  text,
  type         text NOT NULL DEFAULT 'select'
               CHECK (type IN ('select', 'number')),
  options      jsonb,        -- string[] para type='select'
  min_value    integer,      -- para type='number'
  max_value    integer,      -- para type='number'
  correct_answer text,       -- definido pelo admin após o evento
  points       integer NOT NULL DEFAULT 5,
  closes_at    timestamptz,  -- null = aberta indefinidamente
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS bonus_questions_updated_at ON public.bonus_questions;
CREATE TRIGGER bonus_questions_updated_at
  BEFORE UPDATE ON public.bonus_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.bonus_answers (
  id           bigserial PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id  bigint NOT NULL REFERENCES public.bonus_questions(id) ON DELETE CASCADE,
  answer       text NOT NULL,
  points       integer,      -- null até ser apurado pelo admin
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

DROP TRIGGER IF EXISTS bonus_answers_updated_at ON public.bonus_answers;
CREATE TRIGGER bonus_answers_updated_at
  BEFORE UPDATE ON public.bonus_answers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Atualiza view ranking para incluir pontos das perguntas extras
CREATE OR REPLACE VIEW public.ranking AS
SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.created_at AS joined_at,
  COALESCE((SELECT SUM(pr.points)  FROM public.predictions  pr WHERE pr.user_id = p.id), 0) +
  COALESCE((SELECT SUM(ba.points)  FROM public.bonus_answers ba WHERE ba.user_id = p.id), 0) AS total_points,
  COALESCE((SELECT COUNT(*)        FROM public.predictions  pr WHERE pr.user_id = p.id AND pr.points = 3), 0) AS exact_scores,
  COALESCE((SELECT COUNT(*)        FROM public.predictions  pr WHERE pr.user_id = p.id AND pr.points = 1), 0) AS correct_results,
  COALESCE((SELECT COUNT(*)        FROM public.predictions  pr WHERE pr.user_id = p.id), 0) AS total_predictions,
  COALESCE((SELECT SUM(ba.points)  FROM public.bonus_answers ba WHERE ba.user_id = p.id), 0) AS bonus_points
FROM public.profiles p
WHERE p.payment_status = 'paid'
ORDER BY total_points DESC, exact_scores DESC, correct_results DESC, p.created_at ASC;

-- RLS: bonus_questions
ALTER TABLE public.bonus_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bonus_questions_authenticated_select" ON public.bonus_questions;
CREATE POLICY "bonus_questions_authenticated_select"
  ON public.bonus_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "bonus_questions_service_all" ON public.bonus_questions;
CREATE POLICY "bonus_questions_service_all"
  ON public.bonus_questions FOR ALL TO service_role USING (true);

-- RLS: bonus_answers
ALTER TABLE public.bonus_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bonus_answers_own" ON public.bonus_answers;
CREATE POLICY "bonus_answers_own"
  ON public.bonus_answers FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "bonus_answers_service_all" ON public.bonus_answers;
CREATE POLICY "bonus_answers_service_all"
  ON public.bonus_answers FOR ALL TO service_role USING (true);
