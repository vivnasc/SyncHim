-- SYNCHIM — SCHEMA DA BASE DE DADOS (SUPABASE/POSTGRES)
-- Executar no Supabase SQL Editor

-- ============================================
-- TABELA: users
-- ============================================
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nome text,
  locale text not null default 'en' check (locale in ('en', 'pt')),
  tier int not null default 0 check (tier in (0, 1, 2)),
  no_comprado text, -- para Tier 1: qual nó foi pago. NULL para Tier 0 e Tier 2.
  nos_comprados_adicionais text[] default '{}', -- para upgrades Tier 1 → outros nós
  stripe_customer_id text,
  created_at timestamp with time zone default now(),
  paid_at timestamp with time zone
);

create index idx_users_email on public.users(email);
create index idx_users_tier on public.users(tier);

-- ============================================
-- TABELA: diagnosticos
-- Histórico de diagnósticos. Tier 0 pode refazer infinitamente.
-- ============================================
create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  no_dominante text not null,
  no_secundario text,
  pontuacoes jsonb not null, -- {"fome": 8, "controlo": 3, "inferioridade": 5, ...}
  respostas jsonb not null, -- {"q1": "frequentemente", "q2": "sempre", ...}
  created_at timestamp with time zone default now()
);

create index idx_diagnosticos_user on public.diagnosticos(user_id, created_at desc);

-- ============================================
-- TABELA: respostas
-- Respostas escritas dentro das sessões 3-7
-- ============================================
create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sessao_numero int not null check (sessao_numero between 1 and 7),
  no text not null, -- a qual nó pertence esta resposta
  bloco_id text not null, -- identificador do bloco/pergunta dentro da sessão
  resposta text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_respostas_user_sessao on public.respostas(user_id, sessao_numero);

-- ============================================
-- TABELA: progresso
-- Progresso da utilizadora nas sessões
-- ============================================
create table public.progresso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  no text not null,
  sessao_numero int not null check (sessao_numero between 1 and 7),
  iniciada_em timestamp with time zone,
  completada_em timestamp with time zone,
  desbloqueada_em timestamp with time zone default now(),
  unique(user_id, no, sessao_numero)
);

create index idx_progresso_user on public.progresso(user_id);

-- ============================================
-- TABELA: eventos
-- Tracking de eventos para analytics
-- ============================================
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text, -- para utilizadores anónimos antes de criar conta
  evento text not null,
  metadata jsonb default '{}',
  created_at timestamp with time zone default now()
);

create index idx_eventos_evento on public.eventos(evento, created_at desc);
create index idx_eventos_user on public.eventos(user_id, created_at desc);

-- ============================================
-- TABELA: emails_enviados
-- Log de emails para evitar duplicação
-- ============================================
create table public.emails_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tipo text not null, -- 'boas_vindas_t0', 'boas_vindas_paga', 'sessao_2', etc
  enviado_em timestamp with time zone default now(),
  resend_id text,
  unique(user_id, tipo)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.users enable row level security;
alter table public.diagnosticos enable row level security;
alter table public.respostas enable row level security;
alter table public.progresso enable row level security;

-- Política: utilizadora só vê os seus próprios dados
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "diagnosticos_select_own" on public.diagnosticos
  for select using (auth.uid() = user_id);

create policy "diagnosticos_insert_own" on public.diagnosticos
  for insert with check (auth.uid() = user_id);

create policy "respostas_all_own" on public.respostas
  for all using (auth.uid() = user_id);

create policy "progresso_all_own" on public.progresso
  for all using (auth.uid() = user_id);

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Verificar se a utilizadora tem acesso a um nó específico
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

  -- Tier 2 tem acesso a tudo
  if v_tier = 2 then return true; end if;

  -- Tier 1: nó comprado ou nos adicionais
  if v_tier = 1 then
    if v_no_comprado = p_no then return true; end if;
    if p_no = any(v_adicionais) then return true; end if;
  end if;

  return false;
end;
$$;

-- Verificar se uma sessão está desbloqueada (gating temporal de 3 dias)
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
  v_sessao_anterior_completada timestamp with time zone;
begin
  -- Sessões 1 e 2 sempre desbloqueadas
  if p_sessao <= 2 then return true; end if;

  -- Verificar acesso ao nó
  if not public.tem_acesso_no(p_user_id, p_no) then return false; end if;

  -- Verificar se a sessão anterior foi completada há pelo menos 3 dias
  select completada_em into v_sessao_anterior_completada
  from public.progresso
  where user_id = p_user_id and no = p_no and sessao_numero = p_sessao - 1;

  if v_sessao_anterior_completada is null then return false; end if;
  if v_sessao_anterior_completada + interval '3 days' > now() then return false; end if;

  return true;
end;
$$;

-- ============================================
-- DADOS INICIAIS (não precisam ser populados — o conteúdo está em ficheiros .md)
-- ============================================

-- FIM
