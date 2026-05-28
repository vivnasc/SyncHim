-- SyncHim · campaign_jobs
-- Estado das geracoes em background (workflow GitHub Actions).
-- Adiciona-se ao schema synchim. Aplicar depois de admin-schema.sql.

create table if not exists synchim.campaign_jobs (
  job_id text primary key,                  -- 'campaign-{ts}-{rand}'
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  progress int not null default 0,          -- 0..100
  current_slot int not null default 0,      -- 0..total_slots-1
  total_slots int not null,                 -- weeksCount * 14
  settings jsonb not null,                  -- { startDate, weeksCount, autoImages, model, reuseStrategy }
  items_created jsonb not null default '[]', -- [{ code, id, slotIndex }]
  message text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists idx_synchim_campaign_jobs_status
  on synchim.campaign_jobs(status, created_at desc);

drop trigger if exists trg_campaign_jobs_updated on synchim.campaign_jobs;
create trigger trg_campaign_jobs_updated before update on synchim.campaign_jobs
  for each row execute function synchim.touch_updated_at();

alter table synchim.campaign_jobs enable row level security;
drop policy if exists "service_role_all" on synchim.campaign_jobs;
create policy "service_role_all" on synchim.campaign_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
