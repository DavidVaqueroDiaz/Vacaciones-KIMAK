// ============================================================
//  PORTADA — tema, corte de la madera y aparición al bajar
//  El motor de corte es el de la landing de KLIN. La única diferencia
//  es que aquí la madera se dibuja por código (no hay foto que cargar),
//  y que también funciona con el dedo, no solo con el ratón.
// ============================================================

/* ====== TEMA ====== */
// Hay un interruptor en la portada y otro dentro de la aplicación: los dos
// llaman aquí, así que el tema elegido vale para las dos pantallas.
(function(){
  const root = document.documentElement;
  const SUN  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  let guardado = null;
  try { guardado = localStorage.getItem("vac-theme"); } catch(e){}
  if (guardado === "light" || guardado === "dark") root.setAttribute("data-theme", guardado);
  function pintar(){
    const icono = root.getAttribute("data-theme")==="dark" ? MOON : SUN;
    document.querySelectorAll(".toggle .knob").forEach(k => k.innerHTML = icono);
  }
  function alternar(){
    const n = root.getAttribute("data-theme")==="dark" ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("vac-theme", n); } catch(e){}
    pintar();
  }
  window.Tema = { pintar, alternar };
  document.querySelectorAll(".toggle").forEach(t => t.onclick = alternar);
  pintar();
  const header = document.getElementById("header");
  if (header) addEventListener("scroll", () => header.classList.toggle("scrolled", scrollY>30), {passive:true});
})();

/* ====== HÉROE · tablón de madera que se corta al pasar por encima ====== */
(function(){
  const cv = document.getElementById("heroFx"), wcv = document.getElementById("heroWood");
  if (!cv || !wcv) return;
  const ctx = cv.getContext("2d"), wctx = wcv.getContext("2d");
  const hero = document.querySelector(".hero");
  // si el navegador no da lienzo, la portada se queda sin madera pero funciona
  if (!ctx || !wctx || !hero) return;
  let sh = [], falling = [];
  const ri  = (a,b) => Math.random()*(b-a)+a;
  const rii = (a,b) => Math.floor(ri(a,b+1));

  // ---------- la madera, dibujada a mano en un lienzo aparte ----------
  // Se hace una sola vez y se guarda: de ahí se recortan luego los trozos que caen.
  const WW = 1600, WH = 500;               // proporción del tablón (ancho x alto)
  const wood = document.createElement("canvas");
  wood.width = WW; wood.height = WH;
  (function pintarTablon(){
    const g = wood.getContext("2d");
    const TABLAS = 4, alto = WH/TABLAS;
    const bases = ["#8a5e36","#7c5226","#946535","#6e4a26"];
    for (let t=0; t<TABLAS; t++){
      const y0 = t*alto;
      // fondo de la tabla, con un degradado suave de lado a lado
      const lg = g.createLinearGradient(0, y0, WW, y0+alto);
      lg.addColorStop(0, bases[t % bases.length]);
      lg.addColorStop(.5, "#9c6b3a");
      lg.addColorStop(1, bases[(t+2) % bases.length]);
      g.fillStyle = lg; g.fillRect(0, y0, WW, alto);
      // veta: líneas onduladas que recorren la tabla
      const vetas = 26 + Math.floor(Math.random()*10);
      for (let v=0; v<vetas; v++){
        const y = y0 + (v+.5)*(alto/vetas);
        const amp = 2 + Math.random()*7, per = 180 + Math.random()*320, des = Math.random()*6.28;
        g.beginPath();
        for (let x=0; x<=WW; x+=8){
          const yy = y + Math.sin(x/per + des)*amp;
          x ? g.lineTo(x, yy) : g.moveTo(x, yy);
        }
        g.strokeStyle = Math.random() < .5 ? "rgba(70,44,20,.30)" : "rgba(214,175,124,.20)";
        g.lineWidth = .6 + Math.random()*1.5;
        g.stroke();
      }
      // algún nudo suelto
      for (let k=0, n=1+Math.floor(Math.random()*2); k<n; k++){
        const cx = 120 + Math.random()*(WW-240), cy = y0 + alto*(.3+Math.random()*.4);
        const rx = 12 + Math.random()*16, ry = rx*(.55+Math.random()*.3);
        for (let a=6; a>=1; a--){
          g.beginPath();
          g.ellipse(cx, cy, rx*a/6, ry*a/6, Math.random()*.6, 0, 6.283);
          g.strokeStyle = "rgba(58,36,16," + (.16+a*.06) + ")";
          g.lineWidth = 1.4; g.stroke();
        }
      }
      // junta entre tablas
      g.fillStyle = "rgba(35,21,9,.55)"; g.fillRect(0, y0+alto-3, WW, 3);
      g.fillStyle = "rgba(226,192,146,.16)"; g.fillRect(0, y0, WW, 1.5);
    }
    // sombra por abajo, para que el canto no quede plano
    const vg = g.createLinearGradient(0, WH*.72, 0, WH);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)");
    g.fillStyle = vg; g.fillRect(0, WH*.72, WW, WH*.28);
  })();

  // La madera buena es la foto del taller. Se busca por este orden:
  //   1) window.WOOD_SRC  -> lo define IMG/madera3.js, que lleva la foto
  //      convertida a texto. Es el único que funciona también al abrir el
  //      archivo con doble clic (file://), porque así leer los píxeles no
  //      está prohibido y el corte sale fino.
  //   2) IMG/madera3.png  -> la foto normal. Vale servida desde la web.
  //   3) si no hay ninguna de las dos, se queda el tablón dibujado por código,
  //      que se ha pintado justo arriba. La portada nunca se ve vacía.
  let woodOK = true;
  (function cargarMaderaReal(){
    const fuentes = [];
    if (window.WOOD_SRC) fuentes.push(window.WOOD_SRC);
    fuentes.push("IMG/madera3.png");
    let i = 0;
    (function probar(){
      if (i >= fuentes.length) return;      // se queda el tablón dibujado por código
      const img = new Image();
      img.onload = () => {
        wood.width = img.width; wood.height = img.height;
        const g = wood.getContext("2d");
        g.clearRect(0, 0, wood.width, wood.height);
        g.drawImage(img, 0, 0);
        resize();
      };
      img.onerror = () => { i++; probar(); };
      img.src = fuentes[i];
    })();
  })();

  let cv0 = {ox:0, oy:0, s:1};
  // CELL = rejilla invisible (detección); RC = grosor visible de la línea.
  // RM (corte en la rejilla) debe IGUALAR a RC: si la rejilla corta menos que lo
  // que se borra, quedan celdas "fantasma" que impiden separar el trozo.
  const CELL = 4, RC = 6.5, RM = 6.5;
  let cols = 0, rows = 0, mask = null, lab = null, dirty = false, lastDetach = 0;

  // la madera va SOLO en la franja de arriba: a todo el ancho y con su proporción real
  function paintWood(){
    const W = wcv.width;
    cv0 = {ox:0, oy:0, s:W/wood.width};
    wctx.clearRect(0, 0, wcv.width, wcv.height);
    wctx.globalAlpha = 1;
    wctx.drawImage(wood, 0, 0, wood.width*cv0.s, wood.height*cv0.s);
  }
  // la rejilla se construye desde el alfa: solo hay "madera" donde el píxel es opaco
  function buildMask(){
    cols = Math.ceil(wcv.width/CELL); rows = Math.ceil(wcv.height/CELL);
    mask = new Uint8Array(cols*rows); lab = new Int32Array(cols*rows);
    if (!woodOK) return;
    const W = wcv.width, H = wcv.height;
    let img = null;
    try { img = wctx.getImageData(0, 0, W, H).data; } catch(e){ img = null; }
    if (img){
      for (let r=0; r<rows; r++){
        const py = Math.min(H-1, r*CELL+(CELL>>1));
        for (let c=0; c<cols; c++){
          const pxx = Math.min(W-1, c*CELL+(CELL>>1));
          if (img[(py*W+pxx)*4+3] > 40) mask[r*cols+c] = 1;
        }
      }
    } else {
      const bandBottom = wood.height*cv0.s;   // reserva mínima si getImageData fallara
      for (let r=0; r<rows && r*CELL<=bandBottom; r++)
        for (let c=0; c<cols; c++) mask[r*cols+c] = 1;
    }
    // empuja el contenido del héroe por debajo de los tablones
    let lastWoodRow = 0;
    for (let r=rows-1; r>=0; r--){
      const base = r*cols; let any = false;
      for (let c=0; c<cols; c++){ if (mask[base+c]){ any = true; break; } }
      if (any){ lastWoodRow = r; break; }
    }
    const finMadera = (lastWoodRow+1)*CELL;
    hero.style.paddingTop = (finMadera + 48) + "px";
    // la firma se esconde en la parte baja del tablón, justo encima del título:
    // es lo último que aparece según vas recortando
    const credito = document.getElementById("credito");
    if (credito) credito.style.top = Math.round(finMadera*0.72) + "px";
  }
  // ---------- el serrín cae por toda la portada y se amonta abajo ----------
  // Las partículas se guardan en coordenadas de PÁGINA. El lienzo va fijo a la
  // pantalla, así que al pintar se les resta el scroll. Lo que ya ha caído no
  // se sigue simulando: se estampa de una vez en el lienzo del montón.
  const ALTO_PILA = 300, COL = 6, VMAX = 12, MAX_VIRUTAS = 700;
  const pilaCv = document.createElement("canvas");
  let pctx = null, altura = null, colsPila = 0, hayPila = false;
  let sueloY = 0, heroOff = {x:0, y:0};

  function medirPortada(){
    const r = hero.getBoundingClientRect();
    heroOff = {x: r.left + scrollX, y: r.top + scrollY};
    sueloY = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    ) - 4;
  }
  function prepararPila(){
    pilaCv.width = Math.max(1, innerWidth); pilaCv.height = ALTO_PILA;
    pctx = pilaCv.getContext("2d");
    colsPila = Math.ceil(pilaCv.width/COL) + 1;
    altura = new Float32Array(colsPila);
    hayPila = false;
  }
  const techoPila = () => sueloY - ALTO_PILA;
  function alturaEn(px){
    if (!altura) return 0;
    const c = Math.max(0, Math.min(colsPila-1, Math.floor(px/COL)));
    return altura[c];
  }
  // al posarse algo, el montón sube en esa zona: así crece en cerros y no plano
  function subirPila(px, cuanto, ancho){
    if (!altura) return;
    const c0 = Math.floor((px-ancho/2)/COL), c1 = Math.floor((px+ancho/2)/COL);
    for (let c=c0; c<=c1; c++){
      if (c<0 || c>=colsPila) continue;
      altura[c] = Math.min(ALTO_PILA-12, altura[c] + cuanto);
    }
  }

  function resize(){
    const r = hero.getBoundingClientRect();
    cv.width = innerWidth; cv.height = innerHeight;   // el de las virutas: la pantalla
    wcv.width = r.width;   wcv.height = r.height;     // el de la madera: el héroe
    paintWood(); buildMask();
    prepararPila(); medirPortada();
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("scroll", medirPortada, {passive:true});

  const wl = ["#efe0c4","#e7cfa3","#dcbf92","#e0c8a0","#f0e3c8"];  // luz de la viruta
  const wd = ["#a9762f","#8a5e36","#6e4a26","#9c6b3a","#7c5226"];  // sombra/borde
  // 6 diseños de viruta distintos que se van alternando
  const TPL = [
    ()=>{const s=22,tn=ri(1.2,2.1),r0=ri(7,12),p=[];for(let i=0;i<=s;i++){const t=i/s,a=tn*6.283*t,r=r0*(1-0.55*t);p.push([Math.cos(a)*r,Math.sin(a)*r]);}return{pts:p,w:ri(3,5)};},
    ()=>{const s=12,r=ri(8,14),p=[];for(let i=0;i<=s;i++){const a=Math.PI*(i/s)-Math.PI/2;p.push([Math.cos(a)*r,Math.sin(a)*r]);}return{pts:p,w:ri(4,7)};},
    ()=>{const s=12,r=ri(10,18),sp=ri(1.6,2.4),p=[];for(let i=0;i<=s;i++){const a=sp*(i/s)-sp/2;p.push([Math.cos(a)*r,Math.sin(a)*r]);}return{pts:p,w:ri(4,7)};},
    ()=>{const s=16,L=ri(26,42),am=ri(5,10),p=[];for(let i=0;i<=s;i++){const t=i/s;p.push([(t-.5)*L,Math.sin(t*6.283)*am]);}return{pts:p,w:ri(3,6)};},
    ()=>{const s=16,L=ri(32,50),am=ri(2,5),p=[];for(let i=0;i<=s;i++){const t=i/s;p.push([(t-.5)*L,Math.sin(t*Math.PI*1.2)*am]);}return{pts:p,w:ri(3,5)};},
    ()=>{const s=8,L=ri(12,20),b=ri(.4,1)*(Math.random()<.5?-1:1),p=[];let a=-b/2,x=0,y=0,st=L/s;for(let i=0;i<=s;i++){p.push([x,y]);x+=Math.cos(a)*st;y+=Math.sin(a)*st;a+=b/s;}return{pts:p,w:ri(6,10)};}
  ];
  let ti = 0;
  function make(){
    const t = TPL[ti++ % TPL.length](); const pts = t.pts;
    let cx=0, cy=0; for (const p of pts){ cx+=p[0]; cy+=p[1]; } cx/=pts.length; cy/=pts.length;
    const sc = ri(0.8,1.6);
    for (const p of pts){ p[0]=(p[0]-cx)*sc; p[1]=(p[1]-cy)*sc; }
    return {pts, w:t.w*sc, cLight:wl[rii(0,wl.length-1)], cDark:wd[rii(0,wd.length-1)]};
  }
  // marca en la rejilla las celdas dentro del radio RM (no dibuja nada)
  function markMask(x,y){
    const cmin=Math.max(0,Math.floor((x-RM)/CELL)), cmax=Math.min(cols-1,Math.floor((x+RM)/CELL));
    const rmin=Math.max(0,Math.floor((y-RM)/CELL)), rmax=Math.min(rows-1,Math.floor((y+RM)/CELL));
    const R2 = RM*RM;
    for (let cc=cmin; cc<=cmax; cc++) for (let rr=rmin; rr<=rmax; rr++){
      const dx=(cc+0.5)*CELL-x, dy=(rr+0.5)*CELL-y;
      if (dx*dx+dy*dy<=R2) mask[rr*cols+cc]=0;
    }
  }
  // ¿queda madera en este punto? (consulta la rejilla SIN modificarla)
  function woodAt(x,y){
    if (!mask) return false;
    const c = Math.floor(x/CELL), r = Math.floor(y/CELL);
    if (c<0||r<0||c>=cols||r>=rows) return false;
    return mask[r*cols+c] === 1;
  }
  let px=0, py=0, has=false;
  // pointermove vale para el ratón y también para el dedo
  addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect();
    const x = e.clientX-r.left, y = e.clientY-r.top;
    if (x<0||y<0||x>r.width||y>r.height){ has=false; return; }
    const vmx = has ? x-px : 0, vmy = has ? y-py : 0;
    // se comprueba ANTES de cortar: solo salen virutas si aquí todavía había madera
    const cutting = woodOK && woodAt(x,y);
    if (woodOK){
      wctx.save(); wctx.globalCompositeOperation = "destination-out";
      if (has){
        const d = Math.hypot(x-px,y-py), steps = Math.max(1,Math.ceil(d/3));
        for (let i=1; i<=steps; i++) markMask(px+(x-px)*i/steps, py+(y-py)*i/steps);
        wctx.lineWidth = 2*RC; wctx.lineCap = "round"; wctx.lineJoin = "round";
        wctx.beginPath(); wctx.moveTo(px,py); wctx.lineTo(x,y); wctx.stroke();
      } else {
        markMask(x,y); wctx.beginPath(); wctx.arc(x,y,RC,0,6.283); wctx.fill();
      }
      wctx.restore(); dirty = true;
    }
    px=x; py=y; has=true;
    if (cutting){
      const speed = Math.min(12, Math.hypot(vmx,vmy)); const n = 1+Math.round(speed/3);
      for (let i=0; i<n; i++){
        const s = make();
        // en coordenadas de página, para que sigan cayendo aunque bajes
        s.x = heroOff.x + x + ri(-7,7); s.y = heroOff.y + y + ri(-5,5);
        s.vx = ri(-1.7,1.7)-vmx*0.05; s.vy = ri(-2.8,-0.3);
        s.rot = ri(0,6.28); s.vrot = ri(-0.3,0.3);
        s.alpha = ri(0.72,0.96); s.t = 0;
        sh.push(s);
      }
      if (sh.length > MAX_VIRUTAS) sh.splice(0, sh.length - MAX_VIRUTAS);
    }
  }, {passive:true});

  // Pinta una viruta. Se le dice en qué lienzo y con qué desplazamiento, porque
  // se usa dos veces: mientras cae (en pantalla) y al posarse (en el montón).
  function draw(s, fade, destino, offX, offY){
    const g = destino || ctx;
    offX = offX || 0; offY = offY || 0;
    const pts = s.pts, n = pts.length, segs = n-1;
    g.save(); g.globalAlpha = Math.max(0, s.alpha*fade);
    g.translate(s.x - offX, s.y - offY); g.rotate(s.rot);
    const top = [], bot = [];
    for (let i=0; i<n; i++){
      const a = pts[Math.max(0,i-1)], b = pts[Math.min(n-1,i+1)];
      const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1;
      const nx=-dy/L, ny=dx/L;
      const hw = s.w*Math.sin(Math.PI*i/segs)/2+0.5;
      top.push([pts[i][0]+nx*hw, pts[i][1]+ny*hw]);
      bot.push([pts[i][0]-nx*hw, pts[i][1]-ny*hw]);
    }
    g.beginPath(); g.moveTo(top[0][0], top[0][1]);
    for (let i=1; i<n; i++) g.lineTo(top[i][0], top[i][1]);
    for (let i=n-1; i>=0; i--) g.lineTo(bot[i][0], bot[i][1]);
    g.closePath();
    const grad = g.createLinearGradient(0,-s.w,0,s.w);
    grad.addColorStop(0, s.cLight); grad.addColorStop(0.5, s.cLight); grad.addColorStop(1, s.cDark);
    g.fillStyle = grad; g.fill();
    g.globalAlpha = Math.max(0, s.alpha*fade*0.4);
    g.strokeStyle = s.cDark; g.lineWidth = 0.6; g.stroke();
    g.restore();
  }
  // convierte una pieza separada en trozo que cae (con su textura)
  function makeFalling(comp){
    if (comp.length < 3){
      for (const k of comp){ const c=k%cols, r=(k/cols)|0; mask[k]=0; wctx.clearRect(c*CELL-2, r*CELL-2, CELL+4, CELL+4); }
      return;
    }
    let minc=1e9, minr=1e9, maxc=-1, maxr=-1;
    for (const k of comp){ const c=k%cols, r=(k/cols)|0; if(c<minc)minc=c; if(r<minr)minr=r; if(c>maxc)maxc=c; if(r>maxr)maxr=r; }
    const bx=minc*CELL, by=minr*CELL, bw=(maxc-minc+1)*CELL, bh=(maxr-minr+1)*CELL;
    const mk = document.createElement("canvas"); mk.width=bw; mk.height=bh;
    const mc = mk.getContext("2d"); mc.fillStyle = "#000";
    for (const k of comp){ const c=k%cols, r=(k/cols)|0; mc.fillRect((c-minc)*CELL, (r-minr)*CELL, CELL, CELL); }
    const off = document.createElement("canvas"); off.width=bw; off.height=bh;
    const o = off.getContext("2d");
    o.drawImage(wood, cv0.ox-bx, cv0.oy-by, wood.width*cv0.s, wood.height*cv0.s);
    o.globalCompositeOperation = "destination-in"; o.filter = "blur(1.4px)"; o.drawImage(mk,0,0); o.filter = "none";
    for (const k of comp) mask[k] = 0;
    // borra del fondo la forma del trozo, dilatada unos px para arrastrar el borde suavizado
    wctx.save(); wctx.globalCompositeOperation = "destination-out";
    const M = 2;
    for (const d of [[0,0],[M,0],[-M,0],[0,M],[0,-M],[M,M],[-M,-M],[M,-M],[-M,M]]) wctx.drawImage(mk, bx+d[0], by+d[1]);
    wctx.restore();
    const big = bw*bh > 90000;   // trozos enormes: sin sombra para no penalizar cada frame
    // en coordenadas de página, igual que las virutas
    falling.push({img:off, x:heroOff.x+bx, y:heroOff.y+by, vx:ri(-0.4,0.4), vy:ri(0.2,0.8),
                  rot:0, vrot:ri(-0.035,0.035), big});
  }
  // detecta piezas de madera ya separadas del bloque principal
  function detach(){
    lab.fill(-1); const comps = [];
    for (let i=0; i<mask.length; i++){
      if (mask[i]===1 && lab[i]===-1){
        const cells = []; const st = [i]; lab[i] = comps.length;
        while (st.length){
          const k = st.pop(); cells.push(k);
          const c = k%cols, r = (k/cols)|0;
          if (c>0){ const j=k-1; if(mask[j]===1&&lab[j]===-1){lab[j]=comps.length;st.push(j);} }
          if (c<cols-1){ const j=k+1; if(mask[j]===1&&lab[j]===-1){lab[j]=comps.length;st.push(j);} }
          if (r>0){ const j=k-cols; if(mask[j]===1&&lab[j]===-1){lab[j]=comps.length;st.push(j);} }
          if (r<rows-1){ const j=k+cols; if(mask[j]===1&&lab[j]===-1){lab[j]=comps.length;st.push(j);} }
        }
        comps.push(cells);
      }
    }
    if (comps.length <= 1) return;
    let big = 0;
    for (let i=1; i<comps.length; i++) if (comps[i].length > comps[big].length) big = i;
    for (let i=0; i<comps.length; i++) if (i !== big) makeFalling(comps[i]);
  }
  // Al tocar el montón, el trozo se estampa en el lienzo de la pila y deja de
  // simularse: a partir de ahí es un dibujo fijo, no cuesta nada por frame.
  function posarTrozo(p, tope){
    if (pctx){
      const cx = p.x + p.img.width/2, cy = tope - p.img.height/2;
      pctx.save();
      pctx.translate(cx, cy - techoPila()); pctx.rotate(p.rot);
      pctx.drawImage(p.img, -p.img.width/2, -p.img.height/2);
      pctx.restore();
      subirPila(cx, p.img.height*0.45, p.img.width);
      hayPila = true;
    }
  }
  function posarViruta(s, tope){
    if (pctx){
      s.y = tope;
      draw(s, 1, pctx, 0, techoPila());
      subirPila(s.x, 1.1, Math.max(6, s.w*2));
      hayPila = true;
    }
  }

  function loop(){
    if (dirty){ const now = performance.now(); if (now-lastDetach > 40){ detach(); dirty = false; lastDetach = now; } }
    ctx.clearRect(0, 0, cv.width, cv.height);
    const sx = scrollX, sy = scrollY;
    // el montón acumulado, pintado de una sola pasada
    if (hayPila) ctx.drawImage(pilaCv, -sx, techoPila() - sy);

    const fk = [];
    for (const p of falling){
      p.vy = Math.min(p.vy + 0.16, VMAX); p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
      const tope = sueloY - alturaEn(p.x + p.img.width/2);
      if (p.y + p.img.height >= tope){ posarTrozo(p, tope); continue; }
      const vy = p.y - sy;
      if (vy > -p.img.height-40 && vy < cv.height+40){   // fuera de pantalla no se pinta
        ctx.save();
        ctx.translate(p.x+p.img.width/2-sx, p.y+p.img.height/2-sy); ctx.rotate(p.rot);
        if (!p.big){ ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3; }
        ctx.drawImage(p.img, -p.img.width/2, -p.img.height/2);
        ctx.restore();
      }
      fk.push(p);
    }
    falling = fk;

    const sk = [];
    for (const s of sh){
      s.vy = Math.min(s.vy + 0.12, VMAX); s.x += s.vx; s.y += s.vy; s.vx *= 0.99; s.rot += s.vrot;
      const tope = sueloY - alturaEn(s.x);
      if (s.y >= tope){ posarViruta(s, tope); continue; }
      const vy = s.y - sy;
      if (vy > -60 && vy < cv.height+60) draw(s, s.t<8 ? s.t/8 : 1, ctx, sx, sy);
      s.t++; sk.push(s);
    }
    sh = sk;
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ====== APARECER AL BAJAR ====== */
(function(){
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)){ els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver(es => {
    es.forEach((en,i) => {
      if (!en.isIntersecting) return;
      en.target.style.transitionDelay = (i%4*.08)+"s";
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, {threshold:.18});
  els.forEach(el => io.observe(el));
})();
