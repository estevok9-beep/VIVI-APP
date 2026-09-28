-- Execute no SQL Editor do mesmo projeto Supabase utilizado pela Viv.
-- Preserva as funções vivi_* e as políticas financeiras existentes.
create table if not exists public.viv_perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 80),
  avatar_path text,
  updated_at timestamptz not null default now(),
  constraint viv_avatar_path_proprio check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text)
);
alter table public.viv_perfis enable row level security;
create policy "viv_perfis_ler_proprio" on public.viv_perfis for select to authenticated using (id = (select auth.uid()));
create policy "viv_perfis_inserir_proprio" on public.viv_perfis for insert to authenticated with check (id = (select auth.uid()));
create policy "viv_perfis_atualizar_proprio" on public.viv_perfis for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create table if not exists public.viv_chamados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  assunto text not null check (assunto in ('Bug / erro','Dúvida','Sugestão','Outro')),
  descricao text not null check (char_length(trim(descricao)) between 10 and 3000),
  status text not null default 'Aberto' check (status in ('Aberto','Em análise','Resolvido')),
  created_at timestamptz not null default now()
);
alter table public.viv_chamados enable row level security;
create policy "viv_chamados_ler_proprios" on public.viv_chamados for select to authenticated using (usuario_id = (select auth.uid()));
create policy "viv_chamados_criar_proprios" on public.viv_chamados for insert to authenticated with check (usuario_id = (select auth.uid()) and status = 'Aberto');

-- Bucket privado: fotos acessíveis somente ao proprietário por URL temporária.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('viv-avatares','viv-avatares',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "viv_avatar_enviar_proprio" on storage.objects for insert to authenticated
with check (bucket_id = 'viv-avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "viv_avatar_ler_proprio" on storage.objects for select to authenticated
using (bucket_id = 'viv-avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
