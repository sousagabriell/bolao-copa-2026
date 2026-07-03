-- ============================================================
-- Reações passam a ser publicadas como mensagens no chat, em vez
-- de contadores na listagem de palpites/ranking.
-- ============================================================

alter table public.chat_messages
  add column type text not null default 'text' check (type in ('text', 'reaction'));

drop table if exists public.reactions;
