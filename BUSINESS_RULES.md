# Regras de Negócio — Bolão Copa do Mundo 2026

## 1. Acesso e Autenticação

- O app requer cadastro com **e-mail e senha** (via Supabase Auth).
- Após o cadastro, o usuário é redirecionado para a **tela de pagamento**.
- O usuário só tem acesso às telas internas (`/app/*`) quando `payment_status = 'paid'`.
- A validação de pagamento ocorre em **toda requisição** via middleware Next.js.
- Se o pagamento for revertido ou cancelado, o acesso é bloqueado novamente.

## 2. Pagamento (PIX)

- O valor da entrada (`entry_fee`) é configurado pelo admin no painel.
- O pagamento é feito exclusivamente via **PIX** integrado ao Mercado Pago.
- O fluxo:
  1. App cria preferência de pagamento no Mercado Pago com `external_reference = user_id`.
  2. QR Code e código copia-e-cola são exibidos ao usuário.
  3. Ao confirmar o pagamento, o Mercado Pago dispara um **webhook** para `/api/webhooks/mercadopago`.
  4. O webhook valida a assinatura HMAC, confirma o status `approved` e atualiza `profiles.payment_status = 'paid'`.
- Como fallback, o admin pode aprovar manualmente no painel `/admin`.
- Não há reembolso automático — qualquer estorno é gerenciado manualmente pelo admin.

## 3. Jogos e Partidas

- Os jogos são sincronizados automaticamente com a **football-data.org API** (competição `WC`, temporada `2026`).
- A sincronização ocorre diariamente via **Vercel Cron Job** (`/api/cron/sync-matches`).
- O admin pode disparar uma sincronização manual pelo painel.
- Cada jogo possui: times (casa e fora), brasões, data/hora de início, estádio, cidade, fase, grupo, placar real.
- Os resultados oficiais (placar final) são atualizados automaticamente quando `status = FINISHED`.
- Em partidas eliminatórias que vão a **prorrogação ou pênaltis**, a pontuação é baseada no **resultado após os 90 minutos regulamentares** (como registrado no campo `score.regularTime` da API).

## 4. Palpites

- Cada usuário com `payment_status = 'paid'` pode submeter **um palpite por jogo**.
- O palpite consiste no **placar exato** esperado (ex: `2 x 1`).
- **Prazo**: o input de palpite é bloqueado quando `now() >= match.starts_at`. Após esse momento, não é mais possível criar ou editar o palpite.
- Usuários que entrarem no bolão após o início de certos jogos **não podem palpitar retroativamente** nesses jogos — a pontuação fica em `0` para jogos sem palpite.
- Um palpite pode ser **editado** até o prazo de fechamento.

## 5. Pontuação

| Resultado do palpite | Pontos |
|---|---|
| Placar exato correto (ex: acertou `2x1` e o jogo terminou `2x1`) | **3 pontos** |
| Vencedor/empate correto, mas placar errado (ex: palpitou `2x1`, terminou `3x1`) | **1 ponto** |
| Resultado errado (ex: palpitou vitória do time A, mas venceu o time B ou empatou) | **0 pontos** |

- Os pontos são calculados automaticamente por um **trigger no banco de dados** Supabase, disparado quando um jogo tem seu status atualizado para `FINISHED` e o placar real é preenchido.
- O cálculo percorre **todas as predictions** daquele jogo e atualiza o campo `points`.

### Critério de desempate no ranking:
1. Maior número de **placares exatos** (3 pts)
2. Maior número de **vencedores/empates certos** (1 pt)
3. Ordem de cadastro (mais antigo ganha em último caso de empate)

## 6. Prêmio

- O prêmio acumulado é calculado como: `entry_fee × total de usuários com payment_status = 'paid'`.
- O valor é exibido na **tela de ranking** em destaque.
- A distribuição do prêmio é responsabilidade dos organizadores — o app apenas exibe o valor acumulado.

## 7. Ranking

- O ranking exibe **todos os participantes pagos**, ordenados por:
  1. Pontos totais (decrescente)
  2. Placares exatos (decrescente)
  3. Vencedores certos (decrescente)
  4. Data de cadastro (crescente — mais antigo na frente)
- O ranking é atualizado em **tempo real** via Supabase Realtime.
- Participantes com `0 pontos` aparecem no final do ranking.

## 8. Perfil do Usuário

- O usuário pode editar:
  - **Nome de exibição**
  - **Foto de perfil** (upload para Supabase Storage)
  - **E-mail** (requer confirmação por e-mail)
  - **Senha** (requer senha atual)
- O usuário pode se **deslogar** a qualquer momento.
- O e-mail não pode ser duplicado entre usuários.

## 9. Painel Administrativo (`/admin`)

- Acesso restrito a usuários com `is_admin = true` no banco de dados.
- Funcionalidades:
  - Listar todos os usuários e seus status de pagamento
  - Aprovar pagamento manualmente (fallback para webhook)
  - Revogar acesso de um usuário
  - Disparar sincronização manual de jogos
  - Configurar `entry_fee`
  - Visualizar log de webhooks recebidos

## 10. Distribuição do App

- **Android**: APK gerado via [PWABuilder](https://pwabuilder.com) a partir da URL do deploy na Vercel. Compartilhado via WhatsApp.
- **iOS**: Usuário abre a URL no Safari → toca em "Compartilhar" → "Adicionar à Tela de Início" → ativa "Abrir como App da Web". O app abre sem barra de URL, como um app nativo.

## 11. Limites e Restrições

- **Capacidade**: até ~50 participantes (dentro do free tier do Supabase).
- **Rate limit da API de jogos**: 10 req/min (football-data.org free). A sincronização em batch usa 1 requisição para todos os jogos da Copa — sem problemas.
- **Supabase free tier**: 500MB de banco, 1GB de storage, 50.000 usuários ativos mensais — mais que suficiente.
- **Vercel free tier**: 100GB bandwidth/mês, Cron Jobs disponíveis — suficiente.
