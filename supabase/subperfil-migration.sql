-- SyncHim · sub-perfil dentro de target='solteira'.
--
-- A bifurcação tem 3 opções de UI (A=casada, B=sozinha, C=inicio).
-- Mantém-se `target` (casada|solteira) para a selecção de conteúdo,
-- e adiciona-se `sub_perfil` para a saudação condicional e analytics:
--   A → target=casada,   sub_perfil=null
--   B → target=solteira, sub_perfil='sozinha'
--   C → target=solteira, sub_perfil='inicio'

alter table synchim.users
  add column if not exists sub_perfil text
    check (sub_perfil is null or sub_perfil in ('sozinha', 'inicio'));

alter table synchim.diagnosticos
  add column if not exists sub_perfil text
    check (sub_perfil is null or sub_perfil in ('sozinha', 'inicio'));
