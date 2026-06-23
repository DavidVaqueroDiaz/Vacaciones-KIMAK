-- ============================================================
--  AMPLIACIÓN: tabla de perfiles (lista de cuentas creadas)
--  Ejecútalo UNA vez en Supabase -> SQL Editor (igual que el setup).
-- ============================================================
create table if not exists perfiles (
  email  text primary key,
  creado timestamptz not null default now()
);

alter table perfiles enable row level security;
drop policy if exists "auth_all_perfiles" on perfiles;
create policy "auth_all_perfiles" on perfiles for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table perfiles;
