/* ============================================================
   taos.js — Motor Principal del Sistema TAOS
   Sistema de Costos y Presupuestos · Polaris
   ============================================================ */
'use strict';

/* ════════════════════════════════════════════════════════════
   ESTADO GLOBAL CENTRALIZADO
   ════════════════════════════════════════════════════════════ */
const TAOS = {
  state: {
    colaboradores:       [],
    inventario:          [],
    costosFijos:         10750,
    costosVariables:     560,
    costoVariableUnit:   3.5,
    materiaPrimaUnit:    3.294,
    manoObra:            7040,
    ingresos:            0,
    egresos:             0,
    ganancia:            0,
    margenGanancia:      0,
    precioVenta:         8.5,
    precioVentaConIva:   9.42,
    puntoEquilUnidades:  200,
    puntoEquilDinero:    1700,
    precioVentaUnitReg:  0.80,
    costoFabUnitReg:     0.00,
    unidadesProducidas:  0,
    unidadesVendidas:    0,
    proyecciones:        [],
    estacionCounter:     { C: 0, A: 0, O: 0 },
    registroDiario:      [],
    presencia:           {},
    tasaCrecimientoReal: 0,
  },
  currentTab:     'resumen',
  currentCalcTab: 'costos_fijos',
  currentCFTab:   'nomina',
  editingColabId:  null,
  editingInvIdx:   null,
  editingRegId:    null,
};

/* IDs de inputs de calculadoras que se persisten en localStorage */
const CALC_INPUT_IDS = [
  'cf_arriendo','cf_servicios','cf_nomina_val','cf_deprec','cf_consumibles',
  'cv_costo_unit','cv_cantidad',
  'di_mp','di_mod','di_cif','di_gadm','di_gven',
  'mp_mezcla','mp_merma','mp_congelante',
  'mo_salario','mo_horas','mo_trabajadores',
  'cr_psc','cr_margen','cr_iva','mg_inversion','mg_ingresos','mg_egresos',
  'pe_costos_fijos','pe_precio_venta','pe_costo_var_unit',
  'actual_u_vendidas','actual_u_vendidas_proy','actual_tasa_crec','proy_uprod',
  'eq_uprod','eq_ingresos','eq_egresos',
  'pr_costo_fab_input','pr_pvd_input','pr_pvp_input',
];

/* ════════════════════════════════════════════════════════════
   DATOS INICIALES — COLABORADORES
   ════════════════════════════════════════════════════════════ */
const COLABORADORES_INIT = [
  {
    id:1, nombre:'María García', area:'comercial', division:'Mostrador',
    horas:200, salarioHora:2.25, estacion:'EC-01',
    recursos:'Instalaciones - Sección: "Atención al Cliente", Estación de Procesos: Área Mostrador, EPP de Atención al cliente, Kit de consumibles: Comercial',
    productos:'Atención al cliente, Ventas', total:450
  },
  {
    id:2, nombre:'Carlos López', area:'comercial', division:'Facturación y Entrega',
    horas:200, salarioHora:2.25, estacion:'EC-02',
    recursos:'Instalaciones - Sección: "Atención al Cliente", Estación de Procesos: Área Facturación - Entrega, EPP de Atención al cliente, Kit de consumibles: Comercial',
    productos:'Facturas, Documentación', total:450
  },
  {
    id:3, nombre:'Ana Torres', area:'administracion', division:'Control',
    horas:160, salarioHora:4.00, estacion:'EA-02',
    recursos:'Instalaciones - Sección: "Oficinas", Estación de Procesos: Área Coordinación Control, EPP de Control, Kit de Herramientas para Oficina, Kit de consumibles: Papelería',
    productos:'Reportes, Auditoría', total:640
  },
  {
    id:4, nombre:'Pedro Vargas', area:'administracion', division:'Gerencia',
    horas:160, salarioHora:5.20, estacion:'EA-01',
    recursos:'Instalaciones - Sección: "Oficinas", Estación de Procesos: Área Dirección, EPP de Administración, Kit de Herramientas para Oficina, Kit de consumibles: Papelería',
    productos:'Toma de decisiones, Gestión General', total:832
  },
  {
    id:11, nombre:'Martin Arias', area:'administracion', division:'Marketing',
    horas:160, salarioHora:5.00, estacion:'EA-03',
    recursos:'Instalaciones - Sección: "Oficinas", Estación de Procesos: Área Marketing, EPP de Marketing, Kit de Herramientas para Marketing, Kit de consumibles: Marketing',
    productos:'Publicidad y Marketing', total:800
  },
  {
    id:5, nombre:'Lucía Méndez', area:'operaciones', division:'Proceso de Preparacion',
    horas:200, salarioHora:2.30, estacion:'EO-01',
    recursos:'Instalaciones - Sección: "Proceso Primario", Estación de Procesos: Área Lavado, Estación de Procesos: Área Pasteurización, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario',
    productos:'Adecuación de ingredientes', total:460
  },
  {
    id:6, nombre:'Diego Ríos', area:'operaciones', division:'Proceso Primario',
    horas:200, salarioHora:2.30, estacion:'EO-02',
    recursos:'Instalaciones - Sección: "Proceso Primario", Estación de Procesos: Área Maduración, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario',
    productos:'Adecuación de procesos de maduración', total:460
  },
  {
    id:7, nombre:'Sofía Castro', area:'operaciones', division:'Proceso Secundario',
    horas:160, salarioHora:2.30, estacion:'EO-03',
    recursos:'Instalaciones - Sección: "Proceso Secundario", Estación de Procesos: Área Modelado, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Secundario',
    productos:'Paletas, Moldes y Ultracongelado', total:368
  },
  {
    id:8, nombre:'Andrés Paz', area:'operaciones', division:'Empaquetado y Etiquetado',
    horas:120, salarioHora:2.30, estacion:'EO-04',
    recursos:'Instalaciones - Sección: "Proceso Secundario", Estación de Procesos: Área Empaquetado-Etiquetado, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Secundario',
    productos:'Empaque, Etiquetado', total:276
  },
  {
    id:9, nombre:'Kerly Vivanco', area:'operaciones', division:'Almacernamiento',
    horas:200, salarioHora:2.30, estacion:'EO-05',
    recursos:'Instalaciones - Sección: "Proceso Secundario", Estación de Procesos: Área Deposito, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Almacenamiento',
    productos:'Cajas Almacenadas', total:460
  },
  {
    id:10, nombre:'Daniel Garcia', area:'operaciones', division:'Asistente',
    horas:200, salarioHora:2.25, estacion:'EO-06',
    recursos:'Instalaciones - Sección: "Proceso Primario" "Proceso Secundario", Estación de Procesos: Apoyo General - Logística, EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario, Kit de consumibles: Proceso Secundario',
    productos:'Apoyo General, Logística', total:450
  },
];

const INVENTARIO_INIT = [
  { id:'IC.1.1', nombre:'Instalaciones - Sección: "Atención al Cliente"',  categoria:'infraestructura', area:'comercial',      cant:16,    precio:10.00,   subtotal:160.00,  iva:24.00,   total:184.00   },
  { id:'IA.2.1', nombre:'Instalaciones - Sección: "Oficinas"',             categoria:'infraestructura', area:'administracion', cant:20,    precio:10.00,   subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'IO.3.1', nombre:'Instalaciones - Sección: "Proceso Primario"',     categoria:'infraestructura', area:'operaciones',    cant:20,    precio:10.00,   subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'IO.3.2', nombre:'Instalaciones - Sección: "Proceso Secundario"',   categoria:'infraestructura', area:'operaciones',    cant:21,    precio:10.00,   subtotal:210.00,  iva:31.50,   total:241.50   },
  { id:'MC.1.1', nombre:'Estacion de trabajo Comercial',                   categoria:'mobiliario',      area:'comercial',      cant:1,     precio:1000.00, subtotal:1000.00, iva:150.00,  total:1150.00  },
  { id:'MA.2.1', nombre:'Estación de trabajo Dirección',                   categoria:'mobiliario',      area:'administracion', cant:1,     precio:800.00,  subtotal:800.00,  iva:120.00,  total:920.00   },
  { id:'MA.2.2', nombre:'Estación de trabajo Oficinas',                    categoria:'mobiliario',      area:'administracion', cant:3,     precio:600.00,  subtotal:1800.00, iva:270.00,  total:2070.00  },
  { id:'MO.3.1', nombre:'Estación de trabajo Materias Primas',             categoria:'mobiliario',      area:'operaciones',    cant:4,     precio:500.00,  subtotal:2000.00, iva:300.00,  total:2300.00  },
  { id:'MO.3.2', nombre:'Estacion de trabajo Materias Secundarias',        categoria:'mobiliario',      area:'operaciones',    cant:3,     precio:500.00,  subtotal:1500.00, iva:225.00,  total:1725.00  },
  { id:'MO.3.3', nombre:'Estacion de trabajo Almacenamiento',              categoria:'mobiliario',      area:'operaciones',    cant:1,     precio:1000.00, subtotal:1000.00, iva:150.00,  total:1150.00  },
  { id:'QC.1.1', nombre:'Estación de Procesos: Área Facturación - Entrega',categoria:'maquinaria',      area:'comercial',      cant:1,     precio:400.00,  subtotal:400.00,  iva:60.00,   total:460.00   },
  { id:'QC.1.2', nombre:'Estación de Procesos: Área Mostrador',            categoria:'maquinaria',      area:'comercial',      cant:1,     precio:500.00,  subtotal:500.00,  iva:75.00,   total:575.00   },
  { id:'QA.2.1', nombre:'Estación de Procesos: Área Marketing',            categoria:'maquinaria',      area:'administracion', cant:1,     precio:200.00,  subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'QA.2.2', nombre:'Estación de Procesos: Área Dirección',            categoria:'maquinaria',      area:'administracion', cant:1,     precio:200.00,  subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'QA.2.3', nombre:'Estación de Procesos: Área Coordinación',         categoria:'maquinaria',      area:'administracion', cant:1,     precio:200.00,  subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'QO.3.1', nombre:'Estación de Procesos: Área Lavado',               categoria:'maquinaria',      area:'operaciones',    cant:1,     precio:300.00,  subtotal:300.00,  iva:45.00,   total:345.00   },
  { id:'QO.3.2', nombre:'Estación de Procesos: Área Pasteurizacion',       categoria:'maquinaria',      area:'operaciones',    cant:1,     precio:500.00,  subtotal:500.00,  iva:75.00,   total:575.00   },
  { id:'QO.3.3', nombre:'Estación de Procesos: Área Maduración',           categoria:'maquinaria',      area:'operaciones',    cant:1,     precio:600.00,  subtotal:600.00,  iva:90.00,   total:690.00   },
  { id:'QA.2.4', nombre:'Estación de Procesos: Área Modelado',             categoria:'maquinaria',      area:'operaciones',    cant:1,     precio:600.00,  subtotal:600.00,  iva:90.00,   total:690.00   },
  { id:'QO.3.4', nombre:'Estación de Procesos: Área Empaquetado-Etiquetado',categoria:'maquinaria',     area:'operaciones',    cant:1,     precio:400.00,  subtotal:400.00,  iva:60.00,   total:460.00   },
  { id:'QO.3.6', nombre:'Estación de Procesos: Área Deposito',             categoria:'maquinaria',      area:'operaciones',    cant:1,     precio:3000.00, subtotal:3000.00, iva:450.00,  total:3450.00  },
  { id:'HC.1.1', nombre:'Kit de Herramientas para Marketing',              categoria:'herramientas',    area:'comercial',      cant:1,     precio:200.00,  subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'HA.2.1', nombre:'Kit de Herramientas para Oficina',                categoria:'herramientas',    area:'administracion', cant:4,     precio:50.00,   subtotal:200.00,  iva:30.00,   total:230.00   },
  { id:'HO.3.1', nombre:'Kit de Herramientas para Producción',             categoria:'herramientas',    area:'operaciones',    cant:6,     precio:80.00,   subtotal:480.00,  iva:72.00,   total:552.00   },
  { id:'EPP.1.1', nombre:'EPP de Atención al cliente',                     categoria:'epp',             area:'comercial',      cant:2,     precio:39.00,   subtotal:78.00,   iva:11.70,   total:89.70    },
  { id:'EPP.2.1', nombre:'EPP de Administración',                          categoria:'epp',             area:'administracion', cant:2,     precio:48.00,   subtotal:96.00,   iva:14.40,   total:110.40   },
  { id:'EPP.2.2', nombre:'EPP de Marketing',                               categoria:'epp',             area:'administracion', cant:1,     precio:40.00,   subtotal:40.00,   iva:6.00,    total:46.00    },
  { id:'EPP.3.1', nombre:'EPP de Control',                                 categoria:'epp',             area:'operaciones',    cant:2,     precio:25.00,   subtotal:50.00,   iva:7.50,    total:57.50    },
  { id:'EPP.3.2', nombre:'EPP de Fabricación',                             categoria:'epp',             area:'operaciones',    cant:6,     precio:34.80,   subtotal:208.80,  iva:31.32,   total:240.12   },
  { id:'CC.1.1', nombre:'Kit de consumibles: Comercial',                   categoria:'consumibles',     area:'comercial',      cant:4,     precio:10.45,   subtotal:41.80,   iva:6.27,    total:48.07    },
  { id:'CC.1.2', nombre:'Kit de consumibles: Marketing',                   categoria:'consumibles',     area:'comercial',      cant:1,     precio:100.00,  subtotal:100.00,  iva:15.00,   total:115.00   },
  { id:'CA.2.1', nombre:'Kit de consumibles: Papelería',                   categoria:'consumibles',     area:'administracion', cant:4,     precio:25.00,   subtotal:100.00,  iva:15.00,   total:115.00   },
  { id:'CO.3.1', nombre:'Kit de consumibles: Proceso Almacenamiento',      categoria:'consumibles',     area:'operaciones',    cant:800,   precio:0.21,    subtotal:168.00,  iva:25.20,   total:193.20   },
  { id:'CO.3.2', nombre:'Kit de consumibles: Proceso Primario',            categoria:'consumibles',     area:'operaciones',    cant:8000,  precio:0.065,   subtotal:522.40,  iva:78.36,   total:600.76   },
  { id:'CO.3.3', nombre:'Kit de consumibles: Proceso Secundario',          categoria:'consumibles',     area:'operaciones',    cant:8000,  precio:0.0218,  subtotal:174.40,  iva:26.16,   total:200.56   },
];

const RECURSOS_DIVISION = {
  'Mostrador':                { recursos:'EPP de Atención al cliente, Kit de consumibles: Comercial',                                                                                      productos:'Atención al cliente, Ventas' },
  'Facturación y Entrega':    { recursos:'EPP de Atención al cliente, Kit de consumibles: Comercial',                                                                                      productos:'Facturas, Documentación' },
  'Gerencia':                 { recursos:'EPP de Administración, Kit de Herramientas para Oficina, Kit de consumibles: Papelería',                                                         productos:'Toma de decisiones, Gestión General' },
  'Control':                  { recursos:'EPP de Control, Kit de Herramientas para Oficina, Kit de consumibles: Papelería',                                                                productos:'Reportes, Auditoría' },
  'Marketing':                { recursos:'EPP de Marketing, Kit de Herramientas para Marketing, Kit de consumibles: Marketing',                                                            productos:'Publicidad y Marketing' },
  'Proceso de Preparacion':   { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario',                                                  productos:'Adecuación de ingredientes' },
  'Proceso Primario':         { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario',                                                  productos:'Adecuación de procesos de maduración' },
  'Proceso Secundario':       { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Secundario',                                                productos:'Paletas, Moldes y Ultracongelado' },
  'Empaquetado y Etiquetado': { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Secundario',                                                productos:'Empaque, Etiquetado' },
  'Almacernamiento':          { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Almacenamiento',                                            productos:'Cajas Almacenadas' },
  'Asistente':                { recursos:'EPP de Fabricación, Kit de Herramientas para Producción, Kit de consumibles: Proceso Primario, Kit de consumibles: Proceso Secundario',          productos:'Apoyo General, Logística' },
};

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  /* Factory-reset mode: force all defaults to empty */
  const fabricaMode = localStorage.getItem('taos_fabrica_mode');
  if (fabricaMode) {
    localStorage.removeItem('taos_fabrica_mode');
    TAOS.state.colaboradores  = [];
    TAOS.state.inventario     = [];
    TAOS.state.registroDiario = [];
    TAOS.state.presencia      = {};
    TAOS.state.ingresos = TAOS.state.egresos = TAOS.state.ganancia = 0;
    TAOS.state.unidadesVendidas = TAOS.state.unidadesProducidas = 0;
    TAOS.state.puntoEquilUnidades = 0;
    TAOS.state.puntoEquilDinero   = 0;
    TAOS.state.precioVenta = TAOS.state.costoVariableUnit = TAOS.state.materiaPrimaUnit = 0;
    TAOS.state.precioVentaUnitReg = TAOS.state.costoFabUnitReg = 0;
    TAOS.state.proyecciones = [];
    guardar('colaboradores',  []);
    guardar('inventario',     []);
    guardar('registroDiario', []);
    guardar('presencia',      {});
    guardar('estado_financiero', {
      ingresos:0, egresos:0, ganancia:0, unidadesVendidas:0, unidadesProducidas:0,
      puntoEquilUnidades:0, puntoEquilDinero:0
    });
    guardar('proyecciones', []);
    guardar('reg_config', { precioVentaUnitReg:0, costoFabUnitReg:0 });

    /* Clear all calculator & form input values to blank */
    const idsZero = [
      'cf_arriendo','cf_servicios','cf_nomina_val','cf_deprec','cf_consumibles',
      'cv_costo_unit','cv_cantidad','di_mp','di_mod','di_cif','di_gadm','di_gven',
      'mp_mezcla','mp_merma','mp_congelante','mo_salario','mo_horas','mo_trabajadores',
      'cr_psc','cr_margen','cr_iva','mg_inversion',
      'pe_costos_fijos','pe_precio_venta','pe_costo_var_unit',
      'actual_u_vendidas','eq_uprod','eq_ingresos','eq_egresos',
    ];
    idsZero.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } else {
    TAOS.state.colaboradores  = cargar('colaboradores', COLABORADORES_INIT);
    TAOS.state.inventario     = cargar('inventario',    INVENTARIO_INIT);
    TAOS.state.registroDiario = cargar('registroDiario', []);
    TAOS.state.presencia      = cargar('presencia', {});
  }

  /* Migration: ensure Martin Arias (id:11) exists and is in correct position */
  if (!fabricaMode) {
    const cols = TAOS.state.colaboradores || [];
    const martinSrc = COLABORADORES_INIT.find(c => c.id === 11);
    const martinIdx = cols.findIndex(c => c.id === 11);
    if (martinIdx === -1) {
      if (martinSrc && cols.length > 0) {
        const insertAfter = cols.findIndex(c => c.id === 4);
        if (insertAfter >= 0) cols.splice(insertAfter + 1, 0, {...martinSrc});
        guardar('colaboradores', cols);
      }
    } else if (martinSrc) {
      const pedroIdx = cols.findIndex(c => c.id === 4);
      const expectedPos = pedroIdx + 1;
      if (pedroIdx >= 0 && martinIdx !== expectedPos) {
        const [martin] = cols.splice(martinIdx, 1);
        const newIdx = cols.findIndex(c => c.id === 4);
        cols.splice(newIdx + 1, 0, martin);
        guardar('colaboradores', cols);
      }
    }
  }

  const estadoGuardado = cargar('estado_financiero', null);
  if (estadoGuardado) {
    const ALLOWED = ['ingresos','egresos','ganancia','unidadesVendidas','unidadesProducidas','periodo','semana'];
    for (const k of ALLOWED) {
      if (k in estadoGuardado) TAOS.state[k] = estadoGuardado[k];
    }
  }

  const proyeccionesGuardadas = cargar('proyecciones', null);
  if (proyeccionesGuardadas) TAOS.state.proyecciones = proyeccionesGuardadas;

  const regConfigGuardada = cargar('reg_config', null);
  if (regConfigGuardada) {
    TAOS.state.precioVentaUnitReg = regConfigGuardada.precioVentaUnitReg || 0;
    TAOS.state.costoFabUnitReg    = regConfigGuardada.costoFabUnitReg    || 0;
  }

  cargarCalcInputs();
  sincronizarDesdeRegistro();

  /* Load operator name into profile button and lock after first set */
  const nameBtn = document.getElementById('profile_btn_name');
  if (nameBtn) nameBtn.textContent = getNombreOperador();
  if (localStorage.getItem('taos_operador') && localStorage.getItem('taos_operador_lock') === null) {
    localStorage.setItem('taos_operador_lock', '1');
  }
  /* Ensure current operator is in the team list, preserve password */
  const list = JSON.parse(localStorage.getItem('taos_operadores_list') || '[]');
  const existing = list.find(o => o.name === getNombreOperador());
  addOperadorToList(getNombreOperador(), existing ? existing.pass : '');

  initTabs();
  initCalcTabs();
  initCFTabs();
  renderNomina();
  renderInventario();
  renderInventarioGeneral();
  renderRegistroDiario();
  inicializarPresencia();
  actualizarResumenEjecutivo();

  // Inicializar calendario
  if (typeof renderCalendarioRegistro === 'function') {
    renderCalendarioRegistro();
  }

  setTimeout(() => {
    syncAllCalculators();
    calcProyecciones();
    if (typeof actualizarSemanasProy   === 'function') actualizarSemanasProy();
    if (typeof actualizarSemanasActual === 'function') actualizarSemanasActual();
    if (typeof actualizarSemanasReg    === 'function') actualizarSemanasReg();
    /* Initialize filter to current month/week — triggers onChangeFiltroMes */
    const filtroMesEl = document.getElementById('reg_filtro_mes');
    if (filtroMesEl) {
      const hoy = new Date();
      filtroMesEl.value = hoy.getMonth() + 1;
      if (typeof onChangeFiltroMes === 'function') onChangeFiltroMes();
      /* Set correct week */
      const filtroSemEl = document.getElementById('reg_filtro_semana');
      if (filtroSemEl) {
        const sy = new Date(hoy.getFullYear(), 0, 1);
        const diasDesde = Math.floor((hoy - sy) / 86400000);
        const week = Math.ceil((diasDesde + sy.getDay() + 1) / 7);
        const opt = filtroSemEl.querySelector(`option[value="${week}"]`);
        if (opt) filtroSemEl.value = week;
      }
    }
}, 300);

attachCalcListeners();
  attachProyListeners();
  attachModalListeners();
  attachEquilibrioListeners();
  attachRegistroListeners();

  /* Mostrar nombre operador en splash */
  const splashNombre = document.getElementById('splash_operador_nombre');
  if (splashNombre) splashNombre.textContent = getNombreOperador();

  /* Actualizar badge del buzón */
  actualizarBuzonBadge();

  /* Guardar datos automáticamente al cerrar o recargar la página */
  window.addEventListener('beforeunload', () => {
    const s = TAOS.state;
    guardar('colaboradores',  s.colaboradores  || []);
    guardar('inventario',     s.inventario     || []);
    guardar('registroDiario', s.registroDiario || []);
    guardar('presencia',      s.presencia      || {});
    guardar('estado_financiero', {
      ingresos: s.ingresos  || 0,
      egresos:  s.egresos   || 0,
      ganancia: s.ganancia  || 0,
      unidadesVendidas:   s.unidadesVendidas   || 0,
      unidadesProducidas: s.unidadesProducidas || 0,
      periodo: s.periodo,
      semana:  s.semana,
    });
    guardar('proyecciones', s.proyecciones || []);
    guardar('reg_config', {
      precioVentaUnitReg: s.precioVentaUnitReg || 0,
      costoFabUnitReg:    s.costoFabUnitReg    || 0,
    });
    guardarCalcInputs();
  });

  /* Cerrar paneles al hacer clic fuera */
  document.addEventListener('click', (e) => {
    const paneles = ['panel_actualizar','panel_guardar','panel_reset','panel_buzon'];
    for (const pid of paneles) {
      const p = document.getElementById(pid);
      if (p && p.style.display === 'flex' && !e.target.closest('#' + pid) && !e.target.closest('.nav-action-btn')) {
        p.style.display = 'none';
        break;
      }
    }
  });
});

/* ════════════════════════════════════════════════════════════
   NAVEGACIÓN — TABS
   ════════════════════════════════════════════════════════════ */
function initTabs() {
  document.querySelectorAll('.main-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll('.main-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === 'tab_' + tab)
  );
  TAOS.currentTab = tab;
  if (tab === 'proyecciones') calcProyecciones();
  if (tab === 'calculadoras') syncAllCalculators();
  if (tab === 'resumen')      actualizarResumenEjecutivo();
  if (tab === 'registro') {
    renderRegistroDiario();
    if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  }
}

function initCalcTabs() {
  document.querySelectorAll('.calc-tab').forEach(btn => {
    btn.addEventListener('click', () => switchCalcTab(btn.dataset.calc));
  });
}

function switchCalcTab(calc) {
  document.querySelectorAll('.calc-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.calc === calc)
  );
  document.querySelectorAll('.calc-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'calc_' + calc)
  );
  TAOS.currentCalcTab = calc;
}

function initCFTabs() {
  document.querySelectorAll('.cf-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.tab-content') || document.body;
      switchCFTab(btn.dataset.cf, container);
    });
  });
}

function switchCFTab(cf, container) {
  const scope = container || document.body;
  scope.querySelectorAll('.cf-tab').forEach(b =>
    b.classList.toggle('active', b.dataset.cf === cf)
  );
  scope.querySelectorAll('.cf-panel').forEach(p =>
    p.classList.toggle('active', p.id === 'cf_' + cf)
  );
  TAOS.currentCFTab = cf;
  if (cf === 'inv_general') renderInventarioGeneral();
  if (cf === 'inventario')  renderInventario(getActiveChip('inv'), document.getElementById('inv_buscar')?.value || '');
}

/* ════════════════════════════════════════════════════════════
   RESUMEN EJECUTIVO
   ════════════════════════════════════════════════════════════ */
function actualizarResumenEjecutivo() {
  const s      = TAOS.state;
  const colabs = s.colaboradores || [];

  const totalColabs = colabs.length;
  const presentes = Object.keys(s.presencia || {}).filter(k => s.presencia[k]).length;

  setText('re_personal',  presentes + ' / ' + totalColabs);
  setText('re_u_prod',    (s.unidadesProducidas || 0).toLocaleString('es-EC'));
  setText('re_u_vend',    (s.unidadesVendidas   || 0).toLocaleString('es-EC'));
  setText('re_ingresos',  fmt$(s.ingresos  || 0));
  setText('re_egresos',   fmt$(s.egresos   || 0));
  setText('re_ganancia',  fmt$(s.ganancia  || 0));

  const badge = document.querySelector('.stat-card:first-child .stat-badge');
  if (badge) badge.textContent = '↗ ' + presentes + ' activo' + (presentes !== 1 ? 's' : '');
  const personalValEl = document.getElementById('re_personal');
  if (personalValEl) personalValEl.style.color = presentes >= Math.ceil(totalColabs * 0.7) ? 'var(--green-text)' : 'var(--orange-text)';

  const ganEl = document.getElementById('re_ganancia');
  if (ganEl) ganEl.style.color = (s.ganancia || 0) >= 0 ? 'var(--green-text)' : 'var(--red)';

  const peU        = s.puntoEquilUnidades != null ? s.puntoEquilUnidades : 200;
  const peD        = s.puntoEquilDinero   != null ? s.puntoEquilDinero   : 1700;
  const uvs        = s.unidadesVendidas   || 0;
  const totalIng   = s.ingresos           || 0;
  const META_DIARIA = 200;
  const restantes  = Math.max(0, META_DIARIA - uvs);
  const pct        = Math.min(100, (uvs / META_DIARIA) * 100);

  const sinDatos = !colabs.length && !(s.registroDiario || []).length && uvs === 0;
  if (sinDatos) {
    setText('eq_circle_num', '—');
    setText('eq_pct', 'Establecer un nuevo P.E');
    setText('eq_pe_unidades', '—');
    setText('eq_pe_dinero', '—');
  } else {
    if (uvs < META_DIARIA) {
      setText('eq_circle_num', uvs.toLocaleString('es-EC') + ' / ' + META_DIARIA);
    } else {
      const eqFecha = document.getElementById('eq_fecha')?.value;
      const today   = new Date().toISOString().split('T')[0];
      const msg     = eqFecha && eqFecha < today ? '🎯' : '💪';
      setText('eq_circle_num', msg);
    }
    setText('eq_pe_unidades', uvs.toLocaleString('es-EC') + ' / ' + peU.toLocaleString('es-EC'));
    setText('eq_pe_dinero',   fmt$(totalIng) + ' / ' + fmt$(peD));
    setText('eq_pct',         pct.toFixed(0) + '%');
  }

  const uVendEl = document.getElementById('actual_u_vendidas');
  if (uVendEl) uVendEl.value = uvs;
  const uprodEl = document.getElementById('eq_uprod');
  if (uprodEl) uprodEl.value = s.unidadesProducidas || 0;
  const ingEl = document.getElementById('eq_ingresos');
  if (ingEl) ingEl.value = (s.ingresos || 0).toFixed(2);
  const egEl = document.getElementById('eq_egresos');
  if (egEl) egEl.value = (s.egresos || 0).toFixed(2);

  const circle = document.getElementById('eq_circle_fill');
  if (circle) {
    const circ = 2 * Math.PI * 48;
    circle.style.strokeDasharray  = circ;
    circle.style.strokeDashoffset = circ * (1 - pct / 100);
    circle.style.stroke = pct >= 100 ? 'var(--green-text)' : 'var(--brand)';
  }

  setText('cons_g_personal', colabs.length.toString());
  setText('cons_g_uprod',    (s.unidadesProducidas || 0).toLocaleString('es-EC'));
  setText('cons_g_uvend',    (s.unidadesVendidas   || 0).toLocaleString('es-EC'));
  setText('cons_g_ing',      fmt$(s.ingresos || 0));
  setText('cons_g_eg',       fmt$(s.egresos  || 0));
  setText('cons_g_gan',      fmt$(s.ganancia || 0));

  const em = 1.08;
  setText('cons_e_personal', Math.ceil(colabs.length * 1.1).toString());
  setText('cons_e_uprod',    Math.round((s.unidadesProducidas||0) * em).toLocaleString('es-EC'));
  setText('cons_e_uvend',    Math.round((s.unidadesVendidas  ||0) * em).toLocaleString('es-EC'));
  setText('cons_e_ing',      fmt$((s.ingresos||0) * em));
  setText('cons_e_eg',       fmt$((s.egresos ||0) * (em * 0.95)));
  setText('cons_e_gan',      fmt$(((s.ingresos||0)*em) - ((s.egresos||0)*(em*0.95))));

  const fm = 1.35;
  setText('cons_f_personal', Math.ceil(colabs.length * 1.25).toString());
  setText('cons_f_uprod',    Math.round((s.unidadesProducidas||0) * fm).toLocaleString('es-EC'));
  setText('cons_f_uvend',    Math.round((s.unidadesVendidas  ||0) * fm).toLocaleString('es-EC'));
  setText('cons_f_ing',      fmt$((s.ingresos||0) * fm));
  setText('cons_f_eg',       fmt$((s.egresos ||0) * (fm * 0.90)));
  setText('cons_f_gan',      fmt$(((s.ingresos||0)*fm) - ((s.egresos||0)*(fm*0.90))));

  /* Mapa de Flujo: hide/show based on data */
  const mapaBody = document.getElementById('mapa_flujo_body');
  if (mapaBody) {
    if (!mapaBody.dataset.original) mapaBody.dataset.original = mapaBody.innerHTML;
    const estaVacio = !mapaBody.querySelector('.personal-check');
    if (!colabs.length) {
      /* Solo reemplazar si no es ya el empty-state */
      if (!mapaBody.querySelector('.empty-state')) {
        mapaBody.innerHTML = '<div class="empty-state" style="text-align:center;padding:30px 20px">' +
          '<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:8px;opacity:.4">' +
          '<circle cx="9" cy="7" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/>' +
          '<line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/></svg>' +
          '<p style="font-size:15px;font-weight:600;margin-bottom:4px">No hay colaboradores</p>' +
          '<p style="font-size:12px;color:var(--text3)">Ve a <strong>Control Financiero → Nómina</strong> y agrega el primer colaborador para comenzar</p>' +
          '<button class="btn-primary" style="margin-top:10px;padding:8px 20px;font-size:13px" onclick="abrirModalColaborador()">+ Agregar Colaborador</button>' +
          '</div>';
      }
    } else if (estaVacio) {
      /* Solo restaurar el mapa original si estaba vacío (venía del empty-state) */
      mapaBody.innerHTML = mapaBody.dataset.original;
      /* Re-aplicar estado de presencia después de restaurar el DOM */
      inicializarPresencia();
    }
    /* Si ya tiene .personal-check NO tocar el DOM — los checkboxes conservan su estado */
  }

  sincronizarFechaResultadoGlobal();
}

function sincronizarFechaResultadoGlobal() {
  const eqFecha  = document.getElementById('eq_fecha');
  const regFecha = document.getElementById('reg_fecha');
  const resFecha = document.getElementById('res_fecha');
  if (!resFecha) return;
  const best = eqFecha?.value || regFecha?.value || new Date().toISOString().split('T')[0];
  resFecha.value = best;
}

/* ════════════════════════════════════════════════════════════
   PROCESO PRODUCTIVO
   ════════════════════════════════════════════════════════════ */
function activarPaso(step) {
  document.querySelectorAll('.proceso-step').forEach(s => s.classList.remove('active'));
  const el = document.querySelector(`.proceso-step[data-step="${step}"]`);
  if (el) el.classList.add('active');
}

/* ════════════════════════════════════════════════════════════
   LISTENER — EQUILIBRIO
   ════════════════════════════════════════════════════════════ */
function attachEquilibrioListeners() {
  // btn_guardar_progreso already has onclick in HTML

  /* Bidirectional sync: equilibrio → registro diario */
  const syncEqToReg = (srcId, dstId, doCalc) => {
    const src = document.getElementById(srcId);
    if (!src) return;
    src.addEventListener('input', () => {
      if (_syncingRegistro) return;
      _syncingRegistro = true;
      const dst = document.getElementById(dstId);
      if (dst) dst.value = src.value;
      _syncingRegistro = false;
      if (doCalc && typeof autoCalcularRegistro === 'function') autoCalcularRegistro();
    });
  };
  syncEqToReg('actual_u_vendidas', 'reg_uvend_form', true);
  syncEqToReg('eq_uprod',          'reg_uprod_form', true);
  syncEqToReg('eq_ingresos',       'reg_ingresos_form', false);
  syncEqToReg('eq_egresos',        'reg_egresos_form', false);

  /* Re-run resumen when equilibrio date changes */
  const eqFechaEl = document.getElementById('eq_fecha');
  if (eqFechaEl) {
    eqFechaEl.addEventListener('change', () => {
      actualizarResumenEjecutivo();
    });
  }
}

/* ════════════════════════════════════════════════════════════
   NÓMINA — Render y CRUD
   ════════════════════════════════════════════════════════════ */
function renderNomina(filtro, busqueda) {
  filtro   = filtro   || 'todas';
  busqueda = (busqueda || '').toLowerCase();

  let colabs = [...(TAOS.state.colaboradores || [])];
  if (filtro !== 'todas') colabs = colabs.filter(c => c.area === filtro);
  if (busqueda) colabs = colabs.filter(c =>
    c.nombre.toLowerCase().includes(busqueda) ||
    c.division.toLowerCase().includes(busqueda)
  );

  const all    = TAOS.state.colaboradores || [];
  const totalH = all.reduce((s, c) => s + (c.horas || 0), 0);
  const totalT = all.reduce((s, c) => s + (c.total || 0), 0);
  const promH  = all.length > 0
    ? all.reduce((s, c) => s + (c.salarioHora || 0), 0) / all.length
    : 0;

  setText('nom_total_colab', all.length.toString());
  setText('nom_total_horas', totalH.toLocaleString('es-EC') + 'h');
  setText('nom_prom_hora',   fmt$(promH));
  setText('nom_total',       fmt$(totalT));

  const tbody = document.getElementById('nom_tbody');
  if (!tbody) return;

  if (!colabs.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">
      <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:8px;opacity:.4">
        <circle cx="9" cy="7" r="3"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/>
        <line x1="18" y1="8" x2="18" y2="14"/><line x1="15" y1="11" x2="21" y2="11"/>
      </svg>
      <p style="font-size:15px;font-weight:600;margin-bottom:4px">No hay colaboradores</p>
      <p style="font-size:12px;color:var(--text3)">Ve a <strong>Control Financiero → Nómina</strong> y agrega el primer colaborador para comenzar</p>
      <button class="btn-primary" style="margin-top:10px;padding:8px 20px;font-size:13px" onclick="abrirModalColaborador()">+ Agregar Colaborador</button>
    </td></tr>`;
    setText('nom_footer_total', fmt$(totalT));
    return;
  }

  const areaLabel = { comercial:'Comercial', administracion:'Administración', operaciones:'Operaciones' };
  const areaColor = { comercial:'blue',      administracion:'orange',         operaciones:'green' };

  tbody.innerHTML = colabs.map(c => `
    <tr>
      <td><strong>${escHtml(c.nombre)}</strong></td>
      <td><span class="area-badge ${areaColor[c.area] || ''}">${areaLabel[c.area] || c.area}</span></td>
      <td>${escHtml(c.division)}</td>
      <td class="td-mono">${c.horas}h</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(c.recursos)}</td>
      <td><span class="estacion-badge">${escHtml(c.estacion)}</span></td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(c.productos)}</td>
      <td class="td-mono">${fmt$(c.salarioHora)}</td>
      <td class="td-money">${fmt$(c.total)}</td>
      <td class="action-cell">
        <button class="mod-btn" onclick="abrirModalEditarColaborador(${c.id})" title="Editar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="del-btn" onclick="eliminarColaborador(${c.id})" title="Eliminar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  setText('nom_footer_total', fmt$(totalT));
  guardar('colaboradores', TAOS.state.colaboradores);
}

function eliminarColaborador(id) {
  if (!confirm('¿Eliminar este colaborador?')) return;
  TAOS.state.colaboradores = TAOS.state.colaboradores.filter(c => c.id !== id);
  renderNomina();
  syncAllCalculators();
  actualizarResumenEjecutivo();
  toast('Colaborador eliminado', 'warn');
}

function abrirModalColaborador() {
  TAOS.editingColabId = null;
  document.getElementById('modal_colab_title').textContent = 'Agregar Colaborador';
  document.getElementById('modal_colab_btn').textContent   = 'Agregar Colaborador';
  document.getElementById('form_colab').reset();
  document.getElementById('recursos_auto').innerHTML = '';
  document.getElementById('modal_colab').classList.add('open');
}

function abrirModalEditarColaborador(id) {
  const c = TAOS.state.colaboradores.find(x => x.id === id);
  if (!c) return;
  TAOS.editingColabId = id;
  document.getElementById('modal_colab_title').textContent = 'Modificar Colaborador';
  document.getElementById('modal_colab_btn').textContent   = 'Guardar Cambios';

  document.getElementById('colab_nombre').value   = c.nombre;
  document.getElementById('colab_horas').value    = c.horas;
  document.getElementById('colab_salario').value  = c.salarioHora;
  document.getElementById('colab_estacion').value = c.estacion;
  document.getElementById('colab_recursos').value = c.recursos;

  const areaEl = document.getElementById('colab_area');
  areaEl.value = c.area;
  onAreaChange();
  document.getElementById('colab_division').value = c.division;
  previewRecursos();
  document.getElementById('recursos_auto').innerHTML = `
    <strong>Recursos actuales:</strong>
    <div style="margin-top:6px">🔧 Recursos: <em>${escHtml(c.recursos)}</em></div>
    <div>📦 Productos: <em>${escHtml(c.productos)}</em></div>`;

  document.getElementById('modal_colab').classList.add('open');
}

function cerrarModalColaborador() {
  document.getElementById('modal_colab').classList.remove('open');
  document.getElementById('form_colab').reset();
  document.getElementById('recursos_auto').innerHTML = '';
  TAOS.editingColabId = null;
}

function onAreaChange() {
  const area = document.getElementById('colab_area').value;
  const sel  = document.getElementById('colab_division');
  const opts = {
    comercial:      ['Mostrador','Facturación y Entrega'],
    administracion: ['Gerencia','Control','Marketing'],
    operaciones:    ['Proceso de Preparacion','Proceso Primario','Proceso Secundario','Empaquetado y Etiquetado','Almacernamiento','Asistente'],
  };
  sel.innerHTML = '<option value="">Seleccionar división...</option>' +
    (opts[area] || []).map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('colab_recursos').value = '';
  document.getElementById('recursos_auto').innerHTML = '';
  const prefixes = { comercial:'EC', administracion:'EA', operaciones:'EO' };
  const prefix   = prefixes[area] || 'EX';
  const count    = (TAOS.state.colaboradores || []).filter(c => c.area === area).length + 1;
  document.getElementById('colab_estacion').value = `${prefix}-${String(count).padStart(2,'0')}`;
}

function previewRecursos() {
  const div = document.getElementById('colab_division').value;
  const r   = RECURSOS_DIVISION[div] || { recursos:'—', productos:'—' };
  document.getElementById('colab_recursos').value = r.recursos;
  document.getElementById('recursos_auto').innerHTML = `
    <strong>Asignación automática:</strong>
    <div style="margin-top:6px">🔧 Recursos: <em>${escHtml(r.recursos)}</em></div>
    <div>📦 Productos: <em>${escHtml(r.productos)}</em></div>`;
}

function guardarColaborador() {
  const nombre   = document.getElementById('colab_nombre').value.trim();
  const area     = document.getElementById('colab_area').value;
  const division = document.getElementById('colab_division').value;
  const horas    = parseFloat(document.getElementById('colab_horas').value)   || 0;
  const salario  = parseFloat(document.getElementById('colab_salario').value) || 0;
  const estacion = document.getElementById('colab_estacion').value.trim();
  const recursos = document.getElementById('colab_recursos').value.trim();

  if (!nombre || !area || !division || horas <= 0 || salario <= 0) {
    toast('Completa todos los campos correctamente', 'error');
    return;
  }

  const r     = RECURSOS_DIVISION[division] || { productos:'General' };
  const total = horas * salario;

  if (TAOS.editingColabId !== null) {
    const idx = TAOS.state.colaboradores.findIndex(c => c.id === TAOS.editingColabId);
    if (idx !== -1) {
      TAOS.state.colaboradores[idx] = {
        ...TAOS.state.colaboradores[idx],
        nombre, area, division, horas, salarioHora: salario,
        estacion, recursos: recursos || r.recursos,
        productos: r.productos, total,
      };
    }
    toast('Colaborador actualizado ✓');
  } else {
    const maxId = TAOS.state.colaboradores.reduce((m, c) => Math.max(m, c.id || 0), 0);
    TAOS.state.colaboradores.push({
      id: maxId + 1, nombre, area, division, horas, salarioHora: salario,
      estacion, recursos: recursos || r.recursos,
      productos: r.productos, total,
    });
    toast('Colaborador agregado ✓');
  }

  cerrarModalColaborador();
  renderNomina();
  syncAllCalculators();
  actualizarResumenEjecutivo();
}

/* ════════════════════════════════════════════════════════════
   INVENTARIO — Render y CRUD
   ════════════════════════════════════════════════════════════ */
function renderInventario(filtro, busqueda) {
  filtro   = filtro   || 'todas';
  busqueda = (busqueda || '').toLowerCase();

  const inv    = TAOS.state.inventario || [];
  const colabs = TAOS.state.colaboradores || [];

  const sumCat = cat => inv.filter(i => i.categoria === cat).reduce((s,i) => s + (i.total||0), 0);
  setText('inv_sum_inf',  fmt$(sumCat('infraestructura')));
  setText('inv_sum_mob',  fmt$(sumCat('mobiliario')));
  setText('inv_sum_maq',  fmt$(sumCat('maquinaria')));
  setText('inv_sum_her',  fmt$(sumCat('herramientas')));
  setText('inv_sum_epp',  fmt$(sumCat('epp')));
  setText('inv_sum_con',  fmt$(sumCat('consumibles')));

  const totalGen = inv.reduce((s,i) => s + (i.total||0), 0);
  setText('inv_total', fmt$(totalGen));

  const tbody = document.getElementById('inv_tbody');
  if (!tbody) return;

  let visibleColabs = colabs.filter(c => {
    const areaMatch   = filtro === 'todas' || c.area === filtro;
    const searchMatch = !busqueda ||
      c.nombre.toLowerCase().includes(busqueda) ||
      c.estacion.toLowerCase().includes(busqueda) ||
      c.division.toLowerCase().includes(busqueda);
    return areaMatch && searchMatch;
  });

  if (!visibleColabs.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">
      <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:6px;opacity:.3">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <p>No se encontraron colaboradores</p></td></tr>`;
    return;
  }

  const areaLabel = { comercial:'Comercial', administracion:'Administración', operaciones:'Operaciones' };
  const areaColor = { comercial:'blue', administracion:'orange', operaciones:'green' };

  function getColabCatItems(colab, categoria) {
    const areaItems = inv.filter(i => i.area === colab.area && i.categoria === categoria);
    const recursos = (colab.recursos || '').toLowerCase();
    const matched = areaItems.filter(i => recursos.includes(i.nombre.toLowerCase()));
    if (matched.length) return matched;
    return areaItems;
  }

  function buildCellContent(items) {
    if (!items.length) return '<span style="color:var(--text3);font-size:11px">—</span>';
    return items.map(i =>
      `<div style="font-size:11px;line-height:1.4">
        <span class="id-badge" style="font-size:10px">${escHtml(i.id)}</span>
        <span style="color:var(--text2);margin-left:4px">${escHtml(i.nombre)}</span>
        <span class="td-money" style="color:var(--green-text);font-size:11px;margin-left:4px">${fmt$(i.total)}</span>
      </div>`
    ).join('');
  }

  function colabTotalInv(colab) {
    const allAreaItems = inv.filter(i => i.area === colab.area);
    const recursos = (colab.recursos || '').toLowerCase();
    const matched = allAreaItems.filter(i => recursos.includes(i.nombre.toLowerCase()));
    if (matched.length) return matched.reduce((s,i) => s + (i.total||0), 0);
    return 0;
  }

  tbody.innerHTML = visibleColabs.map((colab) => {
    const instalItems = getColabCatItems(colab, 'infraestructura');
    const maqItems    = getColabCatItems(colab, 'maquinaria');
    const eppItems    = getColabCatItems(colab, 'epp');
    const herItems    = getColabCatItems(colab, 'herramientas');
    const conItems    = getColabCatItems(colab, 'consumibles');
    const total       = colabTotalInv(colab);

    return `
    <tr>
      <td>
        <strong style="font-size:13px">${escHtml(colab.nombre)}</strong>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">${escHtml(colab.division)}</div>
      </td>
      <td><span class="estacion-badge">${escHtml(colab.estacion)}</span></td>
      <td><span class="area-badge ${areaColor[colab.area] || ''}">${areaLabel[colab.area] || colab.area}</span></td>
      <td>${buildCellContent(instalItems)}</td>
      <td>${buildCellContent(maqItems)}</td>
      <td>${buildCellContent(eppItems)}</td>
      <td>${buildCellContent(herItems)}</td>
      <td>${buildCellContent(conItems)}</td>
      <td style="font-size:12px;color:var(--text2)">${escHtml(colab.productos)}</td>
      <td class="td-money green">${total > 0 ? fmt$(total) : '—'}</td>
      <td class="action-cell">
        <button class="mod-btn" onclick="abrirModalEditarColaborador(${colab.id})" title="Editar colaborador">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="del-btn" onclick="eliminarColaborador(${colab.id})" title="Eliminar colaborador">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </td>
    </tr>`;
  }).join('');

  guardar('inventario', inv);
}

function eliminarInventario(idx) {
  if (!confirm('¿Eliminar este ítem del inventario?')) return;
  TAOS.state.inventario.splice(idx, 1);
  renderInventario();
  renderInventarioGeneral();
  syncAllCalculators();
  toast('Ítem eliminado', 'warn');
}

function abrirModalInventario() {
  TAOS.editingInvIdx = null;
  document.getElementById('modal_inv_title').textContent = 'Agregar Ítem al Inventario';
  document.getElementById('modal_inv_btn').textContent   = 'Agregar al Inventario';
  document.getElementById('form_inv').reset();
  document.getElementById('inv_iva').value = 15;
  calcSubtotalInv();
  document.getElementById('modal_inv').classList.add('open');
}

function abrirModalEditarInventario(idx) {
  const item = TAOS.state.inventario[idx];
  if (!item) return;
  TAOS.editingInvIdx = idx;
  document.getElementById('modal_inv_title').textContent = 'Modificar Ítem del Inventario';
  document.getElementById('modal_inv_btn').textContent   = 'Guardar Cambios';

  document.getElementById('inv_id').value     = item.id;
  document.getElementById('inv_nombre').value = item.nombre;
  document.getElementById('inv_cat').value    = item.categoria;
  document.getElementById('inv_area').value   = item.area;
  document.getElementById('inv_cant').value   = item.cant;
  document.getElementById('inv_precio').value = item.precio;
  const ivaPct = item.subtotal > 0 ? Math.round((item.iva / item.subtotal) * 100) : 15;
  document.getElementById('inv_iva').value    = ivaPct;
  calcSubtotalInv();
  document.getElementById('modal_inv').classList.add('open');
}

function cerrarModalInventario() {
  document.getElementById('modal_inv').classList.remove('open');
  document.getElementById('form_inv').reset();
  TAOS.editingInvIdx = null;
  calcSubtotalInv();
}

function calcSubtotalInv() {
  const cant   = parseFloat(document.getElementById('inv_cant')?.value)   || 0;
  const precio = parseFloat(document.getElementById('inv_precio')?.value) || 0;
  const ivaPct = parseFloat(document.getElementById('inv_iva')?.value)    || 15;
  const sub    = cant * precio;
  const iva    = sub * (ivaPct / 100);
  const tot    = sub + iva;
  const el = document.getElementById('inv_preview_total');
  if (el) el.textContent = 'Total estimado: ' + fmt$(tot);
}

function guardarInventario() {
  const nombre = document.getElementById('inv_nombre').value.trim();
  const cat    = document.getElementById('inv_cat').value;
  const area   = document.getElementById('inv_area').value;
  const cant   = parseFloat(document.getElementById('inv_cant').value)   || 0;
  const precio = parseFloat(document.getElementById('inv_precio').value) || 0;
  const ivaPct = parseFloat(document.getElementById('inv_iva').value)    || 15;
  const idMan  = document.getElementById('inv_id').value.trim();

  if (!nombre || !cat || !area || cant <= 0 || precio <= 0) {
    toast('Completa todos los campos correctamente', 'error');
    return;
  }

  const subtotal = cant * precio;
  const iva      = subtotal * (ivaPct / 100);
  const total    = subtotal + iva;
  const newId    = idMan || generarCodigoInv(cat, area);

  if (TAOS.editingInvIdx !== null) {
    TAOS.state.inventario[TAOS.editingInvIdx] = { id:newId, nombre, categoria:cat, area, cant, precio, subtotal, iva, total };
    toast('Ítem actualizado ✓');
  } else {
    TAOS.state.inventario.push({ id:newId, nombre, categoria:cat, area, cant, precio, subtotal, iva, total });
    toast('Ítem agregado al inventario ✓');
  }

  cerrarModalInventario();
  renderInventario();
  renderInventarioGeneral();
  syncAllCalculators();
}

function generarCodigoInv(cat, area) {
  const catMap  = { infraestructura:'I', mobiliario:'M', maquinaria:'Q', herramientas:'H', epp:'E', consumibles:'C' };
  const areaMap = { comercial:'C', administracion:'A', operaciones:'O' };
  const catL  = catMap[cat]  || 'X';
  const areaL = areaMap[area]|| 'X';
  const count = (TAOS.state.inventario || [])
    .filter(i => i.categoria === cat && i.area === area).length + 1;
  return `${catL}${areaL}.${areaMap[area] === 'C' ? '1' : areaMap[area] === 'A' ? '2' : '3'}.${count}`;
}

/* ════════════════════════════════════════════════════════════
   INVENTARIO GENERAL
   ════════════════════════════════════════════════════════════ */
function renderInventarioGeneral() {
  const inv    = TAOS.state.inventario || [];
  const areas  = ['comercial','administracion','operaciones'];
  const cats   = ['infraestructura','mobiliario','maquinaria','herramientas','epp','consumibles'];
  const areaLabel = { comercial:'Comercial', administracion:'Administración', operaciones:'Operaciones' };

  const container = document.getElementById('inv_general_content');
  if (!container) return;

  const busq    = (document.getElementById('inv_gen_buscar')?.value || '').toLowerCase();
  const filtCat = getActiveInvgenFilter();

  let html = '';
  let grandTotal = 0;

  cats.forEach(cat => {
    // Si hay filtro de categoría activo y no coincide, saltar
    if (filtCat !== 'todas' && cat !== filtCat) return;

    const itemsCat = inv.filter(i =>
      i.categoria === cat &&
      (!busq || i.nombre.toLowerCase().includes(busq) || i.id.toLowerCase().includes(busq))
    );
    if (!itemsCat.length) return;

    const catTotal = itemsCat.reduce((s,i) => s + (i.total||0), 0);
    grandTotal += catTotal;

    const catLabel = {
      infraestructura:'Instalaciones / Infraestructura',
      mobiliario:'Estación de Trabajo (Mobiliario)',
      maquinaria:'Estación de Procesos (Maquinaria)',
      herramientas:'Kit de Herramientas',
      epp:'E.P.P.',
      consumibles:'Kit de Consumibles'
    }[cat] || capFirst(cat);

    html += `
      <div class="invgen-section">
        <div class="invgen-cat-header">
          <span class="cat-badge ${cat}">${catLabel}</span>
          <span class="invgen-cat-total">${fmt$(catTotal)}</span>
        </div>`;

    areas.forEach(area => {
      const itemsArea = itemsCat.filter(i => i.area === area);
      if (!itemsArea.length) return;
      const areaTotal = itemsArea.reduce((s,i) => s + (i.total||0), 0);

      html += `
        <div class="invgen-area-group">
          <div class="invgen-area-label">
            <span class="area-dot ${area === 'comercial' ? 'blue' : area === 'administracion' ? 'orange' : 'green'}"></span>
            ${areaLabel[area]}
            <span class="invgen-area-sub">${itemsArea.length} ítem${itemsArea.length>1?'s':''} · ${fmt$(areaTotal)}</span>
          </div>
          <table class="invgen-table">
            <thead>
              <tr><th>CÓD.</th><th>NOMBRE</th><th>CANT.</th><th>P. UNIT.</th><th>SUBTOTAL</th><th>IVA</th><th>TOTAL</th><th>ACCIONES</th></tr>
            </thead>
            <tbody>
              ${itemsArea.map(i => {
                const realIdx = inv.indexOf(i);
                return `
                <tr>
                  <td><span class="id-badge">${escHtml(i.id)}</span></td>
                  <td>${escHtml(i.nombre)}</td>
                  <td class="td-mono">${Number(i.cant).toLocaleString('es-EC')}</td>
                  <td class="td-money">${fmt$(i.precio)}</td>
                  <td class="td-money">${fmt$(i.subtotal)}</td>
                  <td class="td-money" style="color:var(--text3)">${fmt$(i.iva)}</td>
                  <td class="td-money green">${fmt$(i.total)}</td>
                  <td class="action-cell">
                    <button class="mod-btn" onclick="abrirModalEditarInventario(${realIdx})" title="Modificar">
                      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="del-btn" onclick="eliminarInventario(${realIdx})" title="Eliminar">
                      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                      </svg>
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    });

    html += `</div>`;
  });

  if (!html) {
    html = `<div class="empty-state" style="padding:60px 20px">
      <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:.3;margin-bottom:10px">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
      <p>No hay ítems en el inventario${busq ? ' para "'+escHtml(busq)+'"' : ''}</p>
    </div>`;
  }

  container.innerHTML = html;
  setText('inv_gen_grand_total', fmt$(grandTotal));
  setText('inv_gen_count', inv.length.toString());
}

function getActiveInvgenFilter() {
  const el = document.querySelector('[data-filter-invgen].active');
  return el ? el.getAttribute('data-filter-invgen') : 'todas';
}

/* ════════════════════════════════════════════════════════════
   LISTENERS
   ════════════════════════════════════════════════════════════ */
function attachCalcListeners() {
  const calcMap = {
    'cf_arriendo,cf_servicios,cf_nomina_val,cf_deprec,cf_consumibles': calcCostosFijos,
    'cv_costo_unit,cv_cantidad':                                        calcCostosVariables,
    'di_mp,di_mod,di_cif,di_gadm,di_gven':                            calcDirectosIndirectos,
    'mp_mezcla,mp_congelante,mp_merma':                                calcMateriaPrima,
    'mo_salario,mo_horas,mo_trabajadores':                             calcManoObra,
    'cr_psc,cr_margen,cr_iva':                                         calcCosteoReceta,
    'mg_ingresos,mg_egresos':                                          calcMargenGanancia,
    'pe_costos_fijos,pe_precio_venta,pe_costo_var_unit':               calcPuntoEquilibrio,
    'pr_margen_dist':                                                    calcProducto,
  };

  Object.entries(calcMap).forEach(([ids, fn]) => {
    ids.split(',').forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', fn);
    });
  });

  // Búsqueda nómina
  const busNom = document.getElementById('nom_buscar');
  if (busNom) busNom.addEventListener('input', () =>
    renderNomina(getActiveChip('nom'), busNom.value)
  );
  document.querySelectorAll('[data-filter-nom]').forEach(ch => {
    ch.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-nom]').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      renderNomina(ch.dataset.filterNom, document.getElementById('nom_buscar')?.value || '');
    });
  });

  // Búsqueda inventario de activos por estación
  const busInv = document.getElementById('inv_buscar');
  if (busInv) busInv.addEventListener('input', () =>
    renderInventario(getActiveChip('inv'), busInv.value)
  );
  document.querySelectorAll('[data-filter-inv]').forEach(ch => {
    ch.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-inv]').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      renderInventario(ch.getAttribute('data-filter-inv'), document.getElementById('inv_buscar')?.value || '');
    });
  });

  // Live subtotal modal inventario
  ['inv_cant','inv_precio','inv_iva'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', calcSubtotalInv);
  });

  // Búsqueda inventario general
  const busGen = document.getElementById('inv_gen_buscar');
  if (busGen) busGen.addEventListener('input', renderInventarioGeneral);

  // Filtros por categoría del inventario general — chips
  document.querySelectorAll('[data-filter-invgen]').forEach(ch => {
    ch.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-invgen]').forEach(x => x.classList.remove('active'));
      ch.classList.add('active');
      renderInventarioGeneral();
    });
  });

  /* Producto manual input listeners */
  const pCosto = document.getElementById('pr_costo_fab_input');
  if (pCosto) pCosto.addEventListener('input', onProductoCostoFabInput);
  const pPvd = document.getElementById('pr_pvd_input');
  if (pPvd) pPvd.addEventListener('input', onProductoPvdInput);
  const pMargen = document.getElementById('pr_margen_dist');
  if (pMargen) pMargen.addEventListener('input', calcProducto);
}

function attachProyListeners() {
  ['proy_tasa','proy_meses'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const labelId = id === 'proy_tasa' ? 'proy_tasa_val' : 'proy_meses_val';
      const suffix  = id === 'proy_tasa' ? '%' : '';
      setText(labelId, el.value + suffix);
      calcProyecciones();
    });
  });
  const mesBaseEl = document.getElementById('proy_mes_base');
  if (mesBaseEl) mesBaseEl.addEventListener('change', () => {
    actualizarSemanasProy();
    calcProyecciones();
  });
}

function attachModalListeners() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════ */
function getActiveChip(group) {
  const el = document.querySelector(`[data-filter-${group}].active`);
  if (!el) return 'todas';
  return el.getAttribute('data-filter-' + group) || 'todas';
}

/* (escHtml, capFirst defined in taos_utilitarios.js) */

/* ════════════════════════════════════════════════════════════
   ACTUALIZAR SISTEMA / RESET
   ════════════════════════════════════════════════════════════ */
function actualizarSistema() {
  sincronizarDesdeRegistro();
  syncAllCalculators();
  calcProyecciones();
  actualizarResumenEjecutivo();
  if (typeof actualizarKPIsActuales === 'function') actualizarKPIsActuales();
  renderNomina();
  renderInventario();
  renderInventarioGeneral();
  renderRegistroDiario();
  toast('Sistema actualizado ✓');
}

function resetearDatos() {
  if (!confirm('¿Resetear todos los datos a valores iniciales? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem('taos_colaboradores');
  localStorage.removeItem('taos_inventario');
  localStorage.removeItem('taos_registroDiario');
  localStorage.removeItem('taos_presencia');
  localStorage.removeItem('taos_estado_financiero');
  localStorage.removeItem('taos_proyecciones');
  location.reload();
}

/* ── HISTORIAL / SNAPSHOTS ────────────────────────────────── */
function obtenerSnapshotActual() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('taos_')) data[k] = localStorage.getItem(k);
  }
  return data;
}

function guardarSnapshot(tipo) {
  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora  = ahora.toTimeString().slice(0,5);
  const hist  = JSON.parse(localStorage.getItem('taos_historial') || '[]');
  hist.push({ fecha, hora, tipo, operador: getNombreOperador(), data: obtenerSnapshotActual() });
  localStorage.setItem('taos_historial', JSON.stringify(hist));
  return { fecha, hora };
}

function obtenerHistorial() {
  return JSON.parse(localStorage.getItem('taos_historial') || '[]');
}

/* ── PANEL ACTUALIZAR ─────────────────────────────────────── */
function togglePanelActualizar() {
  const p = document.getElementById('panel_actualizar');
  if (!p) return;
  if (p.style.display === 'flex') { p.style.display = 'none'; return; }
  cerrarTodosPaneles();

  try {
    const hist = obtenerHistorial();
    const container = document.getElementById('historial_opts');
    const labels = ['🕐 Último guardado','🕑 Penúltimo guardado','🕒 Antepenúltimo guardado'];
    let html = '';
    let encontrados = 0;
    for (let i = hist.length - 1; i >= 0 && encontrados < 3; i--) {
      if (hist[i].tipo === 'cierre') continue;
      const e = hist[i];
      const op = e.operador ? ' · ' + e.operador : '';
      html += `<button class="guardar-panel-btn" onclick="aplicarHistorial(${i})">${labels[encontrados]} (${e.fecha} ${e.hora}${op})</button>`;
      encontrados++;
    }
    if (container) container.innerHTML = html || '<div class="guardar-panel-hint" style="padding:8px;text-align:center;color:var(--text3);font-size:12px">Usa "Sincronizar ahora" para crear el primer punto de restauración</div>';
  } catch(e) { console.error('Error al cargar historial:', e); }
  p.style.display = 'flex';
}

function aplicarHistorial(idx) {
  const hist = obtenerHistorial();
  const entry = hist[idx];
  if (!entry) return;
  for (const k of Object.keys(entry.data)) {
    localStorage.setItem(k, entry.data[k]);
  }
  document.getElementById('panel_actualizar').style.display = 'none';
  toast('Restaurado: ' + entry.fecha + ' ' + entry.hora);
  location.reload();
}

function aplicarHistorialMulti(desde) {
  const hist = obtenerHistorial().filter(h => h.fecha >= desde);
  if (!hist.length) return;
  const merged = {};
  const ALLOWED_PREFIXES = ['taos_colaboradores','taos_inventario','taos_registroDiario','taos_presencia','taos_estado_financiero','taos_proyecciones','taos_reg_config','taos_calc_inputs'];
  for (const h of hist) {
    for (const k of Object.keys(h.data)) {
      if (ALLOWED_PREFIXES.some(p => k.startsWith(p))) merged[k] = h.data[k];
    }
  }
  for (const k of Object.keys(merged)) localStorage.setItem(k, merged[k]);
  document.getElementById('panel_actualizar').style.display = 'none';
  toast('Restaurados ' + hist.length + ' guardados desde ' + desde);
  location.reload();
}

/* ── PANEL GUARDAR ────────────────────────────────────────── */
function togglePanelGuardar() {
  const p = document.getElementById('panel_guardar');
  if (!p) return;
  if (p.style.display === 'flex') { p.style.display = 'none'; return; }
  cerrarTodosPaneles();
  p.style.display = 'flex';
}

function guardarCalcInputs() {
  const vals = {};
  CALC_INPUT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) vals[id] = el.value;
  });
  guardar('calc_inputs', vals);
}

function cargarCalcInputs() {
  const vals = cargar('calc_inputs', null);
  if (vals) {
    CALC_INPUT_IDS.forEach(id => {
      if (id in vals) {
        const el = document.getElementById(id);
        if (el) el.value = vals[id];
      }
    });
  }
}

function guardarSistemaLocal() {
  const s = TAOS.state;
  guardar('colaboradores',  s.colaboradores  || []);
  guardar('inventario',     s.inventario     || []);
  guardar('registroDiario', s.registroDiario || []);
  guardar('presencia',      s.presencia      || {});
  guardar('estado_financiero', {
    ingresos:           s.ingresos  || 0,
    egresos:            s.egresos   || 0,
    ganancia:           s.ganancia  || 0,
    unidadesVendidas:   s.unidadesVendidas   || 0,
    unidadesProducidas: s.unidadesProducidas || 0,
    periodo:            s.periodo,
    semana:             s.semana,
  });
  guardar('proyecciones', s.proyecciones || []);
  guardar('reg_config', {
    precioVentaUnitReg: s.precioVentaUnitReg || 0,
    costoFabUnitReg:    s.costoFabUnitReg    || 0,
  });
  guardarCalcInputs();
  guardarSnapshot('local');
  document.getElementById('panel_guardar').style.display = 'none';
  toast('Guardar Día ✓');
}

function guardarCierreCaja() {
  guardarSistemaLocal();
  const { fecha, hora } = guardarSnapshot('cierre');
  document.getElementById('panel_guardar').style.display = 'none';
  toast('🔒 Cierre de caja — ' + fecha + ' ' + hora + ' ✓');
}

function guardarRespaldo() {
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2,'0');
  const mm = String(ahora.getMonth()+1).padStart(2,'0');
  const nom = `taos_${dd}_${mm}.json`;

  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('taos_')) data[k] = localStorage.getItem(k);
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nom;
  a.click();
  URL.revokeObjectURL(a.href);

  document.getElementById('panel_guardar').style.display = 'none';
  toast('Respaldo guardado: ' + nom + ' ✓');
}

function restaurarRespaldo(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let count = 0;
      for (const k of Object.keys(data)) {
        if (k.startsWith('taos_')) {
          localStorage.setItem(k, data[k]);
          count++;
        }
      }
      input.value = '';
      document.getElementById('panel_guardar').style.display = 'none';
      toast(count + ' claves restauradas. Recargando…');
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      toast('Error al leer el respaldo: formato inválido', 'error');
    }
  };
  reader.readAsText(file);
}

/* ── PANEL RESET ──────────────────────────────────────────── */
function togglePanelReset() {
  const p = document.getElementById('panel_reset');
  if (!p) return;
  if (p.style.display === 'flex') { p.style.display = 'none'; return; }
  cerrarTodosPaneles();
  p.style.display = 'flex';
}

function restaurarPrimerGuardado() {
  const hist = obtenerHistorial();
  const hoy  = new Date().toISOString().split('T')[0];
  const primero = hist.find(h => h.fecha === hoy);
  if (!primero) { toast('No hay guardado de hoy', 'error'); return; }
  if (!confirm('¿Restaurar el primer guardado del día? Se perderán los cambios posteriores.')) return;
  for (const k of Object.keys(primero.data)) localStorage.setItem(k, primero.data[k]);
  document.getElementById('panel_reset').style.display = 'none';
  toast('Primer guardado del día restaurado. Recargando…');
  setTimeout(() => location.reload(), 800);
}

function restaurarValoresFabrica() {
  if (!confirm('¿Restaurar valores de fábrica? Todos los datos se limpiarán (plantilla vacía).')) return;
  const prefijos = ['taos_colaboradores','taos_inventario','taos_registroDiario','taos_presencia','taos_estado_financiero','taos_proyecciones','taos_reg_config','taos_historial','taos_calc_inputs'];
  prefijos.forEach(k => localStorage.removeItem(k));
  document.getElementById('panel_reset').style.display = 'none';

  /* Reset state in-place */
  TAOS.state.colaboradores  = [];
  TAOS.state.inventario     = [];
  TAOS.state.registroDiario = [];
  TAOS.state.presencia      = {};
  TAOS.state.ingresos = TAOS.state.egresos = TAOS.state.ganancia = 0;
  TAOS.state.unidadesVendidas = TAOS.state.unidadesProducidas = 0;
  TAOS.state.puntoEquilUnidades = 0;
  TAOS.state.puntoEquilDinero   = 0;
  TAOS.state.precioVenta = TAOS.state.costoVariableUnit = TAOS.state.materiaPrimaUnit = 0;
  TAOS.state.precioVentaUnitReg = TAOS.state.costoFabUnitReg = 0;
  TAOS.state.proyecciones = [];
  guardar('estado_financiero', {ingresos:0,egresos:0,ganancia:0,unidadesVendidas:0,unidadesProducidas:0});
  guardar('proyecciones', []);
  guardar('reg_config', {precioVentaUnitReg:0,costoFabUnitReg:0});

  /* Clear all calculator & form input values */
  const idsZero = [
    'cf_arriendo','cf_servicios','cf_nomina_val','cf_deprec','cf_consumibles',
    'cv_costo_unit','cv_cantidad','di_mp','di_mod','di_cif','di_gadm','di_gven',
    'mp_mezcla','mp_merma','mp_congelante','mo_salario','mo_horas','mo_trabajadores',
    'cr_psc','cr_margen','cr_iva','mg_inversion','mg_ingresos','mg_egresos',
    'pe_costos_fijos','pe_precio_venta','pe_costo_var_unit',
    'actual_u_vendidas','actual_u_vendidas_proy','actual_tasa_crec','proy_uprod',
    'eq_uprod','eq_ingresos','eq_egresos'
  ];
  idsZero.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  /* Also reset sliders/selects */
  const tEl = document.getElementById('proy_tasa');
  if (tEl) tEl.value = '1';
  const mEl = document.getElementById('proy_meses');
  if (mEl) mEl.value = '1';
  const invPctEl = document.getElementById('inv_futura_pct');
  if (invPctEl) invPctEl.value = '0';
  /* Clear proyecciones table */
  const tb = document.getElementById('proy_tabla_body');
  if (tb) tb.innerHTML = '';
  /* Re-render all sections */
  renderNomina();
  renderInventario();
  renderInventarioGeneral();
  renderRegistroDiario();
  inicializarPresencia();
  actualizarResumenEjecutivo();
  if (typeof syncAllCalculators   === 'function') syncAllCalculators();
  if (typeof calcProyecciones     === 'function') calcProyecciones();
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  /* Clear ALL calculator display rectangles (after calculators, so they stay blank) */
  const displayIds = [
    'cf_total','cv_total','di_directos','di_indirectos','di_total',
    'mp_total_disp','mo_total','cr_pvdiva_disp','cr_psc_disp',
    'mg_total_margen','mg_ganancia_neta','mg_margen_indicator',
    'pe_total_unidades','pe_dinero_disp','pe_margen_contrib',
    'inv_futura_val','obj_rec_val','obj_rec_diff',
    'obj_pe_vendidas','obj_pe_pct','obj_pe_restantes'
  ];
  displayIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
  toast('Valores de fábrica — plantilla vacía');
}

function reinitAllInputs() {
  const CALC_IDS = [
    'cf_arriendo','cf_servicios','cf_nomina_val','cf_deprec','cf_consumibles',
    'cv_costo_unit','cv_cantidad','di_mp','di_mod','di_cif','di_gadm','di_gven',
    'mp_mezcla','mp_merma','mp_congelante','mo_salario','mo_horas','mo_trabajadores',
    'cr_psc','cr_margen','cr_iva','mg_inversion','mg_ingresos','mg_egresos',
    'pe_costos_fijos','pe_precio_venta','pe_costo_var_unit',
    'actual_u_vendidas','actual_u_vendidas_proy','actual_tasa_crec','proy_uprod',
    'eq_uprod','eq_ingresos','eq_egresos',
    'pr_costo_fab_input','pr_pvd_input','pr_pvp_input',
  ];
  CALC_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.getAttribute('data-default') ?? el.getAttribute('value') ?? '';
  });
  ['proy_tasa','proy_meses'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '1';
  });
  const invPctEl = document.getElementById('inv_futura_pct');
  if (invPctEl) invPctEl.value = '0';
  const tb = document.getElementById('proy_tabla_body');
  if (tb) tb.innerHTML = '';
  const DISPLAY_IDS = [
    'cf_total','cv_total','di_directos','di_indirectos','di_total',
    'mp_total_disp','mo_total','cr_pvdiva_disp','cr_psc_disp',
    'mg_total_margen','mg_ganancia_neta','mg_margen_indicator',
    'pe_total_unidades','pe_dinero_disp','pe_margen_contrib',
    'inv_futura_val','obj_rec_val','obj_rec_diff',
    'obj_pe_vendidas','obj_pe_pct','obj_pe_restantes'
  ];
  DISPLAY_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });
}

function restaurarValoresPredeterminados() {
  if (!confirm('¿Restaurar valores predeterminados? Se cargarán los datos iniciales de fábrica (colaboradores, inventario).')) return;
  const prefijos = ['taos_colaboradores','taos_inventario','taos_registroDiario','taos_presencia','taos_estado_financiero','taos_proyecciones','taos_reg_config','taos_calc_inputs'];
  prefijos.forEach(k => localStorage.removeItem(k));
  document.getElementById('panel_reset').style.display = 'none';

  /* Load initial data in-place */
  TAOS.state.colaboradores  = JSON.parse(JSON.stringify(COLABORADORES_INIT));
  TAOS.state.inventario     = JSON.parse(JSON.stringify(INVENTARIO_INIT));
  TAOS.state.registroDiario = [];
  TAOS.state.presencia      = {};
  TAOS.state.ingresos = TAOS.state.egresos = TAOS.state.ganancia = 0;
  TAOS.state.unidadesVendidas = TAOS.state.unidadesProducidas = 0;
  TAOS.state.puntoEquilUnidades = 0;
  TAOS.state.puntoEquilDinero   = 0;
  TAOS.state.proyecciones = [];
  guardar('estado_financiero', {ingresos:0,egresos:0,ganancia:0,unidadesVendidas:0,unidadesProducidas:0});
  guardar('proyecciones', []);
  guardar('reg_config', {precioVentaUnitReg:0,costoFabUnitReg:0});

  guardar('colaboradores', TAOS.state.colaboradores);
  guardar('inventario',    TAOS.state.inventario);

  reinitAllInputs();
  renderNomina();
  renderInventario();
  renderInventarioGeneral();
  renderRegistroDiario();
  inicializarPresencia();
  actualizarResumenEjecutivo();
  if (typeof syncAllCalculators   === 'function') syncAllCalculators();
  if (typeof calcProyecciones     === 'function') calcProyecciones();
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  toast('Valores predeterminados cargados');
}

function restaurarUltimoMes() {
  if (!confirm('¿Restaurar datos únicamente del último mes? Se conservarán el mes anterior y el actual.')) return;
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
  const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;

  const raw = localStorage.getItem('taos_registroDiario');
  if (raw) {
    const regs = JSON.parse(raw);
    const filtrados = regs.filter(r => {
      if (!r.fecha) return r.mes === mesActual || r.mes === mesAnterior;
      const d = new Date(r.fecha + 'T12:00:00');
      if (isNaN(d)) return r.mes === mesActual || r.mes === mesAnterior;
      const m = d.getMonth() + 1;
      const a = d.getFullYear();
      return (a === anioActual && m === mesActual) || (a === anioAnterior && m === mesAnterior);
    });
    localStorage.setItem('taos_registroDiario', JSON.stringify(filtrados));
  }

  document.getElementById('panel_reset').style.display = 'none';
  toast('Datos filtrados al último mes. Recargando…');
  setTimeout(() => location.reload(), 800);
}

/* ── PERFIL / OPERADOR ────────────────────────────────────── */
function togglePanelProfile() {
  const p = document.getElementById('panel_profile');
  if (!p) return;
  if (p.style.display === 'flex') { p.style.display = 'none'; return; }
  cerrarTodosPaneles();
  const inp = document.getElementById('profile_name_input');
  if (inp) inp.value = getNombreOperador();
  actualizarBloqueoUI();
  renderOtrosOperadores();
  p.style.display = 'flex';
}
function getOperadoresList() {
  const raw = localStorage.getItem('taos_operadores_list');
  return raw ? JSON.parse(raw) : [{ name:'Norfolk', pass:'', approved:true }];
}
function addOperadorToList(name, pass) {
  const list = getOperadoresList();
  if (!list.find(o => o.name === name)) { list.push({ name, pass: pass || '', approved:false }); localStorage.setItem('taos_operadores_list', JSON.stringify(list)); }
}
function actualizarBuzonBadge() {
  const badge = document.getElementById('buzon_badge');
  if (!badge) return;
  const list = getOperadoresList();
  const pending = list.filter(o => !o.approved);
  if (pending.length) { badge.textContent = pending.length; badge.style.display = 'block'; }
  else { badge.style.display = 'none'; }
}
function renderOtrosOperadores() {
  const container = document.getElementById('otros_operadores_list');
  if (!container) return;
  const list = getOperadoresList();
  const current = getNombreOperador();
  const isAdmin = !list.find(o => o.name === current)?.pass;
  const pending = list.filter(o => o.name !== current && !o.approved);
  const approved = list.filter(o => o.name !== current && o.approved);

  let html = '';
  /* Pending section (only for admin) */
  if (isAdmin && pending.length) {
    html += '<div style="font-size:10px;color:var(--orange-text);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 4px">⏳ Pendientes</div>';
    html += pending.map(o => `
      <div style="display:flex;align-items:center;gap:4px;padding:4px 0">
        <span style="font-size:13px">👤</span>
        <span style="flex:1;font-size:13px;font-weight:600">${o.name}</span>
        <button style="font-size:11px;padding:2px 8px;border:none;border-radius:4px;cursor:pointer;background:var(--green-soft);color:var(--green-text);font-weight:600" onclick="aprobarOperador('${escHtml(o.name)}',true)">✅</button>
        <button style="font-size:11px;padding:2px 8px;border:none;border-radius:4px;cursor:pointer;background:#fef2f2;color:var(--red);font-weight:600" onclick="aprobarOperador('${escHtml(o.name)}',false)">❌</button>
      </div>
    `).join('');
  }
  /* Approved operators */
  if (approved.length) {
    html += '<div style="font-size:10px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 4px">Otros operadores</div>';
    html += approved.map(o => `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0;cursor:pointer" onclick="seleccionarOperador('${escHtml(o.name)}')">
        <span style="font-size:13px">👤</span>
        <span style="flex:1;font-size:13px;font-weight:600">${o.name}</span>
        <span style="font-size:12px;opacity:.5">${o.pass ? '🔒' : '🔓'}</span>
      </div>
    `).join('');
  }
  if (!html) html = '<div style="font-size:11px;color:var(--text3)">—</div>';
  container.innerHTML = html;
}
function aprobarOperador(name, approved) {
  const list = getOperadoresList();
  const op = list.find(o => o.name === name);
  if (op) { op.approved = approved; localStorage.setItem('taos_operadores_list', JSON.stringify(list)); }
  renderOtrosOperadores();
  toast(approved ? 'Operador "' + name + '" aprobado' : 'Operador "' + name + '" rechazado');
}
function registrarOperadorNuevo() {
  const name = prompt('Nombre del nuevo operador:');
  if (!name || !name.trim()) return;
  const clean = name.trim();
  if (getOperadoresList().find(o => o.name === clean)) { toast('Ya existe un operador con ese nombre', 'error'); return; }
  const pass = prompt('Contraseña para "' + clean + '":');
  if (pass === null) return;
  addOperadorToList(clean, pass || '');
  renderOtrosOperadores();
  toast('Operador "' + clean + '" registrado');
}
function seleccionarOperador(name) {
  const list = getOperadoresList();
  const op = list.find(o => o.name === name);
  if (!op || !op.approved) { toast('Operador no aprobado', 'error'); return; }
  const requiredPass = op && op.pass ? op.pass : '';
  if (requiredPass) {
    const pwd = prompt('Ingresa la contraseña para "' + name + '":');
    if (pwd !== requiredPass) { if (pwd !== null) toast('Contraseña incorrecta', 'error'); return; }
  }
  guardarYCerrarSesion();
  localStorage.setItem('taos_operador', name);
  localStorage.setItem('taos_operador_lock', '1');
  const btn = document.getElementById('profile_btn_name');
  if (btn) btn.textContent = name;
  toast('Operador cambiado a: ' + name);
  document.getElementById('panel_profile').style.display = 'none';
}
function getNombreOperador() {
  const name = localStorage.getItem('taos_operador');
  return name || 'Norfolk';
}
function isOperadorBloqueado() {
  const val = localStorage.getItem('taos_operador_lock');
  return val === '1' || (val === null && !!localStorage.getItem('taos_operador'));
}
function guardarNombreOperador(val) {
  const name = val.trim() || 'Norfolk';
  const oldName = localStorage.getItem('taos_operador') || 'Norfolk';
  localStorage.setItem('taos_operador', name);
  const btn = document.getElementById('profile_btn_name');
  if (btn) btn.textContent = name;
  /* Lock after first save */
  localStorage.setItem('taos_operador_lock', '1');
  /* Migrate password if name changed */
  const list = getOperadoresList();
  const existing = list.find(o => o.name === oldName);
  addOperadorToList(name, existing ? existing.pass : '');
  /* Remove old name from list if renamed */
  if (name !== oldName) {
    const updated = getOperadoresList().filter(o => o.name !== oldName);
    localStorage.setItem('taos_operadores_list', JSON.stringify(updated));
  }
  actualizarBloqueoUI();
  renderOtrosOperadores();
}
function toggleBloqueoOperador() {
  if (isOperadorBloqueado()) {
    const currentName = getNombreOperador();
    const list = getOperadoresList();
    const op = list.find(o => o.name === currentName);
    const requiredPass = op && op.pass ? op.pass : '';
    if (requiredPass) {
      const pwd = prompt('Ingresa la contraseña para desbloquear el perfil:');
      if (pwd !== requiredPass) { if (pwd !== null) toast('Contraseña incorrecta', 'error'); return; }
    }
    localStorage.setItem('taos_operador_lock', '0');
    actualizarBloqueoUI();
    toast('Perfil desbloqueado');
  } else {
    localStorage.setItem('taos_operador_lock', '1');
    const name = document.getElementById('profile_name_input')?.value || getNombreOperador();
    guardarNombreOperador(name);
    toast('Perfil bloqueado');
  }
}
function actualizarBloqueoUI() {
  const inp = document.getElementById('profile_name_input');
  const icon = document.getElementById('profile_lock_icon');
  if (!inp || !icon) return;
  const locked = isOperadorBloqueado();
  inp.disabled = locked;
  icon.textContent = locked ? '🔒' : '🔓';
  icon.title = locked ? 'Bloqueado — haz clic para desbloquear' : 'Desbloqueado — haz clic para bloquear';
}
function guardarYCerrarSesion() {
  /* Save current state before "logging out" */
  if (typeof sincronizarDesdeRegistro === 'function') sincronizarDesdeRegistro();
  if (typeof syncAllCalculators   === 'function') syncAllCalculators();
  if (typeof calcProyecciones     === 'function') calcProyecciones();
  guardarSnapshot('cierre');
  document.getElementById('panel_profile').style.display = 'none';
  toast('Sesión guardada. Bienvenido de nuevo.');
}

/* ── CERRAR PANELES ───────────────────────────────────────── */
function cerrarTodosPaneles() {
  ['panel_actualizar','panel_guardar','panel_reset','panel_profile','panel_buzon'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

/* ════════════════════════════════════════════════════════════
   ESTACIONES — Tabla horizontal (Control Financiero)
   ════════════════════════════════════════════════════════════ */
function renderEstacionesTabla(filtroArea) {
  const tbody = document.getElementById('estaciones_tbody');
  if (!tbody) return;
  const colabs = TAOS.state.colaboradores || [];
  const inv = TAOS.state.inventario || [];
  const fa = filtroArea || 'todas';
  let lista = fa === 'todas' ? colabs : colabs.filter(c => c.area === fa);
  const busq = (document.getElementById('est_buscar')?.value || '').toLowerCase();
  if (busq) lista = lista.filter(c => c.nombre.toLowerCase().includes(busq) || c.estacion.toLowerCase().includes(busq));

  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><p>No se encontraron estaciones</p></td></tr>';
    return;
  }
  const areaLabel = { comercial:'Comercial', administracion:'Administración', operaciones:'Operaciones' };
  const areaColor = { comercial:'blue', administracion:'orange', operaciones:'green' };
  const getInvByColab = (colab) => inv.filter(i => i.area === colab.area).reduce((s,i) => s + (i.total||0), 0);

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td><strong>${escHtml(c.nombre)}</strong></td>
      <td><span class="estacion-badge">${escHtml(c.estacion)}</span></td>
      <td><span class="area-badge ${areaColor[c.area]||''}">${areaLabel[c.area]||c.area}</span></td>
      <td style="font-size:11.5px">${escHtml(c.recursos.split(',')[0]||'-')}</td>
      <td style="font-size:11.5px">${escHtml(c.division)}</td>
      <td style="font-size:11.5px">${escHtml(c.productos)}</td>
      <td style="font-size:11.5px;max-width:200px;white-space:normal">${escHtml(c.recursos)}</td>
      <td class="td-money">${fmt$(getInvByColab(c))}</td>
      <td class="td-money">${fmt$(c.total)}</td>
      <td class="action-cell">
        <button class="mod-btn" onclick="abrirModalEditarColaborador(${c.id})" title="Modificar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="del-btn" onclick="eliminarColaborador(${c.id})" title="Eliminar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </td>
    </tr>`).join('');
}

/* ════════════════════════════════════════════════════════════
   PROYECCIONES — Stubs
   ════════════════════════════════════════════════════════════ */
function editarProyeccion(mes) {
  toast('Para modificar la proyección de ' + mes + ', edita los registros diarios correspondientes en la pestaña Registro Diario.', 'warn');
}

function eliminarProyeccion(mes) {
  if (!confirm('¿Eliminar la proyección del mes ' + mes + '?')) return;
  TAOS.state.proyecciones = TAOS.state.proyecciones.filter(p => p.mes !== mes);
  guardar('proyecciones', TAOS.state.proyecciones);
  if (typeof calcProyecciones === 'function') calcProyecciones();
  toast('Proyección de ' + mes + ' eliminada', 'warn');
}

/* ════════════════════════════════════════════════════════════
   REGISTRO DIARIO
   ════════════════════════════════════════════════════════════ */
function attachRegistroListeners() {
  // Load persisted unit prices
  const regCfg = cargar('reg_config', {});
  if (regCfg.precioVentaUnitReg != null) TAOS.state.precioVentaUnitReg = regCfg.precioVentaUnitReg;
  if (regCfg.costoFabUnitReg != null)    TAOS.state.costoFabUnitReg    = regCfg.costoFabUnitReg;

  // Auto-calc CFU from latest financial data if still 0
  if (TAOS.state.costoFabUnitReg === 0 && TAOS.state.unidadesProducidas > 0 && TAOS.state.egresos > 0) {
    TAOS.state.costoFabUnitReg = TAOS.state.egresos / TAOS.state.unidadesProducidas;
  }

  const pvuEl = document.getElementById('reg_pvu');
  const cfuEl = document.getElementById('reg_cfu');
  if (pvuEl) pvuEl.value = TAOS.state.precioVentaUnitReg || TAOS.state.precioVenta || 0.80;
  if (cfuEl) cfuEl.value = TAOS.state.costoFabUnitReg || TAOS.state.costoVariableUnit || TAOS.state.materiaPrimaUnit || 0;

  // Auto-calculate ingresos/egresos from units
  const doAutoCalc = () => autoCalcularRegistro();
  ['reg_uprod_form','reg_uvend_form','reg_pvu','reg_cfu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', doAutoCalc);
  });

  // Persist unit prices when changed (marks manual override)
  const guardarRegCfg = () => guardar('reg_config', {
    precioVentaUnitReg: TAOS.state.precioVentaUnitReg,
    costoFabUnitReg:    TAOS.state.costoFabUnitReg,
  });
  if (pvuEl) pvuEl.addEventListener('change', () => {
    pvuEl.setAttribute('data-manual', 'true');
    TAOS.state.precioVentaUnitReg = Math.max(0, parseFloat(pvuEl.value) || 0);
    guardarRegCfg();
  });
  if (cfuEl) cfuEl.addEventListener('change', () => {
    cfuEl.setAttribute('data-manual', 'true');
    TAOS.state.costoFabUnitReg = Math.max(0, parseFloat(cfuEl.value) || 0);
    guardarRegCfg();
  });

  // Default values for today
  const today  = new Date();
  const dias   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const fechaEl = document.getElementById('reg_fecha');
  if (fechaEl && !fechaEl.value) fechaEl.value = today.toISOString().split('T')[0];
  const diaEl = document.getElementById('reg_dia');
  if (diaEl && !diaEl.value) diaEl.value = dias[today.getDay()];
  const semanaEl = document.getElementById('reg_semana');
  const mesEl = document.getElementById('reg_mes');
  if (mesEl && !mesEl.value) mesEl.value = today.getMonth() + 1;
  if (typeof actualizarSemanasReg === 'function') actualizarSemanasReg();
  if (semanaEl && !semanaEl.value) {
    const startYear = new Date(today.getFullYear(), 0, 1);
    const sem = Math.ceil(((today - startYear) / 86400000 + startYear.getDay() + 1) / 7);
    const opt = semanaEl.querySelector(`option[value="${sem}"]`);
    if (opt) semanaEl.value = sem;
  }

  // Populate semanas when month changes
  if (mesEl) mesEl.addEventListener('change', () => {
    if (typeof actualizarSemanasReg === 'function') actualizarSemanasReg();
  });

  // Auto-fill dia/semana/mes on date change
  if (fechaEl) fechaEl.addEventListener('change', () => {
    const d = new Date(fechaEl.value + 'T12:00:00');
    if (isNaN(d)) return;
    const de = document.getElementById('reg_dia');
    if (de) de.value = dias[d.getDay()];
    const me = document.getElementById('reg_mes');
    if (me) me.value = d.getMonth() + 1;
    if (typeof actualizarSemanasReg === 'function') actualizarSemanasReg();
    const se = document.getElementById('reg_semana');
    if (se) {
      const sy = new Date(d.getFullYear(), 0, 1);
      const diasDesde = Math.floor((d - sy) / 86400000);
      const sem = Math.ceil((diasDesde + sy.getDay() + 1) / 7);
      const opt = se.querySelector(`option[value="${sem}"]`);
      if (opt) se.value = sem;
    }
    /* Auto-load existing entry for this date */
    const regs = TAOS.state.registroDiario || [];
    const existing = regs.find(r => r.fecha === fechaEl.value);
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
  });

  // Initial auto-calc
  doAutoCalc();
}

let _syncingRegistro = false;

function autoCalcularRegistro() {
  if (_syncingRegistro) return;
  const uprod = Math.max(0, parseInt(document.getElementById('reg_uprod_form')?.value) || 0);
  const uvend = Math.max(0, parseInt(document.getElementById('reg_uvend_form')?.value) || 0);
  const pvu   = Math.max(0, parseFloat(document.getElementById('reg_pvu')?.value)   || 0);
  const cfu   = Math.max(0, parseFloat(document.getElementById('reg_cfu')?.value)   || 0);
  const ingEl = document.getElementById('reg_ingresos_form');
  const egEl  = document.getElementById('reg_egresos_form');
  if (ingEl) ingEl.value = (uvend * pvu).toFixed(2);
  if (egEl)  egEl.value  = (uprod * cfu).toFixed(2);
  const ing  = parseFloat(ingEl?.value) || 0;
  const eg   = parseFloat(egEl?.value)  || 0;
  const gan  = ing - eg;
  const marg = ing > 0 ? (gan / ing * 100) : 0;
  const ganEl  = document.getElementById('reg_prev_gan');
  const margEl = document.getElementById('reg_prev_marg');
  if (ganEl)  { ganEl.textContent  = fmt$(gan); ganEl.style.color = gan >= 0 ? 'var(--green-text)' : 'var(--red)'; }
  if (margEl) { margEl.textContent = marg.toFixed(2) + '%'; margEl.style.color = marg >= 15 ? 'var(--green-text)' : 'var(--orange-text)'; }

  /* Sync equilibrio fields in real time */
  _syncingRegistro = true;
  const uvendEl = document.getElementById('actual_u_vendidas');
  if (uvendEl) uvendEl.value = uvend;
  const uprodEl = document.getElementById('eq_uprod');
  if (uprodEl) uprodEl.value = uprod;
  const eqIngEl = document.getElementById('eq_ingresos');
  if (eqIngEl) eqIngEl.value = ing.toFixed(2);
  const eqEgEl = document.getElementById('eq_egresos');
  if (eqEgEl) eqEgEl.value = eg.toFixed(2);
  _syncingRegistro = false;
}

function actualizarPreviewRegistro() {
  autoCalcularRegistro();
}

function agregarRegistroDiario() {
  const dia    = document.getElementById('reg_dia')?.value.trim()        || '—';
  const semana = parseInt(document.getElementById('reg_semana')?.value)   || 0;
  const mes    = parseInt(document.getElementById('reg_mes')?.value)      || 0;
  const fecha  = document.getElementById('reg_fecha')?.value              || '';
  const uprod  = parseInt(document.getElementById('reg_uprod_form')?.value)   || 0;
  const uvend  = parseInt(document.getElementById('reg_uvend_form')?.value)   || 0;
  const ing    = parseFloat(document.getElementById('reg_ingresos_form')?.value) || 0;
  const eg     = parseFloat(document.getElementById('reg_egresos_form')?.value)  || 0;

  if (!dia || mes <= 0) {
    toast('Completa los campos obligatorios (día, mes)', 'error');
    return;
  }

  const gan  = ing - eg;
  const marg = ing > 0 ? (gan / ing * 100) : 0;
  const id   = Date.now();

  TAOS.state.registroDiario.push({ id, dia, semana, mes, fecha, uprod, uvend, ing, eg, gan, marg });
  guardar('registroDiario', TAOS.state.registroDiario);

  sincronizarDesdeRegistro();
  renderRegistroDiario();
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  toast('Registro agregado ✓');

  ['reg_uprod_form','reg_uvend_form','reg_ingresos_form','reg_egresos_form'].forEach(fieldId => {
    const el = document.getElementById(fieldId);
    if (el) el.value = '';
  });
  actualizarPreviewRegistro();
}

function eliminarRegistroDiario(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  TAOS.state.registroDiario = TAOS.state.registroDiario.filter(r => r.id !== id);
  guardar('registroDiario', TAOS.state.registroDiario);
  sincronizarDesdeRegistro();
  renderRegistroDiario();
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  toast('Registro eliminado', 'warn');
}

/* ── EDITAR REGISTRO DIARIO (modal) ── */
function editarRegistroDiario(id) {
  abrirModalEditarRegistro(id);
}

function abrirModalEditarRegistro(id) {
  const r = TAOS.state.registroDiario.find(x => x.id === id);
  if (!r) return;
  TAOS.editingRegId = id;
  document.getElementById('redit_fecha').value = r.fecha || '';
  document.getElementById('redit_dia').value = r.dia || '';
  document.getElementById('redit_semana').value = r.semana || '';
  document.getElementById('redit_mes').value = r.mes || '';
  document.getElementById('redit_uprod').value = r.uprod || 0;
  document.getElementById('redit_uvend').value = r.uvend || 0;
  document.getElementById('redit_pvu').value = TAOS.state.precioVentaUnitReg;
  document.getElementById('redit_cfu').value = TAOS.state.costoFabUnitReg;
  document.getElementById('redit_ingresos').value = r.ing || 0;
  document.getElementById('redit_egresos').value = r.eg || 0;
  document.getElementById('modal_reg_edit').classList.add('open');
  // Attach auto-calc to modal fields
  ['redit_uprod','redit_uvend','redit_pvu','redit_cfu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.removeEventListener('input', autoCalcularEditRegistro);
    if (el) el.addEventListener('input', autoCalcularEditRegistro);
  });
}

function autoCalcularEditRegistro() {
  const uprod = Math.max(0, parseInt(document.getElementById('redit_uprod')?.value) || 0);
  const uvend = Math.max(0, parseInt(document.getElementById('redit_uvend')?.value) || 0);
  const pvu   = Math.max(0, parseFloat(document.getElementById('redit_pvu')?.value)   || 0);
  const cfu   = Math.max(0, parseFloat(document.getElementById('redit_cfu')?.value)   || 0);
  const ingEl = document.getElementById('redit_ingresos');
  const egEl  = document.getElementById('redit_egresos');
  if (ingEl) ingEl.value = (uvend * pvu).toFixed(2);
  if (egEl)  egEl.value  = (uprod * cfu).toFixed(2);
}

function guardarEditRegistro() {
  const id = TAOS.editingRegId;
  const idx = TAOS.state.registroDiario.findIndex(r => r.id === id);
  if (idx === -1) { toast('Registro no encontrado', 'error'); return; }

  const fecha  = document.getElementById('redit_fecha').value    || '';
  const dia    = document.getElementById('redit_dia').value.trim()   || '—';
  const semana = parseInt(document.getElementById('redit_semana').value) || 0;
  const mes    = parseInt(document.getElementById('redit_mes').value)    || 0;
  const uprod  = parseInt(document.getElementById('redit_uprod').value)  || 0;
  const uvend  = parseInt(document.getElementById('redit_uvend').value)  || 0;
  const ing    = parseFloat(document.getElementById('redit_ingresos').value) || 0;
  const eg     = parseFloat(document.getElementById('redit_egresos').value)  || 0;
  const gan    = ing - eg;
  const marg   = ing > 0 ? (gan / ing * 100) : 0;

  TAOS.state.registroDiario[idx] = { id, dia, semana, mes, fecha, uprod, uvend, ing, eg, gan, marg };
  guardar('registroDiario', TAOS.state.registroDiario);

  cerrarModalRegistro();
  sincronizarDesdeRegistro();
  renderRegistroDiario();
  if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
  toast('Registro actualizado ✓');
}

function cerrarModalRegistro() {
  document.getElementById('modal_reg_edit').classList.remove('open');
  TAOS.editingRegId = null;
}

function renderRegistroDiario() {
  const regs = TAOS.state.registroDiario || [];

  const totalUprod = regs.reduce((s, r) => s + (r.uprod || 0), 0);
  const totalUvend = regs.reduce((s, r) => s + (r.uvend || 0), 0);
  const totalIng   = regs.reduce((s, r) => s + (r.ing   || 0), 0);
  const totalEg    = regs.reduce((s, r) => s + (r.eg    || 0), 0);
  const totalGan   = totalIng - totalEg;

  setText('reg_count_total', regs.length.toString());
  setText('reg_acum_uprod',  totalUprod.toLocaleString('es-EC'));
  setText('reg_acum_uvend',  totalUvend.toLocaleString('es-EC'));
  setText('reg_acum_ing',    fmt$(totalIng));
  setText('reg_acum_eg',     fmt$(totalEg));
  setText('reg_acum_gan',    fmt$(totalGan));
  setText('reg_footer_total', fmt$(totalGan));

  const acumGanEl = document.getElementById('reg_acum_gan');
  if (acumGanEl) acumGanEl.style.color = totalGan >= 0 ? 'var(--green-text)' : 'var(--red)';

  const tbody = document.getElementById('reg_tbody');
  if (!tbody) return;

  if (!regs.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">
      <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin-bottom:6px;opacity:.3">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      </svg>
      <p>No hay registros aún — agrega el primero</p></td></tr>`;
    return;
  }

  tbody.innerHTML = regs.map(r => `
    <tr>
      <td><strong>${escHtml(r.dia)}</strong></td>
      <td class="td-mono">Sem ${r.semana}</td>
      <td class="td-mono">${MESES_NOMBRE[r.mes - 1] || 'Mes ' + r.mes}</td>
      <td style="font-size:12px;color:var(--text2)">${r.fecha || '—'}</td>
      <td class="td-mono">${(r.uprod||0).toLocaleString('es-EC')}</td>
      <td class="td-mono">${(r.uvend||0).toLocaleString('es-EC')}</td>
      <td class="td-money">${fmt$(r.ing)}</td>
      <td class="td-money red">${fmt$(r.eg)}</td>
      <td class="td-money ${(r.gan||0) >= 0 ? 'green-val' : 'red'}">${fmt$(r.gan||0)}</td>
      <td><span class="margin-pill ${(r.marg||0) >= 15 ? 'up' : 'down'}">${(r.marg||0) >= 0 ? '↑' : '↓'} ${Math.abs(r.marg||0).toFixed(1)}%</span></td>
      <td class="action-cell">
        <button class="mod-btn" onclick="editarRegistroDiario(${r.id})" title="Editar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="del-btn" onclick="eliminarRegistroDiario(${r.id})" title="Eliminar">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/* ── FILTRO DE PERIODO ── */
function filtrarPeriodo() {
  const mesNum = parseInt(document.getElementById('reg_filtro_mes')?.value)    || 1;
  const semNum = parseInt(document.getElementById('reg_filtro_semana')?.value) || 1;
  const regs   = TAOS.state.registroDiario || [];

  const filtrados = regs.filter(r => r.mes === mesNum && r.semana === semNum);

  const uvend  = filtrados.reduce((s,r) => s + (r.uvend||0), 0);
  const uprod  = filtrados.reduce((s,r) => s + (r.uprod||0), 0);
  const ing    = filtrados.reduce((s,r) => s + (r.ing  ||0), 0);
  const eg     = filtrados.reduce((s,r) => s + (r.eg   ||0), 0);
  const gan    = ing - eg;

  const resumen = document.getElementById('reg_periodo_resumen');
  if (resumen) {
    resumen.style.display = filtrados.length ? 'block' : 'none';
  }
  const emptyMsg = document.getElementById('reg_periodo_vacio');
  if (emptyMsg) emptyMsg.style.display = filtrados.length ? 'none' : 'block';

  const periodoLabel = MESES_NOMBRE[mesNum - 1] + ' - Sem ' + semNum;
  setText('reg_periodo_titulo', periodoLabel + ' — ' + filtrados.length + ' días registrados');

  if (!filtrados.length) { setText('reg_periodo_uvend','—'); setText('reg_periodo_uprod','—'); setText('reg_periodo_ing','—'); setText('reg_periodo_eg','—'); setText('reg_periodo_gan','—'); setText('reg_periodo_margen','—'); setText('reg_periodo_margen_pct','—'); return; }

  setText('reg_periodo_uvend',  uvend.toLocaleString('es-EC'));
  setText('reg_periodo_uprod',  uprod.toLocaleString('es-EC'));
  setText('reg_periodo_dias',   filtrados.length.toString());

  const ingEl = document.getElementById('reg_periodo_ing');
  const egEl  = document.getElementById('reg_periodo_eg');
  const ganEl = document.getElementById('reg_periodo_gan');
  if (ingEl) ingEl.textContent = fmt$(ing);
  if (egEl)  egEl.textContent  = fmt$(eg);
  if (ganEl) { ganEl.textContent = fmt$(gan); ganEl.style.color = gan >= 0 ? 'var(--green-text)' : 'var(--red)'; }

  const pEl = document.getElementById('actual_u_vendidas_proy');
  if (pEl) { pEl.value = uvend; pEl.dispatchEvent(new Event('input')); }

  /* Sync all Escenario Actual auto fields from filtered data */
  const uprodEl = document.getElementById('proy_uprod');
  if (uprodEl) uprodEl.value = uprod;
  const ingElProy = document.getElementById('proy_ingresos');
  if (ingElProy) ingElProy.value = ing.toFixed(2);
  const egElProy = document.getElementById('proy_egresos');
  if (egElProy) egElProy.value = eg.toFixed(2);

  const actualMesEl = document.getElementById('actual_mes');
  const actualSemEl = document.getElementById('actual_semana');
  if (actualMesEl) { actualMesEl.value = mesNum; if (typeof actualizarSemanasActual === 'function') actualizarSemanasActual(); }
  if (actualSemEl) { const opt = actualSemEl.querySelector(`option[value="${semNum}"]`); if (opt) actualSemEl.value = semNum; }

  /* Pre-fill registro form with the last entry from this period */
  if (filtrados.length > 0) {
    const last = filtrados[filtrados.length - 1];
    const uvendFormEl = document.getElementById('reg_uvend_form');
    const uprodFormEl = document.getElementById('reg_uprod_form');
    const ingFormEl = document.getElementById('reg_ingresos_form');
    const egFormEl = document.getElementById('reg_egresos_form');
    if (uvendFormEl) uvendFormEl.value = last.uvend || '';
    if (uprodFormEl) uprodFormEl.value = last.uprod || '';
    if (ingFormEl) ingFormEl.value = last.ing || '';
    if (egFormEl) egFormEl.value = last.eg || '';
    actualizarPreviewRegistro();
  }

  if (typeof calcProyecciones === 'function') calcProyecciones();
  toast('Periodo filtrado: ' + periodoLabel + ' — ' + uvend + ' u. vendidas ✓');
}

function limpiarFiltroPeriodo() {
  const resumen = document.getElementById('reg_periodo_resumen');
  if (resumen) resumen.style.display = 'none';
  const mesEl = document.getElementById('reg_filtro_mes');
  if (mesEl) mesEl.value = new Date().getMonth() + 1;
  if (typeof actualizarSemanasFiltro === 'function') actualizarSemanasFiltro();
  const semEl = document.getElementById('reg_filtro_semana');
  if (semEl && semEl.options.length > 0) semEl.value = semEl.options[0].value;
}

function actualizarPeriodoActual() {
  const mesNum  = parseInt(document.getElementById('actual_mes')?.value)    || 1;
  const semNum  = parseInt(document.getElementById('actual_semana')?.value) || 1;
  const regs    = TAOS.state.registroDiario || [];

  const filtrados = regs.filter(r => r.mes === mesNum && r.semana === semNum);
  if (!filtrados.length) filtrados.push(...regs.filter(r => r.mes === mesNum));

  const uvend = filtrados.reduce((s,r) => s + (r.uvend||0), 0);
  const uprod = filtrados.reduce((s,r) => s + (r.uprod||0), 0);
  const ing   = filtrados.reduce((s,r) => s + (r.ing  ||0), 0);
  const eg    = filtrados.reduce((s,r) => s + (r.eg   ||0), 0);

  const uvendEl = document.getElementById('actual_u_vendidas_proy');
  if (uvendEl && filtrados.length > 0) uvendEl.value = uvend;
  const uprodEl = document.getElementById('proy_uprod');
  if (uprodEl) uprodEl.value = uprod;
  const ingEl = document.getElementById('proy_ingresos');
  if (ingEl) ingEl.value = ing.toFixed(2);
  const egEl = document.getElementById('proy_egresos');
  if (egEl) egEl.value = eg.toFixed(2);

  if (typeof calcProyecciones === 'function') calcProyecciones();
}

/* ════════════════════════════════════════════════════════════
   SINCRONIZAR DESDE REGISTRO DIARIO → ESTADO GLOBAL
   ════════════════════════════════════════════════════════════ */
function sincronizarDesdeRegistro() {
  const regs = TAOS.state.registroDiario || [];
  if (!regs.length) return;

  const totalIng   = regs.reduce((s, r) => s + (r.ing   || 0), 0);
  const totalEg    = regs.reduce((s, r) => s + (r.eg    || 0), 0);
  const totalUprod = regs.reduce((s, r) => s + (r.uprod || 0), 0);
  const totalUvend = regs.reduce((s, r) => s + (r.uvend || 0), 0);

  TAOS.state.ingresos           = totalIng;
  TAOS.state.egresos            = totalEg;
  TAOS.state.ganancia           = totalIng - totalEg;
  TAOS.state.unidadesProducidas = totalUprod;
  TAOS.state.unidadesVendidas   = totalUvend;

  const PE_UNIDADES = TAOS.state.puntoEquilUnidades || 200;
  const tasaReal    = totalUvend > 0
    ? ((totalUvend - PE_UNIDADES) / PE_UNIDADES * 100)
    : 0;
  TAOS.state.tasaCrecimientoReal = tasaReal;

  const tasaEl = document.getElementById('actual_tasa_crec');
  if (tasaEl) tasaEl.value = tasaReal.toFixed(2);

  const mgIng = document.getElementById('mg_ingresos');
  const mgEg  = document.getElementById('mg_egresos');
  if (mgIng && !mgIng.getAttribute('data-manual')) setAuto('mg_ingresos', totalIng);
  if (mgEg  && !mgEg.getAttribute('data-manual'))  setAuto('mg_egresos',  totalEg);

  /* Sync Escenario Actual auto fields from registro accumulators */
  setAuto('proy_uprod',           totalUprod);
  setAuto('actual_u_vendidas_proy', totalUvend);
  setAuto('proy_ingresos',         totalIng.toFixed(2));
  setAuto('proy_egresos',          totalEg.toFixed(2));

  guardar('estado_financiero', {
    ingresos: totalIng,
    egresos:  totalEg,
    ganancia: TAOS.state.ganancia,
    unidadesVendidas:   totalUvend,
    unidadesProducidas: totalUprod,
    tasaCrecimientoReal: tasaReal,
  });

  actualizarResumenEjecutivo();
  if (typeof actualizarKPIsActuales === 'function') actualizarKPIsActuales();
  if (typeof calcMargenGanancia === 'function') calcMargenGanancia();
  if (typeof calcProyecciones === 'function') calcProyecciones();
}

/* ════════════════════════════════════════════════════════════
   SPLASH DE INICIO
   ════════════════════════════════════════════════════════════ */
function splashOcultar() {
  const sp = document.getElementById('splash_inicio');
  if (sp) {
    sp.style.transition = 'opacity .3s';
    sp.style.opacity = '0';
    setTimeout(() => { sp.style.display = 'none'; }, 320);
  }
}

function splashAccion(accion) {
  try {
    if (accion === 'sync') {
      sincronizarDesdeRegistro();
      syncAllCalculators();
      calcProyecciones();
      actualizarResumenEjecutivo();
      renderNomina();
      renderInventario();
      renderInventarioGeneral();
      renderRegistroDiario();
      guardarSnapshot('sync');
      toast('Sistema sincronizado ✓');
      splashOcultar();
    } else if (accion === 'ultimo_mes') {
      const ahora = new Date();
      const mesActual = ahora.getMonth() + 1;
      const anioActual = ahora.getFullYear();
      const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
      const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
      const raw = localStorage.getItem('taos_registroDiario');
      if (raw) {
        const regs = JSON.parse(raw);
        const filtrados = regs.filter(r => {
          if (!r.fecha) return r.mes === mesActual || r.mes === mesAnterior;
          const d = new Date(r.fecha + 'T12:00:00');
          if (isNaN(d)) return r.mes === mesActual || r.mes === mesAnterior;
          const m = d.getMonth() + 1;
          const a = d.getFullYear();
          return (a === anioActual && m === mesActual) || (a === anioAnterior && m === mesAnterior);
        });
        localStorage.setItem('taos_registroDiario', JSON.stringify(filtrados));
        TAOS.state.registroDiario = filtrados;
      }
      sincronizarDesdeRegistro();
      syncAllCalculators();
      calcProyecciones();
      actualizarResumenEjecutivo();
      renderNomina();
      renderInventario();
      renderInventarioGeneral();
      renderRegistroDiario();
      if (typeof renderCalendarioRegistro === 'function') renderCalendarioRegistro();
      toast('Último mes cargado ✓');
      splashOcultar();
    } else if (accion === 'primer_guardado') {
      const hist = obtenerHistorial();
      const hoy  = new Date().toISOString().split('T')[0];
      const primero = hist.find(h => h.fecha === hoy);
      if (!primero) {
        toast('No hay guardado de hoy — se cargará el estado actual', 'warn');
        splashOcultar();
        return;
      }
      for (const k of Object.keys(primero.data)) localStorage.setItem(k, primero.data[k]);
      toast('Primer guardado del día cargado. Recargando…');
      setTimeout(() => location.reload(), 800);
    } else if (accion === 'fabrica') {
      if (!confirm('¿Restaurar valores de fábrica? Todos los datos se limpiarán (plantilla vacía).')) return;
      const prefijos = ['taos_colaboradores','taos_inventario','taos_registroDiario','taos_presencia','taos_estado_financiero','taos_proyecciones','taos_reg_config','taos_historial'];
      prefijos.forEach(k => localStorage.removeItem(k));
      toast('Valores de fábrica aplicados. Recargando…');
      setTimeout(() => location.reload(), 800);
    }
  } catch (e) {
    console.error('splashAccion(' + accion + '):', e);
    toast('Error: ' + (e.message || e), 'error');
    splashOcultar();
  }
}

/* ════════════════════════════════════════════════════════════
   BUZÓN — Panel independiente de solicitudes de acceso
   ════════════════════════════════════════════════════════════ */
function togglePanelBuzon() {
  const p = document.getElementById('panel_buzon');
  if (!p) return;
  if (p.style.display === 'flex') { p.style.display = 'none'; return; }
  cerrarTodosPaneles();
  renderBuzon();
  p.style.display = 'flex';
}

function renderBuzon() {
  const container = document.getElementById('buzon_lista');
  if (!container) return;
  const list = getOperadoresList();
  const pending = list.filter(o => !o.approved);
  if (!pending.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px 0">Sin solicitudes pendientes</div>';
    return;
  }
  container.innerHTML = pending.map(o => `
    <div style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="font-size:18px">👤</span>
        <span style="font-size:14px;font-weight:700;color:var(--text)">${escHtml(o.name)}</span>
        <span style="font-size:11px;color:var(--text3);margin-left:auto">solicita acceso</span>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="aprobarDesdebuzon('${escHtml(o.name)}',true)" style="
          flex:1;padding:7px 0;border:none;border-radius:8px;cursor:pointer;
          background:var(--green-soft,#f0fdf4);color:var(--green-text,#16a34a);
          font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px
        ">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Aceptar
        </button>
        <button onclick="aprobarDesdebuzon('${escHtml(o.name)}',false)" style="
          flex:1;padding:7px 0;border:none;border-radius:8px;cursor:pointer;
          background:#fef2f2;color:var(--red,#ef4444);
          font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px
        ">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Rechazar
        </button>
      </div>
    </div>
  `).join('');
}

function aprobarDesdebuzon(name, aprobado) {
  aprobarOperador(name, aprobado);
  renderBuzon();
  actualizarBuzonBadge();
}


function inicializarPresencia() {
  const presencia = TAOS.state.presencia || {};
  document.querySelectorAll('[id^="pcheck_"]').forEach(cb => {
    const pid = parseInt(cb.id.replace('pcheck_',''));
    if (presencia[pid]) {
      cb.checked = true;
      cb.closest('.personal-check')?.classList.add('presente');
    }
  });
  actualizarResultadoPresencia();
}

function togglePresencia(pid, presente) {
  const presencia = TAOS.state.presencia || {};
  if (presente) {
    presencia[pid] = true;
  } else {
    delete presencia[pid];
  }
  TAOS.state.presencia = presencia;
  guardar('presencia', presencia);

  const check = document.querySelector(`.personal-check[data-pid="${pid}"]`);
  if (check) check.classList.toggle('presente', presente);

  actualizarResultadoPresencia();
}

function actualizarResultadoPresencia() {
  const presencia = TAOS.state.presencia || {};
  const total     = document.querySelectorAll('[id^="pcheck_"]').length || 11;
  const presentes = Object.keys(presencia).filter(k => presencia[k]).length;
  const pct       = total > 0 ? Math.round((presentes / total) * 100) : 0;

  setText('res_personal_presente', presentes + ' / ' + total);
  const capEl = document.getElementById('res_cap_operativa');
  if (capEl) {
    capEl.textContent = pct + '%';
    capEl.style.color = pct >= 80 ? 'var(--green-text)' : pct >= 50 ? 'var(--orange-text)' : 'var(--red)';
  }

  const regPresEl = document.getElementById('reg_presentes');
  if (regPresEl) regPresEl.value = presentes + ' / ' + total;

  actualizarResumenEjecutivo();
}

function sincronizarFechaResultado(val) {
  const eqFecha = document.getElementById('eq_fecha');
  if (eqFecha && val) eqFecha.value = val;
  const regFecha = document.getElementById('reg_fecha');
  if (regFecha && val) regFecha.value = val;
}

function guardarAsistencia() {
  const resFecha = document.getElementById('res_fecha');
  const fecha = resFecha?.value || new Date().toISOString().split('T')[0];

  if (resFecha && !resFecha.value) resFecha.value = fecha;

  const eqFecha = document.getElementById('eq_fecha');
  if (eqFecha) eqFecha.value = fecha;

  const regFecha = document.getElementById('reg_fecha');
  if (regFecha) regFecha.value = fecha;

  toast('Asistencia guardada — ' + fecha + ' ✓');
}


