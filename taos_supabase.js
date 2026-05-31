/* ════════════════════════════════════════════════════════════
   TAOS · Supabase Cloud Sync (REST API)
   ════════════════════════════════════════════════════════════ */
const SUPABASE_URL = 'https://mhvgwmyrmxfmrffdhuzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odmd3bXlybXhmbXJmZmRodXpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTg5NDMsImV4cCI6MjA5NTc3NDk0M30.GDRzAJPs2wBehxvUGG2Zp1kWGlCFspT77pmKEtFV54Y';

const SUPABASE_KEYS = ['colaboradores','inventario','registroDiario','presencia','estado_financiero','proyecciones','reg_config','calc_inputs'];

function supaDot(state) {
  const d = document.getElementById('supabase_dot');
  if (!d) return;
  d.className = 'supabase-dot ' + state;
  d.title = state === 'connected' ? '☁️ Conectado' :
            state === 'syncing'   ? '☁️ Sincronizando…' :
            '☁️ Desconectado';
}

function supaHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
}

async function supaGuardar() {
  try {
    const data = {};
    for (const k of SUPABASE_KEYS) {
      const raw = localStorage.getItem('taos_' + k);
      if (raw) { try { data[k] = JSON.parse(raw); } catch(e) { data[k] = null; } }
    }
    const body = { id: 1, data: data, updated_at: new Date().toISOString() };
    const res = await fetch(SUPABASE_URL + '/rest/v1/taos_data?id=eq.1', {
      method: 'PUT',
      headers: supaHeaders(),
      body: JSON.stringify(body)
    });
    if (!res.ok && res.status !== 201) {
      /* Try INSERT if PUT fails (first time) */
      if (res.status === 404 || res.status === 406) {
        const res2 = await fetch(SUPABASE_URL + '/rest/v1/taos_data', {
          method: 'POST',
          headers: supaHeaders(),
          body: JSON.stringify(body)
        });
        if (!res2.ok) { console.error('Supabase insert error:', res2.status); return false; }
      } else {
        console.error('Supabase upsert error:', res.status);
        return false;
      }
    }
    localStorage.setItem('taos_sync_timestamp', String(Date.now()));
    return true;
  } catch(e) { console.error('Supabase upload error:', e); return false; }
}

async function supaCargar() {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/taos_data?id=eq.1&select=*', {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Accept': 'application/json'
      }
    });
    if (!res.ok) { if (res.status === 406) return null; console.error('Supabase fetch error:', res.status); return null; }
    const rows = await res.json();
    if (!rows || !rows.length) return null;
    return rows[0];
  } catch(e) { console.error('Supabase download error:', e); return null; }
}

async function syncFromCloud() {
  supaDot('syncing');
  try {
    const cloudData = await supaCargar();
    if (!cloudData || !cloudData.data) {
      if (typeof toast === 'function') toast('☁️ Nube vacía — sin datos para sincronizar');
      supaDot('disconnected');
      return;
    }
    const localTs = parseInt(localStorage.getItem('taos_sync_timestamp') || '0');
    const cloudTs = new Date(cloudData.updated_at).getTime();
    if (cloudTs <= localTs) {
      supaDot('connected');
      if (typeof toast === 'function') toast('☁️ Datos locales están al día');
      return;
    }
    const snapshot = cloudData.data;
    for (const k of SUPABASE_KEYS) {
      if (k in snapshot && snapshot[k] !== null) {
        localStorage.setItem('taos_' + k, JSON.stringify(snapshot[k]));
      }
    }
    localStorage.setItem('taos_sync_timestamp', String(cloudTs));
    supaDot('connected');
    if (typeof toast === 'function') toast('☁️ Datos descargados de la nube — recargando…');
    setTimeout(() => location.reload(), 500);
  } catch(e) {
    console.error('Sync from cloud error:', e);
    supaDot('disconnected');
    if (typeof toast === 'function') toast('☁️ Error de conexión con la nube', 'error');
  }
}

async function syncToCloud() {
  supaDot('syncing');
  const ok = await supaGuardar();
  if (ok) {
    supaDot('connected');
    if (typeof toast === 'function') toast('☁️ Subido a la nube ✓');
  } else {
    supaDot('disconnected');
    if (typeof toast === 'function') toast('☁️ Error al subir a la nube', 'error');
  }
}

/* Patch guardarSistemaLocal */
const _origGuardar = window.guardarSistemaLocal;
window.guardarSistemaLocal = function() {
  _origGuardar();
  syncToCloud();
};

/* Patch guardarCierreCaja */
const _origCierre = window.guardarCierreCaja;
window.guardarCierreCaja = function() {
  _origCierre();
  syncToCloud();
};

/* Add cloud sync button to Actualizar panel */
document.addEventListener('DOMContentLoaded', function() {
  const panel = document.getElementById('panel_actualizar');
  if (panel) {
    const btn = document.createElement('button');
    btn.className = 'guardar-panel-btn';
    btn.innerHTML = '<span class="p-icon">☁️</span> Sincronizar desde nube';
    btn.onclick = function() {
      if (typeof cerrarTodosPaneles === 'function') cerrarTodosPaneles();
      btn.innerHTML = '<span class="spinner"></span> Sincronizando…';
      syncFromCloud().finally(function() {
        btn.innerHTML = '<span class="p-icon">☁️</span> Sincronizar desde nube';
      });
    };
    panel.insertBefore(btn, panel.firstChild);
  }
  /* Auto-sync from cloud after UI loads */
  setTimeout(syncFromCloud, 1500);
});
