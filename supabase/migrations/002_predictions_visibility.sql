-- Política para leitura de predictions por todos os pagos (para tela de palpites ver palpites alheios se desejado)
-- Por ora, cada usuário vê apenas os próprios palpites.
-- Para exibir palpites de outros usuários APÓS o início do jogo, adicionar aqui.

create policy "Paid users can view all predictions after match starts"
  on public.predictions for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.profiles
        where id = auth.uid() and payment_status = 'paid'
      )
      and exists (
        select 1 from public.matches
        where id = match_id and starts_at <= now()
      )
    )
  );
