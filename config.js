// ============================================================
//  CONFIGURACIÓN DE CONEXIÓN
// ============================================================
//  Mientras estos dos valores estén vacíos, la app funciona en
//  MODO LOCAL de prueba (sin cuentas, datos solo en tu navegador),
//  usando los valores por defecto de abajo.
//
//  Cuando pegues aquí tu URL y tu clave "anon" de Supabase, la app
//  pasa a MODO COMPARTIDO: login con cuenta y contraseña, datos
//  compartidos por todos y registro de acciones (logs).
//  (Mira el README.md para saber de dónde se sacan estos valores.)
// ============================================================

window.APP_CONFIG = {
  supabaseUrl:     "https://shtncekxervxerdlssat.supabase.co",
  supabaseAnonKey: "sb_publishable__NCDfRPV6-PqH0-CdpAcpw_q_B7KLSS",

  // Quién es administrador se decide en la tabla "admins" de la base de datos
  // (Supabase), no aquí. Así no hay ningún email personal en el código público.
  // Para añadir un admin:  insert into admins (email) values ('correo@ejemplo.com');

  // ---- TURNOS DE TARDE (se pintan en gris claro en la Vista anual) ----
  // El turno de cada persona se guarda en la base de datos (columna "turno" de
  // la tabla personas) y se edita desde la pestaña "Ajustes". Aquí solo se
  // indica desde qué lunes empieza a contar la "Semana 1" del cuadrante.
  turnos: {
    anchorMonday: "2026-01-05"
  },

  // --- Valores por defecto SOLO para el modo local de prueba ---
  // (En modo compartido todo esto se gestiona desde la pestaña "Ajustes".)
  defaults: {
    year:        2026,
    maxFuera:    2,
    horasPorDia: 8,
    personas: [
      { nombre: "Compañero 1", color: "1F77B4", dias_anuales: 22, bolsa_horas: 20, turno: "ciclo3" },
      { nombre: "Compañero 2", color: "E15759", dias_anuales: 22, bolsa_horas: 20, turno: "ciclo2" },
      { nombre: "Compañero 3", color: "59A14F", dias_anuales: 22, bolsa_horas: 20, turno: "ciclo1" },
      { nombre: "Compañero 4", color: "F28E2B", dias_anuales: 22, bolsa_horas: 20, turno: "" },
      { nombre: "Compañero 5", color: "AF7AA1", dias_anuales: 22, bolsa_horas: 20, turno: "" },
      { nombre: "Compañero 6", color: "4E79A7", dias_anuales: 22, bolsa_horas: 20, turno: "par" }
    ],
    festivos: [
      { fecha: "2026-01-01", nombre: "Año Nuevo" },
      { fecha: "2026-01-06", nombre: "Reyes" },
      { fecha: "2026-05-01", nombre: "Día del Trabajo" },
      { fecha: "2026-08-15", nombre: "Asunción" },
      { fecha: "2026-10-12", nombre: "Fiesta Nacional" },
      { fecha: "2026-12-25", nombre: "Navidad" }
    ]
  }
};
