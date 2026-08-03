-- ============================================================
--  PERMISOS: cada usuario solo edita LO SUYO (vacaciones y su ficha).
--  Parámetros, festivos y alta/baja de compañeros: solo administradores.
--  Ejecútalo UNA vez en Supabase -> SQL Editor.
-- ============================================================

-- 1) Vincular cada compañero con el email de su cuenta
alter table personas add column if not exists email text;

-- 2) Tabla de administradores (pon aquí los emails admin)
create table if not exists admins ( email text primary key );
-- Cambia este correo por el tuyo antes de ejecutar (y añade una línea por cada admin)
insert into admins (email) values ('CAMBIA_ESTO@ejemplo.com') on conflict do nothing;
alter table admins enable row level security;
drop policy if exists "admins_read" on admins;
create policy "admins_read" on admins for select to authenticated using (true);

-- Función auxiliar: ¿la cuenta actual es administradora?
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(auth.email()));
$$;

-- 3) MARCAS: todos las VEN; solo edita las suyas (o un admin)
alter table marcas enable row level security;
drop policy if exists "auth_all_marcas" on marcas;
drop policy if exists "marcas_select" on marcas;
drop policy if exists "marcas_insert" on marcas;
drop policy if exists "marcas_update" on marcas;
drop policy if exists "marcas_delete" on marcas;
create policy "marcas_select" on marcas for select to authenticated using (true);
create policy "marcas_insert" on marcas for insert to authenticated
  with check (public.is_admin() or exists (
    select 1 from personas p where p.id = persona_id and lower(coalesce(p.email,'')) = lower(auth.email())));
create policy "marcas_update" on marcas for update to authenticated
  using (public.is_admin() or exists (
    select 1 from personas p where p.id = persona_id and lower(coalesce(p.email,'')) = lower(auth.email())))
  with check (public.is_admin() or exists (
    select 1 from personas p where p.id = persona_id and lower(coalesce(p.email,'')) = lower(auth.email())));
create policy "marcas_delete" on marcas for delete to authenticated
  using (public.is_admin() or exists (
    select 1 from personas p where p.id = persona_id and lower(coalesce(p.email,'')) = lower(auth.email())));

-- 4) PERSONAS: todos las VEN; cada uno edita SU fila; alta/baja solo admin
alter table personas enable row level security;
drop policy if exists "auth_all_personas" on personas;
drop policy if exists "personas_select" on personas;
drop policy if exists "personas_insert" on personas;
drop policy if exists "personas_update" on personas;
drop policy if exists "personas_delete" on personas;
create policy "personas_select" on personas for select to authenticated using (true);
create policy "personas_insert" on personas for insert to authenticated with check (public.is_admin());
create policy "personas_delete" on personas for delete to authenticated using (public.is_admin());
create policy "personas_update" on personas for update to authenticated
  using (public.is_admin() or lower(coalesce(email,'')) = lower(auth.email()))
  with check (public.is_admin() or lower(coalesce(email,'')) = lower(auth.email()));

-- 5) AJUSTES y FESTIVOS: todos los VEN; solo el admin los cambia
do $$
declare t text;
begin
  foreach t in array array['ajustes','festivos'] loop
    execute format('alter table %1$s enable row level security;', t);
    execute format('drop policy if exists "auth_all_%1$s" on %1$s;', t);
    execute format('drop policy if exists "%1$s_select" on %1$s;', t);
    execute format('drop policy if exists "%1$s_write" on %1$s;', t);
    execute format('create policy "%1$s_select" on %1$s for select to authenticated using (true);', t);
    execute format('create policy "%1$s_write" on %1$s for all to authenticated using (public.is_admin()) with check (public.is_admin());', t);
  end loop;
end $$;
