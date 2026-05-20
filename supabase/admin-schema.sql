-- SYNCHIM — SCHEMA ADMIN (produção de conteúdo p/ redes sociais)
-- Aplicar depois de supabase/schema.sql.
--
-- Tudo vive no schema `synchim` para coexistir com outras apps.
-- Para remover: drop table synchim.{render_jobs,content_slides,content_items} cascade;
--
-- Adiciona uma allowlist de emails admin (synchim.admins) e o modelo
-- de conteúdo (items + slides + render jobs).

create table if not exists synchim.admins (
  email text primary key,
  nome text,
  created_at timestamptz not null default now()
);

-- Item de conteúdo: 1 carrossel ou 1 vídeo.
-- type: 'carousel' | 'video'
-- subtype (apenas para vídeo): 'talking-head' | 'kinetic-text' | 'hands-writing'
-- categoria (para carrossel): 'didatico-A' | 'didatico-B' | 'didatico-C' | 'didatico-D'
--                            | 'reconhecimento' | 'cta'
-- status: 'draft' | 'ready' | 'rendering' | 'rendered' | 'published' | 'failed'
-- platforms: array de 'ig' | 'tiktok' | 'youtube'
create table if not exists synchim.content_items (
  id uuid primary key default gen_random_uuid(),
  code text unique,                       -- ex: SC-001, SV-003
  type text not null check (type in ('carousel', 'video')),
  subtype text,
  categoria text,
  title text not null,
  slug text not null,
  locale text not null default 'pt' check (locale in ('pt', 'en')),
  status text not null default 'draft' check (status in (
    'draft', 'ready', 'rendering', 'rendered', 'published', 'failed'
  )),
  caption text,
  hashtags text,
  platforms text[] not null default '{ig}',
  scheduled_at timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}',
  -- preenchidos pelo render
  output_urls jsonb,                      -- {pngs: [...], zip: '...', video: '...'}
  last_job_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_synchim_items_type on synchim.content_items(type);
create index if not exists idx_synchim_items_status on synchim.content_items(status);
create index if not exists idx_synchim_items_sched on synchim.content_items(scheduled_at);

-- Slides de carrossel ou cenas de vídeo (ordem por idx).
-- design jsonb: { fundo: '#...', acento: '#...', layout: 'capa|conteudo|cta',
--                 imagem: 'url'|null, fonte_titulo_px: int, ... }
create table if not exists synchim.content_slides (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references synchim.content_items(id) on delete cascade,
  idx int not null,
  layout text not null default 'conteudo' check (layout in (
    'capa', 'conteudo', 'cta', 'assinatura', 'kinetic-line', 'kinetic-pair'
  )),
  body text not null default '',          -- markdown leve: **bold**, _italic_, quebras de linha
  design jsonb not null default '{}',
  voice_url text,                         -- mp3 narração (vídeo) por cena
  duration_sec numeric,                   -- override de duração (vídeo)
  unique(item_id, idx)
);

create index if not exists idx_synchim_slides_item on synchim.content_slides(item_id, idx);

-- Render jobs: estado dos pedidos de render despachados ao GitHub Actions.
create table if not exists synchim.render_jobs (
  job_id text primary key,
  item_id uuid not null references synchim.content_items(id) on delete cascade,
  kind text not null check (kind in ('carousel', 'video')),
  status text not null default 'queued' check (status in (
    'queued', 'running', 'done', 'failed'
  )),
  progress int not null default 0,
  message text,
  manifest_url text,
  result_url text,
  output jsonb,                           -- urls finais ao terminar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_synchim_jobs_item on synchim.render_jobs(item_id, created_at desc);
create index if not exists idx_synchim_jobs_status on synchim.render_jobs(status);

-- Função para auto-atualizar updated_at
create or replace function synchim.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_items_updated on synchim.content_items;
create trigger trg_items_updated before update on synchim.content_items
  for each row execute function synchim.touch_updated_at();

drop trigger if exists trg_jobs_updated on synchim.render_jobs;
create trigger trg_jobs_updated before update on synchim.render_jobs
  for each row execute function synchim.touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
-- Admins identificam-se pelo email no auth.users; o service_role
-- (usado pelas APIs do servidor) faz bypass à RLS, por isso as
-- políticas só protegem em caso de exposição directa via anon key.
alter table synchim.admins enable row level security;
alter table synchim.content_items enable row level security;
alter table synchim.content_slides enable row level security;
alter table synchim.render_jobs enable row level security;

-- Default deny — só service_role pode tocar.
drop policy if exists "service_role_all" on synchim.admins;
create policy "service_role_all" on synchim.admins
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_role_all" on synchim.content_items;
create policy "service_role_all" on synchim.content_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_role_all" on synchim.content_slides;
create policy "service_role_all" on synchim.content_slides
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists "service_role_all" on synchim.render_jobs;
create policy "service_role_all" on synchim.render_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Criar manualmente no painel ou via supabase CLI:
--   storage bucket "synchim-assets" público (leitura)
-- O upload é feito sempre pelo service_role; leitura pública para o
-- runner do GitHub Actions descarregar manifests sem token.
