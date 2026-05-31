/* ============================================================
   taos_utilitarios.js — Funciones Utilitarias del Sistema TAOS
   Sistema de Costos y Presupuestos · Polaris
   ============================================================ */
'use strict';

/* ── GLOBALES ────────────────────────────────────────────────── */
const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── RECUPERACIÓN DE VALORES ───────────────────────────────── */
function recuperarTexto(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function recuperarEntero(id) {
  return parseInt(recuperarTexto(id), 10) || 0;
}
function recuperarDecimal(id) {
  return parseFloat(recuperarTexto(id).replace(/[^0-9.-]/g, '')) || 0;
}

/* ── FORMATEO ──────────────────────────────────────────────── */
function fmt$(n) {
  const val = isNaN(n) ? 0 : (n || 0);
  return '$' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtPct(n) {
  return (isNaN(n) ? 0 : (n || 0)).toFixed(2) + '%';
}
function fmtN(n) {
  return (isNaN(n) ? 0 : (n || 0)).toLocaleString('es-EC', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

/* ── MOSTRAR EN DOM ────────────────────────────────────────── */
function mostrarTexto(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerText = msg;
}
function mostrarHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function mostrarEnCaja(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

/* ── PERSISTENCIA LOCAL ────────────────────────────────────── */
function guardar(clave, datos) {
  try {
    localStorage.setItem('taos_' + clave, JSON.stringify(datos));
  } catch (e) { /* storage lleno o bloqueado */ }
}
function cargar(clave, defecto) {
  try {
    const raw = localStorage.getItem('taos_' + clave);
    return raw ? JSON.parse(raw) : defecto;
  } catch (e) { return defecto; }
}

/* ── EXPORTAR CSV ──────────────────────────────────────────── */
function exportarCSV(datos, nombre) {
  if (!datos || !datos.length) return;
  const cols  = Object.keys(datos[0]);
  const enc   = cols.join(',');
  const filas = datos.map(d =>
    cols.map(c => '"' + String(d[c] ?? '').replace(/"/g, '""') + '"').join(',')
  );
  const csv  = [enc, ...filas].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = nombre + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── TOAST ─────────────────────────────────────────────────── */
function toast(msg, tipo) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast show' + (tipo ? ' ' + tipo : '');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.className = 'toast'; }, 3800);
}

/* ── SET CAMPO AUTO ────────────────────────────────────────── */
function setAuto(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (typeof val === 'number')
    ? val.toFixed(val % 1 === 0 ? 0 : 4)
    : val;
  el.setAttribute('data-auto', 'true');
  el.classList.add('auto-updated');
  clearTimeout(el._autoTm);
  el._autoTm = setTimeout(() => el.classList.remove('auto-updated'), 700);
}
function clearAuto(id) {
  const el = document.getElementById(id);
  if (el) el.removeAttribute('data-auto');
}

/* ── SET TEXTO EN SPAN/DIV ─────────────────────────────────── */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── ESCAPE HTML ───────────────────────────────────────────── */
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── CAP FIRST ─────────────────────────────────────────────── */
function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
