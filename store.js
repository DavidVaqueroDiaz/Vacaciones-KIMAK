// ============================================================
//  STORE — capa de datos y autenticación
//  Funciona con Supabase (modo compartido) o con localStorage
//  (modo local de prueba) según haya claves en config.js.
// ============================================================
window.Store = (() => {
  const CFG = window.APP_CONFIG;
  const usaSupabase = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  let sb = null;
  if (usaSupabase) sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

  // -------- helpers localStorage --------
  const LS = {
    personas: "vac_personas",
    ajustes:  "vac_ajustes",
    festivos: "vac_festivos",
    marcas:   "vac_marcas",
    logs:     "vac_logs"
  };
  const lsGet = (k, def) => { const r = localStorage.getItem(k); return r ? JSON.parse(r) : def; };
  const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  function seedLocalSiHaceFalta(){
    if (localStorage.getItem(LS.personas)) return;
    const d = CFG.defaults;
    lsSet(LS.personas, d.personas.map((p,i) => ({ id:i+1, orden:i+1, ...p })));
    lsSet(LS.ajustes,  { year:d.year, max_fuera:d.maxFuera, horas_por_dia:d.horasPorDia });
    lsSet(LS.festivos, d.festivos.slice());
    lsSet(LS.marcas,   []);
    lsSet(LS.logs,     []);
  }

  // ============================================================
  //  AUTENTICACIÓN
  // ============================================================
  async function getUser(){
    if (!usaSupabase) return { email: "(local)" };
    const { data } = await sb.auth.getSession();
    return data.session ? data.session.user : null;
  }
  async function login(email, password){
    if (!usaSupabase) return { ok:true };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? { ok:false, msg:error.message } : { ok:true };
  }
  async function logout(){ if (usaSupabase) await sb.auth.signOut(); }
  async function changePassword(newPassword){
    if (!usaSupabase) return { ok:false, msg:"En modo local no hay contraseñas." };
    const { error } = await sb.auth.updateUser({ password:newPassword });
    return error ? { ok:false, msg:error.message } : { ok:true };
  }
  function onAuthChange(cb){ if (usaSupabase) sb.auth.onAuthStateChange((_e,s)=>cb(s?s.user:null)); }

  // ¿La cuenta actual es administradora? Se comprueba contra la tabla "admins"
  // de la base de datos (la misma que aplica los permisos del servidor).
  async function isAdmin(){
    if (!usaSupabase) return true; // modo local de prueba
    const u = await getUser();
    if (!u || !u.email) return false;
    const { data, error } = await sb.from("admins").select("email").ilike("email", u.email);
    if (error){ console.error(error); return false; }
    return (data||[]).length > 0;
  }

  // Crea una cuenta sin cerrar la sesión del administrador.
  // Usa un cliente auxiliar aislado (no guarda sesión) para el registro.
  async function createUser(email, password){
    if (!usaSupabase) return { ok:false, msg:"En modo local no hay cuentas." };
    const aux = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession:false, autoRefreshToken:false, storageKey:"sb-aux-"+Date.now() }
    });
    const { data, error } = await aux.auth.signUp({ email, password });
    try { await aux.auth.signOut(); } catch(e){}
    if (error) return { ok:false, msg:error.message };
    return { ok:true, needsConfirm: !data.session };
  }

  // ============================================================
  //  CARGA GENERAL
  // ============================================================
  async function loadAll(){
    if (usaSupabase){
      const [pe,aj,fe,ma] = await Promise.all([
        sb.from("personas").select("*").order("orden"),
        sb.from("ajustes").select("*"),
        sb.from("festivos").select("*").order("fecha"),
        sb.from("marcas").select("*")
      ]);
      const ajustes = {};
      (aj.data||[]).forEach(r => ajustes[r.clave] = r.valor);
      return {
        personas: pe.data || [],
        ajustes:  { year:+ajustes.year||CFG.defaults.year, max_fuera:+ajustes.max_fuera||0, horas_por_dia:+ajustes.horas_por_dia||8 },
        festivos: fe.data || [],
        marcas:   ma.data || []
      };
    } else {
      seedLocalSiHaceFalta();
      return {
        personas: lsGet(LS.personas, []),
        ajustes:  lsGet(LS.ajustes, {}),
        festivos: lsGet(LS.festivos, []),
        marcas:   lsGet(LS.marcas, [])
      };
    }
  }

  // ============================================================
  //  PERSONAS
  // ============================================================
  async function addPersona(p){
    if (usaSupabase){ const { error } = await sb.from("personas").insert(p); return !error; }
    const arr = lsGet(LS.personas, []);
    const id = arr.reduce((m,x)=>Math.max(m,x.id),0)+1;
    arr.push({ id, orden:id, ...p }); lsSet(LS.personas, arr); return true;
  }
  async function updatePersona(id, fields){
    if (usaSupabase){ const { error } = await sb.from("personas").update(fields).eq("id",id); return !error; }
    const arr = lsGet(LS.personas, []);
    const i = arr.findIndex(x=>x.id===id); if (i>=0) Object.assign(arr[i], fields);
    lsSet(LS.personas, arr); return true;
  }
  async function deletePersona(id){
    if (usaSupabase){ const { error } = await sb.from("personas").delete().eq("id",id); return !error; }
    lsSet(LS.personas, lsGet(LS.personas, []).filter(x=>x.id!==id));
    lsSet(LS.marcas,   lsGet(LS.marcas, []).filter(x=>x.persona_id!==id));
    return true;
  }

  // ============================================================
  //  AJUSTES GLOBALES
  // ============================================================
  async function setAjustes(obj){
    if (usaSupabase){
      const rows = Object.entries(obj).map(([clave,valor]) => ({ clave, valor:String(valor) }));
      const { error } = await sb.from("ajustes").upsert(rows, { onConflict:"clave" });
      return !error;
    }
    const a = lsGet(LS.ajustes, {}); Object.assign(a, obj); lsSet(LS.ajustes, a); return true;
  }

  // ============================================================
  //  FESTIVOS
  // ============================================================
  async function addFestivo(fecha, nombre){
    if (usaSupabase){ const { error } = await sb.from("festivos").upsert({ fecha, nombre }, { onConflict:"fecha" }); return !error; }
    const arr = lsGet(LS.festivos, []).filter(f=>f.fecha!==fecha);
    arr.push({ fecha, nombre }); arr.sort((a,b)=>a.fecha<b.fecha?-1:1); lsSet(LS.festivos, arr); return true;
  }
  async function deleteFestivo(fecha){
    if (usaSupabase){ const { error } = await sb.from("festivos").delete().eq("fecha",fecha); return !error; }
    lsSet(LS.festivos, lsGet(LS.festivos, []).filter(f=>f.fecha!==fecha)); return true;
  }

  // ============================================================
  //  MARCAS
  // ============================================================
  async function setMarca(persona_id, fecha, valor){
    if (usaSupabase){ const { error } = await sb.from("marcas").upsert({ persona_id, fecha, valor:String(valor) }, { onConflict:"persona_id,fecha" }); return !error; }
    const arr = lsGet(LS.marcas, []).filter(m=>!(m.persona_id===persona_id && m.fecha===fecha));
    arr.push({ persona_id, fecha, valor:String(valor) }); lsSet(LS.marcas, arr); return true;
  }
  async function delMarca(persona_id, fecha){
    if (usaSupabase){ const { error } = await sb.from("marcas").delete().match({ persona_id, fecha }); return !error; }
    lsSet(LS.marcas, lsGet(LS.marcas, []).filter(m=>!(m.persona_id===persona_id && m.fecha===fecha))); return true;
  }

  // ============================================================
  //  LOGS
  // ============================================================
  async function addLog(usuario, accion, detalle){
    if (usaSupabase){ await sb.from("logs").insert({ usuario, accion, detalle }); return; }
    const arr = lsGet(LS.logs, []);
    arr.unshift({ id:Date.now(), ts:new Date().toISOString(), usuario, accion, detalle });
    lsSet(LS.logs, arr.slice(0,500));
  }
  async function loadLogs(limit = 200){
    if (usaSupabase){ const { data } = await sb.from("logs").select("*").order("ts",{ascending:false}).limit(limit); return data||[]; }
    return lsGet(LS.logs, []).slice(0, limit);
  }

  // ============================================================
  //  PERFILES (lista de cuentas creadas, solo para referencia del admin)
  // ============================================================
  async function addPerfil(email){
    if (usaSupabase){ await sb.from("perfiles").upsert({ email }, { onConflict:"email" }); return; }
    const arr = lsGet("vac_perfiles", []).filter(p=>p.email!==email);
    arr.push({ email, creado:new Date().toISOString() }); lsSet("vac_perfiles", arr);
  }
  async function loadPerfiles(){
    if (usaSupabase){ const { data } = await sb.from("perfiles").select("*").order("creado",{ascending:true}); return data||[]; }
    return lsGet("vac_perfiles", []);
  }

  // ============================================================
  //  TIEMPO REAL
  // ============================================================
  function subscribe(onChange){
    if (!usaSupabase) return;
    sb.channel("vac-rt")
      .on("postgres_changes", { event:"*", schema:"public", table:"marcas"   }, onChange)
      .on("postgres_changes", { event:"*", schema:"public", table:"personas" }, onChange)
      .on("postgres_changes", { event:"*", schema:"public", table:"festivos" }, onChange)
      .on("postgres_changes", { event:"*", schema:"public", table:"ajustes"  }, onChange)
      .subscribe();
  }

  return {
    usaSupabase,
    getUser, login, logout, changePassword, onAuthChange, createUser, isAdmin,
    loadAll, addPersona, updatePersona, deletePersona,
    setAjustes, addFestivo, deleteFestivo,
    setMarca, delMarca, addLog, loadLogs,
    addPerfil, loadPerfiles, subscribe
  };
})();
