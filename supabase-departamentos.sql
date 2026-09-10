-- ============================================================
--  DEPARTAMENTOS, HORARIOS Y HORAS DISPONIBLES
--  Ejecútalo UNA vez en Supabase -> SQL Editor.
--
--  Qué hace:
--   · Crea la tabla de departamentos y mete "Programación" y "Oficina Intermedia"
--   · Añade a cada persona: departamento, horario semanal y fechas de alta/baja
--   · Pasa a Programación a todos los que ya existen
--   · Ajusta los permisos: cada uno ve solo su departamento; los admins, todo
-- ============================================================

-- ------------------------------------------------------------
-- 1) DEPARTAMENTOS
-- ------------------------------------------------------------
create table if not exists departamentos (
  id        bigint generated always as identity primary key,
  nombre    text not null unique,
  max_fuera int  not null default 2,   -- máximo de personas fuera a la vez
  orden     int  not null default 0
);

alter table departamentos enable row level security;
drop policy if exists "dep_select" on departamentos;
drop policy if exists "dep_write"  on departamentos;
-- Todos ven la lista de nombres (hace falta para saber a cuál perteneces)
create policy "dep_select" on departamentos for select to authenticated using (true);
create policy "dep_write"  on departamentos for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into departamentos (nombre, max_fuera, orden) values
  ('Programación', 2, 1),
  ('Oficina Intermedia', 3, 2)
on conflict (nombre) do nothing;

-- ------------------------------------------------------------
-- 2) PERSONAS: departamento, horario y fechas de alta/baja
--    horario = horas de lunes a viernes separadas por comas.
--    Ejemplos: "8,8,8,8,8" (40 h)  ·  "8.5,8.5,8.5,8.5,6" (partido)
--    Si se deja vacío, se asume la jornada estándar del sistema.
-- ------------------------------------------------------------
alter table personas add column if not exists departamento_id bigint references departamentos(id);
alter table personas add column if not exists horario     text;
alter table personas add column if not exists fecha_alta  date;
alter table personas add column if not exists fecha_baja  date;

-- Los que ya existían son de Programación
update personas
   set departamento_id = (select id from departamentos where nombre = 'Programación')
 where departamento_id is null;

-- ------------------------------------------------------------
-- 3) ¿A qué departamento pertenece quien está conectado?
-- ------------------------------------------------------------
create or replace function public.mi_departamento() returns bigint
language sql stable security definer set search_path = public as $$
  select departamento_id from personas
   where lower(coalesce(email,'')) = lower(auth.email())
   limit 1;
$$;
grant execute on function public.mi_departamento() to authenticated;

-- ------------------------------------------------------------
-- 4) PERMISOS: cada uno ve lo suyo; los administradores, todo
-- ------------------------------------------------------------
drop policy if exists "personas_select" on personas;
create policy "personas_select" on personas for select to authenticated
  using (public.is_admin() or departamento_id = public.mi_departamento());

drop policy if exists "marcas_select" on marcas;
create policy "marcas_select" on marcas for select to authenticated
  using (public.is_admin() or exists (
    select 1 from personas p
     where p.id = persona_id
       and p.departamento_id = public.mi_departamento()));

-- ------------------------------------------------------------
-- 5) Qué puede cambiar cada uno en su propia ficha:
--      SÍ: nombre, color, horario, días anuales y bolsa de horas
--      NO: email, turno, departamento y fechas de alta/baja (solo el admin)
-- ------------------------------------------------------------
create or replace function public.personas_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.email           is distinct from old.email
     or new.turno           is distinct from old.turno
     or new.orden           is distinct from old.orden
     or new.departamento_id is distinct from old.departamento_id
     or new.fecha_alta      is distinct from old.fecha_alta
     or new.fecha_baja      is distinct from old.fecha_baja then
    raise exception 'Solo un administrador puede modificar estos datos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_personas_before_update on personas;
create trigger trg_personas_before_update
before update on personas
for each row execute function public.personas_before_update();

-- ------------------------------------------------------------
-- 6) ALTA DEL EQUIPO DE OFICINA INTERMEDIA
--    (los correos coinciden con las cuentas ya creadas en Authentication)
-- ------------------------------------------------------------
insert into personas (nombre, email, color, dias_anuales, bolsa_horas, orden, turno, horario, departamento_id)
select v.nombre, v.email, v.color, v.dias, v.horas, v.orden, v.turno, v.horario,
       (select id from departamentos where nombre = 'Oficina Intermedia')
  from (values
    ('Mónica',  'monica@vacaciones.com',  '17BECF', 22, 20, 8,  'tarde',   '8,8,8,8,8'),
    ('Iago',    'iago@vacaciones.com',    '9467BD', 22, 20, 9,  'impar',   '8,8,8,8,8'),
    ('Joaquín', 'joaquin@vacaciones.com', '8C564B', 22, 20, 10, 'partido', '8.5,8.5,8.5,8.5,6'),
    ('Camilo',  'camilo@vacaciones.com',  'E377C2', 22, 20, 11, 'partido', '8.5,8.5,8.5,8.5,6')
  ) as v(nombre,email,color,dias,horas,orden,turno,horario)
 where not exists (select 1 from personas p where lower(p.email) = lower(v.email));

-- Camilo, administrador
insert into admins (email) values ('camilo@vacaciones.com') on conflict do nothing;
