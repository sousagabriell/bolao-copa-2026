-- Garante que o bucket avatars existe e é público (leitura pública das fotos)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- Remove políticas antigas se existirem
drop policy if exists "Avatars are publicly readable"  on storage.objects;
drop policy if exists "Users can upload own avatar"    on storage.objects;
drop policy if exists "Users can update own avatar"    on storage.objects;
drop policy if exists "Users can delete own avatar"    on storage.objects;

-- Leitura pública (necessário mesmo com bucket público para queries via API)
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload: cada usuário só pode gravar no caminho que começa com seu próprio ID
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '.%'
  );

-- Update (upsert dispara update quando o arquivo já existe)
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '.%'
  );

-- Delete (para a função de remover foto)
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '.%'
  );
