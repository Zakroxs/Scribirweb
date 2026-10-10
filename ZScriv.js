(function(){
"use strict";

const LS_INDICE = "zscriv_indice_proyectos";
const LS_ACTIVO = "zscriv_proyecto_activo_id";
const LS_TEMA = "zscriv_tema_v1";
const LS_IA = "zscriv_ia_config_v1";
function claveProyecto(id){ return "zscriv_proyecto_" + id; }

function idNuevo(){ return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function fechaLocal(offsetDias){
  const d = new Date();
  d.setDate(d.getDate() - (offsetDias||0));
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
let avisoAlmacenamientoMostrado = false;
function intentarGuardarLocalStorage(key, value){
  try{ localStorage.setItem(key, value); return true; }
  catch(err){ return false; }
}
function mostrarAvisoAlmacenamientoLleno(){
  if(avisoAlmacenamientoMostrado) return;
  avisoAlmacenamientoMostrado = true;
  abrirOverlay(document.getElementById('modal-almacenamiento-lleno'));
}

const ETIQUETAS = [
  {c:'#ef4444',n:'Rojo'},{c:'#f5802a',n:'Naranja'},{c:'#f5a623',n:'Ámbar'},{c:'#eab308',n:'Amarillo'},
  {c:'#84cc16',n:'Lima'},{c:'#2ec48a',n:'Jade'},{c:'#10b981',n:'Esmeralda'},{c:'#14b8a6',n:'Verde azulado'},
  {c:'#22d3ee',n:'Cian'},{c:'#0ea5e9',n:'Celeste'},{c:'#5068f5',n:'Tinta'},{c:'#6366f1',n:'Índigo'},
  {c:'#9f5cf5',n:'Ciruela'},{c:'#a855f7',n:'Púrpura'},{c:'#d946ef',n:'Fucsia'},{c:'#ec4899',n:'Rosa'},
  {c:'#f43f5e',n:'Carmín'},{c:'#78716c',n:'Piedra'},{c:'#64748b',n:'Pizarra'},{c:'#334155',n:'Grafito'}
];
const SUBTIPOS_LUGAR = ['Ciudad','Pueblo','Barrio','Edificio','Reino','Montaña','Río','Cueva','Bosque','Desierto','Isla','Playa','Otro'];
const TIPOS_RELACION = {
  'Familiar':['Padre','Madre','Hijo/a','Hermano/a','Medio hermano/a','Abuelo/a','Nieto/a','Tío/a','Sobrino/a','Primo/a','Padrastro/Madrastra','Hijastro/a','Cónyuge'],
  'Amor':['Pareja','Interés amoroso','Ex-pareja','Amor no correspondido'],
  'Amistad':['Mejor amigo/a','Amigo/a','Conocido/a'],
  'Conflicto':['Enemigo/a','Rival','Villano de','Némesis'],
  'Otros':['Mentor','Aprendiz','Aliado/a','Jefe/a','Empleado/a','Compañero/a','Otro'],
  'Objetos (procedencia)':['Creado por','Derivado de','Compuesto de','Variante de']
};

function proyectoVacio(){
  return {
    nombre: "Proyecto sin título",
    creado: Date.now(),
    arbol: [
      {id:idNuevo(), tipo:'parte', titulo:'Primera Parte', abierto:true, hijos:[
        {id:idNuevo(), tipo:'capitulo', titulo:'Capítulo 1', abierto:true, hijos:[
          {id:idNuevo(), tipo:'escena', titulo:'Escena 1', texto:'', sinopsis:'', notas:'', estado:'Sin empezar', etiqueta:'', keywords:'', objetivo:0, snapshots:[]}
        ]}
      ]}
    ],
    entidades: [],
    relaciones: [],
    investigacion: [],
    papelera: [],
    eventos: [],
    mapaVistas: {},
    racha: {ultimoDia:null, dias:0},
    historialPalabras: {},
    tiempoEscritura: {},
    objetivoDiario: 500,
    ui: { anchoEditor:700, tamFuente:17, interlineado:1.95, fuente:'serif' }
  };
}

/* ---- índice de proyectos (multi-proyecto) ---- */
function cargarIndice(){
  try{ const raw = Almacen.get(LS_INDICE); if(raw) return JSON.parse(raw); }catch(e){}
  return [];
}
function guardarIndice(idx){ Almacen.set(LS_INDICE, JSON.stringify(idx)); }
function crearNuevoProyecto(nombre){
  const id = idNuevo();
  const p = proyectoVacio();
  p.nombre = nombre || 'Proyecto sin título';
  const ok = Almacen.set(claveProyecto(id), JSON.stringify(p));
  if(!ok){ mostrarAvisoAlmacenamientoLleno(); return null; }
  const idx = cargarIndice();
  idx.push({id, nombre:p.nombre, actualizado:Date.now()});
  guardarIndice(idx);
  return id;
}
function actualizarIndiceMeta(){
  if(!proyectoActivoId) return;
  const idx = cargarIndice();
  const m = idx.find(x=>x.id===proyectoActivoId);
  if(m){ m.nombre = proyecto.nombre; m.actualizado = Date.now(); guardarIndice(idx); }
}

let proyecto = null;
let proyectoActivoId = null;
let nodoActivoId = null;
let vistaActual = 'editor';
let panelActivo = 'manuscrito';
let mundoFiltro = 'todos';
let mapaModo = 'todos';
let vinculando = false, vinculoOrigen = null;

function guardarProyecto(silencioso){
  if(!proyectoActivoId || !proyecto) return;
  const ok = Almacen.set(claveProyecto(proyectoActivoId), JSON.stringify(proyecto));
  if(!ok){ mostrarAvisoAlmacenamientoLleno(); return; }
  avisoAlmacenamientoMostrado = false;
  actualizarIndiceMeta();
  document.getElementById('bi-guardado').textContent = (esMovilActivo() ? '✓ ' : 'Guardado ') + new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  if(!silencioso) toast('Proyecto guardado');
}
function cargarIAConfig(){
  try{ const raw = localStorage.getItem(LS_IA); if(raw) return JSON.parse(raw); }catch(e){}
  return {proveedor:'anthropic', anthropicKey:'', anthropicModelo:'claude-sonnet-4-6', localUrl:'http://localhost:11434', localModelo:'llama3.2:3b', temperatura:0.7};
}
function guardarIAConfig(){ intentarGuardarLocalStorage(LS_IA, JSON.stringify(iaConfig)); }
let iaConfig = cargarIAConfig();

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('activo');
  clearTimeout(t._h);
  t._h = setTimeout(()=>t.classList.remove('activo'), 2200);
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }
function htmlATexto(html){
  if(!html) return '';
  let s = String(html).replace(/<br\s*\/?>/gi,'\n').replace(/(?<!<\/div>)(?<!<\/p>)<(?:div|p)[^>]*>/gi,'\n').replace(/<\/(?:div|p)>/gi,'\n');
  const doc = new DOMParser().parseFromString(s, 'text/html');
  return (doc.body.textContent || '').replace(/\u200B/g,'');
}
/* deja solo el formato que usa el editor: saltos de línea y menciones; elimina scripts y manejadores */
const ETIQUETAS_OK = {BR:1, DIV:1, P:1, SPAN:1, B:1, I:1, U:1, STRONG:1, EM:1};
function sanitizarHtml(html){
  if(!html) return '';
  const doc = new DOMParser().parseFromString('<body>' + String(html) + '</body>', 'text/html');
  (function limpiar(nodo){
    [...nodo.childNodes].forEach(h=>{
      if(h.nodeType === 3) return;
      if(h.nodeType !== 1){ h.remove(); return; }
      if(!ETIQUETAS_OK[h.tagName]){
        if(/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|MATH|TEMPLATE|NOSCRIPT)$/.test(h.tagName)){ h.remove(); return; }
        limpiar(h);
        while(h.firstChild) nodo.insertBefore(h.firstChild, h);
        h.remove(); return;
      }
      [...h.attributes].forEach(a=>{
        const ok = h.tagName === 'SPAN' && (a.name === 'class' || a.name === 'contenteditable' || a.name === 'data-id');
        if(!ok) h.removeAttribute(a.name);
      });
      if(h.tagName === 'SPAN' && h.hasAttribute('class') && !/^mencion[\w\s-]*$/.test(h.getAttribute('class'))) h.removeAttribute('class');
      limpiar(h);
    });
  })(doc.body);
  return doc.body.innerHTML;
}
/* completa lo que falte y sanea un proyecto cargado o importado */
function normalizarProyecto(p){
  const base = proyectoVacio();
  if(!p || typeof p !== 'object' || !Array.isArray(p.arbol)) throw new Error('Formato inválido');
  if(!p.relaciones) p.relaciones = p.conexiones || [];
  ['entidades','relaciones','investigacion','papelera','eventos'].forEach(k=>{ if(!Array.isArray(p[k])) p[k] = []; });
  ['racha','tiempoEscritura','historialPalabras','mapaVistas','ui'].forEach(k=>{ if(!p[k] || typeof p[k] !== 'object') p[k] = base[k]; });
  if(typeof p.nombre !== 'string' || !p.nombre) p.nombre = 'Proyecto sin título';
  if(typeof p.objetivoDiario !== 'number') p.objetivoDiario = base.objetivoDiario;
  if(p.ui.anchoEditor == null) p.ui.anchoEditor = 700;
  if(p.ui.tamFuente == null) p.ui.tamFuente = 17;
  if(p.ui.interlineado == null) p.ui.interlineado = 1.95;
  if(!p.ui.fuente) p.ui.fuente = 'serif';
  const vistos = new Set();
  (function recorrer(lista){
    lista.forEach(n=>{
      if(!n || typeof n !== 'object') return;
      if(!n.id || vistos.has(n.id)) n.id = idNuevo();
      vistos.add(n.id);
      if(!n.titulo) n.titulo = 'Sin título';
      if(n.tipo === 'escena'){
        n.texto = sanitizarHtml(n.texto || '');
        if(!Array.isArray(n.snapshots)) n.snapshots = [];
        n.snapshots.forEach(s=>{ if(s) s.texto = sanitizarHtml(s.texto || ''); });
      }
      if(Array.isArray(n.hijos)) recorrer(n.hijos); else if(n.tipo !== 'escena') n.hijos = [];
    });
  })(p.arbol);
  delete p.xp;
  return p;
}
function contarPalabras(html){
  const txt = htmlATexto(html);
  const m = txt.trim().match(/\S+/g);
  return m ? m.length : 0;
}
function iconoTipo(tipo){ return {parte:'📗',capitulo:'📘',escena:'📄'}[tipo] || '📄'; }

/* ---- árbol ---- */
function todosLosNodos(lista, out){
  out = out || [];
  (lista||[]).forEach(n=>{ out.push(n); if(n.hijos) todosLosNodos(n.hijos, out); });
  return out;
}
function encontrarNodo(id, lista){
  lista = lista || (proyecto? proyecto.arbol : []);
  for(const n of lista){ if(n.id === id) return n; if(n.hijos){ const r = encontrarNodo(id, n.hijos); if(r) return r; } }
  return null;
}
function encontrarPadreYArray(id, lista, padre){
  lista = lista || proyecto.arbol;
  for(let i=0;i<lista.length;i++){
    if(lista[i].id === id) return {arr:lista, idx:i, padre};
    if(lista[i].hijos){ const r = encontrarPadreYArray(id, lista[i].hijos, lista[i]); if(r) return r; }
  }
  return null;
}

function renderArbol(){
  const cont = document.getElementById('arbol');
  cont.innerHTML = '';
  if(!proyecto) return;
  function pintar(lista, contenedor){
    lista.forEach(n=>{
      const div = document.createElement('div');
      div.className = 'nodo' + (n.id === nodoActivoId ? ' activo' : '');
      div.dataset.id = n.id;
      const tieneHijos = n.tipo !== 'escena';
      div.innerHTML = `
        ${tieneHijos ? `<span class="caret ${n.abierto?'abierto':''}">▶</span>` : `<span style="width:12px"></span>`}
        <span class="icono-tipo">${iconoTipo(n.tipo)}</span>
        <span class="txt">${escapeHtml(n.titulo||'Sin título')}</span>
        ${n.etiqueta ? `<span class="etiq-color" style="background:${n.etiqueta}"></span>` : ''}
        ${n.estado && n.estado!=='Sin empezar' ? `<span class="estado-badge">${n.estado[0]}</span>` : ''}
        <button class="btn-borrar-nodo" data-borrar="${n.id}" title="Eliminar">🗑</button>
      `;
      div.addEventListener('click',(e)=>{
        if(e.target.classList.contains('caret')){ n.abierto = !n.abierto; guardarProyecto(true); renderArbol(); return; }
        if(e.target.closest('[data-borrar]')){ return; }
        seleccionarNodo(n.id);
      });
      div.querySelector('[data-borrar]').addEventListener('click', (ev)=>{ ev.stopPropagation(); borrarNodo(n.id); });
      contenedor.appendChild(div);
      if(n.hijos && n.hijos.length){
        const hijosDiv = document.createElement('div');
        hijosDiv.className = 'hijos' + (n.abierto ? '' : ' cerrado');
        pintar(n.hijos, hijosDiv);
        contenedor.appendChild(hijosDiv);
      }
    });
  }
  pintar(proyecto.arbol, cont);
}
async function borrarNodo(id){
  const info = encontrarPadreYArray(id);
  if(!info) return;
  const nodo = info.arr[info.idx];
  const ok = await confirmarPersonalizado(`¿Eliminar "${nodo.titulo}" y todo su contenido? Podrás restaurarlo desde la Papelera.`, {titulo:'Eliminar elemento', peligro:true, textoAceptar:'Eliminar'});
  if(!ok) return;
  info.arr.splice(info.idx,1);
  proyecto.papelera.push({id:idNuevo(), tipoPapelera:'nodo', fecha:Date.now(), datos:nodo, padreId:info.padre ? info.padre.id : null, posicion:info.idx});
  if(nodoActivoId && !encontrarNodo(nodoActivoId)){ nodoActivoId=null; cargarNodoEnEditor(); cargarInspector(); }
  guardarProyecto(true); renderArbol(); toast('Movido a la papelera');
}
function seleccionarNodo(id){
  nodoActivoId = id;
  renderArbol();
  cargarNodoEnEditor();
  cargarInspector();
  cerrarPanelesMovil();
}

/* ---- editor ---- */
const elTitulo = document.getElementById('editor-titulo');
const editorCE = document.getElementById('editor-texto');

function cargarNodoEnEditor(){
  const n = encontrarNodo(nodoActivoId);
  if(!n || n.tipo!=='escena'){
    elTitulo.value = n ? n.titulo : '';
    editorCE.innerHTML = '';
    editorCE.contentEditable = n ? 'true' : 'false';
    actualizarContadores();
    return;
  }
  editorCE.contentEditable = 'true';
  elTitulo.value = n.titulo || '';
  editorCE.innerHTML = sanitizarHtml(n.texto || '');
  actualizarContadores();
}
elTitulo.addEventListener('input', ()=>{
  const n = encontrarNodo(nodoActivoId); if(!n) return;
  n.titulo = elTitulo.value; renderArbol(); guardarProyectoDebounced();
});
function guardarTextoEditorActual(){
  const n = encontrarNodo(nodoActivoId); if(!n) return;
  n.texto = editorCE.innerHTML;
  guardarProyectoDebounced();
}
editorCE.addEventListener('input', ()=>{
  actualizarAutocomplete();
  guardarTextoEditorActual();
  actualizarContadores();
  registrarProgresoDiario();
});
editorCE.addEventListener('paste', (e)=>{
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  if(t) document.execCommand('insertText', false, t.replace(/\r\n?/g, '\n'));
});
editorCE.addEventListener('keydown', (e)=>{
  const cont = document.getElementById('mencion-autocomplete');
  if(cont.style.display==='block'){
    if(e.key==='Escape'){ cont.style.display='none'; autocompleteCtx=null; }
    else if(e.key==='Enter'){ const primera = cont.querySelector('.mencion-opcion'); if(primera){ e.preventDefault(); seleccionarMencion(primera.dataset.id); } }
  }
});
editorCE.addEventListener('click', (e)=>{
  const m = e.target.closest('.mencion');
  if(m){ e.preventDefault(); mostrarPopupMencion(m.dataset.id, e.clientX, e.clientY); }
});

let debTimer=null;
function guardarProyectoDebounced(){ clearTimeout(debTimer); debTimer = setTimeout(()=>guardarProyecto(true), 700); }

function actualizarContadores(){
  const n = encontrarNodo(nodoActivoId);
  const palDoc = n ? contarPalabras(n.texto) : 0;
  const _M = esMovilActivo();
  document.getElementById('bi-palabras-doc').textContent = _M ? palDoc + ' pal.' : palDoc + ' palabras (documento)';
  document.getElementById('insp-palabras').textContent = palDoc;
  const total = proyecto ? todosLosNodos(proyecto.arbol).reduce((s,x)=> s + (x.texto? contarPalabras(x.texto):0), 0) : 0;
  document.getElementById('bi-palabras-total').textContent = _M ? total + ' en total' : total + ' palabras (proyecto)';
  if(n && n.objetivo){
    const pct = Math.min(100, Math.round(palDoc/n.objetivo*100));
    document.getElementById('progreso-mini-fill').style.width = pct+'%';
  } else { document.getElementById('progreso-mini-fill').style.width = '0%'; }
}
function registrarProgresoDiario(){
  if(!proyecto) return;
  const hoy = fechaLocal();
  const total = todosLosNodos(proyecto.arbol).reduce((s,x)=> s + (x.texto? contarPalabras(x.texto):0), 0);
  proyecto.historialPalabras[hoy] = total;
  const r = proyecto.racha;
  if(r.ultimoDia !== hoy){
    const ayer = fechaLocal(1);
    r.dias = (r.ultimoDia === ayer) ? r.dias+1 : 1;
    r.ultimoDia = hoy;
  }
  actualizarBarraInferior();
}
function actualizarBarraInferior(){
  if(!proyecto) return;
  const _M = esMovilActivo();
  document.getElementById('bi-racha').textContent = _M ? `🔥 ${proyecto.racha.dias||0}` : `🔥 Racha: ${proyecto.racha.dias||0} días`;
  document.getElementById('bi-objetivo-txt').textContent = proyecto.objetivoDiario ? (_M ? `Meta ${proyecto.objetivoDiario}p` : `Meta diaria: ${proyecto.objetivoDiario}p`) : (_M ? 'Sin meta' : 'Sin objetivo diario');
}
document.getElementById('bi-objetivo-txt').addEventListener('click', async ()=>{
  if(!proyecto) return;
  const actual = proyecto.objetivoDiario || 0;
  const nuevo = await pedirTextoPersonalizado('¿Cuántas palabras al día quieres proponerte? (0 para desactivarla)', String(actual), {titulo:'Meta diaria de palabras', numerico:true});
  if(nuevo===null) return;
  const num = parseInt(nuevo);
  proyecto.objetivoDiario = isNaN(num) || num<0 ? 0 : num;
  actualizarBarraInferior();
  guardarProyecto(true);
});

/* ---- inspector ---- */
function pintarSelectorEtiquetas(){
  const cont = document.getElementById('selector-etiqueta');
  cont.innerHTML = '';
  ETIQUETAS.forEach(et=>{
    const s = document.createElement('span');
    s.style.background = et.c; s.title = et.n;
    s.addEventListener('click', ()=>{
      const n = encontrarNodo(nodoActivoId); if(!n) return;
      n.etiqueta = (n.etiqueta === et.c) ? '' : et.c;
      cargarInspector(); renderArbol(); guardarProyectoDebounced();
    });
    cont.appendChild(s);
  });
}
function cargarInspector(){
  const n = encontrarNodo(nodoActivoId);
  document.getElementById('insp-sinopsis').value = n ? (n.sinopsis||'') : '';
  document.getElementById('insp-estado').value = n ? (n.estado||'Sin empezar') : 'Sin empezar';
  document.getElementById('insp-notas').value = n ? (n.notas||'') : '';
  document.getElementById('insp-keywords').value = n ? (n.keywords||'') : '';
  document.getElementById('insp-objetivo').value = n && n.objetivo ? n.objetivo : '';
  pintarSelectorEtiquetas();
  document.querySelectorAll('#selector-etiqueta span').forEach((s,i)=>{ s.classList.toggle('sel', !!(n && n.etiqueta === ETIQUETAS[i].c)); });
  renderSnapshots();
  actualizarContadores();
}
['insp-sinopsis','insp-notas','insp-keywords'].forEach(id=>{
  document.getElementById(id).addEventListener('input', (e)=>{
    const n = encontrarNodo(nodoActivoId); if(!n) return;
    n[id.replace('insp-','')] = e.target.value; guardarProyectoDebounced();
  });
});
document.getElementById('insp-estado').addEventListener('change', (e)=>{
  const n = encontrarNodo(nodoActivoId); if(!n) return;
  n.estado = e.target.value; renderArbol(); guardarProyectoDebounced();
});
document.getElementById('insp-objetivo').addEventListener('input', (e)=>{
  const n = encontrarNodo(nodoActivoId); if(!n) return;
  n.objetivo = parseInt(e.target.value)||0; actualizarContadores(); guardarProyectoDebounced();
});
document.getElementById('btn-snapshot').addEventListener('click', ()=>{
  const n = encontrarNodo(nodoActivoId); if(!n || n.tipo!=='escena') return toast('Selecciona una escena');
  n.snapshots = n.snapshots || [];
  n.snapshots.unshift({fecha: Date.now(), texto: n.texto||''});
  if(n.snapshots.length>20) n.snapshots.pop();
  renderSnapshots(); guardarProyectoDebounced(); toast('Instantánea creada');
});
function renderSnapshots(){
  const n = encontrarNodo(nodoActivoId);
  const cont = document.getElementById('lista-snapshots');
  cont.innerHTML='';
  if(!n || !n.snapshots || !n.snapshots.length){ cont.innerHTML = '<p style="color:var(--texto-tenue);font-size:11.5px">Sin instantáneas todavía.</p>'; return; }
  n.snapshots.forEach((s)=>{
    const d = document.createElement('div');
    d.className = 'snapshot-item';
    d.innerHTML = `<div class="fecha">${new Date(s.fecha).toLocaleString('es-ES')} · ${contarPalabras(s.texto)}p</div>`;
    const btn = document.createElement('button');
    btn.className='btn btn-secundario'; btn.style.marginTop='6px'; btn.style.fontSize='10.5px'; btn.style.padding='4px 8px';
    btn.textContent='Restaurar';
    btn.addEventListener('click', ()=>{ n.texto = s.texto; cargarNodoEnEditor(); guardarProyecto(); toast('Restaurado'); });
    d.appendChild(btn);
    cont.appendChild(d);
  });
}
document.querySelectorAll('.insp-tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.insp-tab').forEach(t=>t.classList.remove('activo'));
    document.querySelectorAll('.insp-panel').forEach(p=>p.classList.remove('activo'));
    tab.classList.add('activo');
    document.querySelector(`.insp-panel[data-tab="${tab.dataset.tab}"]`).classList.add('activo');
  });
});

/* ---- vistas ---- */
document.querySelectorAll('.modos-vista button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    vistaActual = btn.dataset.vista;
    document.querySelectorAll('.modos-vista button').forEach(b=>b.classList.remove('activo'));
    btn.classList.add('activo');
    document.querySelectorAll('#centro > div').forEach(v=>v.classList.remove('activa'));
    document.getElementById('vista-'+vistaActual).classList.add('activa');
    if(vistaActual==='corkboard') renderCorkboard();
    if(vistaActual==='outliner') renderOutliner();
    if(vistaActual==='mundo') renderMundo();
    if(vistaActual==='mapa'){ cargarCamaraMapa(); renderMapa(); }
    if(vistaActual==='linea') renderTimeline();
    if(vistaActual==='stats') renderStats();
  });
});

function renderCorkboard(){
  const grid = document.getElementById('cork-grid');
  grid.innerHTML='';
  if(!proyecto) return;
  const n = encontrarNodo(nodoActivoId);
  const lista = (n && n.hijos) ? n.hijos : proyecto.arbol;
  const objetivo = lista.length ? lista : todosLosNodos(proyecto.arbol).filter(x=>x.tipo==='escena');
  objetivo.forEach(item=>{
    const t = document.createElement('div');
    t.className='cork-tarjeta';
    t.innerHTML = `${item.etiqueta?`<div class="cork-label" style="background:${item.etiqueta}"></div>`:''}
      <h4>${escapeHtml(item.titulo||'Sin título')}</h4>
      <p>${escapeHtml(item.sinopsis || (item.texto? htmlATexto(item.texto).slice(0,140)+'…':'Sin sinopsis.'))}</p>
      <div class="cork-meta"><span>${item.estado||''}</span><span>${item.texto?contarPalabras(item.texto)+'p':''}</span></div>`;
    t.addEventListener('click', ()=>{ seleccionarNodo(item.id); document.querySelector('[data-vista="editor"]').click(); });
    grid.appendChild(t);
  });
  if(!objetivo.length) grid.innerHTML = '<p style="color:var(--texto-tenue)">No hay elementos aquí. Selecciona un capítulo en el panel lateral.</p>';
}
function renderOutliner(){
  const tbody = document.getElementById('outliner-body');
  tbody.innerHTML='';
  if(!proyecto) return;
  const escenas = todosLosNodos(proyecto.arbol);
  escenas.forEach((n,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td>
      <td class="titulo-fila">${'　'.repeat(n.tipo==='escena'?2:n.tipo==='capitulo'?1:0)}${escapeHtml(n.titulo)}</td>
      <td style="color:var(--texto-secundario)">${escapeHtml(n.sinopsis||'')}</td>
      <td>${n.estado?`<span class="chip">${n.estado}</span>`:''}</td>
      <td>${n.etiqueta?`<span class="etiq-color" style="display:inline-block;background:${n.etiqueta}"></span>`:''}</td>
      <td>${n.texto?contarPalabras(n.texto):''}</td>`;
    tr.addEventListener('click', ()=>{ seleccionarNodo(n.id); document.querySelector('[data-vista="editor"]').click(); });
    tbody.appendChild(tr);
  });
}

function renderMundo(){
  if(!proyecto) return;
  const cats = document.getElementById('mundo-cats');
  const tipos = ['todos','personaje','lugar','objeto','criatura','raza','cultura','historia','magia','otro'];
  const nombres = {todos:'Todos',personaje:'Personajes',lugar:'Lugares',objeto:'Objetos',criatura:'Criaturas',raza:'Razas',cultura:'Culturas',historia:'Historia',magia:'Magia/Tec',otro:'Otro'};
  cats.innerHTML = tipos.map(t=>`<button data-t="${t}" class="${t===mundoFiltro?'activo':''}">${nombres[t]}</button>`).join('');
  cats.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{ mundoFiltro=b.dataset.t; renderMundo(); }));
  const grid = document.getElementById('mundo-grid');
  grid.innerHTML='';
  const lista = proyecto.entidades.filter(e=> mundoFiltro==='todos' || e.tipo===mundoFiltro);
  const apM = calcularApariciones();
  lista.forEach(e=>{
    const c = document.createElement('div');
    c.className='mundo-card';
    const img = e.imagen? `<img src="${e.imagen}" alt="${escapeHtml(e.nombre)}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:8px">` : '';
    let meta;
    if(e.tipo==='lugar') meta = (e.subtipo||'') + (e.esMundo?' · 🌍 Mundo':'');
    else if(e.tipo==='objeto') meta = 'Objeto'+(e.categoria?' · '+e.categoria:'')+(e.subcategoria?' · '+e.subcategoria:'');
    else if(e.tipo==='criatura') meta = 'Criatura'+(e.categoria?' · '+e.categoria:'')+' · '+'⚠️'.repeat(parseInt(e.peligro)||3);
    else if(e.tipo==='raza') meta = 'Raza'+(e.longevidad?' · '+e.longevidad:'');
    else meta = e.tipo;
    c.innerHTML = `${img}<span class="cat-tag" style="color:${e.color||'var(--acento-cian)'}">${escapeHtml(meta)}</span><h4>${escapeHtml(e.nombre)}</h4><p>${escapeHtml((e.desc||'').slice(0,110))}</p>`;
    if(apM.escenas.length){
      const inf = infoApariciones(apM, e.id);
      const chips = (inf.total ? `<span class="apar-chip">📍 ${inf.nEsc} ${inf.nEsc===1?'escena':'escenas'}</span>` : `<span class="apar-chip">Sin menciones</span>`) +
        (ausenciaLarga(inf, e.tipo) ? `<span class="apar-chip warn">⏳ ${inf.sinAparecer} sin aparecer</span>` : '');
      c.insertAdjacentHTML('beforeend', `<div class="apar-chips">${chips}</div>`);
    }
    c.addEventListener('click', ()=>abrirModalEntidad(e.id));
    grid.appendChild(c);
  });
  if(!lista.length) grid.innerHTML = '<p style="color:var(--texto-tenue)">No hay fichas todavía. Pulsa «＋ Nueva ficha» o usa el panel lateral (Personajes / Lugares).</p>';
}

function listaFiltradaMapa(){
  let lista = proyecto.entidades;
  if(mapaModo==='personajes') lista = lista.filter(e=>e.tipo==='personaje');
  else if(mapaModo==='lugares') lista = lista.filter(e=>e.tipo==='lugar');
  else if(mapaModo==='objetos') lista = lista.filter(e=>e.tipo==='objeto');
  else if(mapaModo==='criaturas') lista = lista.filter(e=>e.tipo==='criatura');
  return lista;
}
let mapaNodosDOM = {};
function centroNodo(entidad){
  const el = mapaNodosDOM[entidad.id];
  const w = el ? el.offsetWidth : 110, h = el ? el.offsetHeight : 46;
  return {x: entidad.x + w/2, y: entidad.y + h/2};
}
function renderMapa(){
  if(!proyecto) return;
  const cont = document.getElementById('mapa-transform');
  cont.querySelectorAll('.mapa-nodo').forEach(n=>n.remove());
  cont.querySelectorAll('.rel-badge').forEach(n=>n.remove());
  cont.querySelectorAll('p.mapa-vacio').forEach(n=>n.remove());
  mapaNodosDOM = {};
  const lista = listaFiltradaMapa();
  lista.forEach((e,i)=>{
    if(e.x==null){ e.x = 60 + (i%5)*160; e.y = 60 + Math.floor(i/5)*120; }
    const d = document.createElement('div');
    d.className='mapa-nodo';
    d.style.left = e.x+'px'; d.style.top = e.y+'px';
    d.style.borderColor = e.color || 'var(--acento-ciruela)';
    const img = e.imagen? `<img src="${e.imagen}" alt="${escapeHtml(e.nombre)}" style="width:100%;max-height:44px;object-fit:cover;border-radius:6px;margin-bottom:4px">`:'';
    d.innerHTML = `${img}${escapeHtml(e.nombre)}<small>${e.tipo}</small>`;
    mapaNodosDOM[e.id] = d;
    const imgEl = d.querySelector('img');
    if(imgEl) imgEl.addEventListener('load', ()=>dibujarConexiones(listaFiltradaMapa()), {once:true});
    d.addEventListener('pointerdown', (ev)=>{ ev.stopPropagation(); iniciarArrastre(ev,e,d); });
    d.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if(d._arrastrado) return;
      if(vinculando){
        if(!vinculoOrigen){ vinculoOrigen=e; document.getElementById('btn-modo-vincular').textContent='🔗 Ahora elige el segundo…'; d.style.outline='2px solid var(--acento-jade)'; }
        else if(vinculoOrigen.id!==e.id){
          abrirModalRelacion(vinculoOrigen.id, e.id);
          vinculando=false; vinculoOrigen=null;
          document.getElementById('btn-modo-vincular').classList.remove('activo');
          document.getElementById('btn-modo-vincular').textContent='🔗 Vincular';
        }
      } else { abrirModalEntidad(e.id); }
    });
    cont.appendChild(d);
  });
  dibujarConexiones(lista);
  if(!lista.length){
    const p = document.createElement('p');
    p.className='mapa-vacio';
    p.style.cssText='position:absolute;top:60px;left:20px;color:var(--texto-tenue);font-size:12px';
    const nombres = {personajes:'personajes',lugares:'lugares',objetos:'objetos',criaturas:'criaturas'};
    p.textContent = nombres[mapaModo] ? `No hay ${nombres[mapaModo]} todavía.` : 'No hay fichas todavía.';
    cont.appendChild(p);
  }
}
function iniciarArrastre(ev, entidad, el){
  ev.preventDefault();
  const startX=ev.clientX, startY=ev.clientY, ox=entidad.x, oy=entidad.y;
  el._arrastrado=false;
  let rafPendiente=false;
  try{ el.setPointerCapture(ev.pointerId); }catch(err){}
  function mover(e2){
    const dx=(e2.clientX-startX)/(mapaZoom*kUI), dy=(e2.clientY-startY)/(mapaZoom*kUI);
    if(Math.abs(dx)+Math.abs(dy)>4) el._arrastrado=true;
    entidad.x=ox+dx; entidad.y=oy+dy;
    el.style.left=entidad.x+'px'; el.style.top=entidad.y+'px';
    if(!rafPendiente){
      rafPendiente=true;
      requestAnimationFrame(()=>{ dibujarConexiones(listaFiltradaMapa()); rafPendiente=false; });
    }
  }
  function soltar(){
    el.removeEventListener('pointermove',mover); el.removeEventListener('pointerup',soltar); el.removeEventListener('pointercancel',soltar);
    if(el._arrastrado){
      ultimoMovimientoMapa = {id: entidad.id, x: ox, y: oy};
      document.getElementById('btn-mapa-deshacer').classList.remove('oculto');
    }
    guardarProyectoDebounced();
  }
  el.addEventListener('pointermove',mover); el.addEventListener('pointerup',soltar); el.addEventListener('pointercancel',soltar);
}

/* ---- geometría: puentes donde se cruzan las líneas del mapa ---- */
let mapaPuentesActivo = true;
function interseccionSegmentos(x1,y1,x2,y2,x3,y3,x4,y4){
  const d = (x2-x1)*(y4-y3) - (y2-y1)*(x4-x3);
  if(Math.abs(d) < 1e-9) return null;
  const t = ((x3-x1)*(y4-y3) - (y3-y1)*(x4-x3)) / d;
  const u = ((x3-x1)*(y2-y1) - (y3-y1)*(x2-x1)) / d;
  if(t>0.05 && t<0.95 && u>0.05 && u<0.95) return {t,u};
  return null;
}
function construirPathConPuentes(x1,y1,x2,y2, puentesT){
  if(!puentesT.length) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const dx=x2-x1, dy=y2-y1;
  const len = Math.hypot(dx,dy) || 1;
  const ux=dx/len, uy=dy/len, px=-uy, py=ux, radio=6.5, deltaT = 5/len;
  let d = `M ${x1} ${y1}`, tPrev = 0;
  puentesT.slice().sort((a,b)=>a-b).forEach(t=>{
    const t0 = Math.max(tPrev, t-deltaT), t1 = Math.min(1, t+deltaT);
    if(t0<=tPrev){ return; }
    const x0=x1+dx*t0, y0=y1+dy*t0, x1b=x1+dx*t1, y1b=y1+dy*t1;
    const mx=(x0+x1b)/2+px*radio, my=(y0+y1b)/2+py*radio;
    d += ` L ${x0} ${y0} Q ${mx} ${my} ${x1b} ${y1b}`;
    tPrev = t1;
  });
  d += ` L ${x2} ${y2}`;
  return d;
}
function dibujarConexiones(listaVisible){
  document.getElementById('mapa-transform').querySelectorAll('.rel-badge').forEach(n=>n.remove());
  const svg = document.getElementById('mapa-svg');
  svg.innerHTML='';
  const idsVisibles = new Set(listaVisible.map(e=>e.id));
  const relVisibles = (proyecto.relaciones||[]).filter(c=> idsVisibles.has(c.origen) && idsVisibles.has(c.destino));
  const segmentos = relVisibles.map(c=>{
    const a = proyecto.entidades.find(e=>e.id===c.origen), b = proyecto.entidades.find(e=>e.id===c.destino);
    if(!a||!b) return null;
    const ca = centroNodo(a), cb = centroNodo(b);
    return {c, x1:ca.x, y1:ca.y, x2:cb.x, y2:cb.y, puentes:[]};
  });
  if(mapaPuentesActivo){
    for(let i=0;i<segmentos.length;i++){
      if(!segmentos[i]) continue;
      for(let j=i+1;j<segmentos.length;j++){
        if(!segmentos[j]) continue;
        const si=segmentos[i].c, sj=segmentos[j].c;
        if(si.origen===sj.origen||si.origen===sj.destino||si.destino===sj.origen||si.destino===sj.destino) continue;
        const inter = interseccionSegmentos(segmentos[i].x1,segmentos[i].y1,segmentos[i].x2,segmentos[i].y2, segmentos[j].x1,segmentos[j].y1,segmentos[j].x2,segmentos[j].y2);
        if(inter) segmentos[j].puentes.push(inter.u);
      }
    }
  }
  segmentos.forEach(seg=>{
    if(!seg) return;
    const {c,x1,y1,x2,y2} = seg;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', construirPathConPuentes(x1,y1,x2,y2, seg.puentes));
    path.setAttribute('fill','none');
    path.setAttribute('stroke','var(--borde-fuerte)');
    path.setAttribute('stroke-width','1.5');
    svg.appendChild(path);
    if(c.tipo){
      const badge = document.createElement('div');
      badge.className='rel-badge';
      badge.style.left = ((x1+x2)/2)+'px';
      badge.style.top = ((y1+y2)/2)+'px';
      badge.textContent = c.tipoInverso ? `${c.tipo} ⇄ ${c.tipoInverso}` : c.tipo;
      badge.addEventListener('click', (ev)=>{ ev.stopPropagation(); abrirModalRelacion(c.origen,c.destino,c.id); });
      document.getElementById('mapa-transform').appendChild(badge);
    }
  });
}

/* ---- zoom y paneo del mapa (cámara independiente por modo) ---- */
let mapaZoom=1, mapaPanX=0, mapaPanY=0;
let ultimoMovimientoMapa = null;
function actualizarTransformMapa(){
  document.getElementById('mapa-transform').style.transform = `translate(${mapaPanX}px,${mapaPanY}px) scale(${mapaZoom})`;
}
function guardarCamaraMapa(){
  if(!proyecto) return;
  if(!proyecto.mapaVistas) proyecto.mapaVistas = {};
  proyecto.mapaVistas[mapaModo] = {zoom:mapaZoom, panX:mapaPanX, panY:mapaPanY};
  guardarProyectoDebounced();
}
function cargarCamaraMapa(){
  const g = (proyecto && proyecto.mapaVistas && proyecto.mapaVistas[mapaModo]) || {zoom:1,panX:0,panY:0};
  mapaZoom = g.zoom; mapaPanX = g.panX; mapaPanY = g.panY;
  actualizarTransformMapa();
}
const elMapaCanvas = document.getElementById('mapa-canvas');
elMapaCanvas.addEventListener('wheel', (e)=>{
  e.preventDefault();
  const rect = elMapaCanvas.getBoundingClientRect();
  const mx = e.clientX-rect.left, my = e.clientY-rect.top;
  const factor = e.deltaY<0 ? 1.12 : 0.89;
  const nuevoZoom = Math.min(3, Math.max(0.25, mapaZoom*factor));
  const wx = (mx-mapaPanX)/mapaZoom, wy = (my-mapaPanY)/mapaZoom;
  mapaZoom = nuevoZoom;
  mapaPanX = mx - wx*mapaZoom;
  mapaPanY = my - wy*mapaZoom;
  actualizarTransformMapa();
  guardarCamaraMapa();
},{passive:false});
let panActivo=false, panStartX=0, panStartY=0, panOrigX=0, panOrigY=0;
let punterosActivos = new Set();
elMapaCanvas.addEventListener('pointerdown', (e)=>{
  punterosActivos.add(e.pointerId);
  if(e.target.closest('.mapa-nodo') || e.target.closest('.rel-badge')) return;
  if(punterosActivos.size > 1){ panActivo=false; return; }
  panActivo=true; panStartX=e.clientX; panStartY=e.clientY; panOrigX=mapaPanX; panOrigY=mapaPanY;
  try{ elMapaCanvas.setPointerCapture(e.pointerId); }catch(err){}
});
elMapaCanvas.addEventListener('pointermove', (e)=>{
  if(!panActivo || punterosActivos.size>1) return;
  mapaPanX = panOrigX + (e.clientX-panStartX)/kUI;
  mapaPanY = panOrigY + (e.clientY-panStartY)/kUI;
  actualizarTransformMapa();
});
['pointerup','pointercancel'].forEach(ev=>elMapaCanvas.addEventListener(ev, (e)=>{
  punterosActivos.delete(e.pointerId);
  if(panActivo) guardarCamaraMapa();
  panActivo=false;
}));
function distanciaToques(t){ return Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY); }
let pinchInicial=null;
elMapaCanvas.addEventListener('touchstart', (e)=>{
  if(e.touches.length===2){
    panActivo=false;
    const rect = elMapaCanvas.getBoundingClientRect();
    const mx = ((e.touches[0].clientX+e.touches[1].clientX)/2 - rect.left)/kUI;
    const my = ((e.touches[0].clientY+e.touches[1].clientY)/2 - rect.top)/kUI;
    pinchInicial = { dist:distanciaToques(e.touches), zoom:mapaZoom, wx:(mx-mapaPanX)/mapaZoom, wy:(my-mapaPanY)/mapaZoom };
  }
}, {passive:true});
elMapaCanvas.addEventListener('touchmove', (e)=>{
  if(e.touches.length===2 && pinchInicial){
    e.preventDefault();
    const rect = elMapaCanvas.getBoundingClientRect();
    const mx = ((e.touches[0].clientX+e.touches[1].clientX)/2 - rect.left)/kUI;
    const my = ((e.touches[0].clientY+e.touches[1].clientY)/2 - rect.top)/kUI;
    mapaZoom = Math.min(3, Math.max(0.25, pinchInicial.zoom * (distanciaToques(e.touches)/pinchInicial.dist)));
    mapaPanX = mx - pinchInicial.wx*mapaZoom;
    mapaPanY = my - pinchInicial.wy*mapaZoom;
    actualizarTransformMapa();
  }
}, {passive:false});
elMapaCanvas.addEventListener('touchend', ()=>{ if(pinchInicial) guardarCamaraMapa(); pinchInicial=null; });
function ajustarMapa(){
  const lista = listaFiltradaMapa();
  const w = elMapaCanvas.clientWidth, h = elMapaCanvas.clientHeight;
  if(!lista.length){ mapaZoom=1; mapaPanX=0; mapaPanY=0; actualizarTransformMapa(); guardarCamaraMapa(); return; }
  const xs=lista.map(e=>e.x||0), ys=lista.map(e=>e.y||0);
  const minX=Math.min(...xs)-30, maxX=Math.max(...xs)+160, minY=Math.min(...ys)-30, maxY=Math.max(...ys)+130;
  const z = Math.min(1.4, Math.max(0.25, Math.min(w/(maxX-minX), h/(maxY-minY))));
  mapaZoom = z;
  mapaPanX = -minX*z + (w-(maxX-minX)*z)/2;
  mapaPanY = -minY*z + (h-(maxY-minY)*z)/2;
  actualizarTransformMapa();
  guardarCamaraMapa();
}
document.getElementById('btn-mapa-mas').addEventListener('click', ()=>{ mapaZoom=Math.min(3,mapaZoom*1.2); actualizarTransformMapa(); guardarCamaraMapa(); });
document.getElementById('btn-mapa-menos').addEventListener('click', ()=>{ mapaZoom=Math.max(0.25,mapaZoom/1.2); actualizarTransformMapa(); guardarCamaraMapa(); });
document.getElementById('btn-mapa-reset').addEventListener('click', ()=>{ mapaZoom=1; mapaPanX=0; mapaPanY=0; actualizarTransformMapa(); guardarCamaraMapa(); });
document.getElementById('btn-mapa-ajustar').addEventListener('click', ajustarMapa);
document.getElementById('btn-mapa-puentes').addEventListener('click', function(){
  mapaPuentesActivo = !mapaPuentesActivo;
  this.classList.toggle('activo', mapaPuentesActivo);
  dibujarConexiones(listaFiltradaMapa());
});
document.getElementById('btn-mapa-deshacer').addEventListener('click', ()=>{
  if(!ultimoMovimientoMapa) return;
  const e = proyecto.entidades.find(x=>x.id===ultimoMovimientoMapa.id);
  if(e){ e.x = ultimoMovimientoMapa.x; e.y = ultimoMovimientoMapa.y; }
  ultimoMovimientoMapa = null;
  document.getElementById('btn-mapa-deshacer').classList.add('oculto');
  renderMapa();
  guardarProyectoDebounced();
  toast('Movimiento deshecho');
});

document.querySelectorAll('.mapa-modos button').forEach(b=>b.addEventListener('click', ()=>{
  guardarCamaraMapa();
  mapaModo=b.dataset.modo;
  document.querySelectorAll('.mapa-modos button').forEach(x=>x.classList.remove('activo'));
  b.classList.add('activo');
  ultimoMovimientoMapa = null;
  document.getElementById('btn-mapa-deshacer').classList.add('oculto');
  cargarCamaraMapa();
  renderMapa();
}));
document.getElementById('btn-modo-vincular').addEventListener('click', function(){
  vinculando = !vinculando; vinculoOrigen=null;
  this.classList.toggle('activo', vinculando);
  this.textContent = vinculando ? '🔗 Elige el primer personaje…' : '🔗 Vincular';
  if(vinculando) toast('Haz clic en dos fichas para crear el vínculo');
});

function renderStats(){
  if(!proyecto) return;
  const escenasNodos = todosLosNodos(proyecto.arbol).filter(x=>x.tipo==='escena');
  const total = escenasNodos.reduce((s,x)=> s + (x.texto? contarPalabras(x.texto):0), 0);
  const escenas = escenasNodos.length;
  const promedio = escenas ? Math.round(total/escenas) : 0;
  const masLarga = escenasNodos.reduce((max,x)=> Math.max(max, x.texto?contarPalabras(x.texto):0), 0);
  const minutosTotales = Object.values(proyecto.tiempoEscritura||{}).reduce((s,v)=>s+v,0);
  const horas = Math.floor(minutosTotales/60), mins = Math.round(minutosTotales%60);
  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card"><div class="valor">${total}</div><div class="label">Palabras totales</div></div>
    <div class="stat-card"><div class="valor">${escenas}</div><div class="label">Escenas</div></div>
    <div class="stat-card"><div class="valor">${proyecto.racha.dias||0}</div><div class="label">Racha (días)</div></div>
    <div class="stat-card"><div class="valor">${proyecto.entidades.length}</div><div class="label">Fichas del mundo</div></div>
    <div class="stat-card"><div class="valor">${promedio}</div><div class="label">Palabras / escena (promedio)</div></div>
    <div class="stat-card"><div class="valor">${masLarga}</div><div class="label">Escena más larga</div></div>
    <div class="stat-card"><div class="valor">${horas}h ${mins}m</div><div class="label">Tiempo de escritura</div></div>
    <div class="stat-card"><div class="valor">${(proyecto.relaciones||[]).length}</div><div class="label">Relaciones activas</div></div>
  `;
  const hm = document.getElementById('heatmap');
  hm.innerHTML='';
  for(let i=29;i>=0;i--){
    const d = fechaLocal(i);
    const val = proyecto.historialPalabras[d] || 0;
    const prevDate = fechaLocal(i+1);
    const delta = Math.max(0, val - (proyecto.historialPalabras[prevDate]||0));
    const div = document.createElement('div');
    div.className='hm-dia';
    div.title = d + ' · ' + delta + ' palabras';
    const intensidad = Math.min(1, delta/800);
    if(delta>0) div.style.background = `color-mix(in srgb, var(--acento-jade) ${20+intensidad*80}%, var(--bg-elemento))`;
    hm.appendChild(div);
  }
  pintarApariciones_stats();
}

/* ---- nav lateral ---- */
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    panelActivo = btn.dataset.panel;
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('activo'));
    btn.classList.add('activo');
    const titulos = {manuscrito:'Manuscrito',personajes:'Personajes',lugares:'Lugares',investigacion:'Investigación',papelera:'Papelera'};
    document.getElementById('panel-lateral-titulo').textContent = titulos[panelActivo];
    document.getElementById('buscador-global').style.display = panelActivo==='manuscrito' ? 'block' : 'none';
    document.getElementById('btn-nuevo-nodo').style.display = panelActivo==='papelera' ? 'none' : 'flex';
    if(panelActivo==='manuscrito'){ renderArbol(); }
    else if(panelActivo==='personajes'||panelActivo==='lugares'){ pintarPanelEntidades(panelActivo); }
    else if(panelActivo==='investigacion'){ pintarPanelInvestigacion(); }
    else if(panelActivo==='papelera'){ renderPapelera(); }
  });
});
function pintarPanelEntidades(tipoPanel){
  const cont = document.getElementById('arbol');
  cont.innerHTML='';
  if(!proyecto) return;
  const tipoFiltro = tipoPanel==='personajes' ? 'personaje' : 'lugar';
  const lista = proyecto.entidades.filter(e=>e.tipo===tipoFiltro);
  if(!lista.length){ cont.innerHTML = `<p style="padding:10px;color:var(--texto-tenue);font-size:12px">Sin ${tipoPanel} todavía. Pulsa ＋ arriba para crear.</p>`; return; }
  lista.forEach(e=>{
    const div = document.createElement('div');
    div.className='nodo';
    const icono = e.imagen? `<img src="${e.imagen}" alt="" style="width:18px;height:18px;border-radius:4px;object-fit:cover">` : `<span class="icono-tipo">${tipoFiltro==='personaje'?'🧑':'📍'}</span>`;
    div.innerHTML = `<span style="width:12px"></span>${icono}<span class="txt">${escapeHtml(e.nombre)}</span>`;
    div.addEventListener('click', ()=>abrirModalEntidad(e.id));
    cont.appendChild(div);
  });
}
function refrescarVistasEntidades(){
  if(vistaActual==='mundo') renderMundo();
  if(vistaActual==='mapa') renderMapa();
  if(panelActivo==='personajes'||panelActivo==='lugares') pintarPanelEntidades(panelActivo);
}

document.getElementById('btn-nuevo-nodo').addEventListener('click', ()=>{
  if(panelActivo==='personajes'){ abrirModalPersonajeNueva(); }
  else if(panelActivo==='lugares'){ abrirModalLugarNueva(); }
  else if(panelActivo==='investigacion'){ abrirModalInvestigacionNueva(); }
  else { document.getElementById('nuevo-titulo').value=''; abrirOverlay(document.getElementById('modal-nuevo')); }
});
document.getElementById('btn-crear-nodo').addEventListener('click', ()=>{
  const tipo = document.getElementById('nuevo-tipo').value;
  const titulo = document.getElementById('nuevo-titulo').value.trim() || 'Sin título';
  const nuevo = {id:idNuevo(), tipo, titulo, abierto:true};
  if(tipo==='escena'){ Object.assign(nuevo, {texto:'', sinopsis:'', notas:'', estado:'Sin empezar', etiqueta:'', keywords:'', objetivo:0, snapshots:[]}); }
  else { nuevo.hijos = []; }
  const activo = encontrarNodo(nodoActivoId);
  if(activo && activo.hijos){ activo.hijos.push(nuevo); activo.abierto = true; }
  else if(activo){ const info = encontrarPadreYArray(nodoActivoId); if(info) info.arr.splice(info.idx+1,0,nuevo); else proyecto.arbol.push(nuevo); }
  else { proyecto.arbol.push(nuevo); }
  cerrarOverlay(document.getElementById('modal-nuevo'));
  guardarProyecto(true); renderArbol(); seleccionarNodo(nuevo.id);
  toast('Elemento creado');
});

/* ---- overlays ---- */
function abrirOverlay(el){
  el.classList.add('activo'); el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  if(esMovilActivo()) registrarCapa(el.id, ()=>{
    if(el._forzado){ registrarCapa(el.id, ()=>{}); return; }
    if(el.id==='modal-confirmar'){ document.getElementById('btn-confirmar-cancelar').click(); return; }
    el.classList.remove('activo');
  });
}
function cerrarOverlay(el){ el.classList.remove('activo'); quitarCapa(el.id); }
document.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click', (e)=>{ cerrarOverlay(e.target.closest('.overlay')); }));
document.querySelectorAll('.overlay').forEach(ov=>ov.addEventListener('click', (e)=>{
  if(e.target===ov){
    if(ov.id==='modal-proyectos' && ov._forzado) return;
    if(ov.id==='modal-confirmar'){ document.getElementById('btn-confirmar-cancelar').click(); return; }
    cerrarOverlay(ov);
  }
}));

/* ---- confirmación / entrada de texto personalizadas (sin prompt/confirm nativos) ---- */
let confirmarResolver = null;
function confirmarPersonalizado(mensaje, opciones){
  opciones = opciones || {};
  return new Promise(resolve=>{
    confirmarResolver = resolve;
    document.getElementById('confirmar-titulo').textContent = opciones.titulo || '¿Confirmar?';
    document.getElementById('confirmar-mensaje').textContent = mensaje || '';
    document.getElementById('confirmar-input-wrap').classList.add('oculto');
    const btnA = document.getElementById('btn-confirmar-aceptar');
    btnA.textContent = opciones.textoAceptar || 'Aceptar';
    btnA.className = 'btn ' + (opciones.peligro ? 'btn-peligro' : 'btn-primario');
    abrirOverlay(document.getElementById('modal-confirmar'));
  });
}
function pedirTextoPersonalizado(mensaje, valorInicial, opciones){
  opciones = opciones || {};
  return new Promise(resolve=>{
    confirmarResolver = resolve;
    document.getElementById('confirmar-titulo').textContent = opciones.titulo || mensaje || 'Escribe un valor';
    document.getElementById('confirmar-mensaje').textContent = opciones.titulo ? (mensaje||'') : '';
    document.getElementById('confirmar-input-wrap').classList.remove('oculto');
    const inp = document.getElementById('confirmar-input');
    inp.value = valorInicial==null ? '' : valorInicial;
    inp.type = opciones.numerico ? 'number' : 'text';
    const btnA = document.getElementById('btn-confirmar-aceptar');
    btnA.textContent = opciones.textoAceptar || 'Aceptar';
    btnA.className = 'btn btn-primario';
    abrirOverlay(document.getElementById('modal-confirmar'));
    setTimeout(()=>{ inp.focus(); inp.select(); }, 60);
  });
}
document.getElementById('btn-confirmar-cancelar').addEventListener('click', ()=>{
  cerrarOverlay(document.getElementById('modal-confirmar'));
  if(confirmarResolver) confirmarResolver(null);
  confirmarResolver = null;
});
document.getElementById('btn-confirmar-aceptar').addEventListener('click', ()=>{
  const conInput = !document.getElementById('confirmar-input-wrap').classList.contains('oculto');
  const resultado = conInput ? document.getElementById('confirmar-input').value : true;
  cerrarOverlay(document.getElementById('modal-confirmar'));
  if(confirmarResolver) confirmarResolver(resultado);
  confirmarResolver = null;
});
document.getElementById('confirmar-input').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); document.getElementById('btn-confirmar-aceptar').click(); }
});
document.getElementById('btn-exportar-emergencia').addEventListener('click', ()=>{
  if(!proyecto) return;
  const datos = Object.assign({_zscriv:'ZSCRIV-v1'}, proyecto);
  descargar((proyecto.nombre||'proyecto').replace(/[^\w\-]+/g,'_')+'_emergencia.json', JSON.stringify(datos), 'application/json');
});

function pintarSelectorColor(contId, colorActual){
  const cont = document.getElementById(contId);
  cont.innerHTML='';
  ETIQUETAS.forEach(et=>{
    const s=document.createElement('span'); s.style.background=et.c; s.dataset.c=et.c;
    if(et.c===colorActual) s.classList.add('sel');
    s.addEventListener('click', ()=>{ cont.querySelectorAll('span').forEach(x=>x.classList.remove('sel')); s.classList.add('sel'); });
    cont.appendChild(s);
  });
}
function comprimirImagen(file, maxDim, calidad){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        try{
          let w = img.naturalWidth||img.width, h = img.naturalHeight||img.height;
          if(w>maxDim || h>maxDim){
            if(w>=h){ h = Math.round(h*maxDim/w); w = maxDim; }
            else { w = Math.round(w*maxDim/h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width=w; canvas.height=h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        }catch(err){ resolve(reader.result); } // si el canvas falla, se usa la imagen original sin comprimir
      };
      img.onerror = ()=>resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = ()=>reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function manejarInputImagen(inputId, previewId, onLoad){
  document.getElementById(inputId).addEventListener('change', async function(){
    const f=this.files[0]; if(!f) return;
    const prev=document.getElementById(previewId);
    try{
      const dataUrl = await comprimirImagen(f, 900, 0.82);
      prev.src=dataUrl; prev.classList.add('activo');
      onLoad(dataUrl);
    }catch(err){ toast('No se pudo procesar la imagen'); }
  });
}

/* ---- personaje ---- */
let pjEditandoId=null, pjImagenTemp=null, pjHabilidadesTemp=[];
function renderHabilidadesRows(){
  const cont = document.getElementById('pj-habilidades-lista');
  cont.innerHTML='';
  pjHabilidadesTemp.forEach((h,i)=>{
    const row = document.createElement('div'); row.className='habilidad-row';
    const inpNombre = document.createElement('input'); inpNombre.placeholder='Nombre (ej. Magia de fuego)'; inpNombre.value=h.nombre||'';
    const inpDeriv = document.createElement('input'); inpDeriv.placeholder='Derivados, separados, por, coma'; inpDeriv.value=h.derivados||'';
    inpNombre.addEventListener('input', ()=>{ pjHabilidadesTemp[i].nombre = inpNombre.value; });
    inpDeriv.addEventListener('input', ()=>{ pjHabilidadesTemp[i].derivados = inpDeriv.value; });
    const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.textContent='✕';
    btnDel.addEventListener('click', ()=>{ pjHabilidadesTemp.splice(i,1); renderHabilidadesRows(); });
    row.appendChild(inpNombre); row.appendChild(inpDeriv); row.appendChild(btnDel);
    cont.appendChild(row);
  });
}
document.getElementById('pj-add-habilidad').addEventListener('click', ()=>{ pjHabilidadesTemp.push({nombre:'',derivados:''}); renderHabilidadesRows(); });
manejarInputImagen('pj-imagen','pj-imagen-preview', (data)=>{ pjImagenTemp=data; });

/* Mapa genérico de campos de texto del personaje (id de input -> propiedad de la entidad) */
const PJ_CAMPOS = {
  'pj-nombre':'nombre', 'pj-apellidos':'apellidos', 'pj-apodo':'apodo', 'pj-edad':'edad',
  'pj-fecha-nac':'fechaNacimiento', 'pj-genero':'genero', 'pj-rol':'rol', 'pj-raza':'raza',
  'pj-ocupacion':'ocupacion', 'pj-estatus':'estatusSocial', 'pj-faccion':'faccion',
  'pj-rasgos':'rasgos', 'pj-virtudes':'virtudes', 'pj-defectos':'defectos',
  'pj-miedos':'miedos', 'pj-manias':'manias',
  'pj-deseo':'deseoConsciente', 'pj-necesidad':'necesidadInterna', 'pj-mentira':'mentira',
  'pj-herida':'herida', 'pj-defecto-tragico':'defectoTragico', 'pj-miedo-profundo':'miedoProfundo',
  'pj-objetivos':'objetivos', 'pj-problemas':'problemas',
  'pj-tipo-arco':'tipoArco', 'pj-estado-inicial':'estadoInicial', 'pj-estado-final':'estadoFinal', 'pj-arco':'arco',
  'pj-secreto':'secreto', 'pj-consecuencia-secreto':'consecuenciaSecreto', 'pj-brujula':'brujulaEtica',
  'pj-aspecto':'aspectoFisico', 'pj-voz':'vozTics', 'pj-frase':'fraseCaracteristica', 'pj-manierismos':'manierismos',
  'pj-religion':'religion', 'pj-idiomas':'idiomas', 'pj-valores':'valores', 'pj-relaciones-clave':'relacionesClave',
  'pj-desc':'desc'
};
const PJ_CAMPOS_CORTOS = new Set(['nombre','apellidos','apodo','edad','fechaNacimiento','genero','rol','raza','ocupacion','estatusSocial','faccion','religion','idiomas','vozTics','fraseCaracteristica','defectoTragico','miedoProfundo','tipoArco']);
function limpiarCamposPersonaje(){ Object.keys(PJ_CAMPOS).forEach(id=>{ document.getElementById(id).value=''; }); }
function cargarCamposPersonaje(e){ Object.entries(PJ_CAMPOS).forEach(([id,prop])=>{ document.getElementById(id).value = e[prop]||''; }); }
function leerCamposPersonaje(){
  const datos = {};
  Object.entries(PJ_CAMPOS).forEach(([id,prop])=>{
    let v = document.getElementById(id).value;
    if(PJ_CAMPOS_CORTOS.has(prop)) v = v.trim();
    datos[prop] = v;
  });
  return datos;
}
function activarPjTab(tabId){
  document.querySelectorAll('#modal-personaje .pj-tab').forEach(t=>t.classList.toggle('activo', t.dataset.tab===tabId));
  document.querySelectorAll('#modal-personaje .pj-panel').forEach(p=>p.classList.toggle('activo', p.dataset.tab===tabId));
}
document.querySelectorAll('#modal-personaje .pj-tab').forEach(t=>t.addEventListener('click', ()=>activarPjTab(t.dataset.tab)));

const ARQUETIPOS = [
  {id:'heroe', icono:'⚔️', nombre:'Héroe',
    habilidades:[{nombre:'Coraje en batalla',derivados:'liderazgo, resistencia'}],
    rasgos:'Valiente\nDeterminado\nLeal a sus principios', defectos:'Terquedad\nSe sacrifica en exceso',
    miedos:'Fracasar a quienes protege\nNo estar a la altura',
    deseoConsciente:'Vencer la amenaza y ser reconocido como héroe', necesidadInterna:'Aceptar que no puede salvar a todos',
    mentira:'Cree que debe hacerlo todo solo para ser digno', herida:'Falló en proteger a alguien en el pasado y no se lo perdona',
    defectoTragico:'Orgullo — no pide ayuda hasta que es demasiado tarde', miedoProfundo:'Ver morir a alguien que juró proteger',
    tipoArco:'Positivo / Redención', estadoInicial:'Inseguro de su valía, busca validación a través de la fuerza',
    estadoFinal:'Encuentra su valía en sus vínculos, no en sus victorias',
    objetivos:'Proteger a los suyos\nSuperar su mayor miedo', problemas:'Duda de sí mismo\nCarga con una pérdida pasada',
    vozTics:'Habla con convicción, frases motivadoras'},
  {id:'mentor', icono:'🧙', nombre:'Mentor',
    habilidades:[{nombre:'Sabiduría',derivados:'enseñanza, paciencia'}],
    rasgos:'Sabio\nPaciente\nObservador', defectos:'Reservado con su propio dolor\nA veces manipulador "por el bien mayor"',
    miedos:'Que su legado se pierda\nRepetir errores del pasado en su aprendiz',
    deseoConsciente:'Formar a un sucesor digno', necesidadInterna:'Dejar ir el control y confiar en otros',
    mentira:'Cree que debe controlar el resultado para que su legado importe', herida:'Un antiguo aprendiz suyo fracasó o se corrompió',
    defectoTragico:'Control excesivo — no sabe soltar', miedoProfundo:'Que su aprendiz repita sus mismos errores',
    tipoArco:'Plano / Estático', estadoInicial:'Guarda su sabiduría con cautela, desconfía de los jóvenes',
    estadoFinal:'Aprende a confiar en que otros continúen su camino',
    objetivos:'Guiar al protagonista\nTransmitir su legado', problemas:'Un secreto del pasado\nTiempo o vida limitados',
    vozTics:'Habla en metáforas y acertijos'},
  {id:'trickster', icono:'🎭', nombre:'Trickster',
    habilidades:[{nombre:'Astucia',derivados:'engaño, improvisación'}],
    rasgos:'Ingenioso\nImpredecible\nCarismático', defectos:'Deshonesto\nEvita la vulnerabilidad con humor',
    miedos:'El compromiso\nSer atrapado o controlado',
    deseoConsciente:'Salir siempre beneficiado sin ataduras', necesidadInterna:'Aprender que la conexión genuina no es una trampa',
    mentira:'Cree que si se compromete, perderá su libertad', herida:'Alguien traicionó su confianza al comprometerse',
    defectoTragico:'Evasión — huye de cualquier vínculo real', miedoProfundo:'Ser visto realmente por alguien',
    tipoArco:'Positivo / Redención', estadoInicial:'Usa el engaño como escudo emocional',
    estadoFinal:'Aprende que la vulnerabilidad no es debilidad',
    objetivos:'Salir siempre beneficiado\nEvitar ataduras', problemas:'Nadie confía del todo en él\nSus trucos pueden volverse en su contra',
    vozTics:'Bromea incluso en momentos serios'},
  {id:'antagonista', icono:'👿', nombre:'Antagonista',
    habilidades:[{nombre:'Manipulación',derivados:'estrategia, poder'}],
    rasgos:'Ambicioso\nInteligente\nImplacable', defectos:'Ciego ante sus propios errores\nDesconfiado',
    miedos:'Perder el control\nSer visto como débil',
    deseoConsciente:'Imponer su visión del mundo a cualquier costo', necesidadInterna:'Reconocer que su método está corrompido',
    mentira:'Cree que el poder es la única forma de estar a salvo', herida:'Fue humillado o traicionado desde una posición de vulnerabilidad',
    defectoTragico:'Soberbia — no admite estar equivocado', miedoProfundo:'Ser irrelevante u olvidado',
    tipoArco:'Negativo / Corrupción', estadoInicial:'Justifica sus métodos como necesarios',
    estadoFinal:'Se hunde más en la corrupción que él mismo causó',
    objetivos:'Imponer su visión del mundo\nDerrotar al protagonista', problemas:'Ciego ante sus propios errores\nRodeado de aliados poco leales',
    vozTics:'Habla con calma calculada, casi nunca grita'},
  {id:'amante', icono:'💕', nombre:'Amante',
    habilidades:[{nombre:'Empatía',derivados:'seducción, entrega'}],
    rasgos:'Apasionado\nEmpático\nEntregado', defectos:'Celoso\nSe pierde a sí mismo en la relación',
    miedos:'El abandono\nNo ser correspondido',
    deseoConsciente:'Estar junto a la persona amada', necesidadInterna:'Aprender a quererse sin depender de otro para ello',
    mentira:'Cree que no vale nada si no es amado por esa persona', herida:'Un abandono o rechazo temprano que definió su autoestima',
    defectoTragico:'Dependencia emocional', miedoProfundo:'Terminar solo para siempre',
    tipoArco:'Positivo / Redención', estadoInicial:'Se define a través de la mirada del otro',
    estadoFinal:'Aprende a amar sin perder su propia identidad',
    objetivos:'Estar junto a la persona amada\nSer correspondido', problemas:'Debe elegir entre el amor y el deber\nMiedo al abandono',
    vozTics:'Habla con el corazón en la mano'},
  {id:'cuidador', icono:'🤲', nombre:'Cuidador',
    habilidades:[{nombre:'Compasión',derivados:'sanación, sacrificio'}],
    rasgos:'Compasivo\nGeneroso\nProtector', defectos:'Se olvida de sus propias necesidades\nControlador con su protección',
    miedos:'No poder proteger a los suyos\nSer una carga',
    deseoConsciente:'Proteger y sanar a quienes ama', necesidadInterna:'Aprender a cuidar de sí mismo también',
    mentira:'Cree que su valor depende de cuánto se sacrifica', herida:'No pudo salvar o cuidar a alguien cuando más lo necesitaba',
    defectoTragico:'Autoabandono', miedoProfundo:'Que a quienes cuida les pase algo por su culpa',
    tipoArco:'Positivo / Redención', estadoInicial:'Se anula a sí mismo por los demás',
    estadoFinal:'Aprende que cuidarse a sí mismo no es egoísmo',
    objetivos:'Proteger a los débiles\nMantener unido al grupo', problemas:'Se olvida de sí mismo\nAgotamiento por dar tanto',
    vozTics:'Pregunta constantemente "¿estás bien?"'},
  {id:'explorador', icono:'🧭', nombre:'Explorador',
    habilidades:[{nombre:'Adaptación',derivados:'resistencia, orientación'}],
    rasgos:'Curioso\nIndependiente\nAdaptable', defectos:'Inconstante\nEvita compromisos profundos',
    miedos:'Quedarse atrapado en un solo lugar\nLa rutina',
    deseoConsciente:'Descubrir lo desconocido', necesidadInterna:'Aprender que también puede echar raíces sin perder su libertad',
    mentira:'Cree que echar raíces significa perder su libertad', herida:'Un lugar o vínculo del pasado lo asfixió o lo hirió',
    defectoTragico:'Huida constante ante el compromiso', miedoProfundo:'Despertar un día atrapado y sin salida',
    tipoArco:'Positivo / Redención', estadoInicial:'Huye de cualquier atadura o rutina',
    estadoFinal:'Encuentra un lugar (o persona) por el que vale la pena quedarse',
    objetivos:'Descubrir lo desconocido\nEscapar de la rutina', problemas:'Le cuesta echar raíces\nSoledad del camino',
    vozTics:'Habla de lugares y viajes constantemente'},
  {id:'rebelde', icono:'🔥', nombre:'Rebelde',
    habilidades:[{nombre:'Convicción',derivados:'valentía, desafío'}],
    rasgos:'Valiente\nApasionado\nDesafiante', defectos:'Impulsivo\nDesconfía de toda autoridad, incluso la buena',
    miedos:'La opresión\nVolverse como aquello que combate',
    deseoConsciente:'Derribar el sistema injusto', necesidadInterna:'Aprender a construir, no solo a destruir',
    mentira:'Cree que toda autoridad es corrupta por naturaleza', herida:'Fue traicionado o dañado por una figura de autoridad',
    defectoTragico:'Impulsividad destructiva', miedoProfundo:'Convertirse en aquello que combate',
    tipoArco:'Positivo / Redención', estadoInicial:'Destruye sin plan claro de qué construir después',
    estadoFinal:'Aprende a canalizar su rabia en un cambio real y sostenible',
    objetivos:'Derribar el sistema injusto\nSer libre', problemas:'Actúa antes de pensar\nDesconfía de la autoridad',
    vozTics:'Habla con urgencia, discursos encendidos'},
  {id:'sabio', icono:'📚', nombre:'Sabio',
    habilidades:[{nombre:'Intelecto',derivados:'análisis, memoria'}],
    rasgos:'Analítico\nReflexivo\nObservador', defectos:'Frío\nParalizado por el exceso de análisis',
    miedos:'Equivocarse públicamente\nLa irracionalidad ajena',
    deseoConsciente:'Comprender la verdad última de las cosas', necesidadInterna:'Conectar emocionalmente, no solo intelectualmente',
    mentira:'Cree que las emociones nublan la verdad', herida:'Una decisión emocional (propia o ajena) le costó cara',
    defectoTragico:'Desconexión emocional', miedoProfundo:'Estar profundamente equivocado sobre algo fundamental',
    tipoArco:'Positivo / Redención', estadoInicial:'Analiza todo mientras evita sentir',
    estadoFinal:'Integra la razón con la emoción',
    objetivos:'Comprender la verdad última\nCompartir el conocimiento', problemas:'Paralizado por el exceso de análisis\nDesconectado emocionalmente',
    vozTics:'Cita datos y precedentes constantemente'},
  {id:'bufon', icono:'🃏', nombre:'Bufón',
    habilidades:[{nombre:'Humor',derivados:'carisma, perspectiva'}],
    rasgos:'Ocurrente\nObservador\nResiliente', defectos:'Usa el humor para evitar temas serios\nEvita la vulnerabilidad',
    miedos:'No ser tomado en serio nunca\nEl silencio incómodo',
    deseoConsciente:'Aliviar el sufrimiento ajeno con humor', necesidadInterna:'Permitirse mostrar su propio dolor',
    mentira:'Cree que si baja la guardia, todos lo abandonarán', herida:'Su dolor fue ignorado o ridiculizado en el pasado',
    defectoTragico:'Usa el humor para evitar la intimidad real', miedoProfundo:'Que descubran lo roto que está por dentro',
    tipoArco:'Positivo / Redención', estadoInicial:'Esconde su dolor detrás de cada broma',
    estadoFinal:'Se permite ser vulnerable frente a alguien de confianza',
    objetivos:'Aliviar el sufrimiento ajeno\nDecir verdades incómodas', problemas:'Usa el humor para evitar el dolor propio\nNo lo toman en serio',
    vozTics:'Convierte todo en un chiste'}
];
function pintarArquetipos(){
  const grid = document.getElementById('pj-arquetipos-grid');
  grid.innerHTML = ARQUETIPOS.map(a=>`<button type="button" class="arquetipo-btn" data-id="${a.id}"><span>${a.icono}</span>${a.nombre}</button>`).join('');
  grid.querySelectorAll('.arquetipo-btn').forEach(b=>b.addEventListener('click', ()=>{
    const a = ARQUETIPOS.find(x=>x.id===b.dataset.id); if(!a) return;
    pjHabilidadesTemp = a.habilidades.map(h=>({...h}));
    renderHabilidadesRows();
    document.getElementById('pj-rol').value = a.nombre;
    document.getElementById('pj-rasgos').value = a.rasgos;
    document.getElementById('pj-defectos').value = a.defectos;
    document.getElementById('pj-miedos').value = a.miedos;
    document.getElementById('pj-deseo').value = a.deseoConsciente;
    document.getElementById('pj-necesidad').value = a.necesidadInterna;
    document.getElementById('pj-mentira').value = a.mentira;
    document.getElementById('pj-herida').value = a.herida;
    document.getElementById('pj-defecto-tragico').value = a.defectoTragico;
    document.getElementById('pj-miedo-profundo').value = a.miedoProfundo;
    document.getElementById('pj-tipo-arco').value = a.tipoArco;
    document.getElementById('pj-estado-inicial').value = a.estadoInicial;
    document.getElementById('pj-estado-final').value = a.estadoFinal;
    document.getElementById('pj-objetivos').value = a.objetivos;
    document.getElementById('pj-problemas').value = a.problemas;
    document.getElementById('pj-voz').value = a.vozTics;
    toast('Arquetipo aplicado — personalízalo a tu gusto');
  }));
}
function abrirModalPersonajeNueva(){
  pjEditandoId=null; pjImagenTemp=null; pjHabilidadesTemp=[];
  pintarListaRazas();
  pintarArquetipos();
  activarPjTab('identidad');
  document.getElementById('pj-arquetipos-wrap').classList.remove('oculto');
  document.getElementById('pj-modal-titulo').textContent='Nuevo personaje';
  limpiarCamposPersonaje();
  document.getElementById('pj-imagen').value='';
  document.getElementById('pj-imagen-preview').classList.remove('activo');
  pintarSelectorColor('pj-color', '#9f5cf5');
  renderHabilidadesRows();
  document.getElementById('btn-borrar-personaje').style.display='none';
  abrirOverlay(document.getElementById('modal-personaje'));
}
function abrirModalPersonaje(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  pjEditandoId=id; pjImagenTemp=e.imagen||null; pjHabilidadesTemp=(e.habilidades||[]).map(h=>({nombre:h.nombre,derivados:h.derivados}));
  pintarListaRazas();
  activarPjTab('identidad');
  document.getElementById('pj-arquetipos-wrap').classList.add('oculto');
  document.getElementById('pj-modal-titulo').textContent='Editar personaje';
  cargarCamposPersonaje(e);
  const prev = document.getElementById('pj-imagen-preview');
  if(e.imagen){ prev.src=e.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('pj-imagen').value='';
  pintarSelectorColor('pj-color', e.color);
  renderHabilidadesRows();
  document.getElementById('btn-borrar-personaje').style.display='block';
  abrirOverlay(document.getElementById('modal-personaje'));
}
document.getElementById('btn-guardar-personaje').addEventListener('click', ()=>{
  const datos = leerCamposPersonaje();
  if(!datos.nombre) return toast('Ponle un nombre al personaje');
  const colorSel = document.querySelector('#pj-color span.sel');
  datos.habilidades = pjHabilidadesTemp.filter(h=>h.nombre && h.nombre.trim());
  datos.color = colorSel? colorSel.dataset.c : '#9f5cf5';
  datos.imagen = pjImagenTemp;
  if(pjEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===pjEditandoId), datos); }
  else { proyecto.entidades.push(Object.assign({id:idNuevo(), tipo:'personaje', x:null,y:null}, datos)); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-personaje'));
  refrescarVistasEntidades();
  toast('Personaje guardado');
});
document.getElementById('btn-borrar-personaje').addEventListener('click', ()=>{
  if(!pjEditandoId) return;
  moverEntidadAPapelera(pjEditandoId);
  cerrarOverlay(document.getElementById('modal-personaje'));
});

/* ---- lugar ---- */
let lgEditandoId=null, lgImagenTemp=null;
function pintarSubtiposLugar(){ document.getElementById('lg-subtipo').innerHTML = SUBTIPOS_LUGAR.map(s=>`<option value="${s}">${s}</option>`).join(''); }
manejarInputImagen('lg-imagen','lg-imagen-preview', (data)=>{ lgImagenTemp=data; });
function abrirModalLugarNueva(){
  lgEditandoId=null; lgImagenTemp=null;
  pintarSubtiposLugar();
  document.getElementById('lg-modal-titulo').textContent='Nuevo lugar';
  document.getElementById('lg-nombre').value=''; document.getElementById('lg-desc').value='';
  document.getElementById('lg-subtipo').value='Ciudad';
  document.getElementById('lg-es-mundo').checked=false;
  document.getElementById('lg-imagen').value='';
  document.getElementById('lg-imagen-preview').classList.remove('activo');
  pintarSelectorColor('lg-color','#22d3ee');
  document.getElementById('btn-borrar-lugar').style.display='none';
  abrirOverlay(document.getElementById('modal-lugar'));
}
function abrirModalLugar(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  lgEditandoId=id; lgImagenTemp=e.imagen||null;
  pintarSubtiposLugar();
  document.getElementById('lg-modal-titulo').textContent='Editar lugar';
  document.getElementById('lg-nombre').value=e.nombre||'';
  document.getElementById('lg-desc').value=e.desc||'';
  document.getElementById('lg-subtipo').value=e.subtipo||'Ciudad';
  document.getElementById('lg-es-mundo').checked=!!e.esMundo;
  const prev=document.getElementById('lg-imagen-preview');
  if(e.imagen){ prev.src=e.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('lg-imagen').value='';
  pintarSelectorColor('lg-color', e.color);
  document.getElementById('btn-borrar-lugar').style.display='block';
  abrirOverlay(document.getElementById('modal-lugar'));
}
document.getElementById('btn-guardar-lugar').addEventListener('click', ()=>{
  const nombre = document.getElementById('lg-nombre').value.trim();
  if(!nombre) return toast('Ponle un nombre al lugar');
  const colorSel = document.querySelector('#lg-color span.sel');
  const datos = {
    nombre, desc: document.getElementById('lg-desc').value,
    subtipo: document.getElementById('lg-subtipo').value,
    esMundo: document.getElementById('lg-es-mundo').checked,
    color: colorSel? colorSel.dataset.c : '#22d3ee',
    imagen: lgImagenTemp
  };
  if(lgEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===lgEditandoId), datos); }
  else { proyecto.entidades.push(Object.assign({id:idNuevo(), tipo:'lugar', x:null,y:null}, datos)); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-lugar'));
  refrescarVistasEntidades();
  toast('Lugar guardado');
});
document.getElementById('btn-borrar-lugar').addEventListener('click', ()=>{
  if(!lgEditandoId) return;
  moverEntidadAPapelera(lgEditandoId);
  cerrarOverlay(document.getElementById('modal-lugar'));
});

/* ---- objetos ---- */
let objEditandoId=null, objImagenTemp=null;
manejarInputImagen('obj-imagen','obj-imagen-preview', (data)=>{ objImagenTemp=data; });
function pintarCategoriasObjeto(){
  const sugeridas = ['Arma','Reliquia','Artefacto mágico','Vestimenta','Documento','Vehículo','Herramienta','Tecnología','Joya','Comida/Bebida'];
  const usadas = proyecto.entidades.filter(e=>e.tipo==='objeto' && e.categoria).map(e=>e.categoria);
  document.getElementById('lista-categorias-objeto').innerHTML = Array.from(new Set([...sugeridas, ...usadas])).map(c=>`<option value="${escapeHtml(c)}">`).join('');
  const subUsadas = proyecto.entidades.filter(e=>e.tipo==='objeto' && e.subcategoria).map(e=>e.subcategoria);
  document.getElementById('lista-subcategorias-objeto').innerHTML = Array.from(new Set(subUsadas)).map(c=>`<option value="${escapeHtml(c)}">`).join('');
}
function abrirModalObjetoNueva(){
  objEditandoId=null; objImagenTemp=null;
  pintarCategoriasObjeto();
  document.getElementById('obj-modal-titulo').textContent='Nuevo objeto';
  document.getElementById('obj-nombre').value=''; document.getElementById('obj-categoria').value=''; document.getElementById('obj-subcategoria').value='';
  document.getElementById('obj-desc').value=''; document.getElementById('obj-historia').value='';
  document.getElementById('obj-imagen').value='';
  document.getElementById('obj-imagen-preview').classList.remove('activo');
  pintarSelectorColor('obj-color','#f5a623');
  document.getElementById('btn-borrar-objeto').style.display='none';
  abrirOverlay(document.getElementById('modal-objeto'));
}
function abrirModalObjeto(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  objEditandoId=id; objImagenTemp=e.imagen||null;
  pintarCategoriasObjeto();
  document.getElementById('obj-modal-titulo').textContent='Editar objeto';
  document.getElementById('obj-nombre').value=e.nombre||'';
  document.getElementById('obj-categoria').value=e.categoria||'';
  document.getElementById('obj-subcategoria').value=e.subcategoria||'';
  document.getElementById('obj-desc').value=e.desc||'';
  document.getElementById('obj-historia').value=e.historia||'';
  const prev=document.getElementById('obj-imagen-preview');
  if(e.imagen){ prev.src=e.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('obj-imagen').value='';
  pintarSelectorColor('obj-color', e.color);
  document.getElementById('btn-borrar-objeto').style.display='block';
  abrirOverlay(document.getElementById('modal-objeto'));
}
document.getElementById('btn-guardar-objeto').addEventListener('click', ()=>{
  const nombre = document.getElementById('obj-nombre').value.trim();
  if(!nombre) return toast('Ponle un nombre al objeto');
  const colorSel = document.querySelector('#obj-color span.sel');
  const datos = {
    nombre, categoria: document.getElementById('obj-categoria').value.trim(),
    subcategoria: document.getElementById('obj-subcategoria').value.trim(),
    desc: document.getElementById('obj-desc').value,
    historia: document.getElementById('obj-historia').value,
    color: colorSel? colorSel.dataset.c : '#f5a623',
    imagen: objImagenTemp
  };
  if(objEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===objEditandoId), datos); }
  else { proyecto.entidades.push(Object.assign({id:idNuevo(), tipo:'objeto', x:null,y:null}, datos)); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-objeto'));
  refrescarVistasEntidades();
  toast('Objeto guardado');
});
document.getElementById('btn-borrar-objeto').addEventListener('click', ()=>{
  if(!objEditandoId) return;
  moverEntidadAPapelera(objEditandoId);
  cerrarOverlay(document.getElementById('modal-objeto'));
});

/* ---- generador reutilizable de listas de habilidades ---- */
function crearGestorHabilidades(contenedorId, getArr){
  return function render(){
    const cont = document.getElementById(contenedorId);
    cont.innerHTML='';
    getArr().forEach((h,i)=>{
      const row = document.createElement('div'); row.className='habilidad-row';
      const inpNombre = document.createElement('input'); inpNombre.placeholder='Nombre'; inpNombre.value=h.nombre||'';
      const inpDeriv = document.createElement('input'); inpDeriv.placeholder='Derivados, separados, por, coma'; inpDeriv.value=h.derivados||'';
      inpNombre.addEventListener('input', ()=>{ getArr()[i].nombre = inpNombre.value; });
      inpDeriv.addEventListener('input', ()=>{ getArr()[i].derivados = inpDeriv.value; });
      const btnDel = document.createElement('button'); btnDel.type='button'; btnDel.textContent='✕';
      btnDel.addEventListener('click', ()=>{ getArr().splice(i,1); render(); });
      row.appendChild(inpNombre); row.appendChild(inpDeriv); row.appendChild(btnDel);
      cont.appendChild(row);
    });
  };
}
function pintarListaRazas(){
  const nombres = proyecto.entidades.filter(e=>e.tipo==='raza').map(e=>e.nombre);
  const dl = document.getElementById('lista-razas');
  if(dl) dl.innerHTML = nombres.map(n=>`<option value="${escapeHtml(n)}">`).join('');
}

/* ---- criaturas ---- */
let crEditandoId=null, crImagenTemp=null, crHabilidadesTemp=[];
const renderHabilidadesCriatura = crearGestorHabilidades('cr-habilidades-lista', ()=>crHabilidadesTemp);
document.getElementById('cr-add-habilidad').addEventListener('click', ()=>{ crHabilidadesTemp.push({nombre:'',derivados:''}); renderHabilidadesCriatura(); });
manejarInputImagen('cr-imagen','cr-imagen-preview', (data)=>{ crImagenTemp=data; });
function pintarCategoriasCriatura(){
  const sugeridas = ['Bestia mágica','Animal','No-muerto','Espíritu','Aberración','Elemental','Monstruo'];
  const usadas = proyecto.entidades.filter(e=>e.tipo==='criatura' && e.categoria).map(e=>e.categoria);
  document.getElementById('lista-categorias-criatura').innerHTML = Array.from(new Set([...sugeridas, ...usadas])).map(c=>`<option value="${escapeHtml(c)}">`).join('');
}
function abrirModalCriaturaNueva(){
  crEditandoId=null; crImagenTemp=null; crHabilidadesTemp=[];
  pintarCategoriasCriatura(); pintarListaRazas();
  document.getElementById('cr-modal-titulo').textContent='Nueva criatura';
  ['cr-nombre','cr-categoria','cr-raza','cr-habitat','cr-dieta','cr-desc','cr-comportamiento','cr-debilidades','cr-historia'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cr-peligro').value='3';
  document.getElementById('cr-imagen').value='';
  document.getElementById('cr-imagen-preview').classList.remove('activo');
  pintarSelectorColor('cr-color','#ef4444');
  renderHabilidadesCriatura();
  document.getElementById('btn-borrar-criatura').style.display='none';
  abrirOverlay(document.getElementById('modal-criatura'));
}
function abrirModalCriatura(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  crEditandoId=id; crImagenTemp=e.imagen||null; crHabilidadesTemp=(e.habilidades||[]).map(h=>({nombre:h.nombre,derivados:h.derivados}));
  pintarCategoriasCriatura(); pintarListaRazas();
  document.getElementById('cr-modal-titulo').textContent='Editar criatura';
  document.getElementById('cr-nombre').value=e.nombre||'';
  document.getElementById('cr-categoria').value=e.categoria||'';
  document.getElementById('cr-raza').value=e.raza||'';
  document.getElementById('cr-habitat').value=e.habitat||'';
  document.getElementById('cr-dieta').value=e.dieta||'';
  document.getElementById('cr-peligro').value=e.peligro||'3';
  document.getElementById('cr-desc').value=e.desc||'';
  document.getElementById('cr-comportamiento').value=e.comportamiento||'';
  document.getElementById('cr-debilidades').value=e.debilidades||'';
  document.getElementById('cr-historia').value=e.historia||'';
  const prev=document.getElementById('cr-imagen-preview');
  if(e.imagen){ prev.src=e.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('cr-imagen').value='';
  pintarSelectorColor('cr-color', e.color);
  renderHabilidadesCriatura();
  document.getElementById('btn-borrar-criatura').style.display='block';
  abrirOverlay(document.getElementById('modal-criatura'));
}
document.getElementById('btn-guardar-criatura').addEventListener('click', ()=>{
  const nombre = document.getElementById('cr-nombre').value.trim();
  if(!nombre) return toast('Ponle un nombre a la criatura');
  const colorSel = document.querySelector('#cr-color span.sel');
  const datos = {
    nombre, categoria: document.getElementById('cr-categoria').value.trim(),
    raza: document.getElementById('cr-raza').value.trim(),
    habitat: document.getElementById('cr-habitat').value.trim(),
    dieta: document.getElementById('cr-dieta').value.trim(),
    peligro: document.getElementById('cr-peligro').value,
    desc: document.getElementById('cr-desc').value,
    comportamiento: document.getElementById('cr-comportamiento').value,
    habilidades: crHabilidadesTemp.filter(h=>h.nombre && h.nombre.trim()),
    debilidades: document.getElementById('cr-debilidades').value,
    historia: document.getElementById('cr-historia').value,
    color: colorSel? colorSel.dataset.c : '#ef4444',
    imagen: crImagenTemp
  };
  if(crEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===crEditandoId), datos); }
  else { proyecto.entidades.push(Object.assign({id:idNuevo(), tipo:'criatura', x:null,y:null}, datos)); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-criatura'));
  refrescarVistasEntidades();
  toast('Criatura guardada');
});
document.getElementById('btn-borrar-criatura').addEventListener('click', ()=>{
  if(!crEditandoId) return;
  moverEntidadAPapelera(crEditandoId);
  cerrarOverlay(document.getElementById('modal-criatura'));
});

/* ---- razas ---- */
let rzEditandoId=null, rzImagenTemp=null, rzHabilidadesTemp=[];
const renderHabilidadesRaza = crearGestorHabilidades('rz-habilidades-lista', ()=>rzHabilidadesTemp);
document.getElementById('rz-add-habilidad').addEventListener('click', ()=>{ rzHabilidadesTemp.push({nombre:'',derivados:''}); renderHabilidadesRaza(); });
manejarInputImagen('rz-imagen','rz-imagen-preview', (data)=>{ rzImagenTemp=data; });
function contarVinculadosARaza(nombreRaza){
  if(!nombreRaza) return 0;
  const nl = nombreRaza.trim().toLowerCase();
  return proyecto.entidades.filter(e=> (e.tipo==='personaje'||e.tipo==='criatura') && (e.raza||'').trim().toLowerCase()===nl).length;
}
function abrirModalRazaNueva(){
  rzEditandoId=null; rzImagenTemp=null; rzHabilidadesTemp=[];
  document.getElementById('rz-modal-titulo').textContent='Nueva raza';
  ['rz-nombre','rz-desc','rz-longevidad','rz-habitat','rz-cultura','rz-religion','rz-historia','rz-magia','rz-debilidades'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rz-imagen').value='';
  document.getElementById('rz-imagen-preview').classList.remove('activo');
  pintarSelectorColor('rz-color','#2ec48a');
  renderHabilidadesRaza();
  document.getElementById('rz-contador').textContent='0';
  document.getElementById('btn-borrar-raza').style.display='none';
  abrirOverlay(document.getElementById('modal-raza'));
}
function abrirModalRaza(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  rzEditandoId=id; rzImagenTemp=e.imagen||null; rzHabilidadesTemp=(e.habilidades||[]).map(h=>({nombre:h.nombre,derivados:h.derivados}));
  document.getElementById('rz-modal-titulo').textContent='Editar raza';
  document.getElementById('rz-nombre').value=e.nombre||'';
  document.getElementById('rz-desc').value=e.desc||'';
  document.getElementById('rz-longevidad').value=e.longevidad||'';
  document.getElementById('rz-habitat').value=e.habitat||'';
  document.getElementById('rz-cultura').value=e.cultura||'';
  document.getElementById('rz-religion').value=e.religion||'';
  document.getElementById('rz-historia').value=e.historia||'';
  document.getElementById('rz-magia').value=e.magia||'';
  document.getElementById('rz-debilidades').value=e.debilidades||'';
  const prev=document.getElementById('rz-imagen-preview');
  if(e.imagen){ prev.src=e.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('rz-imagen').value='';
  pintarSelectorColor('rz-color', e.color);
  renderHabilidadesRaza();
  document.getElementById('rz-contador').textContent = contarVinculadosARaza(e.nombre);
  document.getElementById('btn-borrar-raza').style.display='block';
  abrirOverlay(document.getElementById('modal-raza'));
}
document.getElementById('btn-guardar-raza').addEventListener('click', ()=>{
  const nombre = document.getElementById('rz-nombre').value.trim();
  if(!nombre) return toast('Ponle un nombre a la raza');
  const colorSel = document.querySelector('#rz-color span.sel');
  const datos = {
    nombre, desc: document.getElementById('rz-desc').value,
    longevidad: document.getElementById('rz-longevidad').value.trim(),
    habitat: document.getElementById('rz-habitat').value.trim(),
    cultura: document.getElementById('rz-cultura').value,
    religion: document.getElementById('rz-religion').value,
    historia: document.getElementById('rz-historia').value,
    magia: document.getElementById('rz-magia').value,
    habilidades: rzHabilidadesTemp.filter(h=>h.nombre && h.nombre.trim()),
    debilidades: document.getElementById('rz-debilidades').value,
    color: colorSel? colorSel.dataset.c : '#2ec48a',
    imagen: rzImagenTemp
  };
  if(rzEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===rzEditandoId), datos); }
  else { proyecto.entidades.push(Object.assign({id:idNuevo(), tipo:'raza', x:null,y:null}, datos)); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-raza'));
  refrescarVistasEntidades();
  toast('Raza guardada');
});
document.getElementById('btn-borrar-raza').addEventListener('click', ()=>{
  if(!rzEditandoId) return;
  moverEntidadAPapelera(rzEditandoId);
  cerrarOverlay(document.getElementById('modal-raza'));
});

/* ---- ficha genérica ---- */
let otroEditandoId=null;
document.getElementById('btn-nueva-otro').addEventListener('click', ()=>{
  if(mundoFiltro==='personaje') abrirModalPersonajeNueva();
  else if(mundoFiltro==='lugar') abrirModalLugarNueva();
  else if(mundoFiltro==='objeto') abrirModalObjetoNueva();
  else if(mundoFiltro==='criatura') abrirModalCriaturaNueva();
  else if(mundoFiltro==='raza') abrirModalRazaNueva();
  else abrirModalOtroNueva();
});
function abrirModalOtroNueva(){
  otroEditandoId=null;
  document.getElementById('otro-nombre').value=''; document.getElementById('otro-desc').value='';
  document.getElementById('otro-tipo').value='cultura';
  pintarSelectorColor('otro-color','#f5a623');
  document.getElementById('btn-borrar-otro').style.display='none';
  abrirOverlay(document.getElementById('modal-otro'));
}
function abrirModalOtro(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  otroEditandoId=id;
  document.getElementById('otro-nombre').value=e.nombre;
  document.getElementById('otro-tipo').value=e.tipo;
  document.getElementById('otro-desc').value=e.desc||'';
  pintarSelectorColor('otro-color', e.color);
  document.getElementById('btn-borrar-otro').style.display='block';
  abrirOverlay(document.getElementById('modal-otro'));
}
document.getElementById('btn-guardar-otro').addEventListener('click', ()=>{
  const nombre = document.getElementById('otro-nombre').value.trim();
  if(!nombre) return toast('Ponle un nombre');
  const tipo = document.getElementById('otro-tipo').value;
  const desc = document.getElementById('otro-desc').value;
  const colorSel = document.querySelector('#otro-color span.sel');
  const color = colorSel? colorSel.dataset.c : '#f5a623';
  if(otroEditandoId){ Object.assign(proyecto.entidades.find(x=>x.id===otroEditandoId),{nombre,tipo,desc,color}); }
  else { proyecto.entidades.push({id:idNuevo(),nombre,tipo,desc,color,imagen:null,x:null,y:null}); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-otro'));
  refrescarVistasEntidades();
  toast('Ficha guardada');
});
document.getElementById('btn-borrar-otro').addEventListener('click', ()=>{
  if(!otroEditandoId) return;
  moverEntidadAPapelera(otroEditandoId);
  cerrarOverlay(document.getElementById('modal-otro'));
});

function abrirModalEntidad(id){
  const e = proyecto.entidades.find(x=>x.id===id); if(!e) return;
  if(e.tipo==='personaje') abrirModalPersonaje(id);
  else if(e.tipo==='lugar') abrirModalLugar(id);
  else if(e.tipo==='objeto') abrirModalObjeto(id);
  else if(e.tipo==='criatura') abrirModalCriatura(id);
  else if(e.tipo==='raza') abrirModalRaza(id);
  else abrirModalOtro(id);
}
function moverEntidadAPapelera(id){
  const idx = proyecto.entidades.findIndex(x=>x.id===id);
  if(idx===-1) return;
  const entidad = proyecto.entidades[idx];
  const relacionadas = (proyecto.relaciones||[]).filter(r=>r.origen===id||r.destino===id);
  proyecto.relaciones = (proyecto.relaciones||[]).filter(r=>r.origen!==id && r.destino!==id);
  proyecto.entidades.splice(idx,1);
  proyecto.papelera.push({id:idNuevo(), tipoPapelera:'entidad', fecha:Date.now(), datos:entidad, relacionesGuardadas:relacionadas});
  guardarProyecto(true);
  refrescarVistasEntidades();
  toast('Movido a la papelera');
}

/* ---- relaciones / genealogía ---- */
let relEditando = {origen:null,destino:null,id:null};
function pintarSelectRelacion(){
  const opciones = Object.entries(TIPOS_RELACION).map(([grupo,tipos])=>
    `<optgroup label="${grupo}">${tipos.map(t=>`<option value="${t}">${t}</option>`).join('')}</optgroup>`
  ).join('');
  document.getElementById('rel-tipo').innerHTML = opciones;
  document.getElementById('rel-tipo-inverso').innerHTML = '<option value="">— Igual que la anterior —</option>' + opciones;
}
function abrirModalRelacion(origenId, destinoId, relId){
  pintarSelectRelacion();
  relEditando = {origen:origenId, destino:destinoId, id:relId||null};
  const oE = proyecto.entidades.find(e=>e.id===origenId), dE = proyecto.entidades.find(e=>e.id===destinoId);
  document.getElementById('rel-origen-nombre').textContent = oE? oE.nombre : '?';
  document.getElementById('rel-destino-nombre').textContent = dE? dE.nombre : '?';
  document.getElementById('rel-tipo-label').innerHTML = `¿Cómo ve "${escapeHtml(oE?oE.nombre:'De')}" a "${escapeHtml(dE?dE.nombre:'A')}"?`;
  document.getElementById('rel-tipo-inv-label').innerHTML = `¿Cómo ve "${escapeHtml(dE?dE.nombre:'A')}" a "${escapeHtml(oE?oE.nombre:'De')}"? (opcional, para relaciones asimétricas)`;
  if(relId){
    const rel = proyecto.relaciones.find(r=>r.id===relId);
    document.getElementById('rel-tipo').value = rel.tipo||'';
    document.getElementById('rel-tipo-inverso').value = rel.tipoInverso||'';
    document.getElementById('rel-detalle').value = rel.detalle||'';
    document.getElementById('btn-borrar-relacion').style.display='block';
  } else {
    document.getElementById('rel-tipo').value='';
    document.getElementById('rel-tipo-inverso').value='';
    document.getElementById('rel-detalle').value='';
    document.getElementById('btn-borrar-relacion').style.display='none';
  }
  abrirOverlay(document.getElementById('modal-relacion'));
}
document.getElementById('btn-guardar-relacion').addEventListener('click', ()=>{
  const tipo = document.getElementById('rel-tipo').value;
  const tipoInverso = document.getElementById('rel-tipo-inverso').value;
  const detalle = document.getElementById('rel-detalle').value.slice(0,200);
  if(relEditando.id){ Object.assign(proyecto.relaciones.find(r=>r.id===relEditando.id), {tipo,tipoInverso,detalle}); }
  else { proyecto.relaciones.push({id:idNuevo(), origen:relEditando.origen, destino:relEditando.destino, tipo, tipoInverso, detalle}); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-relacion'));
  renderMapa();
  toast('Vínculo guardado');
});
document.getElementById('btn-borrar-relacion').addEventListener('click', ()=>{
  proyecto.relaciones = proyecto.relaciones.filter(r=>r.id!==relEditando.id);
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-relacion'));
  renderMapa();
  toast('Vínculo eliminado');
});

/* ---- investigación ---- */
let invEditandoId=null, invImagenTemp=null;
manejarInputImagen('inv-imagen','inv-imagen-preview', (data)=>{ invImagenTemp=data; });
function abrirModalInvestigacionNueva(){
  invEditandoId=null; invImagenTemp=null;
  document.getElementById('inv-modal-titulo').textContent='Nueva nota de investigación';
  document.getElementById('inv-titulo').value=''; document.getElementById('inv-etiquetas').value=''; document.getElementById('inv-contenido').value='';
  document.getElementById('inv-imagen-preview').classList.remove('activo');
  document.getElementById('inv-imagen').value='';
  document.getElementById('btn-borrar-investigacion').style.display='none';
  abrirOverlay(document.getElementById('modal-investigacion'));
}
function abrirModalInvestigacion(id){
  const item = proyecto.investigacion.find(x=>x.id===id); if(!item) return;
  invEditandoId=id; invImagenTemp=item.imagen||null;
  document.getElementById('inv-modal-titulo').textContent='Editar nota';
  document.getElementById('inv-titulo').value=item.titulo;
  document.getElementById('inv-etiquetas').value=item.etiquetas||'';
  document.getElementById('inv-contenido').value=item.contenido||'';
  const prev = document.getElementById('inv-imagen-preview');
  if(item.imagen){ prev.src=item.imagen; prev.classList.add('activo'); } else prev.classList.remove('activo');
  document.getElementById('inv-imagen').value='';
  document.getElementById('btn-borrar-investigacion').style.display='block';
  abrirOverlay(document.getElementById('modal-investigacion'));
}
document.getElementById('btn-guardar-investigacion').addEventListener('click', ()=>{
  const titulo = document.getElementById('inv-titulo').value.trim();
  if(!titulo) return toast('Ponle un título a la nota');
  const etiquetas = document.getElementById('inv-etiquetas').value.trim();
  const contenido = document.getElementById('inv-contenido').value;
  if(invEditandoId){ Object.assign(proyecto.investigacion.find(x=>x.id===invEditandoId),{titulo,etiquetas,contenido,imagen:invImagenTemp}); }
  else { proyecto.investigacion.push({id:idNuevo(),titulo,etiquetas,contenido,imagen:invImagenTemp,fecha:Date.now()}); }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-investigacion'));
  pintarPanelInvestigacion();
  toast('Nota guardada');
});
document.getElementById('btn-borrar-investigacion').addEventListener('click', ()=>{
  if(!invEditandoId) return;
  const item = proyecto.investigacion.find(x=>x.id===invEditandoId);
  proyecto.investigacion = proyecto.investigacion.filter(x=>x.id!==invEditandoId);
  proyecto.papelera.push({id:idNuevo(), tipoPapelera:'investigacion', fecha:Date.now(), datos:item});
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-investigacion'));
  pintarPanelInvestigacion();
  toast('Movido a la papelera');
});
function pintarPanelInvestigacion(){
  const cont = document.getElementById('arbol');
  cont.innerHTML='';
  if(!proyecto.investigacion.length){ cont.innerHTML='<p style="padding:14px;color:var(--texto-tenue);font-size:12px">Sin notas de investigación. Pulsa ＋ para crear una (referencias, datos técnicos, jerga, imágenes de apoyo…).</p>'; return; }
  proyecto.investigacion.forEach(item=>{
    const div=document.createElement('div');
    div.className='tarjeta-inv';
    const tags = (item.etiquetas||'').split(',').map(t=>t.trim()).filter(Boolean);
    div.innerHTML = `<h4>${escapeHtml(item.titulo)}</h4><div class="etiquetas">${tags.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div>`;
    div.addEventListener('click', ()=>abrirModalInvestigacion(item.id));
    cont.appendChild(div);
  });
}

/* ---- papelera ---- */
function renderPapelera(){
  const cont = document.getElementById('arbol');
  cont.innerHTML='';
  if(!proyecto.papelera.length){ cont.innerHTML = '<p style="padding:14px;color:var(--texto-tenue);font-size:12px">La papelera está vacía.</p>'; return; }
  proyecto.papelera.slice().reverse().forEach(item=>{
    const div = document.createElement('div');
    div.className='papelera-item';
    const nombre = item.tipoPapelera==='nodo'? item.datos.titulo : (item.datos.nombre || item.datos.titulo);
    const icono = item.tipoPapelera==='nodo'? iconoTipo(item.datos.tipo) : (item.tipoPapelera==='entidad'? (ICONO_POR_TIPO[item.datos.tipo]||'🌐') : item.tipoPapelera==='evento'? '🕒' : '🗒');
    div.innerHTML = `<span style="font-size:16px">${icono}</span><div class="info"><b>${escapeHtml(nombre||'Sin título')}</b><small>Eliminado ${new Date(item.fecha).toLocaleString('es-ES')}</small></div><div class="acciones"><button data-restaurar="${item.id}" title="Restaurar">♻️</button><button data-eliminar="${item.id}" title="Eliminar definitivamente">🗑</button></div>`;
    cont.appendChild(div);
  });
  cont.querySelectorAll('[data-restaurar]').forEach(b=>b.addEventListener('click', ()=>restaurarDePapelera(b.dataset.restaurar)));
  cont.querySelectorAll('[data-eliminar]').forEach(b=>b.addEventListener('click', async ()=>{
    const ok = await confirmarPersonalizado('¿Eliminar definitivamente? Esta acción no se puede deshacer.', {titulo:'Eliminar para siempre', peligro:true, textoAceptar:'Eliminar para siempre'});
    if(ok){
      proyecto.papelera = proyecto.papelera.filter(x=>x.id!==b.dataset.eliminar);
      guardarProyecto(true); renderPapelera();
    }
  }));
}
function restaurarDePapelera(id){
  const item = proyecto.papelera.find(x=>x.id===id); if(!item) return;
  if(item.tipoPapelera==='nodo'){
    const padre = item.padreId ? encontrarNodo(item.padreId) : null;
    const destino = (padre && Array.isArray(padre.hijos)) ? padre.hijos : proyecto.arbol;
    destino.splice(Math.min(item.posicion == null ? destino.length : item.posicion, destino.length), 0, item.datos);
    renderArbol();
  }
  else if(item.tipoPapelera==='entidad'){ proyecto.entidades.push(item.datos); if(item.relacionesGuardadas) proyecto.relaciones.push(...item.relacionesGuardadas); }
  else if(item.tipoPapelera==='investigacion'){ proyecto.investigacion.push(item.datos); }
  else if(item.tipoPapelera==='evento'){ proyecto.eventos.push(item.datos); }
  proyecto.papelera = proyecto.papelera.filter(x=>x.id!==id);
  guardarProyecto(true);
  renderPapelera();
  toast('Restaurado');
}

/* ---- línea de tiempo del mundo ---- */
let evEditandoId=null;
function renderTimeline(){
  if(!proyecto) return;
  const cont = document.getElementById('linea-lista');
  cont.innerHTML='';
  if(!proyecto.eventos.length){ cont.innerHTML = '<p style="color:var(--texto-tenue);font-size:12.5px">Sin eventos todavía. Pulsa «＋ Nuevo evento» para empezar a construir la historia de tu mundo.</p>'; return; }
  const ordenados = proyecto.eventos.slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  ordenados.forEach((ev,i)=>{
    const div = document.createElement('div');
    div.className='evento-item';
    if(ev.color) div.style.setProperty('--dot-color', ev.color);
    if(ev.color){ div.style.borderLeftColor = ev.color; }
    div.innerHTML = `
      <div class="ev-orden">
        <button data-subir="${ev.id}" title="Mover antes" ${i===0?'disabled':''}>▲</button>
        <button data-bajar="${ev.id}" title="Mover después" ${i===ordenados.length-1?'disabled':''}>▼</button>
      </div>
      <div class="ev-fecha">${escapeHtml(ev.fecha||'')}</div>
      <h4>${escapeHtml(ev.titulo)}</h4>
      <p>${escapeHtml((ev.descripcion||'').slice(0,220))}</p>`;
    if(ev.color) div.querySelector('h4').style.color = ev.color;
    div.addEventListener('click', (e)=>{ if(e.target.closest('[data-subir],[data-bajar]')) return; abrirModalEvento(ev.id); });
    cont.appendChild(div);
  });
  cont.querySelectorAll('[data-subir]').forEach(b=>b.addEventListener('click', (e)=>{ e.stopPropagation(); moverEvento(b.dataset.subir,-1); }));
  cont.querySelectorAll('[data-bajar]').forEach(b=>b.addEventListener('click', (e)=>{ e.stopPropagation(); moverEvento(b.dataset.bajar,1); }));
}
function moverEvento(id, direccion){
  const ordenados = proyecto.eventos.slice().sort((a,b)=>(a.orden||0)-(b.orden||0));
  const idx = ordenados.findIndex(e=>e.id===id);
  const otro = ordenados[idx+direccion];
  if(!otro) return;
  const evActual = proyecto.eventos.find(e=>e.id===id);
  const tmp = evActual.orden; evActual.orden = otro.orden; otro.orden = tmp;
  guardarProyecto(true);
  renderTimeline();
}
document.getElementById('btn-nuevo-evento').addEventListener('click', ()=>{
  evEditandoId=null;
  document.getElementById('ev-modal-titulo').textContent='Nuevo evento';
  document.getElementById('ev-titulo').value=''; document.getElementById('ev-fecha').value=''; document.getElementById('ev-descripcion').value='';
  pintarSelectorColor('ev-color','#5068f5');
  document.getElementById('btn-borrar-evento').style.display='none';
  abrirOverlay(document.getElementById('modal-evento'));
});
function abrirModalEvento(id){
  const ev = proyecto.eventos.find(x=>x.id===id); if(!ev) return;
  evEditandoId=id;
  document.getElementById('ev-modal-titulo').textContent='Editar evento';
  document.getElementById('ev-titulo').value=ev.titulo||'';
  document.getElementById('ev-fecha').value=ev.fecha||'';
  document.getElementById('ev-descripcion').value=ev.descripcion||'';
  pintarSelectorColor('ev-color', ev.color);
  document.getElementById('btn-borrar-evento').style.display='block';
  abrirOverlay(document.getElementById('modal-evento'));
}
document.getElementById('btn-guardar-evento').addEventListener('click', ()=>{
  const titulo = document.getElementById('ev-titulo').value.trim();
  if(!titulo) return toast('Ponle un título al evento');
  const colorSel = document.querySelector('#ev-color span.sel');
  const datos = {
    titulo, fecha: document.getElementById('ev-fecha').value.trim(),
    descripcion: document.getElementById('ev-descripcion').value,
    color: colorSel? colorSel.dataset.c : '#5068f5'
  };
  if(evEditandoId){ Object.assign(proyecto.eventos.find(x=>x.id===evEditandoId), datos); }
  else {
    const maxOrden = proyecto.eventos.reduce((m,e)=>Math.max(m,e.orden||0),0);
    proyecto.eventos.push(Object.assign({id:idNuevo(), orden:maxOrden+1}, datos));
  }
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-evento'));
  renderTimeline();
  toast('Evento guardado');
});
document.getElementById('btn-borrar-evento').addEventListener('click', ()=>{
  if(!evEditandoId) return;
  const ev = proyecto.eventos.find(x=>x.id===evEditandoId);
  proyecto.eventos = proyecto.eventos.filter(x=>x.id!==evEditandoId);
  proyecto.papelera.push({id:idNuevo(), tipoPapelera:'evento', fecha:Date.now(), datos:ev});
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-evento'));
  renderTimeline();
  toast('Movido a la papelera');
});

/* ---- menciones @ y # ---- */
let autocompleteCtx = null;
function getCaretContext(){
  const sel = window.getSelection();
  if(!sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if(node.nodeType !== 3) return null;
  const text = node.textContent.slice(0, range.startOffset);
  const m = text.match(/([@#*%&])([^\s@#*%&]{0,30})$/);
  if(!m) return null;
  return {simbolo:m[1], query:m[2], node, offset:range.startOffset, matchStart: range.startOffset - m[0].length, range: range.cloneRange()};
}
const TIPO_POR_SIMBOLO = {'@':'personaje','#':'lugar','*':'objeto','%':'criatura','&':'raza'};
const ICONO_POR_TIPO = {personaje:'🧑', lugar:'📍', objeto:'📦', criatura:'🐉', raza:'🧬'};
function actualizarAutocomplete(){
  const cont = document.getElementById('mencion-autocomplete');
  const ctx = getCaretContext();
  if(!ctx || !proyecto || !AJ('ed.menciones')){ cont.style.display='none'; autocompleteCtx=null; return; }
  const tipo = TIPO_POR_SIMBOLO[ctx.simbolo];
  const q = ctx.query.toLowerCase();
  const opciones = proyecto.entidades.filter(e=> e.tipo===tipo && (
    e.nombre.toLowerCase().includes(q) || ((tipo==='objeto'||tipo==='criatura') && (e.categoria||'').toLowerCase().includes(q)) || (tipo==='objeto' && (e.subcategoria||'').toLowerCase().includes(q))
  )).slice(0,8);
  if(!opciones.length){ cont.style.display='none'; autocompleteCtx=null; return; }
  autocompleteCtx = ctx;
  cont.innerHTML = opciones.map((o,i)=>`<div class="mencion-opcion ${i===0?'sel':''}" data-id="${o.id}">${o.imagen?`<img src="${o.imagen}" alt="">`:`<span class="mini-icono">${ICONO_POR_TIPO[o.tipo]||'❔'}</span>`}<span>${escapeHtml(o.nombre)}${(o.tipo==='objeto'||o.tipo==='criatura') && o.categoria?` <span style="color:var(--texto-tenue);font-size:10.5px">· ${escapeHtml(o.subcategoria||o.categoria)}</span>`:''}</span></div>`).join('');
  cont.querySelectorAll('.mencion-opcion').forEach(op=>{
    let tx=0, ty=0, mov=false;
    op.addEventListener('touchstart', (ev)=>{ tx=ev.touches[0].clientX; ty=ev.touches[0].clientY; mov=false; }, {passive:true});
    op.addEventListener('touchmove', (ev)=>{ if(Math.abs(ev.touches[0].clientX-tx)>8 || Math.abs(ev.touches[0].clientY-ty)>8) mov=true; }, {passive:true});
    op.addEventListener('touchend', (ev)=>{ if(mov) return; ev.preventDefault(); seleccionarMencion(op.dataset.id); });
    op.addEventListener('mousedown', (ev)=>{ ev.preventDefault(); seleccionarMencion(op.dataset.id); });
  });
  try{
    if(esMovilActivo()){
      cont.style.left = ''; cont.style.top = '';
      cont.style.bottom = (espacioInferiorMovil() + 6) + 'px';
    } else {
      cont.style.bottom = '';
      const rect = ctx.range.getBoundingClientRect();
      let left = rect.left, top = rect.bottom+6;
      if(left + 210 > window.innerWidth) left = window.innerWidth - 220;
      if(top + 220 > window.innerHeight) top = rect.top - 226;
      cont.style.left = left+'px'; cont.style.top = top+'px';
    }
  }catch(e){}
  cont.style.display='block';
}
function seleccionarMencion(entidadId){
  const ctx = autocompleteCtx; if(!ctx) return;
  const entidad = proyecto.entidades.find(x=>x.id===entidadId); if(!entidad) return;
  const node = ctx.node;
  const text = node.textContent;
  const before = text.slice(0, ctx.matchStart);
  const after = text.slice(ctx.offset);
  const span = document.createElement('span');
  span.className = 'mencion mencion-' + entidad.tipo;
  span.contentEditable = 'false';
  span.dataset.id = entidad.id;
  span.textContent = ctx.simbolo + entidad.nombre;
  const beforeNode = document.createTextNode(before);
  const afterNode = document.createTextNode('\u200B' + after);
  const parent = node.parentNode;
  parent.insertBefore(beforeNode, node);
  parent.insertBefore(span, node);
  parent.insertBefore(afterNode, node);
  parent.removeChild(node);
  const range = document.createRange();
  range.setStart(afterNode, 1);
  range.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(range);
  document.getElementById('mencion-autocomplete').style.display='none';
  autocompleteCtx=null;
  guardarTextoEditorActual();
  actualizarContadores();
  editorCE.focus();
}
function mostrarPopupMencion(id, clientX, clientY){
  const e = proyecto.entidades.find(x=>x.id===id);
  const pop = document.getElementById('mencion-popup');
  if(!e){ pop.style.display='none'; return; }
  let html = `<span class="cerrar-popup" id="cerrar-mencion-popup">✕</span>`;
  if(e.imagen) html += `<img src="${e.imagen}" alt="${escapeHtml(e.nombre)}">`;
  if(e.tipo==='personaje'){
    html += `<h4>${escapeHtml(e.nombre)} ${escapeHtml(e.apellidos||'')}</h4><div class="sub">${[e.rol,e.raza,e.edad?'Edad: '+e.edad:''].filter(Boolean).map(escapeHtml).join(' · ')}</div>`;
    if(e.rasgos){ const list=e.rasgos.split('\n').map(s=>s.trim()).filter(Boolean); if(list.length) html+=`<div class="sec"><b>Rasgos</b>${list.map(escapeHtml).join(', ')}</div>`; }
    if(e.habilidades && e.habilidades.length){ html += `<div class="sec"><b>Habilidades</b>${e.habilidades.map(h=>escapeHtml(h.nombre)+(h.derivados?' — '+escapeHtml(h.derivados):'')).join('<br>')}</div>`; }
    if(e.deseoConsciente){ html+=`<div class="sec"><b>Quiere</b>${escapeHtml(e.deseoConsciente.slice(0,160))}</div>`; }
    if(e.necesidadInterna){ html+=`<div class="sec"><b>Necesita</b>${escapeHtml(e.necesidadInterna.slice(0,160))}</div>`; }
    if(e.defectoTragico){ html+=`<div class="sec"><b>Defecto trágico</b>${escapeHtml(e.defectoTragico)}</div>`; }
    if(e.objetivos){ const list=e.objetivos.split('\n').map(s=>s.trim()).filter(Boolean); if(list.length) html+=`<div class="sec"><b>Objetivos</b>${list.map(escapeHtml).join('<br>')}</div>`; }
    if(e.problemas){ const list=e.problemas.split('\n').map(s=>s.trim()).filter(Boolean); if(list.length) html+=`<div class="sec"><b>Problemas</b>${list.map(escapeHtml).join('<br>')}</div>`; }
    if(e.desc) html += `<div class="sec"><b>Trasfondo</b>${escapeHtml(e.desc.slice(0,200))}</div>`;
  } else if(e.tipo==='lugar'){
    html += `<h4>${escapeHtml(e.nombre)}</h4><div class="sub">${escapeHtml(e.subtipo||'')}${e.esMundo?' · 🌍 Mundo':''}</div>`;
    if(e.desc) html += `<div class="sec">${escapeHtml(e.desc.slice(0,240))}</div>`;
  } else if(e.tipo==='objeto'){
    html += `<h4>${escapeHtml(e.nombre)}</h4><div class="sub">${escapeHtml(e.categoria||'Objeto')}${e.subcategoria?' · '+escapeHtml(e.subcategoria):''}</div>`;
    if(e.desc) html += `<div class="sec"><b>Descripción</b>${escapeHtml(e.desc.slice(0,180))}</div>`;
    if(e.historia) html += `<div class="sec"><b>Historia</b>${escapeHtml(e.historia.slice(0,220))}</div>`;
  } else if(e.tipo==='criatura'){
    const pel = '⚠️'.repeat(parseInt(e.peligro)||3);
    html += `<h4>${escapeHtml(e.nombre)}</h4><div class="sub">${escapeHtml(e.categoria||'Criatura')} · ${pel}</div>`;
    if(e.habitat) html += `<div class="sec"><b>Hábitat</b>${escapeHtml(e.habitat)}</div>`;
    if(e.habilidades && e.habilidades.length){ html += `<div class="sec"><b>Habilidades</b>${e.habilidades.map(h=>escapeHtml(h.nombre)+(h.derivados?' — '+escapeHtml(h.derivados):'')).join('<br>')}</div>`; }
    if(e.debilidades) html += `<div class="sec"><b>Debilidades</b>${escapeHtml(e.debilidades.slice(0,160))}</div>`;
    if(e.desc) html += `<div class="sec"><b>Descripción</b>${escapeHtml(e.desc.slice(0,180))}</div>`;
  } else if(e.tipo==='raza'){
    html += `<h4>${escapeHtml(e.nombre)}</h4><div class="sub">Raza${e.longevidad?' · '+escapeHtml(e.longevidad):''}</div>`;
    if(e.habitat) html += `<div class="sec"><b>Distribución</b>${escapeHtml(e.habitat)}</div>`;
    if(e.desc) html += `<div class="sec"><b>Rasgos físicos</b>${escapeHtml(e.desc.slice(0,180))}</div>`;
    if(e.habilidades && e.habilidades.length){ html += `<div class="sec"><b>Habilidades raciales</b>${e.habilidades.map(h=>escapeHtml(h.nombre)+(h.derivados?' — '+escapeHtml(h.derivados):'')).join('<br>')}</div>`; }
  } else {
    html += `<h4>${escapeHtml(e.nombre)}</h4><div class="sub">${escapeHtml(e.tipo)}</div><div class="sec">${escapeHtml((e.desc||'').slice(0,240))}</div>`;
  }
  pop.innerHTML = html;
  pop.style.display='block';
  if(esMovilActivo()){
    pop.style.left = ''; pop.style.top = '';
    pop.style.setProperty('--popup-bottom', espacioInferiorMovil() + 'px');
  } else {
    let left = clientX, top = clientY+14;
    const maxLeft = window.innerWidth - 290; if(left>maxLeft) left=maxLeft;
    const maxTop = window.innerHeight - 320; if(top>maxTop) top = Math.max(10, clientY-320);
    pop.style.left = left+'px'; pop.style.top = top+'px';
  }
  document.getElementById('cerrar-mencion-popup').addEventListener('click', ()=>{ pop.style.display='none'; });
}
document.addEventListener('click', (e)=>{
  const pop = document.getElementById('mencion-popup');
  if(pop.style.display==='block' && !pop.contains(e.target) && !e.target.closest('.mencion')){ pop.style.display='none'; }
});

/* ---- temas ---- */
const TEMAS = [
  {id:'oscuro', nombre:'Oscuro', bg:'#050b16', ac:'#5068f5'},
  {id:'claro', nombre:'Claro', bg:'#f7f4ee', ac:'#3b6fd6'},
  {id:'sepia', nombre:'Sepia', bg:'#f4ead5', ac:'#704214'},
  {id:'bosque', nombre:'Bosque', bg:'#0a1a0f', ac:'#4ade80'},
  {id:'oceano', nombre:'Océano', bg:'#03141f', ac:'#22b8c4'},
  {id:'medianoche', nombre:'Medianoche', bg:'#000000', ac:'#ff2fd6'},
  {id:'rosa', nombre:'Rosa', bg:'#1c0e14', ac:'#e0648c'},
  {id:'arena', nombre:'Arena', bg:'#20160b', ac:'#d68f3f'},
];
const FUENTES_EDITOR = {
  sans:"'Inter', system-ui, sans-serif",
  serif:"Georgia, 'Times New Roman', serif",
  book:"'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  mono:"'Courier New', Courier, monospace",
  hand:"'Segoe Print', 'Bradley Hand', cursive"
};
function aplicarTema(id){
  if(id==='oscuro') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', id);
  intentarGuardarLocalStorage(LS_TEMA, id);
}
function pintarTemasGrid(){
  const grid = document.getElementById('temas-grid');
  const actual = localStorage.getItem(LS_TEMA) || 'oscuro';
  grid.innerHTML = TEMAS.map(t=>`<div class="tema-opcion ${t.id===actual?'sel':''}" data-id="${t.id}"><div class="swatch" style="background:linear-gradient(135deg, ${t.bg}, ${t.ac})"></div><span>${t.nombre}</span></div>`).join('');
  grid.querySelectorAll('.tema-opcion').forEach(op=>{
    op.addEventListener('click', ()=>{ aplicarTema(op.dataset.id); grid.querySelectorAll('.tema-opcion').forEach(o=>o.classList.remove('sel')); op.classList.add('sel'); });
  });
}
document.getElementById('btn-temas').addEventListener('click', ()=>{
  pintarTemasGrid();
  document.getElementById('select-fuente').value = (proyecto && proyecto.ui && proyecto.ui.fuente) || 'serif';
  abrirOverlay(document.getElementById('modal-temas'));
});
document.getElementById('rango-ancho').addEventListener('input', (e)=>{
  document.documentElement.style.setProperty('--ancho-editor', e.target.value+'px');
  document.getElementById('ancho-editor-val').textContent = e.target.value+'px';
  if(proyecto){ proyecto.ui.anchoEditor = +e.target.value; guardarProyectoDebounced(); }
});
document.getElementById('rango-fuente').addEventListener('input', (e)=>{
  document.documentElement.style.setProperty('--tam-editor', (e.target.value/16)+'rem');
  document.getElementById('tam-fuente-val').textContent = (e.target.value/16).toFixed(2)+'rem';
  if(proyecto){ proyecto.ui.tamFuente = +e.target.value; guardarProyectoDebounced(); }
});
document.getElementById('rango-interlineado').addEventListener('input', (e)=>{
  document.documentElement.style.setProperty('--alto-linea', e.target.value);
  document.getElementById('interlineado-val').textContent = e.target.value;
  if(proyecto){ proyecto.ui.interlineado = +e.target.value; guardarProyectoDebounced(); }
});
document.getElementById('select-fuente').addEventListener('change', (e)=>{
  document.documentElement.style.setProperty('--fuente-editor', FUENTES_EDITOR[e.target.value]||FUENTES_EDITOR.serif);
  if(proyecto){ proyecto.ui.fuente = e.target.value; guardarProyectoDebounced(); }
});

/* ---- zen ---- */
document.getElementById('btn-zen').addEventListener('click', ()=>{ document.body.classList.add('zen'); document.getElementById('btn-zen-salir').classList.remove('oculto'); document.querySelector('[data-vista="editor"]').click(); });
document.getElementById('btn-zen-salir').addEventListener('click', ()=>{ document.body.classList.remove('zen'); document.getElementById('btn-zen-salir').classList.add('oculto'); });

/* ---- exportar ---- */
document.getElementById('btn-export').addEventListener('click', ()=>abrirOverlay(document.getElementById('modal-export')));
function descargar(nombre, contenido, tipo){
  const blob = new Blob([contenido], {type:tipo});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 8000);
}
function compilarProyecto(formatoHtml){
  const incluirTitulos = document.getElementById('export-titulos').checked;
  const incluirPortada = document.getElementById('export-portada').checked;
  const incluirIndice = document.getElementById('export-indice').checked;
  let partes = [];
  function recorrer(lista){
    lista.forEach(n=>{
      if(n.tipo==='parte'||n.tipo==='capitulo'){
        if(incluirTitulos) partes.push({tipo:'titulo', texto:n.titulo});
        if(n.hijos) recorrer(n.hijos);
      } else if(n.tipo==='escena'){
        if(incluirTitulos && n.titulo) partes.push({tipo:'subtitulo', texto:n.titulo});
        partes.push({tipo:'texto', texto: formatoHtml ? (n.texto||'') : htmlATexto(n.texto||'')});
      }
    });
  }
  recorrer(proyecto.arbol);
  return {partes, incluirPortada, incluirIndice};
}
document.getElementById('btn-compilar').addEventListener('click', ()=>{
  if(!proyecto) return;
  const formato = document.getElementById('export-formato').value;
  const nombreArchivo = (proyecto.nombre||'proyecto').replace(/[^\w\-]+/g,'_');
  if(formato==='json'){
    const datos = Object.assign({_zscriv:'ZSCRIV-v1'}, proyecto);
    descargar(nombreArchivo+'.json', JSON.stringify(datos,null,2), 'application/json');
    cerrarOverlay(document.getElementById('modal-export')); return;
  }
  if(formato==='epub' || formato==='docx'){ exportarLibro(formato); return; }
  const {partes, incluirPortada, incluirIndice} = compilarProyecto(formato==='html');
  const personajes = proyecto.entidades.filter(e=>e.tipo==='personaje');
  let salida='';
  if(formato==='txt'){
    salida = (incluirPortada? `${proyecto.nombre}\n${new Date().toLocaleDateString('es-ES')}\n\n\n` : '') +
      partes.map(p=> p.tipo==='titulo'? '\n'+p.texto.toUpperCase()+'\n' : p.tipo==='subtitulo'? '\n'+p.texto+'\n' : p.texto+'\n').join('\n');
    if(incluirIndice && personajes.length) salida += '\n\n--- PERSONAJES ---\n' + personajes.map(p=>`${p.nombre}${p.rol?' ('+p.rol+')':''} — ${(p.desc||'').slice(0,140)}`).join('\n');
  } else if(formato==='md'){
    salida = (incluirPortada? `# ${proyecto.nombre}\n*${new Date().toLocaleDateString('es-ES')}*\n\n---\n` : '') +
      partes.map(p=> p.tipo==='titulo'? '\n# '+p.texto+'\n' : p.tipo==='subtitulo'? '\n## '+p.texto+'\n' : p.texto.replace(/\n+/g,'\n\n')+'\n').join('\n');
    if(incluirIndice && personajes.length) salida += '\n\n## Personajes\n' + personajes.map(p=>`- **${p.nombre}**${p.rol?' ('+p.rol+')':''} — ${(p.desc||'').slice(0,140)}`).join('\n');
  } else if(formato==='html'){
    const cuerpo = partes.map(p=> p.tipo==='titulo'? `<h1>${escapeHtml(p.texto)}</h1>` : p.tipo==='subtitulo'? `<h2>${escapeHtml(p.texto)}</h2>` : `<div class="p-escena">${p.texto}</div>`).join('\n');
    const portada = incluirPortada? `<div class="portada"><h1>${escapeHtml(proyecto.nombre)}</h1><p>${new Date().toLocaleDateString('es-ES')}</p><p class="marca">Generado con ZScriv</p></div>`:'';
    const indice = (incluirIndice && personajes.length)? `<h2>Personajes</h2><ul>${personajes.map(p=>`<li><b>${escapeHtml(p.nombre)}</b>${p.rol?' ('+escapeHtml(p.rol)+')':''} — ${escapeHtml((p.desc||'').slice(0,180))}</li>`).join('')}</ul>` : '';
    const entidadesExport = {};
    proyecto.entidades.forEach(e=>{ const {imagen,x,y,...resto} = e; entidadesExport[e.id]=resto; });
    const zdataSeguro = JSON.stringify(entidadesExport).replace(/</g, '\\u003c');
    salida = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${escapeHtml(proyecto.nombre)}</title>
<style>
body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.85;padding:0 20px;color:#222}
.portada{text-align:center;padding:60px 0;border-bottom:2px solid #ddd;margin-bottom:40px}
.marca{color:#999;font-size:12px;margin-top:30px}
.mencion{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px}
.zpop{position:absolute;max-width:280px;background:#1c2434;color:#eee;border-radius:8px;padding:12px 14px;font-size:13px;z-index:999;box-shadow:0 10px 30px rgba(0,0,0,.4);line-height:1.5}
.zpop b{font-size:14px}
</style></head><body>
${portada}${cuerpo}
${indice}
<script>
const ZDATA = ${zdataSeguro};
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
document.addEventListener('click', function(e){
  document.querySelectorAll('.zpop').forEach(p=>p.remove());
  const m = e.target.closest('.mencion'); if(!m) return;
  const d = ZDATA[m.dataset.id]; if(!d) return;
  const pop = document.createElement('div'); pop.className='zpop';
  let html = '<b>'+esc(d.nombre)+'</b><br><span style="opacity:.65;font-size:12px">'+esc(d.categoria||d.subtipo||d.tipo||'')+'</span>';
  if(d.desc) html += '<p>'+esc(String(d.desc).slice(0,240))+'</p>';
  if(d.historia) html += '<p><i>Historia:</i> '+esc(String(d.historia).slice(0,220))+'</p>';
  pop.innerHTML = html;
  document.body.appendChild(pop);
  const r = m.getBoundingClientRect();
  pop.style.left = Math.max(8,Math.min(window.innerWidth-290, r.left))+'px';
  pop.style.top = (r.bottom+window.scrollY+6)+'px';
  e.stopPropagation();
});
<\/script>
</body></html>`;
  }
  descargar(nombreArchivo+'.'+formato, salida, 'text/plain;charset=utf-8');
  cerrarOverlay(document.getElementById('modal-export'));
  toast('Archivo compilado');
});
document.getElementById('btn-export-json').addEventListener('click', async ()=>{
  if(!proyecto) return;
  const datos = Object.assign({_zscriv:'ZSCRIV-v1'}, proyecto);
  const contenido = JSON.stringify(datos,null,2);
  const nombre = (proyecto.nombre||'proyecto').replace(/[^\w\-]+/g,'_')+'.json';
  if(window.showSaveFilePicker){
    try{
      const handle = await window.showSaveFilePicker({suggestedName:nombre, types:[{description:'Proyecto ZScriv', accept:{'application/json':['.json']}}]});
      const writable = await handle.createWritable();
      await writable.write(contenido);
      await writable.close();
      toast('Proyecto guardado en tu dispositivo');
      return;
    }catch(err){ if(err && err.name==='AbortError') return; }
  }
  descargar(nombre, contenido, 'application/json');
});
document.getElementById('btn-imprimir-pdf').addEventListener('click', ()=>{
  if(!proyecto) return;
  const {partes} = compilarProyecto(true);
  const cuerpo = partes.map(p=> p.tipo==='titulo'? `<h1>${escapeHtml(p.texto)}</h1>` : p.tipo==='subtitulo'? `<h2>${escapeHtml(p.texto)}</h2>` : `<div>${htmlATexto(p.texto).split('\n').map(l=>`<p>${escapeHtml(l)}</p>`).join('')}</div>`).join('\n');
  let area = document.getElementById('area-impresion');
  if(!area){ area = document.createElement('div'); area.id='area-impresion'; document.body.appendChild(area); }
  area.innerHTML = `<div style="text-align:center;padding:40px 0"><h1>${escapeHtml(proyecto.nombre)}</h1><p>${new Date().toLocaleDateString('es-ES')}</p></div>${cuerpo}`;
  document.body.classList.add('modo-impresion');
  const terminar = ()=>{ document.body.classList.remove('modo-impresion'); window.removeEventListener('afterprint', terminar); };
  window.addEventListener('afterprint', terminar);
  setTimeout(()=>{ try{ window.print(); }catch(e){ terminar(); } if(!('onafterprint' in window)) terminar(); }, 120);
});
document.getElementById('btn-import').addEventListener('click', ()=>{
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.addEventListener('change', ()=>{
    const f = inp.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const datos = normalizarProyecto(JSON.parse(reader.result));
        const id = idNuevo();
        const ok = Almacen.set(claveProyecto(id), JSON.stringify(datos));
        if(!ok){ mostrarAvisoAlmacenamientoLleno(); return; }
        const idx = cargarIndice();
        idx.push({id, nombre:datos.nombre||'Proyecto importado', actualizado:Date.now()});
        guardarIndice(idx);
        abrirProyecto(id);
        toast('Proyecto importado como nuevo proyecto');
      }catch(err){ toast('Error al importar: archivo no válido'); }
    };
    reader.readAsText(f);
  });
  inp.click();
});

/* ---- nombre / guardar ---- */
document.getElementById('proyecto-nombre').addEventListener('input', (e)=>{ if(!proyecto) return; proyecto.nombre=e.target.value; guardarProyectoDebounced(); });
document.getElementById('btn-guardar').addEventListener('click', ()=>{ guardarProyecto(); guardarCopiaEnCarpeta(); });
document.addEventListener('keydown', (e)=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='s'){ e.preventDefault(); guardarProyecto(); } });

/* ---- gestor de proyectos ---- */
function renderListaProyectos(){
  const idx = cargarIndice().sort((a,b)=>b.actualizado-a.actualizado);
  const cont = document.getElementById('lista-proyectos');
  cont.innerHTML='';
  if(!idx.length){ cont.innerHTML = '<p style="color:var(--texto-tenue);font-size:12.5px;padding:6px 2px">Aún no tienes proyectos. Crea el primero arriba.</p>'; return; }
  idx.forEach(meta=>{
    const div = document.createElement('div');
    div.className='papelera-item';
    if(meta.id===proyectoActivoId) div.style.borderColor='var(--acento-tinta)';
    div.innerHTML = `<span style="font-size:16px">📘</span><div class="info"><b>${escapeHtml(meta.nombre)}</b><small>Actualizado ${new Date(meta.actualizado).toLocaleString('es-ES')}</small></div><div class="acciones"><button data-abrir="${meta.id}" title="Abrir">📂</button><button data-eliminar="${meta.id}" title="Eliminar proyecto">🗑</button></div>`;
    cont.appendChild(div);
  });
  cont.querySelectorAll('[data-abrir]').forEach(b=>b.addEventListener('click', ()=>{ abrirProyecto(b.dataset.abrir); cerrarOverlay(document.getElementById('modal-proyectos')); }));
  cont.querySelectorAll('[data-eliminar]').forEach(b=>b.addEventListener('click', async ()=>{
    const meta = idx.find(m=>m.id===b.dataset.eliminar);
    const ok = await confirmarPersonalizado(`¿Eliminar definitivamente el proyecto "${meta.nombre}"? Esta acción no se puede deshacer.`, {titulo:'Eliminar proyecto', peligro:true, textoAceptar:'Eliminar proyecto'});
    if(ok){
      Almacen.remove(claveProyecto(b.dataset.eliminar));
      guardarIndice(cargarIndice().filter(m=>m.id!==b.dataset.eliminar));
      if(proyectoActivoId===b.dataset.eliminar){ proyectoActivoId=null; proyecto=null; localStorage.removeItem(LS_ACTIVO); }
      renderListaProyectos();
      if(!proyectoActivoId){ mostrarSelectorProyectos(true); }
      toast('Proyecto eliminado');
    }
  }));
}
function estimarUsoAlmacenamiento(){ return Almacen.bytes(); }
function actualizarIndicadorAlmacenamiento(){
  const bytes = estimarUsoAlmacenamiento();
  const mb = bytes/1024/1024;
  const el = document.getElementById('almacenamiento-uso');
  if(!el) return;
  if(Almacen.modo() === 'idb'){
    el.textContent = `Tus proyectos ocupan ~${mb.toFixed(mb<1?2:1)} MB y se guardan en la base de datos del navegador (sin el límite de 5 MB de antes).`;
    if(navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e=>{ if(e && e.quota) el.textContent += ` Espacio disponible: ~${(e.quota/1073741824).toFixed(1)} GB.`; }).catch(()=>{});
  } else {
    el.textContent = `Espacio usado por ZScriv en este navegador: ~${mb.toFixed(mb<1?2:1)} MB. Este navegador limita el almacenamiento a unos 5-10 MB — si tu proyecto tiene muchas imágenes, exporta copias o usa el respaldo en carpeta.`;
  }
}
function mostrarSelectorProyectos(forzado){
  renderListaProyectos();
  document.getElementById('btn-cerrar-proyecto-actual').style.display = proyectoActivoId? 'block':'none';
  document.getElementById('modal-proyectos-x').style.display = forzado? 'none':'flex';
  actualizarUICarpetaRespaldo();
  actualizarIndicadorAlmacenamiento();
  const ov = document.getElementById('modal-proyectos');
  ov._forzado = !!forzado;
  abrirOverlay(ov);
}
document.getElementById('btn-proyectos').addEventListener('click', ()=>mostrarSelectorProyectos(false));
document.getElementById('btn-nuevo-proyecto').addEventListener('click', async ()=>{
  const nombre = await pedirTextoPersonalizado('', 'Proyecto sin título', {titulo:'Nombre del nuevo proyecto'});
  if(nombre===null) return;
  const id = crearNuevoProyecto(nombre.trim()||'Proyecto sin título');
  if(!id) return;
  abrirProyecto(id);
  cerrarOverlay(document.getElementById('modal-proyectos'));
  toast('Proyecto creado');
});
document.getElementById('btn-cerrar-proyecto-actual').addEventListener('click', ()=>{
  proyectoActivoId=null; proyecto=null; localStorage.removeItem(LS_ACTIVO);
  cerrarOverlay(document.getElementById('modal-proyectos'));
  mostrarSelectorProyectos(true);
  toast('Proyecto cerrado');
});
function abrirProyecto(id){
  const raw = Almacen.get(claveProyecto(id));
  if(!raw){ toast('No se pudo abrir el proyecto'); return; }
  let p;
  try{ p = normalizarProyecto(JSON.parse(raw)); }
  catch(err){ toast('Este proyecto está dañado y no se pudo abrir. Tus otros proyectos no se tocaron.'); return; }
  proyecto = p;
  proyectoActivoId = id;
  intentarGuardarLocalStorage(LS_ACTIVO, id);
  nodoActivoId=null; panelActivo='manuscrito'; vistaActual='editor'; mundoFiltro='todos'; mapaModo='todos';
  vinculando=false; vinculoOrigen=null;
  document.getElementById('proyecto-nombre').value = proyecto.nombre;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('activo'));
  document.querySelector('.nav-btn[data-panel="manuscrito"]').classList.add('activo');
  document.getElementById('panel-lateral-titulo').textContent='Manuscrito';
  document.getElementById('buscador-global').style.display='block';
  document.getElementById('btn-nuevo-nodo').style.display='flex';
  document.querySelectorAll('.modos-vista button').forEach(b=>b.classList.remove('activo'));
  document.querySelector('[data-vista="editor"]').classList.add('activo');
  document.querySelectorAll('#centro > div').forEach(v=>v.classList.remove('activa'));
  document.getElementById('vista-editor').classList.add('activa');
  document.documentElement.style.setProperty('--ancho-editor', proyecto.ui.anchoEditor+'px');
  document.documentElement.style.setProperty('--tam-editor', (proyecto.ui.tamFuente/16)+'rem');
  document.documentElement.style.setProperty('--alto-linea', proyecto.ui.interlineado);
  document.documentElement.style.setProperty('--fuente-editor', FUENTES_EDITOR[proyecto.ui.fuente]||FUENTES_EDITOR.serif);
  document.getElementById('rango-ancho').value = proyecto.ui.anchoEditor;
  document.getElementById('rango-fuente').value = proyecto.ui.tamFuente;
  document.getElementById('rango-interlineado').value = proyecto.ui.interlineado;
  document.getElementById('ancho-editor-val').textContent = proyecto.ui.anchoEditor+'px';
  document.getElementById('tam-fuente-val').textContent = (proyecto.ui.tamFuente/16).toFixed(2)+'rem';
  document.getElementById('interlineado-val').textContent = proyecto.ui.interlineado;
  renderArbol();
  const primeraEscena = todosLosNodos(proyecto.arbol).find(n=>n.tipo==='escena');
  if(primeraEscena) seleccionarNodo(primeraEscena.id); else { nodoActivoId=null; cargarNodoEnEditor(); cargarInspector(); }
  actualizarBarraInferior();
  sincronizarNavMovil();
  guardarCopiaEnCarpeta();
  iniciarSeguimientoCopias();
}

/* ---- IA ---- */
const MODOS_IA = [
  {id:'ideas', label:'💡 Ideas', prompt:'Dame 4 ideas breves para superar un bloqueo creativo en esta escena, en 1-2 frases cada una.'},
  {id:'analizar', label:'🔍 Analizar', prompt:'Analiza posibles huecos de trama o inconsistencias en el siguiente texto. Sé conciso y concreto.'},
  {id:'dialogos', label:'💬 Diálogos', prompt:'Sugiere cómo mejorar o continuar el diálogo del siguiente texto, dándole voz auténtica a cada personaje.'},
  {id:'continuar', label:'✍️ Continuar', prompt:'Continúa el siguiente texto siguiendo fielmente el estilo y tono del autor. Escribe entre 120 y 200 palabras.'},
  {id:'mundo', label:'🌍 Mundo', prompt:'Genera una idea breve de worldbuilding coherente con este texto.'},
  {id:'revisar', label:'📊 Revisar', prompt:'Haz un análisis estructural breve de esta escena o capítulo: ritmo, tensión y claridad.'},
  {id:'escena', label:'🎭 Escena nueva', prompt:'Genera un borrador breve (150-250 palabras) de una escena nueva que podría seguir a este texto.'},
  {id:'estilo', label:'🔤 Estilo', prompt:'Sugiere mejoras de fluidez, ritmo y vocabulario para el siguiente texto, sin cambiar la trama.'},
  {id:'personaje', label:'🧑 Personaje', prompt:'Sugiere ideas para desarrollar el arco, backstory o motivación de un personaje relevante en este texto.'},
  {id:'sinopsis', label:'📋 Sinopsis', prompt:'Escribe una sinopsis breve (2-3 frases) del siguiente texto.'},
  {id:'titulo', label:'📑 Título', prompt:'Sugiere 5 posibles títulos evocadores para esta escena, basados en el siguiente texto.'},
  {id:'coherencia', label:'🔎 Coherencia', prompt:'Revisa si el siguiente texto contradice hechos ya establecidos (nombres, lugares, cronología) y señala dudas.'}
];
let modoIAActivo = 'continuar';
function pintarModosIA(){
  const cont = document.getElementById('ia-modos');
  cont.innerHTML = MODOS_IA.map(m=>`<button class="ia-modo-btn ${m.id===modoIAActivo?'activo':''}" data-id="${m.id}">${m.label}</button>`).join('');
  cont.querySelectorAll('.ia-modo-btn').forEach(b=>b.addEventListener('click', ()=>{ modoIAActivo=b.dataset.id; cont.querySelectorAll('.ia-modo-btn').forEach(x=>x.classList.remove('activo')); b.classList.add('activo'); }));
}
function actualizarEstadoIA(){
  const dot = document.getElementById('ia-estado-dot'); const txt = document.getElementById('ia-estado-txt');
  const configurado = (iaConfig.proveedor==='anthropic' && iaConfig.anthropicKey) || (iaConfig.proveedor!=='anthropic' && iaConfig.localUrl);
  dot.classList.toggle('ok', !!configurado);
  txt.textContent = configurado ? (iaConfig.proveedor==='anthropic'?'Anthropic conectado':'Servidor local configurado') : 'Sin configurar — pulsa ⚙️';
}
document.getElementById('btn-ia').addEventListener('click', ()=>{ pintarModosIA(); actualizarEstadoIA(); document.getElementById('ia-resultado').textContent = 'Elige un modo arriba y pulsa «Generar».'; abrirOverlay(document.getElementById('modal-ia')); });
document.getElementById('btn-ia-config').addEventListener('click', ()=>{
  document.getElementById('ia-proveedor').value = iaConfig.proveedor;
  document.getElementById('anthropic-key').value = iaConfig.anthropicKey||'';
  document.getElementById('anthropic-modelo').value = iaConfig.anthropicModelo||'claude-sonnet-4-6';
  document.getElementById('local-url').value = iaConfig.localUrl||'http://localhost:11434';
  document.getElementById('local-modelo').value = iaConfig.localModelo||'';
  document.getElementById('ia-temp').value = iaConfig.temperatura??0.7;
  document.getElementById('ia-temp-val').textContent = iaConfig.temperatura??0.7;
  toggleConfIA();
  abrirOverlay(document.getElementById('modal-ia-config'));
});
document.getElementById('ia-proveedor').addEventListener('change', toggleConfIA);
function toggleConfIA(){ const prov = document.getElementById('ia-proveedor').value; document.getElementById('conf-anthropic').classList.toggle('oculto', prov!=='anthropic'); document.getElementById('conf-local').classList.toggle('oculto', prov==='anthropic'); }
document.getElementById('ia-temp').addEventListener('input', (e)=>{ document.getElementById('ia-temp-val').textContent = e.target.value; });
document.getElementById('btn-ia-guardar-config').addEventListener('click', ()=>{
  iaConfig.proveedor = document.getElementById('ia-proveedor').value;
  iaConfig.anthropicKey = document.getElementById('anthropic-key').value.trim();
  iaConfig.anthropicModelo = document.getElementById('anthropic-modelo').value.trim() || 'claude-sonnet-4-6';
  iaConfig.localUrl = document.getElementById('local-url').value.trim();
  iaConfig.localModelo = document.getElementById('local-modelo').value.trim();
  iaConfig.temperatura = parseFloat(document.getElementById('ia-temp').value);
  guardarIAConfig(); actualizarEstadoIA();
  cerrarOverlay(document.getElementById('modal-ia-config'));
  toast('Configuración de IA guardada');
});
async function generarConIA(){
  const modo = MODOS_IA.find(m=>m.id===modoIAActivo);
  const extra = document.getElementById('ia-prompt').value.trim();
  const n = encontrarNodo(nodoActivoId);
  const contextoTexto = n && n.texto ? htmlATexto(n.texto).slice(-2500) : '';
  const promptFinal = `${modo.prompt}\n\n${extra? 'Instrucción adicional: '+extra+'\n\n':''}Texto de referencia:\n"""\n${contextoTexto || '(sin texto todavía)'}\n"""\n\nResponde en español.`;
  const resEl = document.getElementById('ia-resultado');
  resEl.textContent = 'Generando…';
  try{
    let texto;
    if(iaConfig.proveedor==='anthropic'){
      if(!iaConfig.anthropicKey) throw new Error('Configura tu clave de Anthropic en ⚙️');
      texto = await llamarAnthropic(promptFinal);
    } else { texto = await llamarLocal(promptFinal); }
    resEl.textContent = texto;
  }catch(err){ resEl.textContent = 'Error: ' + err.message; }
}
async function llamarAnthropic(prompt){
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'x-api-key': iaConfig.anthropicKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
    body: JSON.stringify({ model: iaConfig.anthropicModelo || 'claude-sonnet-4-6', max_tokens: 700, temperature: iaConfig.temperatura ?? 0.7, messages: [{role:'user', content: prompt}] })
  });
  if(!resp.ok){ const t = await resp.text(); throw new Error('API respondió ' + resp.status + ': ' + t.slice(0,200)); }
  const data = await resp.json();
  const bloque = (data.content||[]).find(c=>c.type==='text');
  return bloque ? bloque.text : '(sin respuesta de texto)';
}
async function llamarLocal(prompt){
  const url = (iaConfig.localUrl||'').replace(/\/$/,'') + '/v1/chat/completions';
  const resp = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ model: iaConfig.localModelo || 'local-model', temperature: iaConfig.temperatura ?? 0.7, messages:[{role:'user', content:prompt}] }) });
  if(!resp.ok){ throw new Error('Servidor local respondió ' + resp.status); }
  const data = await resp.json();
  return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '(sin respuesta)';
}
document.getElementById('btn-ia-generar').addEventListener('click', generarConIA);
document.getElementById('btn-ia-insertar').addEventListener('click', ()=>{
  const n = encontrarNodo(nodoActivoId);
  const resultado = document.getElementById('ia-resultado').textContent;
  if(!n || !resultado || resultado==='Generando…'){ toast('No hay texto para insertar'); return; }
  n.texto = (n.texto||'') + '<br><br>' + escapeHtml(resultado).replace(/\n/g,'<br>');
  cargarNodoEnEditor();
  guardarProyecto(true);
  cerrarOverlay(document.getElementById('modal-ia'));
  toast('Texto insertado en la escena');
});

/* ---- búsqueda ---- */
document.getElementById('input-buscar').addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('#arbol .nodo[data-id]').forEach(div=>{
    if(!q){ div.style.display='flex'; return; }
    const n = encontrarNodo(div.dataset.id);
    const textoPlano = n? htmlATexto(n.texto||'').toLowerCase():'';
    const encontrado = n && ((n.titulo||'').toLowerCase().includes(q) || textoPlano.includes(q) || (n.sinopsis||'').toLowerCase().includes(q));
    div.style.display = encontrado ? 'flex' : 'none';
  });
});

/* ---- búsqueda global (Ctrl+K) ---- */
const ICONO_BUSQUEDA = {escena:'📄',capitulo:'📘',parte:'📗',personaje:'🧑',lugar:'📍',objeto:'📦',criatura:'🐉',raza:'🧬',cultura:'🌐',historia:'🌐',magia:'🌐',otro:'🌐',nota:'🗒'};
function abrirBusquedaGlobal(){
  if(!proyecto || !AJ('tool.buscar')) return;
  abrirOverlay(document.getElementById('modal-buscar-global'));
  const input = document.getElementById('buscar-global-input');
  input.value=''; renderResultadosBusqueda('');
  setTimeout(()=>input.focus(), 50);
}
document.getElementById('btn-buscar-global').addEventListener('click', abrirBusquedaGlobal);
document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); abrirBusquedaGlobal(); }
});
document.getElementById('buscar-global-input').addEventListener('input', (e)=>renderResultadosBusqueda(e.target.value.trim().toLowerCase()));
function renderResultadosBusqueda(q){
  const cont = document.getElementById('buscar-global-resultados');
  cont.innerHTML='';
  if(!proyecto) return;
  const grupos = [];
  const escenas = todosLosNodos(proyecto.arbol).filter(n=>{
    if(!q) return false;
    return (n.titulo||'').toLowerCase().includes(q) || (n.sinopsis||'').toLowerCase().includes(q) || htmlATexto(n.texto||'').toLowerCase().includes(q);
  });
  if(escenas.length) grupos.push({titulo:'Manuscrito', items: escenas.map(n=>({icono:ICONO_BUSQUEDA[n.tipo]||'📄', nombre:n.titulo||'Sin título', sub:n.sinopsis||'', accion:()=>{ seleccionarNodo(n.id); document.querySelector('[data-vista="editor"]').click(); }}))});
  const entTipos = ['personaje','lugar','objeto','criatura','raza','cultura','historia','magia','otro'];
  entTipos.forEach(tipo=>{
    const items = proyecto.entidades.filter(e=> e.tipo===tipo && q && (
      e.nombre.toLowerCase().includes(q) || (e.categoria||'').toLowerCase().includes(q) || (e.subcategoria||'').toLowerCase().includes(q) || (e.desc||'').toLowerCase().includes(q) ||
      (e.rol||'').toLowerCase().includes(q) || (e.rasgos||'').toLowerCase().includes(q) || (e.objetivos||'').toLowerCase().includes(q)
    ));
    if(items.length) grupos.push({titulo: tipo[0].toUpperCase()+tipo.slice(1)+'s', items: items.map(e=>({icono:ICONO_BUSQUEDA[e.tipo]||'❔', nombre:e.nombre, sub:e.rol||e.subcategoria||e.categoria||e.subtipo||'', accion:()=>abrirModalEntidad(e.id)}))});
  });
  const notas = proyecto.investigacion.filter(n=> q && ((n.titulo||'').toLowerCase().includes(q) || (n.contenido||'').toLowerCase().includes(q)));
  if(notas.length) grupos.push({titulo:'Investigación', items: notas.map(n=>({icono:'🗒', nombre:n.titulo, sub:n.etiquetas||'', accion:()=>abrirModalInvestigacion(n.id)}))});
  const eventos = (proyecto.eventos||[]).filter(ev=> q && ((ev.titulo||'').toLowerCase().includes(q) || (ev.descripcion||'').toLowerCase().includes(q)));
  if(eventos.length) grupos.push({titulo:'Línea temporal', items: eventos.map(ev=>({icono:'🕒', nombre:ev.titulo, sub:ev.fecha||'', accion:()=>{ document.querySelector('[data-vista="linea"]').click(); abrirModalEvento(ev.id); }}))});
  if(!q){ cont.innerHTML = '<p style="padding:14px;color:var(--texto-tenue);font-size:12px">Escribe para buscar en escenas, personajes, lugares, objetos, criaturas, razas, notas y eventos.</p>'; return; }
  if(!grupos.length){ cont.innerHTML = '<p style="padding:14px;color:var(--texto-tenue);font-size:12px">Sin resultados.</p>'; return; }
  grupos.forEach(g=>{
    const h = document.createElement('div'); h.className='grupo-busqueda'; h.textContent = g.titulo;
    cont.appendChild(h);
    g.items.slice(0,12).forEach(it=>{
      const div = document.createElement('div'); div.className='resultado-busqueda';
      div.innerHTML = `<span class="rb-icono">${it.icono}</span><div class="rb-info"><b>${escapeHtml(it.nombre)}</b>${it.sub?`<small>${escapeHtml(it.sub)}</small>`:''}</div>`;
      div.addEventListener('click', ()=>{ it.accion(); cerrarOverlay(document.getElementById('modal-buscar-global')); });
      cont.appendChild(div);
    });
  });
}
const panelLateralEl = document.getElementById('panel-lateral');
const inspectorEl = document.getElementById('inspector');
const fondoMovilEl = document.getElementById('fondo-movil');
function togglePanelMovil(){ panelLateralEl.classList.contains('mostrar-movil') ? cerrarDrawers() : abrirDrawer('panel'); }
function toggleInspectorMovil(){ inspectorEl.classList.contains('mostrar-movil') ? cerrarDrawers() : abrirDrawer('inspector'); }
function cerrarPanelesMovil(){
  if(!esMovilActivo() && window.innerWidth > 860) return;
  cerrarDrawers();
}
document.getElementById('btn-menu-movil').addEventListener('click', togglePanelMovil);
document.getElementById('btn-inspector-movil').addEventListener('click', toggleInspectorMovil);
fondoMovilEl.addEventListener('click', cerrarPanelesMovil);

/* ---- PWA: manifest e iconos instalables ---- */
function generarIconoDataURL(tam){
  const canvas = document.createElement('canvas');
  canvas.width = tam; canvas.height = tam;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,tam,tam);
  grad.addColorStop(0,'#050b16'); grad.addColorStop(1,'#5068f5');
  ctx.fillStyle = grad; ctx.fillRect(0,0,tam,tam);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold ' + Math.round(tam*0.52) + 'px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Z', tam/2, tam*0.56);
  return canvas.toDataURL('image/png');
}
function configurarPWA(){
  try{
    const icono192 = generarIconoDataURL(192);
    const icono512 = generarIconoDataURL(512);
    const manifest = {
      name: 'ZScriv — Sistema Operativo Narrativo',
      short_name: 'ZScriv',
      description: 'Escritorio de escritura narrativa offline-first.',
      start_url: '.',
      display: 'standalone',
      background_color: '#050b16',
      theme_color: '#050b16',
      orientation: 'any',
      icons: [
        {src: icono192, sizes:'192x192', type:'image/png', purpose:'any maskable'},
        {src: icono512, sizes:'512x512', type:'image/png', purpose:'any maskable'}
      ]
    };
    const blob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('link');
    link.rel = 'manifest'; link.href = url;
    document.head.appendChild(link);
    const touchIcon = document.createElement('link');
    touchIcon.rel = 'apple-touch-icon'; touchIcon.href = icono192;
    document.head.appendChild(touchIcon);
    const favicon = document.createElement('link');
    favicon.rel = 'icon'; favicon.href = icono192;
    document.head.appendChild(favicon);
  }catch(e){ /* el manifest es una mejora progresiva; si falla, la app sigue funcionando igual */ }
}

/* ---- guía interactiva ---- */
const GUIA = [
  {id:'inicio', titulo:'Empezando', html:`
    <h4>¿Qué es ZScriv?</h4>
    <p>Un escritorio de escritura narrativa que vive en un solo archivo <code>.html</code>. No necesita internet ni instalación: ábrelo en tu navegador y todo se guarda en tu propio dispositivo.</p>
    <h4>Estructura del manuscrito</h4>
    <p>Tu novela se organiza en tres niveles: <b>Partes</b> → <b>Capítulos</b> → <b>Escenas</b>. Usa el botón ＋ del panel izquierdo para crear cada uno.</p>
    <h4>Proyectos</h4>
    <p>Pulsa 📂 en la barra superior para crear un proyecto nuevo, abrir otro, cerrarlo (sin borrar nada) o eliminarlo definitivamente. Puedes tener tantos libros como quieras, cada uno independiente.</p>`},
  {id:'escribir', titulo:'Escribir y mencionar', html:`
    <h4>El editor</h4>
    <p>Escribe libremente en la escena activa. El título, la sinopsis, el estado y las notas se editan desde el panel derecho (inspector).</p>
    <h4>Menciones rápidas</h4>
    <ul>
      <li><code>@Nombre</code> — menciona un personaje</li>
      <li><code>#Nombre</code> — menciona un lugar</li>
      <li><code>*Nombre</code> o <code>*categoría</code> — menciona un objeto (ej. <code>*arma</code> muestra todas las armas)</li>
      <li><code>%Nombre</code> o <code>%categoría</code> — menciona una criatura</li>
      <li><code>&amp;Nombre</code> — menciona una raza</li>
    </ul>
    <p>Toca cualquier mención resaltada para ver su ficha completa sin salir del editor.</p>
    <h4>Modo composición</h4>
    <p>El botón ⛶ oculta todo salvo el texto, ideal para concentrarte.</p>`},
  {id:'fichas', titulo:'Fichas del mundo', html:`
    <h4>Personajes</h4>
    <p>La ficha está organizada en pestañas: <b>Identidad</b> (nombre, apodo, edad, género, rol, raza, ocupación), <b>Personalidad</b> (rasgos, virtudes, defectos, miedos, manías), <b>Motivación</b> (deseo consciente vs. necesidad interna, objetivos, problemas, herida central, arco de transformación), <b>Habilidades</b> (con derivados), <b>Creencias y voz</b> (religión, valores, idiomas, forma de hablar, frase característica, secreto) y <b>Trasfondo</b> (apariencia física e historia).</p>
    <p>La galería de 10 arquetipos precarga automáticamente rasgos, miedos, deseos, defectos y habilidades típicas de ese arquetipo — solo aparece al crear un personaje nuevo, y todo queda editable después.</p>
    <h4>Lugares</h4>
    <p>Incluye imagen, tipo (ciudad, reino, bosque…) y la opción de marcar una como «imagen del mundo entero».</p>
    <h4>Objetos</h4>
    <p>Categoría y subcategoría (ej. Arma → Espada), descripción física e historia propia.</p>
    <h4>Criaturas</h4>
    <p>Hábitat, dieta, nivel de peligrosidad (1 a 5), comportamiento, habilidades y debilidades.</p>
    <h4>Razas</h4>
    <p>Rasgos físicos, esperanza de vida, distribución geográfica, cultura, religión, sistema de magia/tecnología y habilidades raciales. Se pueden vincular a personajes y criaturas, y cada ficha muestra cuántos están vinculados a ella.</p>`},
  {id:'mapa', titulo:'Mapa y relaciones', html:`
    <h4>Cuatro mapas en uno</h4>
    <p>Cambia entre Todos, Genealogía (personajes), Lugares, Objetos y Criaturas. Cada uno recuerda su propio zoom y posición: son, en la práctica, cuatro mapas independientes que comparten pantalla.</p>
    <h4>Zoom y desplazamiento</h4>
    <p>Rueda del ratón para acercar/alejar hacia el cursor, arrastra el fondo para desplazarte, o usa dos dedos en el móvil. Los botones ＋／－／◱／⌂ controlan el zoom, ajustan la vista a todos los nodos o la reinician.</p>
    <h4>Puentes en los cruces</h4>
    <p>Cuando dos líneas de relación se cruzan, una salta sobre la otra con un pequeño puente (como en un diagrama eléctrico) para que no parezca que están conectadas. Puedes desactivarlo con el botón 🌉.</p>
    <h4>Vincular fichas</h4>
    <p>Pulsa «🔗 Vincular», toca dos fichas y elige el tipo de relación (familiar, amor, amistad, conflicto, procedencia de un objeto, etc.). Puedes definir cómo ve cada una a la otra por separado — útil para relaciones no correspondidas.</p>`},
  {id:'tiempo', titulo:'Línea temporal', html:`
    <h4>La historia de tu mundo</h4>
    <p>En la pestaña 🕒 Línea puedes registrar los grandes eventos de tu mundo: guerras, fundaciones, nacimientos importantes, catástrofes…</p>
    <h4>Fecha libre</h4>
    <p>El campo de fecha es texto libre — puedes escribir "Año 302" o "Tercera luna del invierno", lo que tenga sentido en tu calendario ficticio.</p>
    <h4>Orden manual</h4>
    <p>Usa las flechas ▲▼ de cada evento para reordenarlos exactamente como quieras, independientemente de cómo escribiste la fecha.</p>`},
  {id:'seguimiento', titulo:'Progreso', html:`
    <h4>Racha y tiempo</h4>
    <p>ZScriv registra tu racha de días escribiendo y el tiempo aproximado que pasas con el editor abierto, sin que tengas que hacer nada.</p>
    <h4>Estadísticas</h4>
    <p>En la pestaña 📈 Progreso verás palabras totales, promedio por escena, tu escena más larga y un mapa de calor de los últimos 30 días.</p>`},
  {id:'novedades', titulo:'Copias, EPUB y apariciones', html:`
    <h4>Base de datos y copias automáticas</h4>
    <p>Tus proyectos ya no están limitados a 5 MB: se guardan en la base de datos del navegador. Mientras escribes se crean copias automáticas con historial (en <code>Proyectos → Copias automáticas</code>) que puedes restaurar como proyecto nuevo.</p>
    <h4>EPUB y Word</h4>
    <p>En <code>Exportar</code> elige <code>Libro electrónico (.epub)</code> para tu e-reader o <code>Documento de Word (.docx)</code> para agentes y editoriales, con portada, títulos, autor e interlineado doble opcional.</p>
    <h4>Seguimiento de apariciones</h4>
    <p>Cada ficha muestra en qué escenas aparece (si la mencionas con @ # * % &) y avisa si un personaje lleva mucho sin aparecer. En <code>Progreso</code> ves una tira por personaje con todas las escenas de la novela.</p>`},
  {id:'ajustes', titulo:'Ajustes y modos', html:`
    <h4>Modo sencillo y modo completo</h4>
    <p>En ⚙️ Ajustes → General eliges el <code>Modo sencillo</code> (manuscrito, corcho y notas) o el <code>Modo completo</code> (todas las herramientas). Después puedes encender o apagar cada función por separado y tu selección queda guardada como «Tuyo».</p>
    <h4>Nada se pierde</h4>
    <p>Ocultar una vista, un panel o una herramienta solo la quita de la pantalla. Tus personajes, mapas, notas y escenas siguen guardados y reaparecen al volver a activarla.</p>
    <h4>Personalización</h4>
    <p>Tamaño de la interfaz, color de acento, letra, botones grandes, cursor centrado, autoguardado, barras y mucho más. En Datos puedes exportar e importar tus ajustes o restablecerlos.</p>`},
  {id:'exportar', titulo:'Exportar y guardar', html:`
    <h4>Formatos</h4>
    <p>Compila tu manuscrito a TXT, Markdown, HTML interactivo (con las menciones convertidas en tarjetas que se pueden tocar) o JSON completo del proyecto.</p>
    <h4>Imprimir / PDF</h4>
    <p>Usa «Imprimir / Guardar como PDF» dentro del panel de exportar: abre el diálogo de impresión de tu navegador, donde puedes elegir «Guardar como PDF».</p>
    <h4>Copia automática en carpeta</h4>
    <p>En 📂 Proyectos puedes elegir una carpeta de tu equipo (solo en Chrome/Edge de escritorio) donde ZScriv guardará una copia <code>.zscriv.json</code> cada ~30 segundos, sin que tengas que hacer nada. El navegador puede pedirte reconfirmar el permiso al reiniciarlo; verás un aviso con un botón para reactivarlo en un clic.</p>
    <h4>Copias de seguridad manuales</h4>
    <p>Exporta a JSON regularmente también como respaldo adicional. Es tu copia completa: personajes, lugares, objetos, criaturas, razas, relaciones, eventos y el manuscrito entero.</p>`}
];
function pintarGuia(activaId){
  const tabsCont = document.getElementById('guia-tabs');
  tabsCont.innerHTML = GUIA.map(g=>`<button data-id="${g.id}" class="${g.id===activaId?'activo':''}">${g.titulo}</button>`).join('');
  tabsCont.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>pintarGuia(b.dataset.id)));
  const seccion = GUIA.find(g=>g.id===activaId) || GUIA[0];
  document.getElementById('guia-contenido').innerHTML = seccion.html;
}
document.getElementById('btn-guia').addEventListener('click', ()=>{ pintarGuia('inicio'); abrirOverlay(document.getElementById('modal-guia')); });

/* ---- respaldo automático en carpeta (File System Access API) ---- */
const IDB_NOMBRE='zscriv-db', IDB_STORE='handles', IDB_KEY='carpetaRespaldo';
function idbAbrir(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(IDB_NOMBRE, 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbGuardarHandle(handle){
  const db = await idbAbrir();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
    tx.oncomplete = ()=>resolve(); tx.onerror = ()=>reject(tx.error);
  });
}
async function idbLeerHandle(){
  const db = await idbAbrir();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = ()=>resolve(req.result||null);
    req.onerror = ()=>reject(req.error);
  });
}
let carpetaRespaldoHandle = null;
let carpetaRespaldoEstado = 'sin-configurar';
function actualizarUICarpetaRespaldo(){
  const cont = document.getElementById('carpeta-respaldo-estado');
  if(!cont) return;
  const textos = {
    'no-soportado': 'Tu navegador no soporta guardado automático en carpeta (disponible en Chrome/Edge de escritorio).',
    'sin-configurar': 'Elige una carpeta para que ZScriv guarde ahí una copia automática mientras trabajas.',
    'activo': '🟢 Copia automática activa. Se actualiza cada ~30 segundos mientras escribes.',
    'requiere-permiso': '🟡 El navegador pidió reconfirmar el permiso (pasa al reiniciarlo). Pulsa el botón para reactivarlo.'
  };
  cont.textContent = textos[carpetaRespaldoEstado] || '';
  const btn = document.getElementById('btn-config-carpeta-respaldo');
  if(carpetaRespaldoEstado==='no-soportado'){ btn.style.display='none'; return; }
  btn.style.display='inline-flex';
  btn.textContent = carpetaRespaldoEstado==='activo' ? '📁 Cambiar carpeta' : carpetaRespaldoEstado==='requiere-permiso' ? '🔓 Reactivar permiso' : '📁 Elegir carpeta';
}
async function inicializarCarpetaRespaldo(){
  if(!window.showDirectoryPicker){ carpetaRespaldoEstado='no-soportado'; actualizarUICarpetaRespaldo(); return; }
  try{
    const handle = await idbLeerHandle();
    if(!handle){ carpetaRespaldoEstado='sin-configurar'; actualizarUICarpetaRespaldo(); return; }
    carpetaRespaldoHandle = handle;
    const permiso = await handle.queryPermission({mode:'readwrite'});
    carpetaRespaldoEstado = permiso==='granted' ? 'activo' : 'requiere-permiso';
  }catch(err){ carpetaRespaldoEstado='sin-configurar'; }
  actualizarUICarpetaRespaldo();
}
document.getElementById('btn-config-carpeta-respaldo').addEventListener('click', async ()=>{
  if(!window.showDirectoryPicker) return;
  if(carpetaRespaldoEstado==='requiere-permiso' && carpetaRespaldoHandle){
    try{
      const permiso = await carpetaRespaldoHandle.requestPermission({mode:'readwrite'});
      carpetaRespaldoEstado = permiso==='granted' ? 'activo' : 'requiere-permiso';
      actualizarUICarpetaRespaldo();
      if(permiso==='granted'){ toast('Copia automática reactivada'); guardarCopiaEnCarpeta(); }
    }catch(err){}
    return;
  }
  try{
    const handle = await window.showDirectoryPicker({mode:'readwrite'});
    await idbGuardarHandle(handle);
    carpetaRespaldoHandle = handle;
    carpetaRespaldoEstado = 'activo';
    actualizarUICarpetaRespaldo();
    toast('Carpeta de respaldo configurada');
    guardarCopiaEnCarpeta();
  }catch(err){ /* el usuario canceló el selector */ }
});
async function guardarCopiaEnCarpeta(){
  if(carpetaRespaldoEstado!=='activo' || !carpetaRespaldoHandle || !proyecto) return;
  try{
    const nombreArchivo = (proyecto.nombre||'proyecto').replace(/[^\w\-]+/g,'_') + '.zscriv.json';
    const fileHandle = await carpetaRespaldoHandle.getFileHandle(nombreArchivo, {create:true});
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(Object.assign({_zscriv:'ZSCRIV-v1'}, proyecto)));
    await writable.close();
  }catch(err){
    carpetaRespaldoEstado = 'requiere-permiso';
    actualizarUICarpetaRespaldo();
  }
}

/* ======================================================================
   MODO MÓVIL: detección, cajones, navegación inferior, botón «atrás»
   ====================================================================== */
const LS_UI = 'zscriv_modo_ui';
let kUI = 1, zoomUI = 1, claveAnchoUI = '', alturaMaxVV = 0;
const capasUI = [];
let historialUI = 0, ignorarPop = 0, historialOK = true, retrocesoPendiente = false;
const pendientesHistorial = [];

function esMovilActivo(){ return document.documentElement.classList.contains('movil'); }
function esTactil(){ return (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || (navigator.maxTouchPoints||0) > 0; }
function leerModoUI(){ try{ return localStorage.getItem(LS_UI) || 'auto'; }catch(e){ return 'auto'; } }
function detectarMovil(){
  const pref = leerModoUI();
  if(pref==='movil') return true;
  if(pref==='escritorio') return false;
  const lado = Math.min(screen.width||9999, screen.height||9999);
  return (esTactil() && lado <= 820) || window.innerWidth <= 700;
}
function moverNavSegunModo(movil){
  const nav = document.getElementById('nav'), panel = document.getElementById('panel-lateral'), cuerpo = document.getElementById('cuerpo');
  if(movil){ if(nav.parentNode !== panel) panel.insertBefore(nav, panel.firstChild); }
  else { if(nav.parentNode !== cuerpo) cuerpo.insertBefore(nav, panel); }
}
function actualizarVarsViewport(){
  const root = document.documentElement, vv = window.visualViewport;
  let h, w;
  if(Math.abs(zoomUI - 1) > 0.001){ h = window.innerHeight / zoomUI; w = window.innerWidth / zoomUI; }
  else { h = vv ? vv.height : window.innerHeight; w = vv ? vv.width : window.innerWidth; }
  root.style.setProperty('--vh100', h + 'px');
  root.style.setProperty('--vw100', w + 'px');
}
function revisarTeclado(){
  const vv = window.visualViewport;
  const h = Math.abs(zoomUI - 1) > 0.001 ? window.innerHeight : (vv ? vv.height : window.innerHeight);
  if(h > alturaMaxVV) alturaMaxVV = h;
  const abierto = esMovilActivo() && alturaMaxVV > 0 && h < alturaMaxVV * 0.78;
  const antes = document.body.classList.contains('teclado');
  document.body.classList.toggle('teclado', abierto);
  if(abierto && !antes) setTimeout(mantenerCursorVisible, 120);
}
/* Si Chrome está en «Sitio para computadoras» el navegador pinta la página
   con ~980 px de ancho. En ese caso se compensa con zoom para que la interfaz
   móvil ocupe la pantalla completa a tamaño normal. */
function aplicarModoUI(forzar){
  const root = document.documentElement;
  const clave = window.innerWidth + 'x' + screen.width + '|' + leerModoUI();
  const movil = detectarMovil();
  if(forzar || clave !== claveAnchoUI){
    root.style.zoom = '';
    let z = 1;
    if(movil && esTactil() && screen.width > 0){
      const w = root.clientWidth;
      if(w > screen.width * 1.25) z = w / screen.width;
    }
    escalaAplicada = Number(AJ('ui.escala')) || 100;
    zoomUI = z * (escalaAplicada / 100);
    const conZoom = Math.abs(zoomUI - 1) > 0.001;
    if(conZoom) root.style.zoom = String(Math.round(zoomUI*1000)/1000);
    root.classList.toggle('zoom-ui', conZoom);
    const habiaMovil = root.classList.contains('movil');
    root.classList.toggle('movil', movil);
    moverNavSegunModo(movil);
    if(habiaMovil !== movil){ cerrarDrawers(); document.body.classList.remove('teclado','editando'); }
    kUI = 1;
    if(conZoom){
      const sonda = document.createElement('div');
      sonda.style.cssText = 'position:absolute;left:0;top:0;width:100px;height:1px;visibility:hidden;pointer-events:none';
      document.body.appendChild(sonda);
      kUI = (sonda.getBoundingClientRect().width / 100) || 1;
      sonda.remove();
    }
    alturaMaxVV = 0;
    claveAnchoUI = window.innerWidth + 'x' + screen.width + '|' + leerModoUI();
    if(proyecto){ actualizarContadores(); actualizarBarraInferior(); }
  }
  actualizarVarsViewport();
  revisarTeclado();
}
let rafAjusteUI = 0;
function programarAjusteUI(){
  if(rafAjusteUI) return;
  rafAjusteUI = requestAnimationFrame(()=>{ rafAjusteUI = 0; aplicarModoUI(false); });
}
window.addEventListener('resize', programarAjusteUI);
window.addEventListener('orientationchange', ()=>setTimeout(()=>{ alturaMaxVV = 0; aplicarModoUI(true); }, 280));
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', programarAjusteUI);
  window.visualViewport.addEventListener('scroll', ()=>{ if(esMovilActivo() && document.scrollingElement && document.scrollingElement.scrollTop !== 0) document.scrollingElement.scrollTop = 0; });
}

/* ---- botón «atrás» de Android: cierra la capa superior en vez de salir ---- */
function empujarEstadoUI(){
  if(!historialOK) return;
  const hacer = ()=>{ try{ history.pushState({zs:1}, ''); historialUI++; }catch(e){ historialOK = false; } };
  if(retrocesoPendiente) pendientesHistorial.push(hacer); else hacer();
}
function liberarEstadoUI(){
  if(historialUI <= 0) return;
  historialUI--; ignorarPop++; retrocesoPendiente = true;
  try{ history.back(); }catch(e){ ignorarPop--; retrocesoPendiente = false; }
  setTimeout(()=>{ if(retrocesoPendiente){ ignorarPop = 0; vaciarPendientesHistorial(); } }, 700);
}
function vaciarPendientesHistorial(){
  retrocesoPendiente = false;
  pendientesHistorial.splice(0).forEach(f=>f());
}
function registrarCapa(id, cerrarFn){
  if(capasUI.some(c=>c.id===id)) return;
  capasUI.push({id, cerrar:cerrarFn});
  empujarEstadoUI();
}
function quitarCapa(id){
  const i = capasUI.findIndex(c=>c.id===id);
  if(i < 0) return false;
  capasUI.splice(i, 1);
  liberarEstadoUI();
  return true;
}
window.addEventListener('popstate', ()=>{
  if(ignorarPop > 0){ ignorarPop--; if(ignorarPop === 0) vaciarPendientesHistorial(); return; }
  if(!capasUI.length) return;
  const capa = capasUI.pop();
  if(historialUI > 0) historialUI--;
  capa.cerrar();
});

/* ---- cajones laterales ---- */
function aplicarDrawer(cual){
  panelLateralEl.classList.toggle('mostrar-movil', cual === 'panel');
  inspectorEl.classList.toggle('mostrar-movil', cual === 'inspector');
  fondoMovilEl.classList.toggle('activo', !!cual);
}
function abrirDrawer(cual){
  aplicarDrawer(cual);
  registrarCapa('drawer', ()=>aplicarDrawer(null));
}
function cerrarDrawers(){
  aplicarDrawer(null);
  quitarCapa('drawer');
}
function swipeCerrar(el, dir){
  let x0 = 0, y0 = 0, t0 = 0, valido = false;
  el.addEventListener('touchstart', (e)=>{
    valido = e.touches.length === 1 && !e.target.closest('textarea,input,select');
    if(valido){ x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }
  }, {passive:true});
  el.addEventListener('touchend', (e)=>{
    if(!valido || !esMovilActivo()) return;
    const t = e.changedTouches[0];
    const dx = (t.clientX - x0) / kUI, dy = (t.clientY - y0) / kUI;
    if(Math.abs(dx) > 70 && Math.abs(dy) < 45 && Math.sign(dx) === dir && Date.now() - t0 < 600) cerrarDrawers();
  }, {passive:true});
}
swipeCerrar(panelLateralEl, -1);
swipeCerrar(inspectorEl, 1);

/* ---- hoja «Más» y navegación inferior (se reconstruyen según los ajustes) ---- */
const hojaMasEl = document.getElementById('hoja-mas');
const navMovilEl = document.getElementById('navmovil');
const VISTAS_NAV = [
  {k:'corkboard', ic:'▤', t:'Corcho'}, {k:'mundo', ic:'🌐', t:'Mundo'}, {k:'mapa', ic:'✺', t:'Mapa'},
  {k:'outliner', ic:'☰', t:'Esquema'}, {k:'linea', ic:'🕒', t:'Línea'}, {k:'stats', ic:'📈', t:'Progreso'}
];
const HERRAM_HOJA = [
  {id:'btn-proyectos', ic:'📂', t:'Proyectos'},
  {id:'btn-ia', ic:'✨', t:'Asistente', aj:'tool.ia'},
  {id:'btn-zen', ic:'⛶', t:'Composición', aj:'tool.zen'},
  {id:'btn-temas', ic:'🎨', t:'Apariencia'},
  {id:'btn-export', ic:'⇩', t:'Exportar', aj:'tool.export'},
  {id:'btn-guardar', ic:'💾', t:'Guardar'},
  {id:'btn-guia', ic:'❓', t:'Guía', aj:'tool.guia'}
];
let vistasFijasNav = ['editor'];
function reconstruirNavMovil(){
  const vis = VISTAS_NAV.filter(v=>AJ('vista.'+v.k));
  const fijas = vis.slice(0,3), resto = vis.slice(3);
  vistasFijasNav = ['editor'].concat(fijas.map(v=>v.k));
  const btn = (v)=>`<button data-ir="${v.k}"><span class="ic">${v.ic}</span><span class="tx">${v.t}</span></button>`;
  navMovilEl.innerHTML = btn({k:'editor', ic:'✎', t:'Editor'}) + fijas.map(btn).join('') +
    '<button id="btn-mas-nav"><span class="ic">⋯</span><span class="tx">Más</span></button>';
  const herr = HERRAM_HOJA.filter(h=>!h.aj || AJ(h.aj));
  hojaMasEl.innerHTML = '<div class="hoja"><div class="hoja-asa"></div>' +
    (resto.length ? '<div class="hoja-grupo">Otras vistas</div><div class="hoja-grid">' + resto.map(btn).join('') + '</div>' : '') +
    '<div class="hoja-grupo">Herramientas</div><div class="hoja-grid">' +
    herr.map(h=>`<button data-btn="${h.id}"><span class="ic">${h.ic}</span><span class="tx">${h.t}</span></button>`).join('') + '</div></div>';
  sincronizarNavMovil();
}
function sincronizarNavMovil(){
  navMovilEl.querySelectorAll('[data-ir]').forEach(b=>b.classList.toggle('activo', b.dataset.ir === vistaActual));
  const mas = document.getElementById('btn-mas-nav');
  if(mas) mas.classList.toggle('activo', !vistasFijasNav.includes(vistaActual));
  hojaMasEl.querySelectorAll('[data-ir]').forEach(b=>b.classList.toggle('activo', b.dataset.ir === vistaActual));
}
function abrirHojaMas(){
  sincronizarNavMovil();
  hojaMasEl.classList.add('activo');
  registrarCapa('hoja', ()=>hojaMasEl.classList.remove('activo'));
}
function cerrarHojaMas(){
  hojaMasEl.classList.remove('activo');
  quitarCapa('hoja');
}
function irAVista(v){
  cerrarDrawers();
  cerrarHojaMas();
  const destino = document.querySelector('.modos-vista [data-vista="' + v + '"]');
  if(destino) destino.click();
}
navMovilEl.addEventListener('click', (e)=>{
  const b = e.target.closest('button'); if(!b) return;
  if(b.id === 'btn-mas-nav'){ abrirHojaMas(); return; }
  if(b.dataset.ir) irAVista(b.dataset.ir);
});
hojaMasEl.addEventListener('click', (e)=>{
  if(e.target === hojaMasEl){ cerrarHojaMas(); return; }
  const b = e.target.closest('button'); if(!b) return;
  if(b.dataset.ir){ irAVista(b.dataset.ir); return; }
  if(b.dataset.btn){
    cerrarHojaMas();
    setTimeout(()=>{ const o = document.getElementById(b.dataset.btn); if(o) o.click(); }, 80);
  }
});
document.querySelectorAll('.modos-vista button').forEach(b=>b.addEventListener('click', ()=>{ sincronizarNavMovil(); if(esMovilActivo()) cerrarDrawers(); }));

/* ---- modo composición con el botón atrás ---- */
document.getElementById('btn-zen').addEventListener('click', ()=>{
  if(!esMovilActivo()) return;
  registrarCapa('zen', ()=>{ document.body.classList.remove('zen'); document.getElementById('btn-zen-salir').classList.add('oculto'); });
});
document.getElementById('btn-zen-salir').addEventListener('click', ()=>{ quitarCapa('zen'); });

/* ---- editor: barra sobre el teclado ---- */
const barraEscEl = document.getElementById('barra-escritura');
function actualizarEditando(){
  const a = document.activeElement;
  document.body.classList.toggle('editando', !!a && (a === editorCE || a === elTitulo));
}
const vistaEditorEl = document.getElementById('vista-editor');
vistaEditorEl.addEventListener('focusin', actualizarEditando);
vistaEditorEl.addEventListener('focusout', ()=>setTimeout(actualizarEditando, 140));
/* botón que no le quita el foco al editor (así el teclado no se cierra) */
function botonSinFoco(el, fn){
  let x0 = 0, y0 = 0, movido = false, ultimoToque = 0;
  el.addEventListener('mousedown', (e)=>e.preventDefault());
  el.addEventListener('touchstart', (e)=>{ x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; movido = false; }, {passive:true});
  el.addEventListener('touchmove', (e)=>{ if(Math.abs(e.touches[0].clientX - x0) > 8 || Math.abs(e.touches[0].clientY - y0) > 8) movido = true; }, {passive:true});
  el.addEventListener('touchend', (e)=>{ if(movido) return; e.preventDefault(); ultimoToque = Date.now(); fn(); });
  el.addEventListener('click', ()=>{ if(Date.now() - ultimoToque < 600) return; fn(); });
}
function insertarEnEditor(texto){
  if(!proyecto || !nodoActivoId || !editorCE.isContentEditable){ toast('Selecciona una escena para escribir'); return; }
  editorCE.focus();
  document.execCommand('insertText', false, texto);
}
barraEscEl.querySelectorAll('[data-ins]').forEach(b=>botonSinFoco(b, ()=>insertarEnEditor(b.dataset.ins)));
botonSinFoco(document.getElementById('be-deshacer'), ()=>{ editorCE.focus(); document.execCommand('undo'); });
botonSinFoco(document.getElementById('be-rehacer'), ()=>{ editorCE.focus(); document.execCommand('redo'); });
botonSinFoco(document.getElementById('be-ajustes'), ()=>{ document.getElementById('btn-temas').click(); });
botonSinFoco(document.getElementById('be-ocultar'), ()=>{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); actualizarEditando(); });

function mantenerCursorVisible(){
  if(!esMovilActivo() || document.activeElement !== editorCE) return;
  const sel = window.getSelection();
  if(!sel || !sel.rangeCount) return;
  const rg = sel.getRangeAt(0).cloneRange();
  rg.collapse(false);
  let r = rg.getBoundingClientRect();
  if(!r || (r.top === 0 && r.bottom === 0)){
    const lista = rg.getClientRects();
    if(!lista.length) return;
    r = lista[lista.length - 1];
  }
  const env = document.getElementById('editor-envoltura');
  const c = env.getBoundingClientRect();
  const margen = 36;
  if(r.bottom > c.bottom - margen) env.scrollTop += (r.bottom - (c.bottom - margen)) / kUI;
  else if(r.top < c.top + 8) env.scrollTop -= (c.top + 8 - r.top) / kUI;
}
editorCE.addEventListener('input', ()=>{ setTimeout(()=>{ if(AJ('ed.maquina')) centrarCursor(); else if(esMovilActivo()) mantenerCursorVisible(); }, 0); });
editorCE.addEventListener('focus', ()=>{ if(esMovilActivo()) setTimeout(mantenerCursorVisible, 380); });

/* espacio ocupado abajo por barras fijas (para colocar sugerencias y fichas encima) */
function espacioInferiorMovil(){
  let tope = window.innerHeight;
  ['barra-escritura','navmovil','barainf'].forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.offsetParent !== null) tope = Math.min(tope, el.getBoundingClientRect().top);
  });
  return Math.max(0, (window.innerHeight - tope) / kUI);
}

/* ---- guardar siempre al salir de la pestaña (en Android el navegador puede cerrarla sin avisar) ---- */
document.addEventListener('visibilitychange', ()=>{ if(document.hidden && proyectoActivoId){ guardarProyecto(true); copiaAutomatica(120000); } });
window.addEventListener('pagehide', ()=>{ if(proyectoActivoId) guardarProyecto(true); });

/* ======================================================================
   AJUSTES: modo sencillo / completo y personalización de todo
   (ocultar una función NUNCA borra datos; solo la quita de la pantalla)
   ====================================================================== */
const LS_AJ = 'zscriv_ajustes';
const AJ_DEF = {
  'vista.corkboard':true, 'vista.outliner':true, 'vista.mundo':true, 'vista.mapa':true, 'vista.linea':true, 'vista.stats':true,
  'panel.personajes':true, 'panel.lugares':true, 'panel.investigacion':true, 'panel.papelera':true,
  'tool.ia':true, 'tool.zen':true, 'tool.buscar':true, 'tool.export':true, 'tool.guia':true, 'tool.json':true,
  'insp.activo':true, 'insp.sinopsis':true, 'insp.notas':true, 'insp.meta':true, 'insp.historial':true,
  'bar.visible':true, 'bar.doc':true, 'bar.total':true, 'bar.meta':true, 'bar.racha':true, 'bar.guardado':true,
  'ed.menciones':true, 'ed.hint':true,
  'ed.corrector':true, 'ed.justificar':false, 'ed.maquina':false, 'ed.autoguardado':30, 'ed.barraMovil':true,
  'nav.etiquetas':true,
  'dat.copias':true, 'seg.avisos':true, 'seg.umbral':8,
  'ui.escala':100, 'ui.acento':'', 'ui.fuente':'defecto', 'ui.sinAnim':false, 'ui.grande':false
};
const AJ_MODO_CLAVES = Object.keys(AJ_DEF).filter(k=>/^(vista|panel|tool|insp|bar)\./.test(k) || k==='ed.menciones' || k==='ed.hint');
const AJ_COMPLETO = {}; AJ_MODO_CLAVES.forEach(k=>{ AJ_COMPLETO[k] = AJ_DEF[k]; });
const AJ_SENCILLO = Object.assign({}, AJ_COMPLETO, {
  'vista.outliner':false, 'vista.mundo':false, 'vista.mapa':false, 'vista.linea':false, 'vista.stats':false,
  'panel.personajes':false, 'panel.lugares':false, 'panel.investigacion':false,
  'tool.ia':false, 'tool.json':false,
  'insp.meta':false, 'insp.historial':false,
  'bar.total':false, 'bar.meta':false, 'bar.racha':false,
  'ed.menciones':false, 'ed.hint':false
});
let ajustes = (()=>{ try{ return JSON.parse(localStorage.getItem(LS_AJ) || '{}') || {}; }catch(e){ return {}; } })();
let escalaAplicada = null;
function AJ(k){ const v = ajustes[k]; return v === undefined ? AJ_DEF[k] : v; }
function guardarAjustes(){ try{ localStorage.setItem(LS_AJ, JSON.stringify(ajustes)); }catch(e){} }
function valoresModo(){ const o = {}; AJ_MODO_CLAVES.forEach(k=>{ o[k] = AJ(k); }); return o; }
function mismosValores(a, b){ return AJ_MODO_CLAVES.every(k=>a[k] === b[k]); }
function modoActual(){
  const v = valoresModo();
  if(mismosValores(v, AJ_COMPLETO)) return 'completo';
  if(mismosValores(v, AJ_SENCILLO)) return 'sencillo';
  return 'personalizado';
}
function aplicarModoPreset(nombre){
  if(modoActual() === 'personalizado') ajustes._custom = valoresModo();
  const origen = nombre === 'sencillo' ? AJ_SENCILLO : nombre === 'completo' ? AJ_COMPLETO : ajustes._custom;
  if(!origen) return;
  AJ_MODO_CLAVES.forEach(k=>{ ajustes[k] = origen[k]; });
  guardarAjustes(); aplicarAjustes(); pintarAjustes();
  toast(nombre === 'sencillo' ? 'Modo sencillo activado' : nombre === 'completo' ? 'Modo completo activado' : 'Tu selección personalizada se restauró');
}

const FUENTES_UI = {
  defecto:'',
  sistema:"system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  serif:"Georgia,'Times New Roman',serif",
  mono:"ui-monospace,Consolas,'Courier New',monospace"
};
function ocultarAj(el, si){ if(el) el.classList.toggle('oculto-aj', !!si); }
function aplicarAjustes(){
  const root = document.documentElement;
  const q = (s)=>document.querySelector(s), id = (s)=>document.getElementById(s);
  /* vistas */
  const vistas = ['corkboard','outliner','mundo','mapa','linea','stats'];
  vistas.forEach(k=>ocultarAj(q('.modos-vista [data-vista="'+k+'"]'), !AJ('vista.'+k)));
  ocultarAj(q('.modos-vista'), !vistas.some(k=>AJ('vista.'+k)));
  if(vistaActual !== 'editor' && !AJ('vista.'+vistaActual)) q('.modos-vista [data-vista="editor"]').click();
  /* paneles laterales */
  const paneles = ['personajes','lugares','investigacion','papelera'];
  paneles.forEach(k=>ocultarAj(q('.nav-btn[data-panel="'+k+'"]'), !AJ('panel.'+k)));
  ocultarAj(id('nav'), !paneles.some(k=>AJ('panel.'+k)));
  if(panelActivo !== 'manuscrito' && !AJ('panel.'+panelActivo)) q('.nav-btn[data-panel="manuscrito"]').click();
  /* herramientas */
  ocultarAj(id('btn-ia'), !AJ('tool.ia'));
  ocultarAj(id('btn-zen'), !AJ('tool.zen'));
  ocultarAj(id('btn-export'), !AJ('tool.export'));
  ocultarAj(id('btn-guia'), !AJ('tool.guia'));
  ocultarAj(id('btn-buscar-global'), !AJ('tool.buscar'));
  ocultarAj(id('buscador-global'), !AJ('tool.buscar'));
  ocultarAj(q('.panel-pie'), !AJ('tool.json'));
  /* panel de detalles */
  const tabsInsp = ['sinopsis','notas','meta','historial'];
  tabsInsp.forEach(k=>ocultarAj(q('.insp-tab[data-tab="'+k+'"]'), !AJ('insp.'+k)));
  const hayInsp = AJ('insp.activo') && tabsInsp.some(k=>AJ('insp.'+k));
  ocultarAj(inspectorEl, !hayInsp);
  ocultarAj(id('btn-inspector-movil'), !hayInsp);
  if(hayInsp){
    const act = q('.insp-tab.activo');
    if(!act || act.classList.contains('oculto-aj')){
      const prim = [...document.querySelectorAll('.insp-tab')].find(t=>!t.classList.contains('oculto-aj'));
      if(prim) prim.click();
    }
  }
  /* barra de estado */
  ocultarAj(id('barainf'), !AJ('bar.visible'));
  ocultarAj(id('bi-palabras-doc'), !AJ('bar.doc'));
  ocultarAj(id('bi-palabras-total'), !AJ('bar.total'));
  ocultarAj(id('bi-objetivo-txt'), !AJ('bar.meta'));
  ocultarAj(id('progreso-mini'), !AJ('bar.meta'));
  ocultarAj(id('bi-racha'), !AJ('bar.racha'));
  ocultarAj(id('bi-guardado'), !AJ('bar.guardado'));
  id('barainf').classList.toggle('sin-sep', ['doc','total','meta','racha','guardado'].some(k=>!AJ('bar.'+k)));
  /* escritura */
  editorCE.spellcheck = !!AJ('ed.corrector');
  elTitulo.spellcheck = !!AJ('ed.corrector');
  editorCE.style.textAlign = AJ('ed.justificar') ? 'justify' : '';
  ocultarAj(id('editor-hint'), !AJ('ed.hint'));
  root.classList.toggle('sin-menciones', !AJ('ed.menciones'));
  root.classList.toggle('sin-barra-esc', !AJ('ed.barraMovil'));
  root.classList.toggle('nav-sin-texto', !AJ('nav.etiquetas'));
  /* apariencia de la interfaz */
  root.classList.toggle('ui-grande', !!AJ('ui.grande'));
  root.classList.toggle('sin-anim', !!AJ('ui.sinAnim'));
  if(AJ('ui.acento')) root.style.setProperty('--acento-tinta', AJ('ui.acento')); else root.style.removeProperty('--acento-tinta');
  const fuente = FUENTES_UI[AJ('ui.fuente')];
  if(fuente) root.style.setProperty('--fuente-ui', fuente); else root.style.removeProperty('--fuente-ui');
  const esc = Number(AJ('ui.escala')) || 100;
  if(escalaAplicada !== esc){ aplicarModoUI(true); }
  reconstruirNavMovil();
}

/* cursor centrado tipo máquina de escribir */
function centrarCursor(){
  if(document.activeElement !== editorCE) return;
  const sel = window.getSelection(); if(!sel || !sel.rangeCount) return;
  const rg = sel.getRangeAt(0).cloneRange(); rg.collapse(false);
  let r = rg.getBoundingClientRect();
  if(!r || (r.top === 0 && r.bottom === 0)){ const l = rg.getClientRects(); if(!l.length) return; r = l[l.length-1]; }
  const env = document.getElementById('editor-envoltura'), c = env.getBoundingClientRect();
  env.scrollTop += (r.top - (c.top + c.height * 0.4)) / kUI;
}

/* ---- pantalla de ajustes ---- */
const sw = (k, t, d)=>({tipo:'sw', k, t, d});
const AJ_TABS = [['general','General'],['funciones','Funciones'],['editor','Escritura'],['barras','Barras'],['datos','Datos']];
const AJ_SCHEMA = {
  general:[
    {g:'Modo de uso'}, {tipo:'modos'},
    {g:'Interfaz'},
    {tipo:'sel', k:'ui.modo', t:'Diseño', d:'«Automático» detecta si usas celular o computadora.', opts:[['auto','Automático'],['movil','Siempre móvil'],['escritorio','Siempre escritorio']],
      get:()=>leerModoUI(), set:(v)=>{ try{ localStorage.setItem(LS_UI, v); }catch(e){} aplicarModoUI(true); }},
    {tipo:'rng', k:'ui.escala', t:'Tamaño de la interfaz', min:80, max:140, step:5, fmt:(v)=>v+'%'},
    {tipo:'color', k:'ui.acento', t:'Color de acento'},
    {tipo:'sel', k:'ui.fuente', t:'Letra de la interfaz', opts:[['defecto','Predeterminada'],['sistema','Del sistema'],['serif','Con serifa'],['mono','Monoespaciada']]},
    sw('ui.grande','Botones y filas más grandes','Más fáciles de tocar con el dedo.'),
    sw('ui.sinAnim','Reducir animaciones','Transiciones y movimientos desactivados.'),
    {g:'Texto del editor'},
    {tipo:'btn', t:'Tema, tipografía, ancho e interlineado…', fn:()=>document.getElementById('btn-temas').click()}
  ],
  funciones:[
    {g:'Vistas'}, {nota:'Ocultar una función no borra nada: tus personajes, mapas, notas y escenas siguen guardados y reaparecen al volver a activarla.'},
    sw('vista.corkboard','Corcho','Tarjetas con la sinopsis de cada escena.'),
    sw('vista.outliner','Esquema','Tabla con estado, etiqueta y palabras.'),
    sw('vista.mundo','Mundo','Fichas de personajes, lugares, objetos, criaturas y más.'),
    sw('vista.mapa','Mapa','Relaciones y genealogía entre fichas.'),
    sw('vista.linea','Línea de tiempo','Eventos de tu mundo en orden.'),
    sw('vista.stats','Progreso','Estadísticas, racha y mapa de calor.'),
    {g:'Paneles laterales'},
    sw('panel.personajes','Personajes'), sw('panel.lugares','Lugares'), sw('panel.investigacion','Investigación'),
    sw('panel.papelera','Papelera','Lo que elimines se guarda aunque ocultes este panel.'),
    {g:'Herramientas'},
    sw('tool.ia','Asistente narrativo (IA)'), sw('tool.zen','Modo composición'),
    sw('tool.buscar','Búsqueda','En el manuscrito y en todo el proyecto.'),
    sw('tool.export','Exportar y compilar'), sw('tool.guia','Guía de uso'),
    sw('tool.json','Importar y exportar JSON en el panel lateral'),
    {g:'Panel de detalles'},
    sw('insp.activo','Mostrar el panel de detalles'),
    sw('insp.sinopsis','Sinopsis, estado y etiqueta'), sw('insp.notas','Notas'), sw('insp.meta','Palabras clave y objetivo'), sw('insp.historial','Historial e instantáneas')
  ],
  editor:[
    {g:'Escritura'},
    sw('ed.corrector','Corrector ortográfico'),
    sw('ed.justificar','Texto justificado'),
    sw('ed.maquina','Cursor centrado','La línea que escribes se mantiene en el centro, como una máquina de escribir.'),
    {g:'Menciones'},
    sw('ed.menciones','Menciones con @ # * % &','Sugerencias de personajes, lugares, objetos, criaturas y razas.'),
    sw('ed.hint','Mostrar recordatorio de menciones'),
    {g:'Celular'},
    sw('ed.barraMovil','Barra sobre el teclado','Símbolos de mención, deshacer y ajustes mientras escribes.'),
    {g:'Seguimiento de personajes'},
    sw('seg.avisos','Avisar si un personaje lleva mucho sin aparecer','Se muestra en las fichas, en Mundo y en Progreso.'),
    {tipo:'sel', k:'seg.umbral', t:'Avisar a partir de', num:true, opts:[[5,'5 escenas'],[8,'8 escenas'],[12,'12 escenas'],[20,'20 escenas'],[30,'30 escenas']]},
    {g:'Guardado'},
    {tipo:'sel', k:'ed.autoguardado', t:'Autoguardado', num:true, opts:[[15,'Cada 15 s'],[30,'Cada 30 s'],[60,'Cada minuto'],[120,'Cada 2 min']]}
  ],
  barras:[
    {g:'Barra de estado'},
    sw('bar.visible','Mostrar la barra de estado'),
    sw('bar.doc','Palabras del documento'), sw('bar.total','Palabras del proyecto'),
    sw('bar.meta','Meta diaria y progreso'), sw('bar.racha','Racha de escritura'), sw('bar.guardado','Hora del último guardado'),
    {g:'Navegación en celular'},
    sw('nav.etiquetas','Nombres bajo los iconos')
  ],
  datos:[
    {g:'Copias automáticas'},
    sw('dat.copias','Guardar copias automáticas del proyecto','Cada ~10 minutos si hay cambios; se conservan las últimas 6 y una por día durante una semana.'),
    {tipo:'btn', t:'Ver y restaurar copias automáticas…', fn:()=>{ abrirCopias(); }},
    {g:'Tus ajustes'},
    {tipo:'btn', t:'Exportar ajustes (.json)', fn:()=>{ descargar('zscriv-ajustes.json', JSON.stringify(Object.assign({_zscriv:'AJUSTES-v1', _diseno:leerModoUI()}, ajustes), null, 2), 'application/json'); toast('Ajustes exportados'); }},
    {tipo:'btn', t:'Importar ajustes…', fn:()=>importarAjustes()},
    {g:'Proyecto'},
    {tipo:'btn', t:'Proyectos y copia de seguridad…', fn:()=>{ cerrarOverlay(document.getElementById('modal-ajustes')); setTimeout(()=>document.getElementById('btn-proyectos').click(), 90); }},
    {tipo:'btn', t:'Exportar el proyecto…', fn:()=>document.getElementById('btn-export').click()},
    {tipo:'btn', t:'Configurar el asistente de IA…', fn:()=>document.getElementById('btn-ia-config').click()},
    {g:'Restablecer'},
    {tipo:'btn', t:'Restablecer todos los ajustes', peligro:true, fn:()=>restablecerAjustes()}
  ]
};
const AJ_ITEMS = {};
Object.values(AJ_SCHEMA).forEach(l=>l.forEach(it=>{ if(it.k) AJ_ITEMS[it.k] = it; }));
const AJ_COLORES = [['','⟲'],['#5068f5',''],['#9f5cf5',''],['#2ec48a',''],['#f5802a',''],['#ef4444',''],['#22d3ee',''],['#e0648c',''],['#f5a623','']];
let ajTab = 'general';
function valorItem(it){ return it.get ? it.get() : AJ(it.k); }
function pintarAjustes(){
  const tabs = document.getElementById('aj-tabs'), cuerpo = document.getElementById('aj-cuerpo');
  tabs.innerHTML = AJ_TABS.map(([k,t])=>`<button data-tab="${k}" class="${k===ajTab?'activo':''}">${t}</button>`).join('');
  const modo = modoActual();
  const html = AJ_SCHEMA[ajTab].map((it, i)=>{
    if(it.g) return `<div class="aj-grupo">${it.g}</div>`;
    if(it.nota) return `<p class="aj-nota">${it.nota}</p>`;
    if(it.tipo === 'modos'){
      const hayCustom = !!ajustes._custom;
      return `<div class="aj-modos">
        <button class="aj-modo ${modo==='sencillo'?'sel':''}" data-modo="sencillo"><b>Sencillo</b>Lo esencial para escribir</button>
        <button class="aj-modo ${modo==='completo'?'sel':''}" data-modo="completo"><b>Completo</b>Todas las herramientas</button>
        <button class="aj-modo ${modo==='personalizado'?'sel':''}" data-modo="personalizado" ${(modo!=='personalizado' && !hayCustom)?'disabled':''}><b>Tuyo</b>Tu propia selección</button>
      </div><p class="aj-nota" style="margin-top:8px">Elige un punto de partida y ajusta cada función en «Funciones», «Escritura» y «Barras».</p>`;
    }
    if(it.tipo === 'sw'){
      return `<label class="aj-fila"><span class="aj-txt">${it.t}${it.d?`<small>${it.d}</small>`:''}</span><input type="checkbox" class="aj-sw" data-k="${it.k}" ${AJ(it.k)?'checked':''}></label>`;
    }
    if(it.tipo === 'sel'){
      const v = String(valorItem(it));
      return `<div class="aj-fila"><span class="aj-txt">${it.t}${it.d?`<small>${it.d}</small>`:''}</span><select data-k="${it.k}">${it.opts.map(([val,lab])=>`<option value="${val}" ${String(val)===v?'selected':''}>${lab}</option>`).join('')}</select></div>`;
    }
    if(it.tipo === 'rng'){
      const v = Number(AJ(it.k));
      return `<div class="aj-col"><div class="aj-cab"><span>${it.t}</span><b id="aj-val-${i}">${it.fmt(v)}</b></div><input type="range" data-k="${it.k}" data-val="aj-val-${i}" min="${it.min}" max="${it.max}" step="${it.step}" value="${v}"></div>`;
    }
    if(it.tipo === 'color'){
      const v = AJ(it.k) || '';
      return `<div class="aj-col"><div class="aj-cab"><span>${it.t}</span></div><div class="aj-colores">` +
        AJ_COLORES.map(([c,s])=>`<button data-color="${c}" class="${c===v?'sel':''}" style="background:${c||'var(--bg-elemento)'};${c?'':'color:var(--texto-secundario)'}" title="${c||'Color del tema'}">${s}</button>`).join('') +
        `<input type="color" data-colorlibre value="${v||'#5068f5'}" title="Otro color"></div></div>`;
    }
    if(it.tipo === 'btn'){
      return `<button class="btn ${it.peligro?'btn-peligro':'btn-secundario'} aj-btn" data-btn="${i}">${it.t}</button>`;
    }
    return '';
  }).join('');
  cuerpo.innerHTML = html;
}
(function(){
  const modal = document.getElementById('modal-ajustes');
  const cuerpo = document.getElementById('aj-cuerpo'), tabs = document.getElementById('aj-tabs');
  tabs.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-tab]'); if(!b) return;
    ajTab = b.dataset.tab; pintarAjustes();
    modal.querySelector('.modal-body').scrollTop = 0;
  });
  function fijar(k, v){
    const it = AJ_ITEMS[k];
    if(it && it.set) it.set(v); else { ajustes[k] = v; guardarAjustes(); }
    aplicarAjustes();
  }
  cuerpo.addEventListener('input', (e)=>{
    const el = e.target;
    if(el.type === 'range' && el.dataset.val){ const it = AJ_ITEMS[el.dataset.k]; document.getElementById(el.dataset.val).textContent = it.fmt(Number(el.value)); }
  });
  cuerpo.addEventListener('change', (e)=>{
    const el = e.target;
    if(el.hasAttribute('data-colorlibre')){ fijar('ui.acento', el.value); pintarAjustes(); return; }
    const k = el.dataset.k; if(!k) return;
    const it = AJ_ITEMS[k];
    if(el.type === 'checkbox') fijar(k, el.checked);
    else if(el.type === 'range') fijar(k, Number(el.value));
    else fijar(k, it.num ? Number(el.value) : el.value);
    if(el.type === 'checkbox') pintarModoSoloTarjetas();
  });
  cuerpo.addEventListener('click', (e)=>{
    const m = e.target.closest('[data-modo]');
    if(m && !m.disabled){ aplicarModoPreset(m.dataset.modo); return; }
    const c = e.target.closest('[data-color]');
    if(c){ fijar('ui.acento', c.dataset.color); pintarAjustes(); return; }
    const b = e.target.closest('[data-btn]');
    if(b){ const it = AJ_SCHEMA[ajTab][Number(b.dataset.btn)]; if(it && it.fn) it.fn(); }
  });
  function pintarModoSoloTarjetas(){
    const modo = modoActual();
    cuerpo.querySelectorAll('[data-modo]').forEach(b=>b.classList.toggle('sel', b.dataset.modo === modo));
  }
  document.getElementById('btn-ajustes').addEventListener('click', ()=>{
    pintarAjustes();
    abrirOverlay(modal);
    modal.querySelector('.modal-body').scrollTop = 0;
  });
})();
function importarAjustes(){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.addEventListener('change', ()=>{
    const f = inp.files && inp.files[0]; if(!f) return;
    const lector = new FileReader();
    lector.onload = ()=>{
      try{
        const d = JSON.parse(lector.result);
        if(!d || d._zscriv !== 'AJUSTES-v1') throw new Error('formato');
        const modoUI = d._diseno; delete d._zscriv; delete d._diseno;
        ajustes = d; guardarAjustes();
        if(modoUI){ try{ localStorage.setItem(LS_UI, modoUI); }catch(e){} }
        aplicarAjustes(); aplicarModoUI(true); pintarAjustes();
        toast('Ajustes importados');
      }catch(err){ toast('Ese archivo no es un respaldo de ajustes de ZScriv'); }
    };
    lector.readAsText(f);
  });
  inp.click();
}
async function restablecerAjustes(){
  const ok = await confirmarPersonalizado('Se restablecerán todos los ajustes a sus valores originales (modo completo). Tus proyectos no se tocan.', {titulo:'Restablecer ajustes', peligro:true, textoAceptar:'Restablecer'});
  if(!ok) return;
  ajustes = {}; guardarAjustes();
  try{ localStorage.removeItem(LS_UI); }catch(e){}
  aplicarAjustes(); aplicarModoUI(true); pintarAjustes();
  toast('Ajustes restablecidos');
}
/* autoguardado con el intervalo elegido */
(function ciclo(){
  setTimeout(()=>{ if(proyectoActivoId){ guardarProyecto(true); guardarCopiaEnCarpeta(); copiaAutomatica(600000); } ciclo(); }, (Number(AJ('ed.autoguardado')) || 30) * 1000);
})();

/* ======================================================================
   ALMACÉN: IndexedDB (sin el límite de ~5 MB de localStorage) con
   respaldo automático a localStorage si el navegador no lo permite.
   La API es síncrona (caché en memoria) y escribe en segundo plano.
   ====================================================================== */
const Almacen = (function(){
  const cache = new Map();
  let modo = 'ls', db = null;
  const esDatoProyecto = (k)=> k === LS_INDICE || (k.indexOf('zscriv_proyecto_') === 0 && k !== LS_ACTIVO);
  function abrirDB(){
    return new Promise((res, rej)=>{
      if(!window.indexedDB){ rej(new Error('sin IndexedDB')); return; }
      let r;
      try{ r = indexedDB.open('zscriv', 1); }catch(e){ rej(e); return; }
      r.onupgradeneeded = ()=>{
        const d = r.result;
        if(!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if(!d.objectStoreNames.contains('copias')){
          const s = d.createObjectStore('copias', {keyPath:'id', autoIncrement:true});
          s.createIndex('proyecto', 'proyectoId', {unique:false});
        }
      };
      r.onsuccess = ()=>res(r.result);
      r.onerror = ()=>rej(r.error);
      r.onblocked = ()=>rej(new Error('bloqueada'));
      setTimeout(()=>rej(new Error('tiempo agotado')), 4000);
    });
  }
  function txPromesa(tx){
    return new Promise((res, rej)=>{ tx.oncomplete = ()=>res(); tx.onerror = ()=>rej(tx.error); tx.onabort = ()=>rej(tx.error); });
  }
  function leerTodo(){
    return new Promise((res, rej)=>{
      const out = new Map();
      const c = db.transaction('kv', 'readonly').objectStore('kv').openCursor();
      c.onsuccess = ()=>{ const cur = c.result; if(cur){ out.set(cur.key, cur.value); cur.continue(); } else res(out); };
      c.onerror = ()=>rej(c.error);
    });
  }
  async function iniciar(){
    try{
      db = await abrirDB();
      const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put('1', '__prueba');
      await txPromesa(tx);
      (await leerTodo()).forEach((v, k)=>{ if(k !== '__prueba') cache.set(k, v); });
      modo = 'idb';
      /* migración desde localStorage (una sola vez) */
      const pendientes = [];
      try{ for(let i=0; i<localStorage.length; i++){ const k = localStorage.key(i); if(k && esDatoProyecto(k)) pendientes.push(k); } }catch(e){}
      if(pendientes.length){
        const tx2 = db.transaction('kv', 'readwrite'), st = tx2.objectStore('kv');
        pendientes.forEach(k=>{
          const v = localStorage.getItem(k);
          if(v == null) return;
          if(k === LS_INDICE && cache.has(k)){
            try{
              const a = JSON.parse(cache.get(k)), b = JSON.parse(v), ids = new Set(a.map(x=>x.id));
              b.forEach(x=>{ if(!ids.has(x.id)) a.push(x); });
              const m = JSON.stringify(a); cache.set(k, m); st.put(m, k);
            }catch(e){}
          } else if(!cache.has(k)){ cache.set(k, v); st.put(v, k); }
        });
        await txPromesa(tx2);
        pendientes.forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
      }
      try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
    }catch(err){
      modo = 'ls'; db = null; cache.clear();
      try{ for(let i=0; i<localStorage.length; i++){ const k = localStorage.key(i); if(k && esDatoProyecto(k)) cache.set(k, localStorage.getItem(k)); } }catch(e){}
    }
  }
  function set(k, v){
    if(modo === 'idb'){
      try{
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(v, k);
        tx.onerror = tx.onabort = ()=>{ mostrarAvisoAlmacenamientoLleno(); };
        cache.set(k, v);
        return true;
      }catch(e){ return false; }
    }
    try{ localStorage.setItem(k, v); cache.set(k, v); return true; }catch(e){ return false; }
  }
  function remove(k){
    cache.delete(k);
    if(modo === 'idb'){ try{ db.transaction('kv', 'readwrite').objectStore('kv').delete(k); }catch(e){} }
    else { try{ localStorage.removeItem(k); }catch(e){} }
  }
  function bytes(){ let t = 0; cache.forEach((v, k)=>{ t += k.length + (v ? v.length : 0); }); return t; }
  return { iniciar, get:(k)=>cache.has(k) ? cache.get(k) : null, set, remove, bytes, modo:()=>modo, db:()=>db };
})();

/* ---- copias automáticas con historial (solo con IndexedDB) ---- */
const Copias = (function(){
  const COPIAS_RECIENTES = 6, DIAS_HISTORIAL = 7;
  function agregar(proyectoId, nombre, palabras, datos){
    return new Promise((res, rej)=>{
      const tx = Almacen.db().transaction('copias', 'readwrite');
      tx.objectStore('copias').add({proyectoId, nombre, palabras, fecha:Date.now(), datos});
      tx.oncomplete = ()=>res(); tx.onerror = tx.onabort = ()=>rej(tx.error);
    });
  }
  function listar(){
    return new Promise((res, rej)=>{
      const out = [];
      const c = Almacen.db().transaction('copias', 'readonly').objectStore('copias').openCursor();
      c.onsuccess = ()=>{
        const cur = c.result;
        if(cur){ const v = cur.value; out.push({id:v.id, proyectoId:v.proyectoId, nombre:v.nombre, palabras:v.palabras, fecha:v.fecha, tam:(v.datos||'').length}); cur.continue(); }
        else res(out.sort((a,b)=>b.fecha-a.fecha));
      };
      c.onerror = ()=>rej(c.error);
    });
  }
  function obtener(id){
    return new Promise((res, rej)=>{
      const r = Almacen.db().transaction('copias', 'readonly').objectStore('copias').get(id);
      r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error);
    });
  }
  function eliminar(id){
    return new Promise((res, rej)=>{
      const tx = Almacen.db().transaction('copias', 'readwrite');
      tx.objectStore('copias').delete(id);
      tx.oncomplete = ()=>res(); tx.onerror = tx.onabort = ()=>rej(tx.error);
    });
  }
  async function podar(proyectoId){
    const mias = (await listar()).filter(c=>c.proyectoId === proyectoId);
    const limite = Date.now() - DIAS_HISTORIAL * 86400000;
    const dias = new Set();
    for(let i=0; i<mias.length; i++){
      if(i < COPIAS_RECIENTES){ dias.add(new Date(mias[i].fecha).toDateString()); continue; }
      const dia = new Date(mias[i].fecha).toDateString();
      if(mias[i].fecha >= limite && !dias.has(dia)){ dias.add(dia); continue; }
      await eliminar(mias[i].id);
    }
  }
  return { agregar, listar, obtener, eliminar, podar };
})();
const copiaEstado = {id:null, base:null, t:0};
function totalPalabrasProyecto(){
  return todosLosNodos(proyecto.arbol).filter(n=>n.tipo==='escena').reduce((s, n)=>s + (n.texto ? contarPalabras(n.texto) : 0), 0);
}
function iniciarSeguimientoCopias(){
  copiaEstado.id = proyectoActivoId; copiaEstado.base = JSON.stringify(proyecto); copiaEstado.t = Date.now();
  if(Almacen.modo() !== 'idb' || !AJ('dat.copias')) return;
  /* copia del estado con el que se abre el proyecto, como mucho una por hora */
  const id = proyectoActivoId, nombre = proyecto.nombre, palabras = totalPalabrasProyecto(), datos = copiaEstado.base;
  Copias.listar().then(l=>{
    const ultima = l.find(c=>c.proyectoId === id);
    if(!ultima || Date.now() - ultima.fecha > 3600000) return Copias.agregar(id, nombre, palabras, datos).then(()=>Copias.podar(id));
  }).catch(()=>{});
}
async function copiaAutomatica(minMs, forzar){
  if(Almacen.modo() !== 'idb' || !AJ('dat.copias') || !proyecto || !proyectoActivoId) return false;
  if(copiaEstado.id !== proyectoActivoId){ iniciarSeguimientoCopias(); return false; }
  if(!forzar && Date.now() - copiaEstado.t < minMs) return false;
  const datos = JSON.stringify(proyecto);
  if(!forzar && datos === copiaEstado.base) return false;
  copiaEstado.base = datos; copiaEstado.t = Date.now();
  try{ await Copias.agregar(proyectoActivoId, proyecto.nombre, totalPalabrasProyecto(), datos); await Copias.podar(proyectoActivoId); return true; }
  catch(e){ return false; }
}
function formatoTam(n){ return n > 1048576 ? (n/1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n/1024)) + ' KB'; }
async function pintarCopias(){
  const cont = document.getElementById('lista-copias');
  if(Almacen.modo() !== 'idb'){
    cont.innerHTML = '<p class="aj-nota">Las copias automáticas necesitan IndexedDB, que este navegador no permite abrir aquí. Usa «Exportar proyecto (.json)» para tus respaldos.</p>';
    return;
  }
  let lista = [];
  try{ lista = await Copias.listar(); }catch(e){}
  if(!lista.length){ cont.innerHTML = '<p class="aj-nota">Todavía no hay copias. Se crean solas mientras escribes, o pulsa «Crear copia ahora».</p>'; return; }
  lista.sort((a,b)=>(b.proyectoId === proyectoActivoId) - (a.proyectoId === proyectoActivoId) || b.fecha - a.fecha);
  cont.innerHTML = lista.map(c=>`<div class="papelera-item"><span style="font-size:16px">${c.proyectoId === proyectoActivoId ? '🕘' : '📦'}</span><div class="info"><b>${escapeHtml(c.nombre || 'Sin título')}</b><small>${new Date(c.fecha).toLocaleString('es-ES')} · ${c.palabras || 0} palabras · ${formatoTam(c.tam)}${c.proyectoId === proyectoActivoId ? '' : ' · otro proyecto'}</small></div><div class="acciones"><button data-restaurar-copia="${c.id}" title="Restaurar como proyecto nuevo">♻️</button><button data-borrar-copia="${c.id}" title="Eliminar esta copia">🗑</button></div></div>`).join('');
}
document.getElementById('lista-copias').addEventListener('click', async (e)=>{
  const r = e.target.closest('[data-restaurar-copia]'), b = e.target.closest('[data-borrar-copia]');
  if(r){
    try{
      const reg = await Copias.obtener(Number(r.dataset.restaurarCopia));
      const datos = normalizarProyecto(JSON.parse(reg.datos));
      datos.nombre = (datos.nombre || 'Proyecto') + ' (copia ' + new Date(reg.fecha).toLocaleDateString('es-ES') + ' ' + new Date(reg.fecha).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) + ')';
      const id = idNuevo();
      if(!Almacen.set(claveProyecto(id), JSON.stringify(datos))){ mostrarAvisoAlmacenamientoLleno(); return; }
      const idx = cargarIndice(); idx.push({id, nombre:datos.nombre, actualizado:Date.now()}); guardarIndice(idx);
      abrirProyecto(id);
      document.querySelectorAll('#modal-copias,#modal-proyectos').forEach(o=>cerrarOverlay(o));
      toast('Copia restaurada como proyecto nuevo');
    }catch(err){ toast('No se pudo restaurar esa copia'); }
  } else if(b){
    const ok = await confirmarPersonalizado('¿Eliminar esta copia automática?', {titulo:'Eliminar copia', peligro:true, textoAceptar:'Eliminar'});
    if(ok){ try{ await Copias.eliminar(Number(b.dataset.borrarCopia)); }catch(err){} pintarCopias(); }
  }
});
function abrirCopias(){
  pintarCopias();
  abrirOverlay(document.getElementById('modal-copias'));
}
document.getElementById('btn-ver-copias').addEventListener('click', abrirCopias);
document.getElementById('btn-copia-ahora').addEventListener('click', async ()=>{
  if(!proyecto){ toast('Abre un proyecto primero'); return; }
  const ok = await copiaAutomatica(0, true);
  toast(ok ? 'Copia creada' : 'No se pudo crear la copia en este navegador');
  pintarCopias();
});
/* ======================================================================
   EXPORTAR A EPUB Y WORD (.docx) — sin librerías, ZIP propio
   ====================================================================== */
const TABLA_CRC = (function(){
  const t = new Uint32Array(256);
  for(let n=0; n<256; n++){ let c = n; for(let k=0; k<8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes){
  let c = 0xFFFFFFFF;
  for(let i=0; i<bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function crearZip(archivos, tipoMime){
  const enc = new TextEncoder(), partes = [], central = [];
  let offset = 0;
  const d = new Date();
  const dosT = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosD = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  archivos.forEach(a=>{
    const nombre = enc.encode(a.nombre);
    const datos = typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos;
    const crc = crc32(datos);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dosT, true); h.setUint16(12, dosD, true); h.setUint32(14, crc, true);
    h.setUint32(18, datos.length, true); h.setUint32(22, datos.length, true); h.setUint16(26, nombre.length, true); h.setUint16(28, 0, true);
    partes.push(new Uint8Array(h.buffer), nombre, datos);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dosT, true); c.setUint16(14, dosD, true); c.setUint32(16, crc, true);
    c.setUint32(20, datos.length, true); c.setUint32(24, datos.length, true); c.setUint16(28, nombre.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nombre);
    offset += 30 + nombre.length + datos.length;
  });
  let tamC = 0; central.forEach(x=>{ tamC += x.length; });
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamC, true); fin.setUint32(16, offset, true);
  return new Blob(partes.concat(central, [new Uint8Array(fin.buffer)]), {type:tipoMime});
}
function descargarBlob(nombre, blob){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 8000);
}
function escXml(s){
  return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
/* manuscrito -> secciones: [{tipo, titulo, nivel, escenas:[{titulo, lineas}]}] */
function seccionesDelLibro(){
  const items = []; let actual = null;
  function lineasDe(n){ return htmlATexto(n.texto || '').split('\n').map(t=>t.trim()).filter(Boolean); }
  (function visitar(lista, nivel){
    lista.forEach(n=>{
      if(n.tipo === 'escena'){
        const lineas = lineasDe(n);
        if(!lineas.length) return;
        if(!actual){ actual = {tipo:'capitulo', titulo:'', nivel:nivel, escenas:[]}; items.push(actual); }
        actual.escenas.push({titulo:n.titulo || '', lineas});
      } else {
        actual = {tipo:n.tipo, titulo:n.titulo || '', nivel:nivel, escenas:[]};
        items.push(actual);
        if(n.hijos && n.hijos.length){ visitar(n.hijos, n.tipo === 'parte' ? nivel + 1 : nivel); actual = null; }
      }
    });
  })(proyecto.arbol, 1);
  return items.filter(it=>it.escenas.length || it.titulo);
}
function idUnico(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{ const r = Math.random()*16|0; return (c === 'x' ? r : (r&3|8)).toString(16); });
}
function personajesParaIndice(){ return proyecto.entidades.filter(e=>e.tipo === 'personaje'); }

function generarEpub(opc){
  const secciones = seccionesDelLibro();
  const css = 'body{font-family:Georgia,"Times New Roman",serif;line-height:1.55;margin:0 4%}\n' +
    'h1,h2,h3{font-family:Georgia,serif;text-align:center;font-weight:bold;page-break-after:avoid}\n' +
    'h1{font-size:1.7em;margin:2.5em 0 1em}h2{font-size:1.35em;margin:2em 0 1em}h3{font-size:1.1em;margin:1.6em 0 .8em}\n' +
    'p{margin:0;text-indent:1.3em;text-align:justify}h1+p,h2+p,h3+p,p.sep+p,p.sin{text-indent:0}\n' +
    'p.sep{text-align:center;text-indent:0;margin:1.4em 0}\n' +
    '.portada{text-align:center;margin-top:30%}.portada h1{font-size:2.2em}.portada p{text-indent:0;text-align:center}\n' +
    'ul.lista{list-style:none;padding:0}ul.lista li{margin:.6em 0}\n';
  const envoltura = (titulo, cuerpo)=>'<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="es" xml:lang="es"><head><meta charset="utf-8"/><title>' + escXml(titulo) + '</title><link rel="stylesheet" type="text/css" href="estilo.css"/></head><body>' + cuerpo + '</body></html>';
  const archivos = [
    {nombre:'mimetype', datos:'application/epub+zip'},
    {nombre:'META-INF/container.xml', datos:'<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'},
    {nombre:'OEBPS/estilo.css', datos:css}
  ];
  const manifest = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    '<item id="css" href="estilo.css" media-type="text/css"/>'
  ];
  const spine = [], navItems = [];
  if(opc.portada){
    archivos.push({nombre:'OEBPS/portada.xhtml', datos:envoltura(proyecto.nombre, '<div class="portada"><h1>' + escXml(proyecto.nombre) + '</h1>' + (opc.autor ? '<p>' + escXml(opc.autor) + '</p>' : '') + '<p>' + escXml(new Date().toLocaleDateString('es-ES')) + '</p></div>')});
    manifest.push('<item id="portada" href="portada.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="portada"/>');
    navItems.push({href:'portada.xhtml', titulo:proyecto.nombre, nivel:1});
  }
  secciones.forEach((sec, i)=>{
    const archivo = 'c' + String(i + 1).padStart(3, '0') + '.xhtml';
    const h = sec.nivel <= 1 ? 'h1' : 'h2';
    let cuerpo = (opc.titulos && sec.titulo) ? '<' + h + '>' + escXml(sec.titulo) + '</' + h + '>' : '';
    sec.escenas.forEach((es, k)=>{
      if(opc.titulos && es.titulo) cuerpo += '<h3>' + escXml(es.titulo) + '</h3>';
      else if(k > 0) cuerpo += '<p class="sep">* * *</p>';
      cuerpo += es.lineas.map(l=>'<p>' + escXml(l) + '</p>').join('');
    });
    if(!sec.escenas.length) cuerpo += '<p class="sin">&#160;</p>';
    archivos.push({nombre:'OEBPS/' + archivo, datos:envoltura(sec.titulo || proyecto.nombre, cuerpo)});
    manifest.push('<item id="c' + i + '" href="' + archivo + '" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="c' + i + '"/>');
    if(sec.titulo) navItems.push({href:archivo, titulo:sec.titulo, nivel:sec.nivel});
  });
  if(opc.indice && personajesParaIndice().length){
    const lis = personajesParaIndice().map(p=>'<li><b>' + escXml(p.nombre) + '</b>' + (p.rol ? ' (' + escXml(p.rol) + ')' : '') + (p.desc ? ' — ' + escXml(String(p.desc).slice(0, 180)) : '') + '</li>').join('');
    archivos.push({nombre:'OEBPS/personajes.xhtml', datos:envoltura('Personajes', '<h1>Personajes</h1><ul class="lista">' + lis + '</ul>')});
    manifest.push('<item id="personajes" href="personajes.xhtml" media-type="application/xhtml+xml"/>');
    spine.push('<itemref idref="personajes"/>');
    navItems.push({href:'personajes.xhtml', titulo:'Personajes', nivel:1});
  }
  if(!navItems.length) navItems.push({href:spine.length ? (opc.portada ? 'portada.xhtml' : 'c001.xhtml') : 'nav.xhtml', titulo:proyecto.nombre, nivel:1});
  /* nav.xhtml con anidación */
  let nav = '<nav epub:type="toc" id="toc"><h1>Índice</h1>', nivelAct = 0;
  navItems.forEach(it=>{
    const n = (nivelAct === 0 || it.nivel <= 1) ? 1 : 2;
    if(n > nivelAct){ nav += '<ol>'; nivelAct = n; }
    else if(n < nivelAct){ nav += '</li></ol></li>'; nivelAct = n; }
    else nav += '</li>';
    nav += '<li><a href="' + it.href + '">' + escXml(it.titulo) + '</a>';
  });
  nav += '</li>' + (nivelAct === 2 ? '</ol></li>' : '') + '</ol></nav>';
  archivos.push({nombre:'OEBPS/nav.xhtml', datos:envoltura('Índice', nav)});
  /* toc.ncx (compatibilidad con lectores antiguos) */
  const uuid = 'urn:uuid:' + idUnico();
  archivos.push({nombre:'OEBPS/toc.ncx', datos:'<?xml version="1.0" encoding="UTF-8"?>\n<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="' + uuid + '"/><meta name="dtb:depth" content="1"/><meta name="dtb:totalPageCount" content="0"/><meta name="dtb:maxPageNumber" content="0"/></head><docTitle><text>' + escXml(proyecto.nombre) + '</text></docTitle><navMap>' +
    navItems.map((it, i)=>'<navPoint id="np' + (i + 1) + '" playOrder="' + (i + 1) + '"><navLabel><text>' + escXml(it.titulo) + '</text></navLabel><content src="' + it.href + '"/></navPoint>').join('') + '</navMap></ncx>'});
  const modificado = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  archivos.splice(3, 0, {nombre:'OEBPS/content.opf', datos:'<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="es"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">' + uuid + '</dc:identifier><dc:title>' + escXml(proyecto.nombre) + '</dc:title><dc:language>es</dc:language>' + (opc.autor ? '<dc:creator>' + escXml(opc.autor) + '</dc:creator>' : '') + '<meta property="dcterms:modified">' + modificado + '</meta></metadata><manifest>' + manifest.join('') + '</manifest><spine toc="ncx">' + spine.join('') + '</spine></package>'});
  return crearZip(archivos, 'application/epub+zip');
}

function generarDocx(opc){
  const secciones = seccionesDelLibro();
  const p = (estilo, texto, extra)=>'<w:p><w:pPr><w:pStyle w:val="' + estilo + '"/>' + (extra || '') + '</w:pPr><w:r><w:t xml:space="preserve">' + escXml(texto) + '</w:t></w:r></w:p>';
  let cuerpo = '';
  if(opc.portada){
    cuerpo += '<w:p><w:pPr><w:pStyle w:val="Title"/><w:spacing w:before="3600"/></w:pPr><w:r><w:t xml:space="preserve">' + escXml(proyecto.nombre) + '</w:t></w:r></w:p>';
    if(opc.autor) cuerpo += p('Subtitle', opc.autor);
    cuerpo += p('Subtitle', new Date().toLocaleDateString('es-ES'));
    cuerpo += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }
  secciones.forEach(sec=>{
    if(opc.titulos && sec.titulo) cuerpo += p(sec.nivel <= 1 ? 'Heading1' : 'Heading2', sec.titulo);
    sec.escenas.forEach((es, k)=>{
      if(opc.titulos && es.titulo) cuerpo += p('Heading3', es.titulo);
      else if(k > 0) cuerpo += p('Separador', '* * *');
      es.lineas.forEach((l, j)=>{ cuerpo += p((j === 0 && ((opc.titulos && es.titulo) || k === 0)) ? 'SinSangria' : 'Normal', l); });
    });
  });
  if(opc.indice && personajesParaIndice().length){
    cuerpo += p('Heading1', 'Personajes');
    personajesParaIndice().forEach(pj=>{ cuerpo += p('SinSangria', pj.nombre + (pj.rol ? ' (' + pj.rol + ')' : '') + (pj.desc ? ' — ' + String(pj.desc).slice(0, 180) : '')); });
  }
  const linea = opc.doble ? 480 : 300;
  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const estilos = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles ' + NS + '>' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="' + linea + '" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="567"/><w:jc w:val="both"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="SinSangria"><w:name w:val="Sin sangría"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="0"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Separador"><w:name w:val="Separador"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="56"/><w:szCs w:val="56"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:before="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="2400" w:after="480" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="1200" w:after="360" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>' +
    '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="240" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:i/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>' +
    '</w:styles>';
  const documento = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ' + NS + '><w:body>' + cuerpo +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const ahora = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const archivos = [
    {nombre:'[Content_Types].xml', datos:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'},
    {nombre:'_rels/.rels', datos:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'},
    {nombre:'word/_rels/document.xml.rels', datos:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {nombre:'word/document.xml', datos:documento},
    {nombre:'word/styles.xml', datos:estilos},
    {nombre:'docProps/core.xml', datos:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + escXml(proyecto.nombre) + '</dc:title><dc:creator>' + escXml(opc.autor || '') + '</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + ahora + '</dcterms:created></cp:coreProperties>'}
  ];
  return crearZip(archivos, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
function exportarLibro(formato){
  const autor = document.getElementById('export-autor').value.trim();
  if(proyecto.autor !== autor){ proyecto.autor = autor; guardarProyectoDebounced(); }
  const opc = {
    autor,
    titulos:document.getElementById('export-titulos').checked,
    portada:document.getElementById('export-portada').checked,
    indice:document.getElementById('export-indice').checked,
    doble:document.getElementById('export-doble').checked
  };
  if(!seccionesDelLibro().length){ toast('No hay texto escrito para exportar'); return; }
  const base = (proyecto.nombre || 'proyecto').replace(/[^\w\-]+/g, '_');
  try{
    const blob = formato === 'epub' ? generarEpub(opc) : generarDocx(opc);
    descargarBlob(base + '.' + formato, blob);
    cerrarOverlay(document.getElementById('modal-export'));
    toast(formato === 'epub' ? 'Libro electrónico creado' : 'Documento de Word creado');
  }catch(err){ toast('No se pudo crear el archivo'); }
}
function actualizarCamposExport(){
  const f = document.getElementById('export-formato').value;
  document.getElementById('campo-export-autor').style.display = (f === 'epub' || f === 'docx') ? '' : 'none';
  document.getElementById('campo-export-doble').style.display = f === 'docx' ? '' : 'none';
}
document.getElementById('export-formato').addEventListener('change', actualizarCamposExport);
document.getElementById('btn-export').addEventListener('click', ()=>{
  if(proyecto) document.getElementById('export-autor').value = proyecto.autor || '';
  actualizarCamposExport();
});
/* ======================================================================
   SEGUIMIENTO DE MENCIONES: en qué escenas aparece cada ficha
   ====================================================================== */
function calcularApariciones(){
  const escenas = todosLosNodos(proyecto.arbol).filter(n=>n.tipo === 'escena' && n.texto && contarPalabras(n.texto) > 0);
  const por = new Map();
  escenas.forEach((es, idx)=>{
    const re = /<span[^>]*class="mencion[^"]*"[^>]*>/g, cuenta = {};
    let m;
    while((m = re.exec(es.texto))){ const d = /data-id="([^"]+)"/.exec(m[0]); if(d) cuenta[d[1]] = (cuenta[d[1]] || 0) + 1; }
    Object.keys(cuenta).forEach(id=>{
      let r = por.get(id);
      if(!r){ r = {total:0, escenas:[]}; por.set(id, r); }
      r.total += cuenta[id];
      r.escenas.push({idx, id:es.id, n:cuenta[id]});
    });
  });
  return {escenas, por};
}
function infoApariciones(ap, entidadId){
  const N = ap.escenas.length, r = ap.por.get(entidadId);
  if(!r) return {total:0, nEsc:0, N, ultima:-1, sinAparecer:N, lista:[]};
  const ultima = r.escenas[r.escenas.length - 1].idx;
  return {total:r.total, nEsc:r.escenas.length, N, ultima, sinAparecer:N - 1 - ultima, lista:r.escenas};
}
function umbralAusencia(){ return Number(AJ('seg.umbral')) || 8; }
function ausenciaLarga(info, tipo){
  return AJ('seg.avisos') && (tipo === 'personaje' || tipo === 'criatura') && info.total > 0 && info.sinAparecer >= umbralAusencia();
}
function rutaNodo(id, lista, ruta){
  lista = lista || proyecto.arbol; ruta = ruta || [];
  for(const n of lista){
    if(n.id === id) return ruta;
    if(n.hijos){ const r = rutaNodo(id, n.hijos, ruta.concat([n])); if(r) return r; }
  }
  return null;
}
function irAEscena(id){
  document.querySelectorAll('.overlay.activo').forEach(o=>{ if(o.id !== 'modal-proyectos') cerrarOverlay(o); });
  const ruta = rutaNodo(id) || [];
  ruta.forEach(n=>{ n.abierto = true; });
  const ed = document.querySelector('.modos-vista [data-vista="editor"]');
  if(vistaActual !== 'editor' && ed) ed.click();
  const btnM = document.querySelector('.nav-btn[data-panel="manuscrito"]');
  if(panelActivo !== 'manuscrito' && btnM) btnM.click();
  seleccionarNodo(id);
  const fila = document.querySelector('#arbol [data-id="' + id + '"]');
  if(fila && fila.scrollIntoView) fila.scrollIntoView({block:'center'});
}
function etiquetaEscena(id){
  const n = encontrarNodo(id), ruta = rutaNodo(id) || [];
  const cap = ruta.length ? ruta[ruta.length - 1].titulo : '';
  return escapeHtml((n && n.titulo) || 'Escena') + (cap ? ' <small>· ' + escapeHtml(cap) + '</small>' : '');
}
const MODAL_POR_TIPO = {personaje:'modal-personaje', lugar:'modal-lugar', objeto:'modal-objeto', criatura:'modal-criatura', raza:'modal-raza'};
function pintarApariciones(entidadId){
  const e = proyecto.entidades.find(x=>x.id === entidadId); if(!e) return;
  const modal = document.getElementById(MODAL_POR_TIPO[e.tipo] || 'modal-otro'); if(!modal) return;
  const cuerpo = modal.querySelector('.modal-body'); if(!cuerpo) return;
  cuerpo.querySelectorAll('.apar-bloque').forEach(x=>x.remove());
  const ap = calcularApariciones(), info = infoApariciones(ap, entidadId);
  const aviso = ausenciaLarga(info, e.tipo);
  let resumen;
  if(!info.N) resumen = 'Aún no hay escenas con texto.';
  else if(!info.total) resumen = 'Sin menciones todavía. Escribe @ # * % & en una escena para enlazar esta ficha.';
  else resumen = 'Aparece en ' + info.nEsc + ' de ' + info.N + ' escenas · ' + info.total + (info.total === 1 ? ' mención' : ' menciones');
  const bloque = document.createElement('details');
  bloque.className = 'apar-bloque' + (aviso ? ' apar-aviso' : '');
  bloque.innerHTML = '<summary>📍 ' + escapeHtml(resumen) + '</summary>' +
    (aviso ? '<p class="apar-alerta">⏳ Lleva ' + info.sinAparecer + ' escenas sin aparecer desde su última mención.</p>' : '') +
    (info.lista.length ? '<div class="apar-lista">' + info.lista.map(x=>'<button data-ir-escena="' + x.id + '"><span>' + etiquetaEscena(x.id) + '</span><b>×' + x.n + '</b></button>').join('') + '</div>' : '');
  bloque.addEventListener('click', (ev)=>{ const b = ev.target.closest('[data-ir-escena]'); if(b){ ev.preventDefault(); irAEscena(b.dataset.irEscena); } });
  cuerpo.insertBefore(bloque, cuerpo.firstChild);
}
(function(){
  const original = abrirModalEntidad;
  abrirModalEntidad = function(id){ original(id); try{ pintarApariciones(id); }catch(err){} };
})();
function pintarApariciones_stats(){
  const cont = document.getElementById('apar-stats'); if(!cont || !proyecto) return;
  const ap = calcularApariciones();
  const fichas = proyecto.entidades.filter(e=>e.tipo === 'personaje' || e.tipo === 'criatura');
  if(!ap.escenas.length || !fichas.length){ cont.innerHTML = '<p class="aj-nota">Cuando tengas personajes y menciones (@) en tus escenas, aquí verás en qué parte de la novela aparece cada uno.</p>'; return; }
  const filas = fichas.map(e=>({e, info:infoApariciones(ap, e.id)})).sort((a,b)=>b.info.total - a.info.total);
  cont.innerHTML = filas.map(({e, info})=>{
    const celdas = ap.escenas.map((es, i)=>{
      const x = info.lista.find(l=>l.idx === i);
      return '<i class="apar-celda' + (x ? ' on' : '') + '" ' + (x ? 'style="opacity:' + Math.min(1, .45 + x.n * .15) + '" data-ir-escena="' + es.id + '"' : '') + ' title="' + escapeHtml(es.titulo || 'Escena') + (x ? ' · ×' + x.n : '') + '"></i>';
    }).join('');
    const aviso = ausenciaLarga(info, e.tipo);
    return '<div class="apar-fila"><div class="apar-nom"><b>' + escapeHtml(e.nombre) + '</b><small>' + (info.total ? info.nEsc + ' esc. · ' + info.total + ' mención' + (info.total === 1 ? '' : 'es') : 'sin menciones') + (aviso ? ' · <span class="apar-warn">⏳ ' + info.sinAparecer + ' sin aparecer</span>' : '') + '</small></div><div class="apar-tira">' + celdas + '</div></div>';
  }).join('');
  cont.onclick = (ev)=>{ const c = ev.target.closest('[data-ir-escena]'); if(c) irAEscena(c.dataset.irEscena); };
}
/* ---- init ---- */
function inicializar(){
  aplicarModoUI(true);
  aplicarAjustes();
  document.querySelectorAll('[title]:not([aria-label])').forEach(el=>{ el.setAttribute('aria-label', el.getAttribute('title')); });
  const temaGuardado = localStorage.getItem(LS_TEMA);
  if(temaGuardado) aplicarTema(temaGuardado);
  actualizarEstadoIA();
  configurarPWA();
  inicializarCarpetaRespaldo();
  window.addEventListener('beforeunload', ()=>{ if(proyectoActivoId) guardarProyecto(true); });
  setInterval(()=>{
    if(!proyecto) return;
    if(document.activeElement===editorCE && !document.hidden){
      const hoy = fechaLocal();
      proyecto.tiempoEscritura[hoy] = (proyecto.tiempoEscritura[hoy]||0) + 0.5;
    }
  }, 30000);
  const idActivo = localStorage.getItem(LS_ACTIVO);
  const idx = cargarIndice();
  if(idActivo && idx.find(m=>m.id===idActivo) && Almacen.get(claveProyecto(idActivo))){
    abrirProyecto(idActivo);
  } else {
    mostrarSelectorProyectos(true);
  }
}
Almacen.iniciar().then(inicializar, inicializar);


})();
