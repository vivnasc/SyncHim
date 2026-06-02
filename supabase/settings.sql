-- SYNCHIM — settings simples (singletons chave/valor).
-- Aplicar uma vez no SQL editor depois de admin-schema.sql.

create table if not exists synchim.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_settings_updated on synchim.settings;
create trigger trg_settings_updated before update on synchim.settings
  for each row execute function synchim.touch_updated_at();

alter table synchim.settings enable row level security;
drop policy if exists "service_role_all" on synchim.settings;
create policy "service_role_all" on synchim.settings
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
