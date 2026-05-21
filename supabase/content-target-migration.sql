-- SyncHim · acrescenta dimensão `target` aos items de conteúdo.
-- Permite separar os carrosséis e vídeos por público (casada,
-- solteira ou ambos). Aplica depois de admin-schema.sql.

alter table synchim.content_items
  add column if not exists target text not null default 'casada'
    check (target in ('casada', 'solteira', 'ambos'));

create index if not exists idx_synchim_items_target on synchim.content_items(target);
