-- ============================================================
--  REFUERZO DE SEGURIDAD (tras auditoría)
--  Cierra cuatro huecos que las políticas RLS por sí solas no cubren.
--  Ejecútalo UNA vez en Supabase -> SQL Editor.
--
--  IMPORTANTE: recarga antes la web con Ctrl+Mayús+R para tener la última
--  versión de la app (el punto 4 la necesita).
-- ============================================================

-- ------------------------------------------------------------
-- 1) PERSONAS: cada uno edita su ficha, pero NO puede cambiarse
--    los días, las horas, el turno, su email ni el orden.
--    (La política RLS comprueba de quién es la fila, pero no qué
--     columnas se tocan: eso lo resuelve este disparador.)
-- ------------------------------------------------------------
create or replace function public.personas_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.email        is distinct from old.email
     or new.turno        is distinct from old.turno
     or new.dias_anuales is distinct from old.dias_anuales
     or new.bolsa_horas  is distinct from old.bolsa_horas
     or new.orden        is distinct from old.orden then
    raise exception 'Solo un administrador puede modificar email, turno, días u horas';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_personas_before_update on personas;
create trigger trg_personas_before_update
before update on personas
for each row execute function public.personas_before_update();

-- ------------------------------------------------------------
-- 2) LOGS: el servidor decide quién firma cada acción y cuándo.
--    Así el registro no se puede falsificar ni antedatar.
-- ------------------------------------------------------------
create or replace function public.logs_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.usuario := auth.email();
  new.ts := now();
  return new;
end;
$$;

drop trigger if exists trg_logs_before_insert on logs;
create trigger trg_logs_before_insert
before insert on logs
for each row execute function public.logs_before_insert();

-- ------------------------------------------------------------
-- 3) PERFILES (lista de cuentas creadas): solo para administradores.
-- ------------------------------------------------------------
drop policy if exists "auth_all_perfiles" on perfiles;
drop policy if exists "perfiles_select"   on perfiles;
drop policy if exists "perfiles_write"    on perfiles;
drop policy if exists "perfiles_insert"   on perfiles;
drop policy if exists "perfiles_update"   on perfiles;
drop policy if exists "perfiles_delete"   on perfiles;
create policy "perfiles_select" on perfiles for select to authenticated using (public.is_admin());
create policy "perfiles_write"  on perfiles for all    to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------
-- 4) ADMINS: dejar de exponer la lista de administradores.
--    La app pasa a preguntar "¿soy admin?" mediante la función
--    is_admin(), que no revela quiénes son los demás.
-- ------------------------------------------------------------
grant execute on function public.is_admin() to authenticated;
drop policy if exists "admins_read" on admins;
