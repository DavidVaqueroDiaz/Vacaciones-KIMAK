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

  // Emails que pueden ver el panel de Administración (crear cuentas).
  // Añade aquí en minúsculas los correos que quieras que sean administradores.
  adminEmails: ["davidvaquero94@gmail.com", "jsomoza@kimak.com"],

  // ---- TURNOS DE TARDE (se pintan en gris claro en la Vista anual) ----
  // El sistema lo calcula solo a partir de este patrón; no hay que marcar nada a mano.
  turnos: {
    anchorMonday: "2026-01-05",   // lunes de la "Semana 1" del cuadrante
    // Ciclo de 3 semanas del trío: quién está de TARDE en la semana 1, 2 y 3 (y se repite)
    cicloTarde: ["Carlos Pernas", "David Vaquero", "Jose Angel"],
    // Personas que alternan mañana/tarde cada semana y están de TARDE en semanas PARES
    alternosTardeSemanaPar: ["Javier Orosa"]
    // (Diego Ponte, Joel Feijoo y José Somoza tienen turno fijo: no se marcan)
  },

  // --- Valores por defecto SOLO para el modo local de prueba ---
  // (En modo compartido todo esto se gestiona desde la pestaña "Ajustes".)
  defaults: {
    year:        2026,
    maxFuera:    2,
    horasPorDia: 8,
    personas: [
      { nombre: "Jose Angel",    color: "1F77B4", dias_anuales: 22, bolsa_horas: 20 },
      { nombre: "David Vaquero", color: "E15759", dias_anuales: 22, bolsa_horas: 20 },
      { nombre: "Carlos Pernas", color: "59A14F", dias_anuales: 22, bolsa_horas: 20 },
      { nombre: "Diego Ponte",   color: "F28E2B", dias_anuales: 22, bolsa_horas: 20 },
      { nombre: "Joel Feijoo",   color: "AF7AA1", dias_anuales: 22, bolsa_horas: 20 },
      { nombre: "Javier Orosa",  color: "4E79A7", dias_anuales: 22, bolsa_horas: 20 }
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
