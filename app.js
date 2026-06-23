// ============================================================
//  APP DE VACACIONES — interfaz
// ============================================================
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DOW = ["L","M","X","J","V","S","D"];

const state = {
  user: null,
  personas: [],            // [{id,nombre,color,dias_anuales,bolsa_horas,orden}]
  ajustes: { year:2026, max_fuera:2, horas_por_dia:8 },
  festivosSet: new Set(),  // "AAAA-MM-DD"
  festivos: [],            // [{fecha,nombre}]
  marcas: new Map()        // "personaId|fecha" -> valor
};
let mesActual = 0;

// ---------- utilidades fecha ----------
const pad = n => String(n).padStart(2,"0");
const ymd = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
const diasDelMes = (y,m) => new Date(y, m+1, 0).getDate();
const dowLunes = (y,m,d) => (new Date(y,m,d).getDay()+6)%7;
const esFinde = (y,m,d) => dowLunes(y,m,d) >= 5;
const esFinde2 = d => (d.getDay()+6)%7 >= 5;
const esFestivo = f => state.festivosSet.has(f);
const key = (pid,f) => pid+"|"+f;
const fmt = d => ymd(d.getFullYear(), d.getMonth(), d.getDate());
const personaById = id => state.personas.find(p=>p.id===id);

// ============================================================
//  ARRANQUE
// ============================================================
async function init(){
  document.getElementById("modeBadge").textContent =
    Store.usaSupabase ? "Modo compartido" : "Modo local (prueba)";
  if (Store.usaSupabase) document.getElementById("modeBadge").classList.add("shared");

  state.user = await Store.getUser();
  Store.onAuthChange(async u => { state.user = u; await routeAuth(); });
  initEventos();
  await routeAuth();
}

async function routeAuth(){
  const necesitaLogin = Store.usaSupabase && !state.user;
  document.getElementById("loginScreen").style.display = necesitaLogin ? "flex" : "none";
  document.getElementById("appRoot").style.display     = necesitaLogin ? "none" : "block";
  if (necesitaLogin) return;
  await arrancarApp();
}

let arrancada = false;
async function arrancarApp(){
  document.getElementById("userEmail").textContent = state.user ? state.user.email : "";
  document.getElementById("btnLogout").style.display = Store.usaSupabase ? "inline-block" : "none";
  document.getElementById("btnPass").style.display   = Store.usaSupabase ? "inline-block" : "none";
  await recargar();
  if (!arrancada){
    arrancada = true;
    Store.subscribe(() => recargar());
    const hoy = new Date();
    mesActual = (hoy.getFullYear() === state.ajustes.year) ? hoy.getMonth() : 0;
  }
}

async function recargar(){
  const data = await Store.loadAll();
  state.personas = (data.personas||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  state.ajustes  = data.ajustes;
  state.festivos = data.festivos||[];
  state.festivosSet = new Set(state.festivos.map(f=>f.fecha));
  state.marcas = new Map();
  (data.marcas||[]).forEach(m => state.marcas.set(key(m.persona_id, m.fecha), String(m.valor)));
  document.getElementById("hdrYear").textContent = state.ajustes.year;
  renderTodo();
}

function renderTodo(){
  renderCalendario();
  if (document.querySelector(".tab.active")?.dataset.tab === "resumen") renderResumen();
}

// ============================================================
//  CALENDARIO
// ============================================================
function renderCalendario(){
  const y = state.ajustes.year, m = mesActual, nd = diasDelMes(y,m);
  document.getElementById("mesActual").textContent = `${MESES[m]} ${y}`;
  const maxFuera = state.ajustes.max_fuera;

  let html = "<thead><tr><th class='persona-col'>Compañero ↓ / Día →</th>";
  for (let d=1; d<=nd; d++) html += `<th>${d}<div class='dow'>${DOW[dowLunes(y,m,d)]}</div></th>`;
  html += "</tr></thead><tbody>";

  state.personas.forEach(p => {
    html += `<tr><td class='persona-col'><span class='color-dot' style='background:#${p.color}'></span>${p.nombre}</td>`;
    for (let d=1; d<=nd; d++){
      const f = ymd(y,m,d);
      const v = state.marcas.get(key(p.id, f));
      let cls = "cell", style = "", txt = "";
      if (v !== undefined && v !== ""){
        txt = v;
        if (v === "X") style = `background:#${p.color};color:#fff;`;
        else if (v === "M") style = `background:linear-gradient(135deg,#${p.color} 50%,#fff 50%);color:#${p.color};`;
        else style = "background:#ffe08a;color:#333;";
      } else if (esFestivo(f)) cls += " festivo";
      else if (esFinde(y,m,d)) cls += " finde";
      html += `<td class='${cls}' style='${style}' data-pid="${p.id}" data-fecha="${f}">${txt}</td>`;
    }
    html += "</tr>";
  });

  html += `<tr class='fuera-row'><td class='persona-col'>Personas fuera</td>`;
  for (let d=1; d<=nd; d++){
    const f = ymd(y,m,d);
    let c = 0;
    state.personas.forEach(p => { const v = state.marcas.get(key(p.id,f)); if (v==="X"||v==="M") c++; });
    html += `<td class='${c>maxFuera?"alerta":""}'>${c||""}</td>`;
  }
  html += "</tr></tbody>";

  const tabla = document.getElementById("tablaCal");
  tabla.innerHTML = html;
  tabla.querySelectorAll("td.cell").forEach(td =>
    td.addEventListener("dblclick", () => abrirModal(+td.dataset.pid, td.dataset.fecha)));
}

// ============================================================
//  RESUMEN
// ============================================================
function renderResumen(){
  const acc = {};
  state.personas.forEach(p => acc[p.id] = { mes:Array(12).fill(0), dias:0, horas:0 });
  state.marcas.forEach((v,k) => {
    const [pid,fecha] = k.split("|"); const id = +pid;
    if (!acc[id]) return;
    const m = +fecha.slice(5,7) - 1;
    if (v === "X"){ acc[id].mes[m]+=1; acc[id].dias+=1; }
    else if (v === "M"){ acc[id].mes[m]+=0.5; acc[id].dias+=0.5; }
    else { const h = parseFloat(v); if (!isNaN(h)) acc[id].horas += h; }
  });

  let html = "<thead><tr><th class='nombre'>Compañero</th>";
  MESES.forEach(mm => html += `<th>${mm.slice(0,3)}</th>`);
  html += "<th class='sep'>Días tot.</th><th>Asig.</th><th>Rest.</th><th class='sep'>Horas usad.</th><th>Bolsa</th><th>Rest.</th></tr></thead><tbody>";
  state.personas.forEach(p => {
    const a = acc[p.id];
    html += `<tr><td class='nombre'><span class='color-dot' style='background:#${p.color}'></span>${p.nombre}</td>`;
    a.mes.forEach(x => html += `<td>${x||""}</td>`);
    const rest = p.dias_anuales - a.dias, hrest = p.bolsa_horas - a.horas;
    html += `<td class='sep'><b>${a.dias}</b></td><td>${p.dias_anuales}</td><td class='${rest<0?"neg":""}'>${rest}</td>`;
    html += `<td class='sep'>${a.horas}</td><td>${p.bolsa_horas}</td><td class='${hrest<0?"neg":""}'>${hrest}</td></tr>`;
  });
  html += "</tbody>";
  document.getElementById("tablaResumen").innerHTML = html;

  let tDias=0,tHoras=0,activos=0; const cargaMes=Array(12).fill(0);
  state.personas.forEach(p => { const a=acc[p.id]; tDias+=a.dias; tHoras+=a.horas; if(a.dias||a.horas) activos++; a.mes.forEach((x,i)=>cargaMes[i]+=x); });
  const idxMax = cargaMes.indexOf(Math.max(...cargaMes));
  const mesMax = Math.max(...cargaMes)>0 ? MESES[idxMax] : "—";
  document.getElementById("statsBox").innerHTML = `
    <div class='stat-card'><div class='n'>${tDias}</div><div class='l'>Días totales cogidos</div></div>
    <div class='stat-card'><div class='n'>${tHoras}</div><div class='l'>Horas totales usadas</div></div>
    <div class='stat-card'><div class='n'>${activos}/${state.personas.length}</div><div class='l'>Compañeros activos</div></div>
    <div class='stat-card'><div class='n'>${mesMax}</div><div class='l'>Mes más cargado</div></div>`;
}

// ============================================================
//  AJUSTES
// ============================================================
function renderAjustes(){
  document.getElementById("ajYear").value = state.ajustes.year;
  document.getElementById("ajMaxFuera").value = state.ajustes.max_fuera;
  document.getElementById("ajHorasDia").value = state.ajustes.horas_por_dia;

  // personas
  let ph = "<thead><tr><th>Nombre</th><th>Color</th><th>Días anuales</th><th>Bolsa horas</th><th></th></tr></thead><tbody>";
  state.personas.forEach(p => {
    ph += `<tr data-id="${p.id}">
      <td><input class="e-nombre" value="${p.nombre}"></td>
      <td><input class="e-color" value="${p.color}" maxlength="6" style="width:80px"> <span class="color-dot" style="background:#${p.color}"></span></td>
      <td><input class="e-dias" type="number" value="${p.dias_anuales}" style="width:70px"></td>
      <td><input class="e-horas" type="number" value="${p.bolsa_horas}" style="width:70px"></td>
      <td><button class="ghost-btn sm btn-save-p">Guardar</button> <button class="danger-btn sm btn-del-p">Borrar</button></td>
    </tr>`;
  });
  ph += "</tbody>";
  const tp = document.getElementById("tablaPersonas");
  tp.innerHTML = ph;
  tp.querySelectorAll(".btn-save-p").forEach(b => b.onclick = e => guardarPersona(+e.target.closest("tr").dataset.id));
  tp.querySelectorAll(".btn-del-p").forEach(b => b.onclick = e => borrarPersona(+e.target.closest("tr").dataset.id));

  // festivos
  let fh = "<thead><tr><th>Fecha</th><th>Nombre</th><th></th></tr></thead><tbody>";
  state.festivos.forEach(f => {
    fh += `<tr data-fecha="${f.fecha}"><td>${f.fecha}</td><td>${f.nombre||""}</td>
      <td><button class="danger-btn sm btn-del-f">Borrar</button></td></tr>`;
  });
  fh += "</tbody>";
  const tf = document.getElementById("tablaFestivos");
  tf.innerHTML = fh;
  tf.querySelectorAll(".btn-del-f").forEach(b => b.onclick = e => borrarFestivo(e.target.closest("tr").dataset.fecha));
}

async function guardarParams(){
  const obj = {
    year:+document.getElementById("ajYear").value,
    max_fuera:+document.getElementById("ajMaxFuera").value,
    horas_por_dia:+document.getElementById("ajHorasDia").value
  };
  await Store.setAjustes(obj);
  await log("ajustes", `Parámetros: año=${obj.year}, máx fuera=${obj.max_fuera}, horas/día=${obj.horas_por_dia}`);
  await recargar(); renderAjustes(); toast("Parámetros guardados");
}
async function guardarPersona(id){
  const tr = document.querySelector(`#tablaPersonas tr[data-id="${id}"]`);
  const fields = {
    nombre: tr.querySelector(".e-nombre").value.trim(),
    color:  tr.querySelector(".e-color").value.trim().replace("#",""),
    dias_anuales: +tr.querySelector(".e-dias").value,
    bolsa_horas:  +tr.querySelector(".e-horas").value
  };
  if (!fields.nombre){ toast("El nombre no puede estar vacío"); return; }
  await Store.updatePersona(id, fields);
  await log("persona", `Editado compañero: ${fields.nombre} (${fields.dias_anuales}d / ${fields.bolsa_horas}h)`);
  await recargar(); renderAjustes(); toast("Compañero guardado");
}
async function borrarPersona(id){
  const p = personaById(id);
  if (!confirm(`¿Borrar a "${p.nombre}" y todas sus marcas?`)) return;
  await Store.deletePersona(id);
  await log("persona", `Borrado compañero: ${p.nombre}`);
  await recargar(); renderAjustes(); toast("Compañero borrado");
}
async function addPersona(){
  const nombre = document.getElementById("npNombre").value.trim();
  if (!nombre){ toast("Pon un nombre"); return; }
  const color = (document.getElementById("npColor").value.trim()||"4472C4").replace("#","");
  const dias = +document.getElementById("npDias").value || 22;
  const horas = +document.getElementById("npHoras").value || 0;
  const orden = (state.personas.reduce((m,p)=>Math.max(m,p.orden||0),0))+1;
  await Store.addPersona({ nombre, color, dias_anuales:dias, bolsa_horas:horas, orden });
  await log("persona", `Añadido compañero: ${nombre}`);
  document.getElementById("npNombre").value=""; document.getElementById("npColor").value="";
  await recargar(); renderAjustes(); toast("Compañero añadido");
}
async function addFestivo(){
  const fecha = document.getElementById("nfFecha").value;
  if (!fecha){ toast("Elige una fecha"); return; }
  const nombre = document.getElementById("nfNombre").value.trim();
  await Store.addFestivo(fecha, nombre);
  await log("festivo", `Añadido festivo: ${fecha} ${nombre}`);
  document.getElementById("nfNombre").value="";
  await recargar(); renderAjustes(); toast("Festivo añadido");
}
async function borrarFestivo(fecha){
  await Store.deleteFestivo(fecha);
  await log("festivo", `Borrado festivo: ${fecha}`);
  await recargar(); renderAjustes(); toast("Festivo borrado");
}

// ============================================================
//  REGISTRO (LOGS)
// ============================================================
async function renderLogs(){
  const logs = await Store.loadLogs(200);
  let html = "<thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>";
  if (!logs.length) html += "<tr><td colspan='4'>Sin registros todavía.</td></tr>";
  logs.forEach(l => {
    const fecha = new Date(l.ts).toLocaleString("es-ES");
    html += `<tr><td>${fecha}</td><td>${l.usuario||""}</td><td>${l.accion}</td><td style="text-align:left">${l.detalle||""}</td></tr>`;
  });
  html += "</tbody>";
  document.getElementById("tablaLogs").innerHTML = html;
}
function log(accion, detalle){
  const u = state.user ? state.user.email : "(local)";
  return Store.addLog(u, accion, detalle);
}

// ============================================================
//  MODAL PEDIR
// ============================================================
const overlay = document.getElementById("overlay");
const mPersona = document.getElementById("mPersona");
const mDesde = document.getElementById("mDesde");
const mHasta = document.getElementById("mHasta");
const mHoras = document.getElementById("mHoras");
const horasBox = document.getElementById("horasBox");
const modalMsg = document.getElementById("modalMsg");
const tipoSel = () => document.querySelector("input[name=tipo]:checked").value;

function abrirModal(pidPre, fechaPre){
  modalMsg.textContent = "";
  mPersona.innerHTML = state.personas.map(p=>`<option value="${p.id}">${p.nombre}</option>`).join("");
  if (pidPre) mPersona.value = pidPre;
  mDesde.value = fechaPre || ymd(state.ajustes.year, mesActual, 1);
  mHasta.value = ""; mHoras.value = "";
  document.querySelector("input[name=tipo][value=X]").checked = true;
  horasBox.style.display = "none";
  overlay.classList.add("open");
}
const cerrarModal = () => overlay.classList.remove("open");

async function guardar(){
  modalMsg.textContent = "";
  const pid = +mPersona.value;
  const p = personaById(pid);
  const tipo = tipoSel();
  if (!mDesde.value){ modalMsg.textContent = "Indica la fecha 'Desde'."; return; }
  const fIni = new Date(mDesde.value+"T00:00:00");
  const fFin = mHasta.value ? new Date(mHasta.value+"T00:00:00") : new Date(fIni);
  if (fFin < fIni){ modalMsg.textContent = "La fecha 'Hasta' es anterior a 'Desde'."; return; }
  if ((tipo==="M"||tipo==="H") && mHasta.value && mHasta.value!==mDesde.value){
    modalMsg.textContent = "Medio día y horas solo admiten un único día."; return;
  }

  if (tipo==="H"){
    const h = parseFloat((mHoras.value||"").replace(",","."));
    if (isNaN(h)||h<=0){ modalMsg.textContent = "Indica un número de horas válido."; return; }
    await Store.setMarca(pid, fmt(fIni), h);
    await log("marca", `${p.nombre}: ${h}h el ${fmt(fIni)}`);
    return finalizar("Horas guardadas");
  }
  if (tipo==="M"){
    const f = fmt(fIni);
    if (esFinde2(fIni)||esFestivo(f)){ modalMsg.textContent = "Ese día es finde o festivo."; return; }
    await Store.setMarca(pid, f, "M");
    await log("marca", `${p.nombre}: medio día el ${f}`);
    return finalizar("Medio día guardado");
  }

  const fechas = [];
  for (let d=new Date(fIni); d<=fFin; d.setDate(d.getDate()+1)){
    const f = fmt(d);
    if (esFinde2(d)||esFestivo(f)) continue;
    fechas.push(f);
  }
  if (!fechas.length){ modalMsg.textContent = "El rango solo contiene findes/festivos."; return; }
  const conflicto = fechas.find(f => contarFuera(f,pid)+1 > state.ajustes.max_fuera);
  if (conflicto && !confirm(`El ${conflicto} ya hay ${state.ajustes.max_fuera} persona(s) fuera (máximo).\n\n¿Guardar igualmente?`)) return;
  for (const f of fechas) await Store.setMarca(pid, f, "X");
  await log("marca", `${p.nombre}: ${fechas.length} día(s) (${fechas[0]} a ${fechas[fechas.length-1]})`);
  finalizar(`${fechas.length} día(s) guardado(s)`);
}

async function borrar(){
  const pid = +mPersona.value, p = personaById(pid);
  if (!mDesde.value){ modalMsg.textContent = "Indica la fecha 'Desde'."; return; }
  const fIni = new Date(mDesde.value+"T00:00:00");
  const fFin = mHasta.value ? new Date(mHasta.value+"T00:00:00") : new Date(fIni);
  let n = 0;
  for (let d=new Date(fIni); d<=fFin; d.setDate(d.getDate()+1)){
    const f = fmt(d);
    if (state.marcas.has(key(pid,f))){ await Store.delMarca(pid,f); n++; }
  }
  if (n) await log("borrado", `${p.nombre}: ${n} día(s) borrados desde ${fmt(fIni)}`);
  finalizar(n ? `${n} día(s) borrado(s)` : "No había nada que borrar");
}
async function finalizar(msg){ cerrarModal(); await recargar(); toast(msg); }
function contarFuera(fecha, exclPid){
  let c=0; state.personas.forEach(p => { if (p.id===exclPid) return; const v=state.marcas.get(key(p.id,fecha)); if (v==="X"||v==="M") c++; });
  return c;
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove("show"), 2600);
}

// ============================================================
//  EVENTOS
// ============================================================
function initEventos(){
  // login
  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("loginMsg"); msg.textContent = "";
    const r = await Store.login(document.getElementById("loginEmail").value.trim(), document.getElementById("loginPass").value);
    if (!r.ok){ msg.textContent = "No se pudo entrar: " + (r.msg||"revisa email y contraseña"); return; }
    state.user = await Store.getUser();
    await log("login", "Inicio de sesión");
  });
  document.getElementById("btnLogout").onclick = async () => { await log("logout","Cierre de sesión"); await Store.logout(); };

  // cambiar contraseña
  document.getElementById("btnPass").onclick = () => {
    document.getElementById("passMsg").textContent = "";
    document.getElementById("newPass").value = ""; document.getElementById("newPass2").value = "";
    document.getElementById("overlayPass").classList.add("open");
  };
  document.getElementById("passCancelar").onclick = () => document.getElementById("overlayPass").classList.remove("open");
  document.getElementById("passGuardar").onclick = async () => {
    const a = document.getElementById("newPass").value, b = document.getElementById("newPass2").value;
    const msg = document.getElementById("passMsg");
    if (a.length < 6){ msg.textContent = "Mínimo 6 caracteres."; return; }
    if (a !== b){ msg.textContent = "Las contraseñas no coinciden."; return; }
    const r = await Store.changePassword(a);
    if (!r.ok){ msg.textContent = r.msg; return; }
    await log("password", "Cambio de contraseña");
    document.getElementById("overlayPass").classList.remove("open");
    toast("Contraseña cambiada");
  };

  // navegación mes
  document.getElementById("btnPrev").onclick = () => { mesActual=(mesActual+11)%12; renderCalendario(); };
  document.getElementById("btnNext").onclick = () => { mesActual=(mesActual+1)%12; renderCalendario(); };
  document.getElementById("btnHoy").onclick = () => { const h=new Date(); mesActual=(h.getFullYear()===state.ajustes.year)?h.getMonth():0; renderCalendario(); };

  // modal pedir
  document.getElementById("btnPedir").onclick = () => abrirModal(null,null);
  document.getElementById("mGuardar").onclick = guardar;
  document.getElementById("mBorrar").onclick = borrar;
  document.getElementById("mCancelar").onclick = cerrarModal;
  overlay.addEventListener("click", e => { if (e.target===overlay) cerrarModal(); });
  document.querySelectorAll("input[name=tipo]").forEach(r => r.addEventListener("change", () => horasBox.style.display = tipoSel()==="H"?"block":"none"));

  // ajustes
  document.getElementById("btnGuardarParams").onclick = guardarParams;
  document.getElementById("btnAddPersona").onclick = addPersona;
  document.getElementById("btnAddFestivo").onclick = addFestivo;
  document.getElementById("btnRefreshLogs").onclick = renderLogs;

  // pestañas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-"+tab.dataset.tab).classList.add("active");
      if (tab.dataset.tab==="resumen") renderResumen();
      if (tab.dataset.tab==="ajustes") renderAjustes();
      if (tab.dataset.tab==="registro") renderLogs();
    };
  });
}

init();
