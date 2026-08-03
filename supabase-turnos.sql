-- ============================================================
--  TURNOS DE TARDE: cada persona guarda su patrón en la base de datos
--  (antes estaba en config.js, con nombres reales a la vista).
--  Ejecútalo UNA vez en Supabase -> SQL Editor.
-- ============================================================

alter table personas add column if not exists turno text;

-- Valores admitidos en la columna "turno":
--   'ciclo1' / 'ciclo2' / 'ciclo3' -> tarde en esa semana del ciclo de 3, repitiendo
--   'par'                          -> alterna: tarde en las semanas pares
--   'impar'                        -> alterna: tarde en las semanas impares
--   NULL o ''                      -> turno fijo: no se marca nada
--
-- Después de ejecutar esto, asigna el turno de cada compañero desde la app:
--   Ajustes -> Compañeros -> columna "Turno de tarde" -> Guardar
-- (No hace falta volver a tocar SQL nunca más.)
--
-- La semana 1 del cuadrante es la del lunes indicado en config.js -> turnos.anchorMonday
