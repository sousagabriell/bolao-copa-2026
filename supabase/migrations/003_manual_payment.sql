-- ============================================================
-- BOLÃO COPA 2026 — Migration 003: Pagamento manual (PIX fixo)
-- ============================================================
-- Remove integração com Mercado Pago e adiciona fluxo de
-- comprovante manual com aprovação pelo admin.

-- Remove constraint antiga de payment_status (qualquer versão)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payment_status_check;

-- Adiciona novos estados
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payment_status_check
  CHECK (payment_status IN ('pending', 'pending_approval', 'paid', 'rejected', 'revoked'));

-- Coluna para URL do comprovante de pagamento (salvo no Storage)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Remove coluna do Mercado Pago (não mais utilizada)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS payment_id;
