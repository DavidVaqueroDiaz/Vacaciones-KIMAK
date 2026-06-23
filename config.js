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
  supabaseUrl:     "",
  supabaseAnonKey: "",

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
