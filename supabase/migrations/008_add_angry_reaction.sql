-- ============================================================
-- Adiciona o emoji 😡 ao conjunto de reações permitidas
-- ============================================================

alter table public.reactions
  drop constraint reactions_emoji_check;

alter table public.reactions
  add constraint reactions_emoji_check
  check (emoji in ('🔥', '😂', '😱', '👏', '😭', '😡'));
