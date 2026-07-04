-- ============================================================
-- Snapshot estruturado para reações renderizadas como cards
-- ============================================================

alter table public.chat_messages
  add column reaction_data jsonb;

comment on column public.chat_messages.reaction_data is
  'Snapshot imutável dos dados da reação (palpite ou ranking) no momento do envio. '
  'NULL para mensagens de texto normais e para reações antigas enviadas antes desta coluna existir '
  '(essas continuam usando apenas a coluna message como fallback em texto simples).';
