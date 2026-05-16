-- SYNCHIM — SCHEMA DA BASE DE DADOS (Supabase/Postgres)
-- Adaptado: PayPal em vez de Stripe; trigger auth.users -> public.users.

-- ============================================
-- TABLES
-- ============================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nome text,
  locale text not null default 'en' check (locale in ('en', 'pt')),
  tier int not null default 0 check (tier in (0, 1, 2)),
  no_comprado text,
  nos_comprados_adicionais text[] not null default '{}',
  paypal_payer_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_tier on public.users(tier);

create table if not exists public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  no_dominante text not null,
  no_secundario text,
  pontuacoes jsonb not null,
  respostas jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_diagnosticos_user on public.diagnosticos(user_id, created_at desc);

create table if not exists public.respostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sessao_numero int not null check (sessao_numero between 1 and 7),
  no text not null,
  bloco_id text not null,
  resposta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sessao_numero, no, bloco_id)
);

create index if not exists idx_respostas_user_sessao on public.respostas(user_id, sessao_numero);

create table if not exists public.progresso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  no text not null,
  sessao_numero int not null check (sessao_numero between 1 and 7),
  iniciada_em timestamptz,
  completada_em timestamptz,
  desbloqueada_em timestamptz not null default now(),
  unique(user_id, no, sessao_numero)
);

create index if not exists idx_progresso_user on public.progresso(user_id);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text,
  evento text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_evento on public.eventos(evento, created_at desc);
create index if not exists idx_eventos_user on public.eventos(user_id, created_at desc);

create table if not exists public.emails_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tipo text not null,
  enviado_em timestamptz not null default now(),
  resend_id text,
  unique(user_id, tipo)
);

create table if not exists public.notify_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  no text not null,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  unique(email, no)
);

create table if not exists public.paypal_orders (
  order_id text primary key,
  user_email text,
  tier int not null,
  no text,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'CREATED',
  payer_id text,
  capture_id text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.users enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.respostas enable row level security;
alter table public.progresso enable row level security;
alter table public.emails_enviados enable row level security;
alter table public.eventos enable row level security;
alter table public.notify_list enable row level security;
alter table public.paypal_orders enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "diagnosticos_select_own" on public.diagnosticos;
create policy "diagnosticos_select_own" on public.diagnosticos
  for select using (auth.uid() = user_id);

drop policy if exists "diagnosticos_insert_own" on public.diagnosticos;
create policy "diagnosticos_insert_own" on public.diagnosticos
  for insert with check (auth.uid() = user_id);

drop policy if exists "respostas_all_own" on public.respostas;
create policy "respostas_all_own" on public.respostas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progresso_all_own" on public.progresso;
create policy "progresso_all_own" on public.progresso
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "emails_enviados_select_own" on public.emails_enviados;
create policy "emails_enviados_select_own" on public.emails_enviados
  for select using (auth.uid() = user_id);

-- Eventos, notify_list e paypal_orders são escritos exclusivamente pelo service role.
-- Sem policies para o utilizador final.

-- ============================================
-- TRIGGER: criar linha em public.users quando aparece em auth.users
-- ============================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, locale, tier, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'locale', 'en'),
    coalesce((new.raw_user_meta_data ->> 'tier')::int, 0),
    new.raw_user_meta_data ->> 'nome'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================
-- FUNÇÕES
-- ============================================
create or replace function public.tem_acesso_no(p_user_id uuid, p_no text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_tier int;
  v_no_comprado text;
  v_adicionais text[];
begin
  select tier, no_comprado, nos_comprados_adicionais
    into v_tier, v_no_comprado, v_adicionais
  from public.users where id = p_user_id;

  if v_tier is null then return false; end if;
  if v_tier = 2 then return true; end if;

  if v_tier = 1 then
    if v_no_comprado = p_no then return true; end if;
    if p_no = any(v_adicionais) then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function public.sessao_desbloqueada(
  p_user_id uuid,
  p_no text,
  p_sessao int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_anterior timestamptz;
begin
  if p_sessao <= 2 then return true; end if;
  if not public.tem_acesso_no(p_user_id, p_no) then return false; end if;

  select completada_em into v_anterior
  from public.progresso
  where user_id = p_user_id and no = p_no and sessao_numero = p_sessao - 1;

  if v_anterior is null then return false; end if;
  if v_anterior + interval '3 days' > now() then return false; end if;

  return true;
end;
$$;

create or replace function public.proxima_abertura(
  p_user_id uuid,
  p_no text,
  p_sessao int
)
returns timestamptz
language plpgsql
security definer
as $$
declare
  v_anterior timestamptz;
begin
  if p_sessao <= 2 then return now(); end if;
  select completada_em into v_anterior
  from public.progresso
  where user_id = p_user_id and no = p_no and sessao_numero = p_sessao - 1;
  if v_anterior is null then return null; end if;
  return v_anterior + interval '3 days';
end;
$$;

-- FIM
