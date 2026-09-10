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
  marcas: new Map(),       // "personaId|fecha" -> valor
  esAdminFlag: false,      // se resuelve contra la tabla "admins" al entrar
  departamentos: [],       // [{id,nombre,max_fuera,orden}]
  depActual: null          // departamento que se está viendo
};
let mesActual  = 0;   // mes que muestra el calendario
let mesSemanas = 0;   // mes que muestran las tarjetas de horas por semana

// ---------- seguridad: nunca insertar texto de la BD sin escapar ----------
// Evita que alguien pueda inyectar HTML o JavaScript a través de un nombre,
// un email o cualquier otro dato guardado (XSS).
const ESCAPES = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESCAPES[c]);
// Solo se admiten colores hexadecimales de 6 dígitos; si no, uno por defecto.
const hex = c => /^[0-9A-Fa-f]{6}$/.test(String(c || "")) ? String(c) : "4472C4";

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

// ---------- departamentos ----------
// Personas del departamento que se está viendo ahora mismo
const personasDep = () => state.personas.filter(p => p.departamento_id === state.depActual);
const depById = id => state.departamentos.find(d => d.id === id);
// Máximo de personas fuera a la vez, propio de cada departamento
function maxFueraDep(){
  const d = depById(state.depActual);
  return (d && d.max_fuera != null) ? +d.max_fuera : (state.ajustes.max_fuera || 0);
}

// ---------- jornada y horas disponibles ----------
// Horas que trabaja una persona ese día de la semana (0=lunes … 6=domingo).
// El horario se guarda como "8,8,8,8,8" o "8.5,8.5,8.5,8.5,6" (lunes a viernes).
function horasDelDia(p, dow){
  if (dow >= 5) return 0;                        // findes no cuentan
  const arr = String(p.horario||"").split(",").map(x => parseFloat(String(x).trim()));
  if (arr.length === 5 && arr.every(n => !isNaN(n) && n >= 0)) return arr[dow];
  return state.ajustes.horas_por_dia || 8;       // jornada estándar si no tiene horario propio
}
// ¿Estaba esta persona en el equipo en esa fecha? (altas y bajas)
function activaEn(p, fecha){
  if (p.fecha_alta && fecha < p.fecha_alta) return false;
  if (p.fecha_baja && fecha > p.fecha_baja) return false;
  return true;
}
// Horas de trabajo del equipo en un día: las teóricas y las que quedan disponibles.
// Recibe un Date, así que también vale para días de otro mes (semanas partidas).
function horasDelEquipoD(dt){
  const fecha = fmt(dt), dow = (dt.getDay()+6)%7;
  if (dow >= 5 || esFestivo(fecha)) return { teoricas:0, disponibles:0 };
  let teoricas = 0, disponibles = 0;
  personasDep().forEach(p => {
    if (!activaEn(p, fecha)) return;
    const h = horasDelDia(p, dow);
    teoricas += h;
    const v = state.marcas.get(key(p.id, fecha));
    if (v === "X") return;                       // día entero fuera
    if (v === "M"){ disponibles += h/2; return; } // medio día
    const n = parseFloat(v);
    if (!isNaN(n)){ disponibles += Math.max(0, h - n); return; } // horas de exceso
    disponibles += h;
  });
  return { teoricas, disponibles };
}
const horasDelEquipo = (y,m,d) => horasDelEquipoD(new Date(y,m,d));
// Quiénes están fuera ese día: da el color de cada uno para repartir el
// círculo en la vista anual, y sus nombres para el texto al pasar el cursor.
function quienesFuera(fecha){
  return personasDep().filter(p => {
    const v = state.marcas.get(key(p.id,fecha));
    return v === "X" || v === "M";
  });
}
// Redondea a un decimal y quita el ",0" cuando no hace falta
const numH = n => (Math.round(n*10)/10).toString().replace(".", ",");

// ---------- semanas completas ----------
const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
// Semanas de lunes a viernes que tocan un mes. Una semana se cuenta entera
// aunque empiece o termine en el mes de al lado (31 oct – 4 nov, por ejemplo),
// así que las semanas partidas salen en los dos meses.
function semanasDelMes(y, m){
  const primero = new Date(y, m, 1);
  const ultimo  = new Date(y, m, diasDelMes(y,m));
  const lunes = new Date(primero);
  lunes.setDate(primero.getDate() - ((primero.getDay()+6)%7));
  const semanas = [];
  while (lunes <= ultimo){
    const dias = [];
    for (let i=0; i<5; i++){
      const d = new Date(lunes); d.setDate(lunes.getDate()+i); dias.push(d);
    }
    if (dias[4] >= primero){          // la semana anterior al día 1 no pinta nada aquí
      let teoricas = 0, disponibles = 0;
      const fuera = new Map();        // id -> nombre, para no contar dos veces a nadie
      dias.forEach(d => {
        const h = horasDelEquipoD(d);
        teoricas += h.teoricas; disponibles += h.disponibles;
        quienesFuera(fmt(d)).forEach(p => fuera.set(p.id, p.nombre));
      });
      semanas.push({ ini:dias[0], fin:dias[4], teoricas, disponibles, fuera:[...fuera.values()] });
    }
    lunes.setDate(lunes.getDate()+7);
  }
  return semanas;
}
// "7 – 11 sep"  ·  "31 ago – 4 sep" cuando la semana cambia de mes
function etiquetaSemana(ini, fin){
  const a = ini.getDate(), b = fin.getDate();
  if (ini.getMonth() === fin.getMonth()) return `${a} – ${b} ${MESES_CORTOS[ini.getMonth()]}`;
  return `${a} ${MESES_CORTOS[ini.getMonth()]} – ${b} ${MESES_CORTOS[fin.getMonth()]}`;
}
// Semáforo de la semana: 0 nadie · 1 amarillo · 2 naranja · 3 o más rojo
const nivelSemana = n => n >= 3 ? 3 : n;

// ============================================================
//  ARRANQUE
// ============================================================
async function init(){
  document.getElementById("modeBadge").textContent =
    Store.usaSupabase ? "Modo compartido" : "Modo local (prueba)";
  if (Store.usaSupabase) document.getElementById("modeBadge").classList.add("shared");

  mostrarVista("portada");
  state.user = await Store.getUser();
  Store.onAuthChange(async u => { state.user = u; await routeAuth(); });
  initEventos();
  await routeAuth();
}

// ---------- las tres pantallas: portada, login y aplicación ----------
// Al abrir la web siempre se ve la portada. Desde ahí, "Entrar en la app"
// lleva al login si aún no has entrado, o directo al calendario si ya lo estás.
let vista = "portada";
function mostrarVista(v){
  vista = v;
  document.getElementById("portada").style.display      = v==="portada" ? "block" : "none";
  document.getElementById("loginScreen").style.display  = v==="login"   ? "flex"  : "none";
  document.getElementById("appRoot").style.display      = v==="app"     ? "block" : "none";
  try { window.scrollTo(0,0); } catch(e){}
  // los lienzos de la portada y la barra de las pestañas se miden al mostrarse
  window.dispatchEvent(new Event("resize"));
}
const necesitaLogin = () => Store.usaSupabase && !state.user;
function entrarEnLaApp(){
  if (necesitaLogin()){ mostrarVista("login"); return; }
  mostrarVista("app");
}

async function routeAuth(){
  if (necesitaLogin()){
    // sesión cerrada (o caducada): se vuelve a la portada
    if (vista !== "portada") mostrarVista("portada");
    return;
  }
  // Ya hay sesión: se cargan los datos aunque todavía se esté viendo la portada,
  // así al pulsar "Entrar en la app" el calendario aparece al instante.
  await arrancarApp();
  if (vista === "login") mostrarVista("app");
}

let arrancada = false;
// Se resuelve contra la tabla "admins" de la base de datos al entrar (ver arrancarApp)
function esAdmin(){
  if (!Store.usaSupabase) return true; // en modo local de prueba todo está permitido
  return state.esAdminFlag === true;
}
const emailActual = () => (state.user && state.user.email ? state.user.email : "").toLowerCase();
// Persona vinculada a la cuenta actual (por email). En modo local no aplica.
function miPersona(){
  if (!Store.usaSupabase) return null;
  return state.personas.find(p => (p.email||"").toLowerCase() === emailActual()) || null;
}
// ¿Puede la cuenta actual editar las vacaciones / datos de esta persona?
function canEdit(pid){
  if (esAdmin()) return true;
  const mp = miPersona();
  return !!mp && mp.id === pid;
}
// Colores pastel para los 12 meses de la vista anual
const MESCOLORS = ["4E79A7","E15759","59A14F","EDC948","76B7B2","F28E2B",
                   "B07AA1","9C755F","8CD17D","FF9D9A","BAB0AC","86BCB6"];

// ---------- turnos de tarde ----------
// Número de semana del cuadrante (semana 1 = la del anchorMonday)
function semanaCuadrante(y,m,d){
  const t = window.APP_CONFIG.turnos;
  if (!t) return 0;
  const anchor = new Date(t.anchorMonday+"T00:00:00");
  const fecha = new Date(y,m,d);
  const lunes = new Date(fecha); lunes.setDate(fecha.getDate() - ((fecha.getDay()+6)%7)); // lunes de esa semana
  return Math.round((lunes - anchor)/(7*86400000)) + 1;
}
// ¿Esta persona está de turno de tarde en esa semana?
// El patrón lo lleva cada persona en su campo "turno" (se edita en Ajustes):
//   ciclo1 / ciclo2 / ciclo3 -> tarde en esa semana del ciclo de 3, repitiendo
//   par / impar              -> alterna: tarde en las semanas pares o impares
//   manana / tarde / partido -> turno fijo: se muestra como etiqueta, no se sombrea
//   (vacío)                  -> sin turno definido, no se marca nada
function esTardeTurno(persona, semana){
  const turno = (persona && persona.turno ? String(persona.turno) : "").trim().toLowerCase();
  if (!turno || semana < 1) return false;
  if (turno.startsWith("ciclo")){
    const n = parseInt(turno.slice(5), 10);
    if (!n) return false;
    return (((semana - 1) % 3) + 3) % 3 === (n - 1);
  }
  if (turno === "par")   return semana % 2 === 0;
  if (turno === "impar") return semana % 2 === 1;
  return false;   // los turnos fijos (mañana/tarde/partido) no se sombrean
}
// Etiqueta corta del turno fijo, para mostrarla junto al nombre
const ETIQUETAS_TURNO = { manana:"(mañana)", tarde:"(tarde)", partido:"(j.partida)" };
function etiquetaTurno(p){
  const t = (p && p.turno ? String(p.turno) : "").trim().toLowerCase();
  return ETIQUETAS_TURNO[t] || "";
}

async function arrancarApp(){
  state.esAdminFlag = await Store.isAdmin();   // antes de pintar nada
  document.getElementById("userEmail").textContent = state.user ? state.user.email : "";
  document.getElementById("btnLogout").style.display = Store.usaSupabase ? "inline-block" : "none";
  document.getElementById("btnPass").style.display   = Store.usaSupabase ? "inline-block" : "none";
  document.getElementById("tabUsuarios").style.display = esAdmin() ? "inline-block" : "none";
  moverIndicador();
  await recargar();
  if (!arrancada){
    arrancada = true;
    Store.subscribe(() => recargar());
    // Al entrar se abre por el mes en curso (el año lo sabemos tras recargar)
    const hoy = new Date();
    mesActual = mesSemanas = (hoy.getFullYear() === state.ajustes.year) ? hoy.getMonth() : 0;
    renderCalendario();
  }
}

async function recargar(){
  const data = await Store.loadAll();
  state.personas = (data.personas||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  state.departamentos = (data.departamentos||[]).slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  fijarDepartamento();
  state.ajustes  = data.ajustes;
  state.festivos = data.festivos||[];
  state.festivosSet = new Set(state.festivos.map(f=>f.fecha));
  state.marcas = new Map();
  (data.marcas||[]).forEach(m => state.marcas.set(key(m.persona_id, m.fecha), String(m.valor)));
  document.getElementById("hdrYear").textContent = state.ajustes.year;
  pintarSelectorDep();
  renderTodo();
}

// Elige qué departamento se muestra: el que ya estuviera, si no el propio, si no el primero
function fijarDepartamento(){
  const deps = state.departamentos;
  if (!deps.length){ state.depActual = null; return; }
  if (state.depActual && deps.some(d => d.id === state.depActual)) return;
  const mp = miPersona();
  state.depActual = (mp && mp.departamento_id) ? mp.departamento_id : deps[0].id;
}
// Departamentos que puede ver la cuenta actual: el suyo, o todos si es admin
function depsVisibles(){
  if (esAdmin()) return state.departamentos;
  const mp = miPersona();
  return state.departamentos.filter(d => mp && d.id === mp.departamento_id);
}
function pintarSelectorDep(){
  const sel = document.getElementById("depSelector");
  const cont = document.getElementById("depBox");
  if (!sel) return;
  const visibles = depsVisibles();
  // Con un solo departamento a la vista no hace falta selector
  cont.style.display = visibles.length > 1 ? "flex" : "none";
  sel.innerHTML = visibles.map(d => `<option value="${d.id}">${esc(d.nombre)}</option>`).join("");
  if (visibles.some(d => d.id === state.depActual)) sel.value = state.depActual;
  const d = depById(state.depActual);
  const et = document.getElementById("depNombre");
  if (et) et.textContent = d ? d.nombre : "";
}

// Desliza la barra de acento hasta la pestaña activa
function moverIndicador(){
  const ind = document.getElementById("tabIndicator");
  const activa = document.querySelector(".tab.active");
  if (!ind || !activa) return;
  ind.style.width = activa.offsetWidth + "px";
  ind.style.transform = "translateX(" + activa.offsetLeft + "px)";
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
  const maxFuera = maxFueraDep();
  const personas = personasDep();

  let html = "<thead><tr><th class='persona-col'>Compañero ↓ / Día →</th>";
  for (let d=1; d<=nd; d++) html += `<th>${d}<div class='dow'>${DOW[dowLunes(y,m,d)]}</div></th>`;
  html += "</tr></thead><tbody>";

  personas.forEach(p => {
    const editable = canEdit(p.id);
    const mp = miPersona();
    const esMia = mp && mp.id === p.id;
    const etq = etiquetaTurno(p);
    html += `<tr class='${esMia?"fila-mia":""}'><td class='persona-col'><span class='color-dot' style='background:#${hex(p.color)}'></span>${esc(p.nombre)}${etq?` <span class='etq-turno'>${esc(etq)}</span>`:""}${esMia?" <span class='yo'>(tú)</span>":""}</td>`;
    for (let d=1; d<=nd; d++){
      const f = ymd(y,m,d);
      const v = state.marcas.get(key(p.id, f));
      let cls = "cell" + (editable ? "" : " ro"), style = "", txt = "";
      if (v !== undefined && v !== ""){
        txt = esc(v);
        if (v === "X") style = `background:#${hex(p.color)};color:#fff;`;
        else if (v === "M") style = `background:linear-gradient(135deg,#${hex(p.color)} 50%,#fff 50%);color:#${hex(p.color)};`;
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
    personas.forEach(p => { const v = state.marcas.get(key(p.id,f)); if (v==="X"||v==="M") c++; });
    html += `<td class='${c>maxFuera?"alerta":""}'>${c||""}</td>`;
  }
  html += "</tr>";

  // Fila de horas de trabajo disponibles cada día
  html += `<tr class='horas-row'><td class='persona-col'>Horas disponibles</td>`;
  for (let d=1; d<=nd; d++){
    const h = horasDelEquipo(y,m,d);
    const falta = h.teoricas > 0 && h.disponibles < h.teoricas;
    html += `<td class='${falta?"mermado":""}'>${h.teoricas ? esc(numH(h.disponibles)) : ""}</td>`;
  }
  html += "</tr></tbody>";

  const tabla = document.getElementById("tablaCal");
  tabla.innerHTML = html;
  tabla.querySelectorAll("td.cell").forEach(td =>
    td.addEventListener("dblclick", () => {
      const pid = +td.dataset.pid;
      if (!canEdit(pid)){ toast("Solo puedes editar tus propias vacaciones."); return; }
      abrirModal(pid, td.dataset.fecha);
    }));

  renderHorasSemana();
  populateAnioSelector();
  renderAnio();
}

// Resumen de horas disponibles por semana. Tiene su propio mes y sus propias
// flechas, para poder mirar semanas de más adelante sin mover el calendario.
function renderHorasSemana(){
  const cont = document.getElementById("horasSemana");
  if (!cont) return;
  if (!personasDep().length){ cont.innerHTML = ""; return; }
  const y = state.ajustes.year, m = mesSemanas;
  const semanas = semanasDelMes(y, m);

  let html = `<div class='hs-head'>
      <h4>Horas disponibles por semana</h4>
      <button id='hsPrev' class='nav-btn sm' title='Mes anterior'>◀</button>
      <span class='hs-mes'>${esc(MESES[m])} ${esc(String(y))}</span>
      <button id='hsNext' class='nav-btn sm' title='Mes siguiente'>▶</button>
    </div><div class='semana-cards'>`;
  semanas.forEach(w => {
    const n = w.fuera.length;
    const tit = n ? "De vacaciones esta semana: " + w.fuera.join(", ")
                  : "Esta semana no falta nadie";
    html += `<div class='semana-card hs${nivelSemana(n)}' title="${esc(tit)}">
      <div class='sc-dias'>${esc(etiquetaSemana(w.ini, w.fin))}</div>
      <div class='sc-horas'>${esc(numH(w.disponibles))} h</div>
      <div class='sc-tot'>de ${esc(numH(w.teoricas))} h</div>
      <div class='sc-fuera'>${n ? esc(n === 1 ? "1 persona fuera" : n + " personas fuera") : "equipo completo"}</div>
    </div>`;
  });
  html += "</div>";
  cont.innerHTML = html;
  cont.querySelector("#hsPrev").onclick = () => { mesSemanas = (mesSemanas+11)%12; renderHorasSemana(); };
  cont.querySelector("#hsNext").onclick = () => { mesSemanas = (mesSemanas+1)%12;  renderHorasSemana(); };
}

// ============================================================
//  VISTA ANUAL (12 minicalendarios)
// ============================================================
function populateAnioSelector(){
  const sel = document.getElementById("anioPersona");
  const prev = sel.value;
  sel.innerHTML = `<option value="__todos__">— Todos —</option>` +
    personasDep().map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
  // Por defecto se muestra "Todos"; si el usuario ya eligió algo, se respeta.
  const def = (prev && (prev === "__todos__" || personasDep().some(p=>String(p.id)===prev))) ? prev : "__todos__";
  sel.value = def;
}
function renderAnio(){
  const sel = document.getElementById("anioPersona");
  const modoTodos = sel.value === "__todos__";
  const pid = modoTodos ? null : +sel.value;
  const p = modoTodos ? null : personaById(pid);
  const cont = document.getElementById("anioGrid");
  if (!modoTodos && !p){ cont.innerHTML = ""; return; }
  const y = state.ajustes.year;
  const hoyStr = fmt(new Date());
  let html = "";
  for (let m=0; m<12; m++){
    html += `<div class='mini-mes'><h4 style='background:#${MESCOLORS[m]}'>${MESES[m]}</h4>`;
    html += "<table class='mini-tabla'><thead><tr>" + DOW.map(d=>`<th>${d}</th>`).join("") + "</tr></thead><tbody>";
    const nd = diasDelMes(y,m), first = dowLunes(y,m,1);
    let day = 1;
    for (let row=0; row<6 && day<=nd; row++){
      html += "<tr>";
      for (let c=0; c<7; c++){
        if ((row===0 && c<first) || day>nd){ html += "<td></td>"; continue; }
        const f = ymd(y,m,day);
        let cls = "", style = "", title = "";
        if (modoTodos){
          // El círculo se reparte entre los colores de quienes están fuera ese día
          const quienes = quienesFuera(f);
          if (quienes.length){
            cls = "dia-x";
            title = esc(quienes.map(q=>q.nombre).join(", "));
            if (quienes.length === 1){
              style = `background:#${hex(quienes[0].color)}`;
            } else if (quienes.length === 2){
              style = `background:linear-gradient(90deg,#${hex(quienes[0].color)} 0 50%,#${hex(quienes[1].color)} 50% 100%)`;
            } else {
              const segs = quienes.map((q,i) =>
                `#${hex(q.color)} ${Math.round(i*360/quienes.length)}deg ${Math.round((i+1)*360/quienes.length)}deg`).join(",");
              style = `background:conic-gradient(${segs})`;
            }
          }
          else if (esFestivo(f)) cls = "festivo";
          else if (esFinde(y,m,day)) cls = "finde";
        } else {
          const v = state.marcas.get(key(pid,f));
          if (v === "X"){ cls = "dia-x"; style = `background:#${hex(p.color)}`; }
          else if (v === "M"){ cls = "dia-m"; style = `color:#${hex(p.color)}`; }
          else if (v !== undefined && v !== ""){ cls = "dia-h"; }
          else if (esFestivo(f)) cls = "festivo";
          else if (esFinde(y,m,day)) cls = "finde";
          else if (esTardeTurno(p, semanaCuadrante(y,m,day))) cls = "tarde";
        }
        if (f === hoyStr) cls += " hoy";
        html += `<td class='${cls}' data-fecha='${f}'${title ? ` title="${title}"` : ""}><span class='d' style='${style}'>${day}</span></td>`;
        day++;
      }
      html += "</tr>";
    }
    html += "</tbody></table></div>";
  }
  cont.innerHTML = html;

  // doble clic en un día -> abrir el modal con esa fecha
  cont.querySelectorAll("td[data-fecha]").forEach(td => {
    td.addEventListener("dblclick", () => {
      if (modoTodos){
        const mp = miPersona();
        abrirModal(mp ? mp.id : null, td.dataset.fecha);
        return;
      }
      if (!canEdit(pid)){ toast("Solo puedes editar tus propias vacaciones."); return; }
      abrirModal(pid, td.dataset.fecha);
    });
  });
}

// ============================================================
//  RESUMEN
// ============================================================
function renderResumen(){
  const acc = {};
  const personas = personasDep();
  personas.forEach(p => acc[p.id] = { mes:Array(12).fill(0), dias:0, horas:0 });
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
  personas.forEach(p => {
    const a = acc[p.id];
    html += `<tr><td class='nombre'><span class='color-dot' style='background:#${hex(p.color)}'></span>${esc(p.nombre)}</td>`;
    a.mes.forEach(x => html += `<td>${x||""}</td>`);
    const rest = p.dias_anuales - a.dias, hrest = p.bolsa_horas - a.horas;
    html += `<td class='sep'><b>${a.dias}</b></td><td>${p.dias_anuales}</td><td class='${rest<0?"neg":""}'>${rest}</td>`;
    html += `<td class='sep'>${a.horas}</td><td>${p.bolsa_horas}</td><td class='${hrest<0?"neg":""}'>${hrest}</td></tr>`;
  });
  html += "</tbody>";
  document.getElementById("tablaResumen").innerHTML = html;

  let tDias=0,tHoras=0,activos=0; const cargaMes=Array(12).fill(0);
  personas.forEach(p => { const a=acc[p.id]; tDias+=a.dias; tHoras+=a.horas; if(a.dias||a.horas) activos++; a.mes.forEach((x,i)=>cargaMes[i]+=x); });
  const idxMax = cargaMes.indexOf(Math.max(...cargaMes));
  const mesMax = Math.max(...cargaMes)>0 ? MESES[idxMax] : "—";
  document.getElementById("statsBox").innerHTML = `
    <div class='stat-card'><div class='n'>${tDias}</div><div class='l'>Días totales cogidos</div></div>
    <div class='stat-card'><div class='n'>${tHoras}</div><div class='l'>Horas totales usadas</div></div>
    <div class='stat-card'><div class='n'>${activos}/${personas.length}</div><div class='l'>Compañeros activos</div></div>
    <div class='stat-card'><div class='n'>${mesMax}</div><div class='l'>Mes más cargado</div></div>`;
}

// ============================================================
//  AJUSTES
// ============================================================
function renderAjustes(){
  const isAdm = esAdmin();
  document.getElementById("ajYear").value = state.ajustes.year;
  document.getElementById("ajMaxFuera").value = state.ajustes.max_fuera;
  document.getElementById("ajHorasDia").value = state.ajustes.horas_por_dia;

  // bloques solo-admin
  document.getElementById("blockParams").style.display = isAdm ? "block" : "none";
  document.getElementById("blockFestivos").style.display = isAdm ? "block" : "none";
  document.getElementById("addPersonaRow").style.display = isAdm ? "flex" : "none";
  const dep = depById(state.depActual);
  const elDep = document.getElementById("ajDepNombre");
  if (elDep) elDep.textContent = dep ? dep.nombre : "—";
  const elMax = document.getElementById("ajMaxFuera");
  if (elMax && dep) elMax.value = dep.max_fuera != null ? dep.max_fuera : state.ajustes.max_fuera;
  document.getElementById("notaPersonas").textContent = isAdm
    ? "Solo se muestran los compañeros de " + (dep ? dep.nombre : "este departamento") + ". El email vincula a cada uno con su cuenta y el horario son las horas de lunes a viernes."
    : "Solo puedes editar tu propia fila, incluido tu horario (las horas de lunes a viernes).";

  // personas
  const TURNOS = [
    { v:"",        t:"Sin definir" },
    { v:"manana",  t:"Fijo: siempre mañana" },
    { v:"tarde",   t:"Fijo: siempre tarde" },
    { v:"partido", t:"Fijo: horario partido" },
    { v:"par",     t:"Alterna: tarde en semanas pares" },
    { v:"impar",   t:"Alterna: tarde en semanas impares" },
    { v:"ciclo1",  t:"Ciclo de 3: tarde la semana 1" },
    { v:"ciclo2",  t:"Ciclo de 3: tarde la semana 2" },
    { v:"ciclo3",  t:"Ciclo de 3: tarde la semana 3" }
  ];
  let ph = "<thead><tr><th>Nombre</th><th>Email (cuenta)</th><th>Turno</th><th>Horario (L,M,X,J,V)</th><th>Color</th><th>Días anuales</th><th>Bolsa horas</th><th></th></tr></thead><tbody>";
  personasDep().forEach(p => {
    const editable = canEdit(p.id);
    const dis = editable ? "" : "disabled";
    const emailDis = isAdm ? "" : "disabled"; // el email y el turno solo los gestiona el admin
    const turnoAct = (p.turno||"").toLowerCase();
    const opts = TURNOS.map(o => `<option value="${o.v}"${o.v===turnoAct?" selected":""}>${o.t}</option>`).join("");
    ph += `<tr data-id="${p.id}">
      <td><input class="e-nombre" value="${esc(p.nombre)}" ${dis}></td>
      <td><input class="e-email" value="${esc(p.email||"")}" placeholder="email@..." style="width:160px" ${emailDis}></td>
      <td><select class="e-turno" ${emailDis}>${opts}</select></td>
      <td><input class="e-horario" value="${esc(p.horario||"")}" placeholder="8,8,8,8,8" style="width:120px" ${dis}></td>
      <td><input class="e-color" value="${esc(p.color)}" maxlength="6" style="width:80px" ${dis}> <span class="color-dot" style="background:#${hex(p.color)}"></span></td>
      <td><input class="e-dias" type="number" value="${p.dias_anuales}" style="width:70px" ${dis}></td>
      <td><input class="e-horas" type="number" value="${p.bolsa_horas}" style="width:70px" ${dis}></td>
      <td>${editable ? `<button class="ghost-btn sm btn-save-p">Guardar</button>` : ""}${isAdm ? ` <button class="danger-btn sm btn-del-p">Borrar</button>` : ""}</td>
    </tr>`;
  });
  ph += "</tbody>";
  const tp = document.getElementById("tablaPersonas");
  tp.innerHTML = ph;
  tp.querySelectorAll(".btn-save-p").forEach(b => b.onclick = e => guardarPersona(+e.target.closest("tr").dataset.id));
  tp.querySelectorAll(".btn-del-p").forEach(b => b.onclick = e => borrarPersona(+e.target.closest("tr").dataset.id));

  // festivos (lista visible para todos; añadir/borrar solo admin)
  let fh = "<thead><tr><th>Fecha</th><th>Nombre</th><th></th></tr></thead><tbody>";
  state.festivos.forEach(f => {
    fh += `<tr data-fecha="${esc(f.fecha)}"><td>${esc(f.fecha)}</td><td>${esc(f.nombre||"")}</td>
      <td>${isAdm ? `<button class="danger-btn sm btn-del-f">Borrar</button>` : ""}</td></tr>`;
  });
  fh += "</tbody>";
  const tf = document.getElementById("tablaFestivos");
  tf.innerHTML = fh;
  tf.querySelectorAll(".btn-del-f").forEach(b => b.onclick = e => borrarFestivo(e.target.closest("tr").dataset.fecha));
}

async function guardarParams(){
  const obj = {
    year:+document.getElementById("ajYear").value,
    horas_por_dia:+document.getElementById("ajHorasDia").value
  };
  await Store.setAjustes(obj);
  // El máximo de personas fuera es propio de cada departamento
  const maxF = +document.getElementById("ajMaxFuera").value;
  if (state.depActual) await Store.updateDepartamento(state.depActual, { max_fuera: maxF });
  const dep = depById(state.depActual);
  await log("ajustes", `Parámetros: año=${obj.year}, horas/día=${obj.horas_por_dia}, máx fuera en ${dep?dep.nombre:"?"}=${maxF}`);
  await recargar(); renderAjustes(); toast("Parámetros guardados");
}
async function guardarPersona(id){
  if (!canEdit(id)){ toast("Solo puedes editar tu propia fila."); return; }
  const tr = document.querySelector(`#tablaPersonas tr[data-id="${id}"]`);
  const fields = {
    nombre: tr.querySelector(".e-nombre").value.trim(),
    color:  tr.querySelector(".e-color").value.trim().replace("#",""),
    dias_anuales: +tr.querySelector(".e-dias").value,
    bolsa_horas:  +tr.querySelector(".e-horas").value
  };
  // El horario lo ajusta cada uno en su propia fila; el email y el turno, solo el admin
  fields.horario = tr.querySelector(".e-horario").value.trim();
  if (esAdmin()){
    fields.email = tr.querySelector(".e-email").value.trim();
    fields.turno = tr.querySelector(".e-turno").value;
  }
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
  if (!esAdmin()){ toast("Solo el administrador puede añadir compañeros."); return; }
  const nombre = document.getElementById("npNombre").value.trim();
  if (!nombre){ toast("Pon un nombre"); return; }
  const email = document.getElementById("npEmail").value.trim();
  const color = (document.getElementById("npColor").value.trim()||"4472C4").replace("#","");
  const dias = +document.getElementById("npDias").value || 22;
  const horas = +document.getElementById("npHoras").value || 0;
  const orden = (state.personas.reduce((m,p)=>Math.max(m,p.orden||0),0))+1;
  const departamento_id = state.depActual;
  await Store.addPersona({ nombre, email, color, dias_anuales:dias, bolsa_horas:horas, orden, departamento_id });
  await log("persona", `Añadido compañero: ${nombre}`);
  document.getElementById("npNombre").value=""; document.getElementById("npEmail").value=""; document.getElementById("npColor").value="";
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
    html += `<tr><td>${esc(fecha)}</td><td>${esc(l.usuario||"")}</td><td>${esc(l.accion)}</td><td style="text-align:left">${esc(l.detalle||"")}</td></tr>`;
  });
  html += "</tbody>";
  document.getElementById("tablaLogs").innerHTML = html;
}
function log(accion, detalle){
  const u = state.user ? state.user.email : "(local)";
  return Store.addLog(u, accion, detalle);
}

// ============================================================
//  USUARIOS (panel de admin)
// ============================================================
function generarPass(n = 10){
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = ""; for (let i=0;i<n;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}
async function crearUsuario(){
  const msg = document.getElementById("nuMsg"); msg.className = "user-msg"; msg.textContent = "";
  const email = document.getElementById("nuEmail").value.trim();
  const pass = document.getElementById("nuPass").value;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ msg.textContent = "Email no válido."; return; }
  if (pass.length < 6){ msg.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
  const btn = document.getElementById("btnCrearUsuario"); btn.disabled = true; btn.textContent = "Creando...";
  const r = await Store.createUser(email, pass);
  btn.disabled = false; btn.textContent = "Crear cuenta";
  if (!r.ok){ msg.textContent = "No se pudo crear: " + r.msg; return; }
  await Store.addPerfil(email);
  await log("usuario", `Cuenta creada: ${email}`);
  msg.className = "user-msg ok";
  msg.innerHTML = r.needsConfirm
    ? `⚠️ Cuenta creada, pero Supabase pide <b>confirmar el email</b>. Desactiva esa opción (ver instrucciones) para que pueda entrar directamente.`
    : `✅ Cuenta creada. Comparte estos datos:<br><b>Email:</b> ${esc(email)} &nbsp; <b>Contraseña:</b> ${esc(pass)}`;
  document.getElementById("nuEmail").value = ""; document.getElementById("nuPass").value = "";
  renderUsuarios();
}
async function renderUsuarios(){
  const perfiles = await Store.loadPerfiles();
  let html = "<thead><tr><th>Email</th><th>Creada</th></tr></thead><tbody>";
  if (!perfiles.length) html += "<tr><td colspan='2'>Aún no has creado cuentas desde aquí.</td></tr>";
  perfiles.forEach(p => html += `<tr><td>${esc(p.email)}</td><td>${esc(p.creado?new Date(p.creado).toLocaleString("es-ES"):"")}</td></tr>`);
  html += "</tbody>";
  document.getElementById("tablaUsuarios").innerHTML = html;
}

// ============================================================
//  AYUDA — cómo se usa la aplicación
//  Se pinta distinto según quién entre: lo que ve todo el mundo y, si la
//  cuenta es de administrador, un bloque extra con lo que solo él puede hacer.
// ============================================================
const AYUDA_TODOS = [
  ["Entrar y cambiar la contraseña",
   ["Entras con tu <b>email</b> y tu <b>contraseña</b>. La primera vez te la damos nosotros.",
    "Cámbiala cuanto antes con el botón <b>«Cambiar contraseña»</b> de arriba a la derecha. Mínimo 6 caracteres.",
    "Si se te olvida, pídesela al administrador: él puede restablecerla."]],
  ["Pedir vacaciones u horas",
   ["Botón <b>«+ Pedir vacaciones / horas»</b>, o <b>doble clic</b> en un día del calendario (también en los calendarios pequeños de la vista anual).",
    "<b>Día(s) entero(s)</b>: marca de golpe todo un rango de fechas. Se salta findes y festivos.",
    "<b>Medio día</b> y <b>Horas de exceso</b>: solo para un día suelto.",
    "Para quitar días, abre la misma ventana con esas fechas y pulsa <b>«Borrar día(s)»</b>."]],
  ["Qué significa cada marca",
   ["<b>X</b> = día entero de vacaciones, con tu color.",
    "<b>M</b> = medio día (el cuadro sale partido en diagonal).",
    "Un <b>número</b> = horas sueltas que gastas ese día.",
    "La fila <b>«Personas fuera»</b> se pone en rojo si ese día se pasa del máximo permitido en tu departamento."]],
  ["Solo puedes tocar lo tuyo",
   ["Tu fila aparece resaltada y con la palabra <b>(tú)</b>.",
    "Puedes marcar y borrar <b>únicamente tus días</b>. Si intentas cambiar los de otro, la aplicación no te deja.",
    "Esto no es solo la pantalla: el permiso está puesto en la base de datos, así que no hay forma de saltárselo."]],
  ["Vista anual",
   ["El selector <b>«— Todos —»</b> enseña de un vistazo quién está fuera cada día: si falta una persona el círculo sale de su color, y si faltan varias se reparte entre los colores de cada una.",
    "Pon el cursor encima de un día y te dice <b>los nombres</b> de quienes están de vacaciones.",
    "El día de <b>hoy</b> lleva un borde rojo, y las semanas de <b>turno de tarde</b> salen sombreadas en gris."]],
  ["Horas disponibles por semana",
   ["Cada tarjeta es una <b>semana completa de lunes a viernes</b>, aunque empiece en un mes y acabe en el siguiente.",
    "Enseña las horas que le quedan al equipo frente a las que tendría a pleno rendimiento.",
    "El color avisa de un vistazo: <b>amarillo</b> si esa semana falta una persona, <b>naranja</b> si faltan dos y <b>rojo</b> si faltan tres o más.",
    "Con las <b>flechas ◀ ▶</b> de ese bloque puedes mirar los meses siguientes sin mover el calendario de arriba."]],
  ["Resumen",
   ["Te dice cuántos <b>días y horas has gastado</b> y cuántos te quedan.",
    "Si ves un número raro, mira primero tus días anuales y tu bolsa de horas en <b>Ajustes</b>."]],
  ["Ajustes: lo que puedes cambiar tú",
   ["De <b>tu propia fila</b>: el nombre, el color, los días anuales, la bolsa de horas y tu horario de lunes a viernes.",
    "El <b>horario</b> se escribe con las horas de cada día separadas por comas. Por ejemplo <code>8,8,8,8,8</code> son 40 horas, y <code>8.5,8.5,8.5,8.5,6</code> es una jornada partida.",
    "El <b>email</b>, el <b>turno</b> y el <b>departamento</b> solo los cambia el administrador."]],
  ["Registro",
   ["Queda apuntado <b>quién ha hecho cada cosa y cuándo</b>: entradas, cambios de contraseña, días pedidos y días borrados.",
    "Está a la vista de todos a propósito, para que no haya dudas si algo cambia."]]
];

const AYUDA_ADMIN = [
  ["Parámetros generales",
   ["En <b>Ajustes</b> puedes cambiar el <b>año</b>, las <b>horas por día completo</b> y el <b>máximo de personas fuera a la vez</b>.",
    "Ese máximo es <b>propio de cada departamento</b>: cambia el selector de arriba y ajusta el de cada uno por separado."]],
  ["Compañeros",
   ["Puedes editar <b>la fila de cualquiera</b>, no solo la tuya, y además el email, el turno, el departamento y las fechas de alta y baja.",
    "El <b>turno</b> marca las semanas de tarde en la vista anual: <code>ciclo1</code>, <code>ciclo2</code> y <code>ciclo3</code> rotan cada tres semanas; <code>par</code> e <code>impar</code> alternan; <code>mañana</code>, <code>tarde</code> y <code>partido</code> son fijos y salen como etiqueta junto al nombre.",
    "La <b>fecha de baja</b> es mejor que borrar a alguien: deja de contar a partir de ese día pero se conserva su histórico."]],
  ["Festivos",
   ["Se añaden y se quitan desde <b>Ajustes</b>. Un festivo no gasta vacaciones y no cuenta horas."]],
  ["Crear cuentas",
   ["Pestaña <b>Usuarios</b>: pon el email, genera una contraseña y comparte los dos datos con esa persona.",
    "Después, en <b>Ajustes</b>, escribe ese mismo email en la fila del compañero: es lo que une la cuenta con su fila del calendario.",
    "Para <b>restablecer una contraseña</b> olvidada o <b>borrar una cuenta</b>, entra en Supabase → Authentication → Users."]],
  ["Hacer administrador a alguien",
   ["Se decide en la tabla <code>admins</code> de la base de datos, no en el código.",
    "En Supabase → SQL Editor: <code>insert into admins (email) values ('correo@ejemplo.com');</code>",
    "Quitarlo: <code>delete from admins where email = 'correo@ejemplo.com';</code>"]],
  ["Departamentos",
   ["El selector <b>«Departamento»</b> de arriba solo lo ves tú y quien sea administrador: los demás ven únicamente el suyo.",
    "Todo lo que hay debajo (calendario, resumen, horas por semana y vista anual) es del departamento que tengas elegido en ese momento."]]
];

function bloqueAyuda(secciones){
  return secciones.map(([titulo, puntos]) =>
    `<div class='ayuda-sec'><h4>${esc(titulo)}</h4><ul>` +
    puntos.map(t => `<li>${t}</li>`).join("") +
    `</ul></div>`).join("");
}

function renderAyuda(){
  const cont = document.getElementById("ayudaBox");
  if (!cont) return;
  const admin = esAdmin();
  let html = `<div class='ayuda-quien ${admin ? "admin" : ""}'>
      ${admin ? "🔑 Estás dentro como <b>administrador</b>: puedes cambiar los datos de todo el mundo."
              : "👤 Estás dentro como <b>usuario</b>: puedes ver el calendario entero, pero solo cambiar lo tuyo."}
    </div>`;
  html += `<div class='ajustes-block'><h3>Cómo se usa</h3>${bloqueAyuda(AYUDA_TODOS)}</div>`;
  if (admin){
    html += `<div class='ajustes-block ayuda-admin'>
      <h3>Solo para administradores</h3>
      <p class='muted-note'>Esto no lo ve nadie más: solo aparece en las cuentas que están en la tabla <code>admins</code>.</p>
      ${bloqueAyuda(AYUDA_ADMIN)}</div>`;
  }
  html += `<div class='ajustes-block'><h3>¿Algo no cuadra?</h3><ul class='ayuda-final'>
      <li>Si ves datos viejos, recarga la página con <b>Ctrl + Mayús + R</b>.</li>
      <li>Si no te deja cambiar algo, seguramente no es tuyo: mira que la fila lleve el <b>(tú)</b>.</li>
      <li>Para cualquier otra cosa, habla con el administrador.</li>
    </ul></div>`;
  cont.innerHTML = html;
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
  const mp = miPersona();
  // No-admin: solo puede operar sobre su propia persona
  const lista = (Store.usaSupabase && !esAdmin()) ? (mp ? [mp] : []) : personasDep();
  mPersona.innerHTML = lista.map(p=>`<option value="${p.id}">${esc(p.nombre)}</option>`).join("");
  mPersona.disabled = (Store.usaSupabase && !esAdmin());

  const sinPersona = lista.length === 0;
  document.getElementById("mGuardar").disabled = sinPersona;
  document.getElementById("mBorrar").disabled = sinPersona;
  if (sinPersona){
    modalMsg.textContent = "Tu cuenta no está vinculada a ningún compañero. Pide al administrador que ponga tu email en Ajustes.";
  }

  if (pidPre && lista.some(p=>p.id===pidPre)) mPersona.value = pidPre;
  else if (mp && lista.some(p=>p.id===mp.id)) mPersona.value = mp.id;
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
  if (!canEdit(pid)){ modalMsg.textContent = "Solo puedes editar tus propias vacaciones."; return; }
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
  if (!canEdit(pid)){ modalMsg.textContent = "Solo puedes editar tus propias vacaciones."; return; }
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
  let c=0; personasDep().forEach(p => { if (p.id===exclPid) return; const v=state.marcas.get(key(p.id,fecha)); if (v==="X"||v==="M") c++; });
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
  // portada <-> aplicación
  document.querySelectorAll(".entrar-app").forEach(b => b.onclick = entrarEnLaApp);
  const volver = document.getElementById("volverPortada");
  if (volver) volver.onclick = () => mostrarVista("portada");
  const btnPortada = document.getElementById("btnPortada");
  if (btnPortada) btnPortada.onclick = () => mostrarVista("portada");

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

  // navegación mes (las tarjetas de horas siguen al calendario, pero luego
  // se pueden mover por su cuenta con sus propias flechas)
  const irAlMes = m => { mesActual = m; mesSemanas = m; renderCalendario(); };
  document.getElementById("btnPrev").onclick = () => irAlMes((mesActual+11)%12);
  document.getElementById("btnNext").onclick = () => irAlMes((mesActual+1)%12);
  document.getElementById("btnHoy").onclick = () => { const h=new Date(); irAlMes((h.getFullYear()===state.ajustes.year)?h.getMonth():0); };
  document.getElementById("anioPersona").onchange = renderAnio;
  window.addEventListener("resize", moverIndicador);

  // cambiar de departamento
  const depSel = document.getElementById("depSelector");
  if (depSel) depSel.onchange = e => {
    state.depActual = +e.target.value;
    const d = depById(state.depActual);
    pintarSelectorDep();
    renderTodo();
    const activa = document.querySelector(".tab.active")?.dataset.tab;
    if (activa === "ajustes") renderAjustes();
    if (d) toast("Viendo: " + d.nombre);
  };

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

  // usuarios (admin)
  document.getElementById("btnCrearUsuario").onclick = crearUsuario;
  document.getElementById("btnGenPass").onclick = () => document.getElementById("nuPass").value = generarPass();

  // pestañas
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("tab-"+tab.dataset.tab).classList.add("active");
      moverIndicador();
      if (tab.dataset.tab==="resumen") renderResumen();
      if (tab.dataset.tab==="ajustes") renderAjustes();
      if (tab.dataset.tab==="usuarios") renderUsuarios();
      if (tab.dataset.tab==="registro") renderLogs();
      if (tab.dataset.tab==="ayuda")    renderAyuda();
    };
  });
}

init();
