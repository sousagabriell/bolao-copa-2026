-- Quarto tipo de notificação: reação em emoji a uma mensagem de chat
-- (chat_message_reactions), avisando o dono da mensagem.

alter table public.notifications
  add column emoji text check (emoji in ('🔥', '😂', '😱', '👏', '😭', '😡'));

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('reaction', 'match_reminder', 'mention', 'message_reaction'));

alter table public.notifications drop constraint notifications_type_shape_check;
alter table public.notifications add constraint notifications_type_shape_check check (
  (type in ('reaction', 'mention') and message_id is not null and match_id is null and emoji is null)
  or
  (type = 'match_reminder' and match_id is not null and actor_id is null and message_id is null and emoji is null)
  or
  (type = 'message_reaction' and message_id is not null and match_id is null and actor_id is not null and emoji is not null)
);
