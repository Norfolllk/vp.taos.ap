/* ============================================================
   taos_calculadora.js — Motor de Calculadoras Inteligentes
   Sistema TAOS · Costos y Presupuestos · Polaris
   ============================================================ */
'use strict';

/* ════════════════════════════════════════════════════════════
   HELPERS INTERNOS
   ════════════════════════════════════════════════════════════ */
function parseFloatSafe(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseFloat(String(el.value).replace(/[^0-9.-]/g, '')) || 0;
}

function setDisplay(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════════════════════════════
   1 — COSTOS FIJOS
   ════════════════════════════════════════════════════════════ */
function calcCostosFijos() {
  const arriendo    = parseFloatSafe('cf_arriendo');
  const servicios   = parseFloatSafe('cf_servicios');
  const nomina      = parseFloatSafe('cf_nomina_val');
  const deprec      = parseFloatSafe('cf_deprec');
  const consumibles = parseFloatSafe('cf_consumibles');

  const total = arriendo + servicios + nomina + deprec + consumibles;
  setDisplay('cf_total', fmt$(total));
  TAOS.state.costosFijos = total;
  cascadeUpdate('costos_fijos');
}

/* ════════════════════════════════════════════════════════════
   2 — COSTOS VARIABLES
   ════════════════════════════════════════════════════════════ */
function calcCostosVariables() {
  const costoUnit = parseFloatSafe('cv_costo_unit');
  const cantidad  = parseFloatSafe('cv_cantidad');

  const total = costoUnit * cantidad;
  setDisplay('cv_total', fmt$(total));
  TAOS.state.costosVariables    = total;
  TAOS.state.costoVariableUnit  = costoUnit;
  cascadeUpdate('costos_variables');
}

/* ════════════════════════════════════════════════════════════
   3 — DIRECTOS E INDIRECTOS
   ════════════════════════════════════════════════════════════ */
function calcDirectosIndirectos() {
  const mp   = parseFloatSafe('di_mp');
  const mod  = parseFloatSafe('di_mod');
  const cif  = parseFloatSafe('di_cif');
  const gadm = parseFloatSafe('di_gadm');
  const gven = parseFloatSafe('di_gven');

  const costosDirect   = mp + mod + cif;
  const costosIndirect = gadm + gven;
  const total          = costosDirect + costosIndirect;

  setDisplay('di_directos',  fmt$(costosDirect));
  setDisplay('di_indirectos',fmt$(costosIndirect));
  setDisplay('di_total',     fmt$(total));
  TAOS.state.estructuraCostos = total;
  cascadeUpdate('directos_indirectos');
}

/* ════════════════════════════════════════════════════════════
   4 — MATERIA PRIMA
   ════════════════════════════════════════════════════════════ */
function calcMateriaPrima() {
  const mezcla     = parseFloatSafe('mp_mezcla');
  const congelante = parseFloatSafe('mp_congelante');
  const mermaPct   = parseFloatSafe('mp_merma');

  const baseUnit = mezcla + congelante;
  const mermaAmt = baseUnit * (mermaPct / 100);
  const total    = baseUnit + mermaAmt;

  const elDisp = document.getElementById('mp_total_disp');
  if (elDisp) elDisp.textContent = '$' + total.toFixed(4);

  TAOS.state.materiaPrimaUnit = total;

  setAuto('cr_psc', total);
  setAuto('cv_costo_unit', total);
  setAuto('pe_costo_var_unit', total);

  cascadeUpdate('materia_prima');
}

/* ════════════════════════════════════════════════════════════
   5 — MANO DE OBRA
   ════════════════════════════════════════════════════════════ */
function calcManoObra() {
  const salario      = parseFloatSafe('mo_salario');
  const horas        = parseFloatSafe('mo_horas');
  const trabajadores = parseFloatSafe('mo_trabajadores');

  const total = salario * horas * trabajadores;
  setDisplay('mo_total', fmt$(total));
  TAOS.state.manoObra = total;

  setAuto('di_mod', total.toFixed(2));
  cascadeUpdate('mano_obra');
}

/* ════════════════════════════════════════════════════════════
   6 — COSTEO DE RECETA
   ════════════════════════════════════════════════════════════ */
function calcCosteoReceta() {
  const psc       = parseFloatSafe('cr_psc');
  const margenPct = parseFloatSafe('cr_margen');
  const ivaPct    = parseFloatSafe('cr_iva');

  const pvd       = margenPct < 100 ? psc / (1 - margenPct / 100) : psc;
  const pvdConIva = pvd * (1 + ivaPct / 100);
  const markupPct = psc > 0 ? ((pvd - psc) / psc * 100) : 0;

  setAuto('cr_pvd',    pvd.toFixed(2));
  setAuto('cr_pvdiva', pvdConIva.toFixed(2));
  setAuto('cr_markup', markupPct.toFixed(2));

  setDisplay('cr_pvdiva_disp', '$' + pvdConIva.toFixed(2));
  setDisplay('cr_psc_disp',    '$' + psc.toFixed(4));

  TAOS.state.precioVenta       = pvd;
  TAOS.state.precioVentaConIva = pvdConIva;
  cascadeUpdate('costeo_receta');
}

/* ════════════════════════════════════════════════════════════
   7 — MARGEN DE GANANCIA
   ════════════════════════════════════════════════════════════ */
function calcMargenGanancia() {
  const ingresos = parseFloatSafe('mg_ingresos');
  const egresos  = parseFloatSafe('mg_egresos');

  const ganancia = ingresos - egresos;
  const margen   = ingresos > 0 ? (ganancia / ingresos * 100) : 0;

  setDisplay('mg_total_margen',  margen.toFixed(1) + '%');
  setDisplay('mg_ganancia_neta', fmt$(ganancia));

  const indicator = document.getElementById('mg_margen_indicator');
  if (indicator) {
    indicator.className  = 'mg-indicator ' + (margen >= 20 ? 'good' : margen >= 10 ? 'warn' : 'bad');
    indicator.textContent = margen >= 20 ? '● Saludable' : margen >= 10 ? '● Aceptable' : '● Bajo';
  }

  TAOS.state.ingresos       = ingresos;
  TAOS.state.egresos        = egresos;
  TAOS.state.ganancia       = ganancia;
  TAOS.state.margenGanancia = margen;
  cascadeUpdate('margen_ganancia');
}

/* ════════════════════════════════════════════════════════════
   8 — PUNTO DE EQUILIBRIO
   ════════════════════════════════════════════════════════════ */
function calcPuntoEquilibrio() {
  const cf  = parseFloatSafe('pe_costos_fijos');
  const pvd = parseFloatSafe('pe_precio_venta');
  const cvu = parseFloatSafe('pe_costo_var_unit');

  const margenContrib = pvd - cvu;
  let unidades = 0;
  let dinero   = 0;

  if (margenContrib > 0) {
    unidades = cf / margenContrib;
    dinero   = unidades * pvd;
  }

  const unidadesCeil = Math.ceil(unidades);

  setAuto('pe_unidades', unidadesCeil.toString());
  setAuto('pe_dinero',   dinero.toFixed(0));

  setDisplay('pe_total_unidades', unidadesCeil.toLocaleString('es-EC') + ' unidades');
  setDisplay('pe_dinero_disp',    fmt$(dinero));
  setDisplay('pe_margen_contrib', fmt$(margenContrib));

  TAOS.state.puntoEquilUnidades = unidadesCeil;
  TAOS.state.puntoEquilDinero   = dinero;
  cascadeUpdate('punto_equilibrio');
}

/* ════════════════════════════════════════════════════════════
   9 — PRODUCTO (Costo Fab, PVD, PVP)
   ════════════════════════════════════════════════════════════ */
function calcProducto() {
  const cfEl = document.getElementById('pr_costo_fab_input');
  const pvdEl = document.getElementById('pr_pvd_input');
  const pvpEl = document.getElementById('pr_pvp_input');
  const distEl = document.getElementById('pr_margen_dist');

  const cfManual = cfEl?.getAttribute('data-manual') === 'true';
  const pvdManual = pvdEl?.getAttribute('data-manual') === 'true';

  let costoFabUnit, pvdVal, margenDist, pvpVal;

  if (!cfManual) {
    const mp  = parseFloatSafe('di_mp');
    const mod = parseFloatSafe('di_mod');
    const cif = parseFloatSafe('di_cif');
    const up  = parseInt(document.getElementById('cv_cantidad')?.value) || 1;
    costoFabUnit = (mp + mod + cif) / up;
  } else {
    costoFabUnit = parseFloat(cfEl?.value) || 0;
  }

  if (!pvdManual) {
    pvdVal = parseFloat(document.getElementById('cr_pvd')?.value) || 0;
  } else {
    pvdVal = parseFloat(pvdEl?.value) || 0;
  }

  margenDist = parseFloat(distEl?.value) || 25;
  pvpVal = pvdVal * (1 + margenDist / 100);

  setText('pr_costo_fab', '$' + costoFabUnit.toFixed(4));
  setText('pr_pvd',       '$' + pvdVal.toFixed(2));
  setText('pr_pvp',       '$' + pvpVal.toFixed(2));

  if (!cfManual && cfEl) cfEl.value = costoFabUnit.toFixed(4);
  if (!pvdManual && pvdEl) pvdEl.value = pvdVal.toFixed(2);
  if (pvpEl) pvpEl.value = pvpVal.toFixed(2);
}

function onProductoCostoFabInput() {
  const el = document.getElementById('pr_costo_fab_input');
  if (!el) return;
  const val = parseFloat(el.value);
  if (val > 0) {
    el.setAttribute('data-manual', 'true');
    const up = parseInt(document.getElementById('cv_cantidad')?.value) || 1;
    setAuto('cr_psc', val.toFixed(4));
    setAuto('cv_costo_unit', val.toFixed(4));
    setAuto('pe_costo_var_unit', val.toFixed(4));
    cascadeUpdate('materia_prima');
  } else {
    el.setAttribute('data-manual', 'false');
    calcProducto();
  }
}

function onProductoPvdInput() {
  const el = document.getElementById('pr_pvd_input');
  if (!el) return;
  const val = parseFloat(el.value);
  if (val > 0) {
    el.setAttribute('data-manual', 'true');
    const psc = parseFloat(document.getElementById('cr_psc')?.value) || 0;
    if (psc > 0 && val > psc) {
      const margen = (1 - psc / val) * 100;
      setAuto('cr_margen', margen.toFixed(1));
      setAuto('pe_precio_venta', val.toFixed(2));
      cascadeUpdate('costeo_receta');
    }
    calcProducto();
  } else {
    el.setAttribute('data-manual', 'false');
    calcProducto();
  }
}

/* ════════════════════════════════════════════════════════════
   CASCADE UPDATE — Propaga cambios entre calculadoras
   ════════════════════════════════════════════════════════════ */
function cascadeUpdate(origin) {
  const s = TAOS.state;

  const nominaTotal = calcNominaTotal();
  if (nominaTotal > 0 && origin !== 'costos_fijos') {
    setAuto('cf_nomina_val', nominaTotal.toFixed(2));
  }

  const deprec = calcDeprecMaq();
  if (deprec > 0 && origin !== 'costos_fijos') {
    setAuto('cf_deprec', deprec.toFixed(2));
  }

  if (origin !== 'punto_equilibrio') {
    if (s.costosFijos > 0) setAuto('pe_costos_fijos', s.costosFijos.toFixed(2));
  }

  if (origin !== 'punto_equilibrio' && s.precioVenta > 0) {
    setAuto('pe_precio_venta', s.precioVenta.toFixed(2));
  }

  if (origin !== 'costos_variables' && s.materiaPrimaUnit > 0) {
    setAuto('cv_costo_unit', s.materiaPrimaUnit.toFixed(4));
    setAuto('pe_costo_var_unit', s.materiaPrimaUnit.toFixed(4));
  }

  if (origin !== 'mano_obra') {
    const colabsOp = (s.colaboradores || []).filter(c => c.area === 'operaciones').length;
    if (colabsOp > 0) setAuto('mo_trabajadores', colabsOp.toString());
  }

  if (s.ingresos && origin !== 'margen_ganancia') {
    setAuto('mg_ingresos', s.ingresos.toFixed(2));
  }
  if (s.egresos && origin !== 'margen_ganancia') {
    setAuto('mg_egresos', s.egresos.toFixed(2));
  }

  /* Sync Escenario Actual auto fields */
  if (s.unidadesProducidas != null) setAuto('proy_uprod', s.unidadesProducidas);
  if (s.unidadesVendidas != null)   setAuto('actual_u_vendidas_proy', s.unidadesVendidas);
  if (s.ingresos != null)           setAuto('proy_ingresos', s.ingresos.toFixed(2));
  if (s.egresos != null)            setAuto('proy_egresos', s.egresos.toFixed(2));

  /* Sync registro form PVU/CFU from PE calculator */
  if (s.precioVenta > 0) {
    const pvuEl = document.getElementById('reg_pvu');
    if (pvuEl && !pvuEl.getAttribute('data-manual')) {
      pvuEl.value = s.precioVenta.toFixed(2);
      s.precioVentaUnitReg = s.precioVenta;
      pvuEl.dispatchEvent(new Event('input'));
    }
  }
  if (s.materiaPrimaUnit > 0 || s.costoVariableUnit > 0) {
    const cfuVal = s.costoVariableUnit || s.materiaPrimaUnit;
    const cfuEl = document.getElementById('reg_cfu');
    if (cfuEl && !cfuEl.getAttribute('data-manual')) {
      cfuEl.value = cfuVal.toFixed(2);
      s.costoFabUnitReg = cfuVal;
      cfuEl.dispatchEvent(new Event('input'));
    }
  }

  if (typeof actualizarResumenEjecutivo === 'function') actualizarResumenEjecutivo();
  if (typeof actualizarProyecciones     === 'function') actualizarProyecciones();
}

/* ════════════════════════════════════════════════════════════
   HELPERS DE CÁLCULO
   ════════════════════════════════════════════════════════════ */
function calcNominaTotal() {
  const colabs = TAOS.state.colaboradores || [];
  return colabs.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
}

function calcDeprecMaq() {
  const items  = TAOS.state.inventario || [];
  const maqVal = items
    .filter(i => i.categoria === 'maquinaria')
    .reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  return maqVal / 60;
}

/* ════════════════════════════════════════════════════════════
   SYNC ALL — Ejecutar en orden correcto
   ════════════════════════════════════════════════════════════ */
function syncAllCalculators() {
  calcMateriaPrima();
  calcManoObra();
  calcCostosVariables();
  calcCostosFijos();
  calcDirectosIndirectos();
  calcCosteoReceta();
  calcMargenGanancia();
  calcPuntoEquilibrio();
  calcProducto();
}

/* ════════════════════════════════════════════════════════════
   SEMANAS POR MES — Genérica (reusable)
   ════════════════════════════════════════════════════════════ */
function actualizarSemanasPorMes(mesId, semId) {
  const mesNum = parseInt(document.getElementById(mesId)?.value) || 1;
  const anio   = new Date().getFullYear();
  const primerDia = new Date(anio, mesNum - 1, 1);
  const ultimoDia = new Date(anio, mesNum, 0);
  const semanas   = new Set();

  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const inicioAnio = new Date(d.getFullYear(), 0, 1);
    const dias       = Math.floor((d - inicioAnio) / 86400000);
    const semana     = Math.ceil((dias + inicioAnio.getDay() + 1) / 7);
    semanas.add(semana);
  }

  const semEl = document.getElementById(semId);
  if (!semEl) return;
  const sorted = [...semanas].sort((a,b) => a - b);
  const actual = parseInt(semEl.value);
  semEl.innerHTML = sorted.map(s => `<option value="${s}"${s === actual ? ' selected' : ''}>Semana ${s}</option>`).join('');
  if (!sorted.includes(actual)) semEl.value = sorted[0] || '';
}

function actualizarSemanasProy()   { actualizarSemanasPorMes('proy_mes_base',   'proy_semana_base'); }
function actualizarSemanasActual() { actualizarSemanasPorMes('actual_mes',     'actual_semana'); }
function actualizarSemanasReg()    { actualizarSemanasPorMes('reg_mes',        'reg_semana'); }
function actualizarSemanasFiltro() { actualizarSemanasPorMes('reg_filtro_mes', 'reg_filtro_semana'); }

function onChangeFiltroMes() {
  const mesEl = document.getElementById('reg_filtro_mes');
  if (mesEl) {
    _calMesActual = parseInt(mesEl.value) - 1;
    _calAnioActual = new Date().getFullYear();
  }
  actualizarSemanasFiltro();
  renderCalendarioRegistro();
}

/* ════════════════════════════════════════════════════════════
   PROYECCIONES — Motor
   ════════════════════════════════════════════════════════════ */
function calcProyecciones() {
  const tasaPct = parseFloat(document.getElementById('proy_tasa')?.value  || 10);
  const meses   = parseInt(document.getElementById('proy_meses')?.value   || 6, 10);
  const mesBase = parseInt(document.getElementById('proy_mes_base')?.value) || (new Date().getMonth() + 1);
  const s       = TAOS.state;

  const tasa    = tasaPct / 100;
  const actIng  = parseFloat(document.getElementById('proy_ingresos')?.value) || 0;
  const actEg   = parseFloat(document.getElementById('proy_egresos')?.value)  || 0;
  const actUp   = parseInt(document.getElementById('proy_uprod')?.value)      || 0;
  const sinDatos = actIng === 0 && actEg === 0 && actUp === 0;
  const ingBase = sinDatos ? 0 : (actIng || 19327);
  const egBase  = sinDatos ? 0 : (actEg  || 12496);
  const upBase  = sinDatos ? 0 : (actUp  || 32000);

  const rows = [];
  let ingPrev = ingBase, egPrev = egBase, upPrev = upBase;

  for (let i = 0; i < meses; i++) {
    const mesActual = ((mesBase - 1 + i) % 12) + 1;
    const ing  = ingPrev * (1 + tasa);
    const eg   = egPrev  * (1 + tasa * 0.80);
    const up   = Math.round(upPrev * (1 + tasa));
    const uv   = Math.round(up * 0.85);
    const gan  = ing - eg;
    const marg = ing > 0 ? (gan / ing * 100) : 0;
    const id   = i + 1;
    rows.push({ id, mes: mesActual, up, uv, ing, eg, gan, marg });
    ingPrev = ing; egPrev = eg; upPrev = up;
  }

  const last = rows.length ? rows[rows.length - 1] : null;
  const crecTotal = last && ingBase > 0 ? ((last.ing - ingBase) / ingBase * 100) : 0;

  setText('proy_ing_mes',    last ? fmt$(last.ing) : '—');
  setText('proy_gan_mes',    last ? fmt$(last.gan) : '—');
  setText('proy_up_mes',     last ? last.up.toLocaleString('es-EC') : '—');
  setText('proy_crec_total', crecTotal.toFixed(0) + '%');

  const tbody = document.getElementById('proy_tabla_body');
  if (tbody) {
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td><strong>${MESES_NOMBRE[r.mes - 1] || 'Mes ' + r.mes}</strong></td>
        <td>${r.up.toLocaleString('es-EC')}</td>
        <td>${r.uv.toLocaleString('es-EC')}</td>
        <td class="td-money">${fmt$(r.ing)}</td>
        <td class="td-money red">${fmt$(r.eg)}</td>
        <td class="td-money ${r.gan >= 0 ? 'green-val' : 'red'}">${fmt$(r.gan)}</td>
        <td><span class="margin-pill ${r.marg >= 15 ? 'up' : 'down'}">
          ${r.marg >= 0 ? '↑' : '↓'} ${Math.abs(r.marg).toFixed(1)}%
        </span></td>
        <td class="action-cell">
          <button class="mod-btn" onclick="editarProyeccion(${r.id})" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="del-btn" onclick="eliminarProyeccion(${r.id})" title="Eliminar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderBarChart(rows);

  if (sinDatos) {
    setText('obj_pe_pct',       '0%');
    setText('obj_pe_vendidas',  '— vendidas');
    setText('obj_pe_restantes', '—');
    setText('obj_rec_val',      '—');
    setText('obj_rec_diff',     'Establecer un nuevo P.E');
    const fill = document.getElementById('obj_pe_fill');
    if (fill) fill.style.width = '0%';
  } else {
    const metaDiaria = 200;
    const vendidas   = s.unidadesVendidas   || 0;
    const restantes  = Math.max(0, metaDiaria - vendidas);
    const progPct    = metaDiaria > 0 ? Math.min(100, (vendidas / metaDiaria) * 100) : 0;

    setText('obj_pe_pct',       progPct.toFixed(0) + '%');
    setText('obj_pe_vendidas',  vendidas.toLocaleString('es-EC') + ' vendidas');
    setText('obj_pe_restantes', restantes.toLocaleString('es-EC') + ' restantes de ' + metaDiaria);

    const fill = document.getElementById('obj_pe_fill');
    if (fill) fill.style.width = progPct.toFixed(1) + '%';

    const diff = (s.puntoEquilDinero != null ? s.puntoEquilDinero : 1700) - ingBase;
    setText('obj_rec_val',  fmt$(ingBase));
    setText('obj_rec_diff', diff > 0
      ? 'Faltan ' + fmt$(diff) + ' para alcanzar el equilibrio'
      : '✓ Equilibrio superado en ' + fmt$(Math.abs(diff))
    );

    const invPct = parseInt(document.getElementById('inv_futura_pct')?.value) || 0;
    const invFutura = (s.ganancia || 0) * (invPct / 100);
    setText('inv_futura_val', fmt$(invFutura));
    setText('inv_futura_pct_label', '% de la ganancia neta');
  }
  if (sinDatos) {
    setText('inv_futura_val', '—');
    setText('inv_futura_pct_label', '% de la ganancia neta');
  }

  TAOS.state.proyecciones = rows;
  if (typeof actualizarKPIsActuales === 'function') actualizarKPIsActuales();
}

/* ── EDITAR / ELIMINAR PROYECCIÓN ── */
function editarProyeccion(id) {
  toast('Las proyecciones se generan automáticamente desde los sliders — ajusta Tasa y Meses para modificar', 'warn');
}

function eliminarProyeccion(id) {
  toast('Las filas de proyección se generan automáticamente. Usa los sliders para ajustar los meses.', 'warn');
}

function renderBarChart(rows) {
  _renderBarChartInto('bar_chart',      rows, r => r.ing, r => r.eg);
  _renderBarChartInto('bar_chart_fab',  rows, r => r.up,  r => r.uv);
  _renderBarChartInto('bar_chart_fact', rows, r => r.ing, r => r.eg);
}

function _renderBarChartInto(chartId, rows, valA, valB) {
  const chart = document.getElementById(chartId);
  if (!chart) return;
  const maxVal   = Math.max(...rows.map(r => Math.max(valA(r), valB(r))), 1);
  const curMes   = (parseInt(document.getElementById('proy_mes_base')?.value) || new Date().getMonth() + 1) - 1;
  chart.innerHTML = rows.map((r, i) => {
    const hA      = Math.max(4, (valA(r) / maxVal) * 110);
    const hB      = Math.max(4, (valB(r) / maxVal) * 110);
    const current = (i === curMes);
    const mesAbr  = MESES_NOMBRE[i] ? MESES_NOMBRE[i].slice(0,3) : 'M'+(i+1);
    return `
      <div class="bar-group">
        <div class="bar-pair">
          <div class="bar-col green${current ? ' current' : ''}"
               style="height:${hA.toFixed(0)}px" title="${fmt$(valA(r))}"></div>
          <div class="bar-col red${current ? ' current' : ''}"
               style="height:${hB.toFixed(0)}px" title="${fmt$(valB(r))}"></div>
        </div>
        <div class="bar-label">${mesAbr}</div>
      </div>`;
  }).join('');
}

function actualizarProyecciones() {
  calcProyecciones();
}

/* Rellena KPIs de Escenario Actual */
function actualizarKPIsActuales() {
  const s   = TAOS.state;
  const sinDatos = !(s.colaboradores || []).length && !(s.registroDiario || []).length && (s.unidadesVendidas || 0) === 0;
  const ing = sinDatos ? 0 : (s.ingresos || 19327);
  const eg  = sinDatos ? 0 : (s.egresos  || 12496);
  const gan = ing - eg;
  const up  = sinDatos ? 0 : (s.unidadesProducidas || 0);
  const uv  = sinDatos ? 0 : (s.unidadesVendidas   || 0);
  const peD = sinDatos ? 0 : (s.puntoEquilDinero   || 1700);
  const peU = sinDatos ? 0 : (s.puntoEquilUnidades || 200);
  const flujo = gan >= 0 ? gan : 0;

  setText('actual_flujo_caja', sinDatos ? '—' : fmt$(flujo));
  setText('actual_ingresos',   sinDatos ? '— / —' : fmt$(ing)  + ' / ' + fmt$(peD));
  setText('actual_egresos',    sinDatos ? '— / —' : fmt$(eg)   + ' / ' + fmt$(peD));
  setText('actual_ganancia',   sinDatos ? '—' : fmt$(gan));
  setText('actual_u_prod',     sinDatos ? '— / —' : up.toLocaleString('es-EC') + ' / ' + peU.toLocaleString('es-EC'));

  const PE_UNIDADES = s.puntoEquilUnidades || 200;
  const tasaReal = !sinDatos && uv > 0
    ? ((uv - PE_UNIDADES) / PE_UNIDADES * 100)
    : 0;
  setText('actual_crec_total', sinDatos ? '—' : ((tasaReal >= 0 ? '+' : '') + tasaReal.toFixed(1) + '%'));
  const tasaEl = document.getElementById('actual_tasa_crec');
  if (tasaEl) tasaEl.value = tasaReal.toFixed(2);

  const tbody = document.getElementById('actual_tabla_body');
  if (tbody) {
    const regs = (s.registroDiario || []);
    if (regs.length > 0) {
      const byMes = {};
      regs.forEach(r => {
        const key = MESES_NOMBRE[r.mes - 1] || 'Mes ' + r.mes;
        if (!byMes[key]) byMes[key] = { mes: key, uprod:0, uvend:0, ing:0, eg:0 };
        byMes[key].uprod += r.uprod || 0;
        byMes[key].uvend += r.uvend || 0;
        byMes[key].ing   += r.ing   || 0;
        byMes[key].eg    += r.eg    || 0;
      });
      tbody.innerHTML = Object.values(byMes).map(m => {
        const mGan  = m.ing - m.eg;
        const mMarg = m.ing > 0 ? (mGan / m.ing * 100) : 0;
        return `<tr>
          <td><strong>${escHtml(m.mes)}</strong></td>
          <td>${m.uprod.toLocaleString('es-EC')}</td>
          <td>${m.uvend.toLocaleString('es-EC')}</td>
          <td class="td-money">${fmt$(m.ing)}</td>
          <td class="td-money red">${fmt$(m.eg)}</td>
          <td class="td-money ${mGan >= 0 ? 'green-val' : 'red'}">${fmt$(mGan)}</td>
          <td><span class="margin-pill ${mMarg >= 15 ? 'up' : 'down'}">${mMarg >= 0 ? '↑' : '↓'} ${Math.abs(mMarg).toFixed(1)}%</span></td>
          <td class="action-cell">
            <button class="mod-btn" onclick="editarEscenarioActual('${m.mes}')" title="Editar">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </td>
        </tr>`;
      }).join('');
    } else {
      const marg = ing > 0 ? ((gan / ing) * 100) : 0;
      tbody.innerHTML = `<tr>
        <td><strong>Mes Actual</strong></td>
        <td>${up.toLocaleString('es-EC')}</td>
        <td>${uv.toLocaleString('es-EC')}</td>
        <td class="td-money">${fmt$(ing)}</td>
        <td class="td-money red">${fmt$(eg)}</td>
        <td class="td-money ${gan >= 0 ? 'green-val' : 'red'}">${fmt$(gan)}</td>
        <td><span class="margin-pill ${marg >= 15 ? 'up' : 'down'}">${marg >= 0 ? '↑' : '↓'} ${Math.abs(marg).toFixed(1)}%</span></td>
        <td class="action-cell">—</td>
      </tr>`;
    }
  }
}

/* ── EDITAR ESCENARIO ACTUAL ── */
function editarEscenarioActual(mes) {
  toast('Para modificar el escenario, edita los registros diarios correspondientes al ' + mes + ' en la pestaña Registro Diario.', 'warn');
}

/* Guardar consolidado */
function guardarConsolidado() {
  const eqFechaEl = document.getElementById('eq_fecha');
  if (eqFechaEl && !eqFechaEl.value) eqFechaEl.value = new Date().toISOString().split('T')[0];
  if (typeof actualizarSemanasReg === 'function') actualizarSemanasReg();
  const eqFecha = eqFechaEl?.value;
  const date = eqFecha ? new Date(eqFecha + 'T12:00:00') : new Date();
  if (isNaN(date.getTime())) { toast('Fecha inválida', 'error'); return; }
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const diaEl = document.getElementById('reg_dia');
  if (diaEl) diaEl.value = dias[date.getDay()];
  const mesEl = document.getElementById('reg_mes');
  if (mesEl) mesEl.value = date.getMonth() + 1;
  const semanaEl = document.getElementById('reg_semana');
  if (semanaEl) {
    const sy = new Date(date.getFullYear(), 0, 1);
    const diasDesde = Math.floor((date - sy) / 86400000);
    const sem = Math.ceil((diasDesde + sy.getDay() + 1) / 7);
    const opt = semanaEl.querySelector(`option[value="${sem}"]`);
    if (opt) semanaEl.value = sem;
  }
  const regFechaEl = document.getElementById('reg_fecha');
  if (regFechaEl) regFechaEl.value = date.toISOString().split('T')[0];
  agregarRegistroDiario();
  /* Sync filter to current date */
  const filtroMesEl = document.getElementById('reg_filtro_mes');
  if (filtroMesEl) {
    filtroMesEl.value = date.getMonth() + 1;
    if (typeof actualizarSemanasFiltro === 'function') actualizarSemanasFiltro();
    const filtroSemEl = document.getElementById('reg_filtro_semana');
    if (filtroSemEl) {
      const sy = new Date(date.getFullYear(), 0, 1);
      const diasDesde = Math.floor((date - sy) / 86400000);
      const week = Math.ceil((diasDesde + sy.getDay() + 1) / 7);
      const opt = filtroSemEl.querySelector(`option[value="${week}"]`);
      if (opt) filtroSemEl.value = week;
    }
  }
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  if (typeof guardarSnapshot === 'function') guardarSnapshot('progreso');
  toast('Progreso guardado ✓');
}

/* Guardar datos del escenario actual */
function guardarDatosActual() {
  const mesNum = parseInt(document.getElementById('actual_mes')?.value) || 1;
  const semNum = parseInt(document.getElementById('actual_semana')?.value) || 1;
  guardar('estado_financiero', {
    ingresos: TAOS.state.ingresos,
    egresos:  TAOS.state.egresos,
    ganancia: TAOS.state.ganancia,
    unidadesVendidas: TAOS.state.unidadesVendidas,
    unidadesProducidas: TAOS.state.unidadesProducidas,
    periodo: mesNum,
    semana: semNum,
  });
  actualizarResumenEjecutivo();
  actualizarKPIsActuales();
  syncAllCalculators();
  toast('Datos del escenario actual guardados ✓');
}

/* Guardar proyección */
function guardarProyeccion() {
  guardar('proyecciones', TAOS.state.proyecciones);
  toast('Proyección guardada ✓');
}

/* ════════════════════════════════════════════════════════════
   CALENDARIO DE REGISTRO
   ════════════════════════════════════════════════════════════ */
let _calMesActual = new Date().getMonth();
let _calAnioActual = new Date().getFullYear();

function renderCalendarioRegistro() {
  const diasNom  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  const titEl  = document.getElementById('cal_titulo');
  const headEl = document.getElementById('cal_dias_head');
  const bodyEl = document.getElementById('cal_dias_body');
  if (!titEl || !headEl || !bodyEl) return;

  titEl.textContent = MESES_NOMBRE[_calMesActual] + ' ' + _calAnioActual;

  headEl.innerHTML = diasNom.map(d =>
    `<div class="cal-day-head">${d}</div>`
  ).join('');

  const primerDia = new Date(_calAnioActual, _calMesActual, 1).getDay();
  const diasEnMes = new Date(_calAnioActual, _calMesActual + 1, 0).getDate();

  const regs  = TAOS.state.registroDiario || [];
  const today = new Date();

  let bodyHtml = '';
  for (let i = 0; i < primerDia; i++) {
    bodyHtml += `<div class="cal-day empty"></div>`;
  }
  for (let d = 1; d <= diasEnMes; d++) {
    const fechaStr = _calAnioActual + '-' +
      String(_calMesActual + 1).padStart(2,'0') + '-' +
      String(d).padStart(2,'0');
    const reg = regs.find(r => r.fecha === fechaStr);
    const isToday = (d === today.getDate() && _calMesActual === today.getMonth() && _calAnioActual === today.getFullYear());
    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (reg) {
      const marg = reg.ing > 0 ? ((reg.ing - reg.eg) / reg.ing * 100) : 0;
      const pos = marg >= 0;
      cls += ' has-reg' + (pos ? ' marg-pos' : ' marg-neg');
    }
    bodyHtml += `<div class="${cls}" onclick="calDiaClick('${fechaStr}',${d})" title="${reg ? 'Ingreso: '+fmt$(reg.ing)+' | Egreso: '+fmt$(reg.eg) : 'Sin registro'}">${d}${reg ? '<span class="cal-dot"></span>' : ''}</div>`;
  }

  bodyEl.innerHTML = bodyHtml;
}

function calNavMes(dir) {
  _calMesActual += dir;
  if (_calMesActual > 11) { _calMesActual = 0; _calAnioActual++; }
  if (_calMesActual < 0)  { _calMesActual = 11; _calAnioActual--; }
  renderCalendarioRegistro();
}

function calDiaClick(fechaStr, dia) {
  const regs = TAOS.state.registroDiario || [];
  const reg  = regs.find(r => r.fecha === fechaStr);
  const infoEl = document.getElementById('cal_selected_info');
  if (!infoEl) return;

  if (reg) {
    infoEl.style.display = 'block';
    infoEl.innerHTML = `
      <strong>${fechaStr}</strong> —
      U.Prod: <b>${reg.uprod}</b> | U.Vend: <b>${reg.uvend}</b> |
      Ingreso: <b class="green-val">${fmt$(reg.ing)}</b> |
      Egreso: <b style="color:var(--red)">${fmt$(reg.eg)}</b> |
      Ganancia: <b style="color:${reg.gan>=0?'var(--green-text)':'var(--red)'}">${fmt$(reg.gan||0)}</b>
      <button class="mod-btn" style="margin-left:8px" onclick="editarRegistroDiario(${reg.id})" title="Editar">✏</button>
      <button class="del-btn" style="margin-left:4px" onclick="eliminarRegistroDiario(${reg.id})" title="Eliminar">🗑</button>
    `;
  } else {
    infoEl.style.display = 'block';
    infoEl.innerHTML = `<strong>${fechaStr}</strong> — Sin registro. <button class="btn-primary" style="padding:4px 10px;font-size:12px" onclick="preLlenarFechaRegistro('${fechaStr}')">+ Agregar</button>`;
  }
}

function preLlenarFechaRegistro(fechaStr) {
  const fechaEl = document.getElementById('reg_fecha');
  if (fechaEl) fechaEl.value = fechaStr;
  const d     = new Date(fechaStr + 'T00:00:00');
  const dias  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const diaEl = document.getElementById('reg_dia');
  if (diaEl) diaEl.value = dias[d.getDay()];
  const mesEl = document.getElementById('reg_mes');
  if (mesEl) mesEl.value = d.getMonth() + 1;
  if (typeof actualizarSemanasReg === 'function') actualizarSemanasReg();
  const startYear = new Date(d.getFullYear(), 0, 1);
  const diasDesde = Math.floor((d - startYear) / 86400000);
  const week = Math.ceil((diasDesde + startYear.getDay() + 1) / 7);
  const semEl = document.getElementById('reg_semana');
  if (semEl) { const opt = semEl.querySelector(`option[value="${week}"]`); if (opt) semEl.value = week; }
  /* Auto-load existing data for this date */
  const regs = TAOS.state.registroDiario || [];
  const existing = regs.find(r => r.fecha === fechaStr);
  const uprodEl = document.getElementById('reg_uprod_form');
  const uvendEl = document.getElementById('reg_uvend_form');
  const ingEl = document.getElementById('reg_ingresos_form');
  const egEl = document.getElementById('reg_egresos_form');
  if (existing) {
    if (uprodEl) uprodEl.value = existing.uprod || '';
    if (uvendEl) uvendEl.value = existing.uvend || '';
    if (ingEl) ingEl.value = existing.ing || '';
    if (egEl) egEl.value = existing.eg || '';
  } else {
    if (uprodEl) uprodEl.value = '';
    if (uvendEl) uvendEl.value = '';
    if (ingEl) ingEl.value = '';
    if (egEl) egEl.value = '';
  }
  actualizarPreviewRegistro();
  const tabBtn = document.querySelector('.main-tab[data-tab="registro"]');
  if (tabBtn) tabBtn.click();
}
