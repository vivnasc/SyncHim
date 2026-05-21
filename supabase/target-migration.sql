-- SyncHim · expansão de público (mulheres solteiras com intenção de
-- relacionamento sério).
--
-- Adiciona `target` ao perfil e ao diagnóstico. Os nós e o scoring
-- mantêm-se idênticos; o que muda é o framing do copy (perguntas,
-- landing, resultado).
--
-- Aplicar depois de supabase/schema.sql e supabase/admin-schema.sql.

alter table synchim.users
  add column if not exists target text not null default 'casada'
    check (target in ('casada', 'solteira'));

alter table synchim.diagnosticos
  add column if not exists target text not null default 'casada'
    check (target in ('casada', 'solteira'));

create index if not exists idx_synchim_users_target on synchim.users(target);
create index if not exists idx_synchim_diagnosticos_target on synchim.diagnosticos(target);
