-- ============================================================
--  ESQUEMA DE BASE DE DATOS — App de Vacaciones (Supabase)
--  Cómo usarlo:
--   1) En Supabase, menú izquierdo -> "SQL Editor" -> "New query".
--   2) Pega TODO este archivo y pulsa "Run".
--   (Solo hay que hacerlo UNA vez, al crear el proyecto.)
-- ============================================================

-- ---------- TABLAS ----------
create table if not exists personas (
  id           bigint generated always as identity primary key,
  nombre       text   not null,
  color        text   not null default '4472C4',
  dias_anuales numeric not null default 22,
  bolsa_horas  numeric not null default 20,
  orden        int    not null default 0
);

create table if not exists ajustes (
  clave text primary key,
  valor text
);

create table if not exists festivos (
  fecha  date primary key,
  nombre text
);

create table if not exists marcas (
  persona_id bigint not null references personas(id) on delete cascade,
  fecha      date   not null,
  valor      text   not null,
  primary key (persona_id, fecha)
);

create table if not exists logs (
  id      bigint generated always as identity primary key,
  ts      timestamptz not null default now(),
  usuario text,
  accion  text not null,
  detalle text
);

-- ---------- SEGURIDAD (RLS): solo usuarios con cuenta pueden ver/editar ----------
alter table personas enable row level security;
alter table ajustes  enable row level security;
alter table festivos enable row level security;
alter table marcas   enable row level security;
alter table logs     enable row level security;

-- Cualquier usuario autenticado puede leer y escribir personas/ajustes/festivos/marcas
do $$
declare t text;
begin
  foreach t in array array['personas','ajustes','festivos','marcas'] loop
    execute format('drop policy if exists "auth_all_%1$s" on %1$s;', t);
    execute format('create policy "auth_all_%1$s" on %1$s for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Logs: los usuarios pueden leer e insertar, pero NO modificar ni borrar (registro inalterable)
drop policy if exists "auth_read_logs"   on logs;
drop policy if exists "auth_insert_logs" on logs;
create policy "auth_read_logs"   on logs for select to authenticated using (true);
create policy "auth_insert_logs" on logs for insert to authenticated with check (true);

-- ---------- DATOS INICIALES (solo se cargan si las tablas están vacías) ----------
insert into personas (nombre,color,dias_anuales,bolsa_horas,orden)
select * from (values
  ('Jose Angel','1F77B4',22,20,1),
  ('David Vaquero','E15759',22,20,2),
  ('Carlos Pernas','59A14F',22,20,3),
  ('Diego Ponte','F28E2B',22,20,4),
  ('Joel Feijoo','AF7AA1',22,20,5),
  ('Javier Orosa','4E79A7',22,20,6)
) as v(nombre,color,dias_anuales,bolsa_horas,orden)
where not exists (select 1 from personas);

insert into ajustes (clave,valor) values
  ('year','2026'), ('max_fuera','2'), ('horas_por_dia','8')
on conflict (clave) do nothing;

insert into festivos (fecha,nombre) values
  ('2026-01-01','Año Nuevo'),
  ('2026-01-06','Reyes'),
  ('2026-05-01','Día del Trabajo'),
  ('2026-08-15','Asunción'),
  ('2026-10-12','Fiesta Nacional'),
  ('2026-12-25','Navidad')
on conflict (fecha) do nothing;

-- ---------- TIEMPO REAL ----------
-- Para que el calendario se actualice solo cuando un compañero cambia algo.
alter publication supabase_realtime add table personas, ajustes, festivos, marcas, logs;
