/**
 * vetecare.js  —  Lógica universal para todos los formularios VeteCare
 *
 * Uso: incluir este script en cada página HTML.
 * Cada página declara la variable global VETECARE_CONFIG antes del script:
 *
 *   <script>
 *     const VETECARE_CONFIG = {
 *       apiEndpoint: '/api/pacientes',
 *       formId:      'vetecare-form',
 *       campos: ['id_paciente','especie','nombre','edad','genero'],
 *       columnas: ['ID','Especie','Nombre','Edad','Género'],
 *       titulo: 'Pacientes Registrados'
 *     };
 *   </script>
 *   <script src="vetecare.js"></script>
 */

(function () {
    'use strict';

    const ADMIN_PASSWORD = 'vetecareadmin'; // ← Cambia tu contraseña aquí
    const API_BASE = 'http://localhost:5000';

    // ── Utilidades ────────────────────────────────────────────────────────────

    function mostrarToast(msg, tipo = 'exito') {
        let toast = document.getElementById('vc-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'vc-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.className = 'vc-toast vc-toast--' + tipo + ' vc-toast--visible';
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('vc-toast--visible'), 3500);
    }

    function pedirPassword(accion) {
        return new Promise((resolve) => {
            // Modal de contraseña
            let overlay = document.getElementById('vc-modal-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'vc-modal-overlay';
                overlay.innerHTML = `
                  <div class="vc-modal">
                    <h3>🔐 Acceso de Administrador</h3>
                    <p class="vc-modal-sub">Ingresa la contraseña para <span id="vc-modal-accion"></span>.</p>
                    <input type="password" id="vc-modal-input" placeholder="Contraseña admin" autocomplete="off">
                    <div class="vc-modal-btns">
                      <button id="vc-modal-ok" class="vc-btn-ok">Confirmar</button>
                      <button id="vc-modal-cancel" class="vc-btn-cancel">Cancelar</button>
                    </div>
                    <p id="vc-modal-error" class="vc-modal-error"></p>
                  </div>`;
                document.body.appendChild(overlay);
            }

            const input  = document.getElementById('vc-modal-input');
            const error  = document.getElementById('vc-modal-error');
            const ok     = document.getElementById('vc-modal-ok');
            const cancel = document.getElementById('vc-modal-cancel');

            document.getElementById('vc-modal-accion').textContent = accion;
            input.value = '';
            error.textContent = '';
            overlay.classList.add('vc-modal-visible');
            setTimeout(() => input.focus(), 100);

            function cerrar() {
                overlay.classList.remove('vc-modal-visible');
                ok.removeEventListener('click', confirmar);
                cancel.removeEventListener('click', cancelar);
                input.removeEventListener('keydown', keyHandler);
            }

            function confirmar() {
                if (input.value === ADMIN_PASSWORD) {
                    cerrar();
                    resolve(true);
                } else {
                    error.textContent = '❌ Contraseña incorrecta.';
                    input.value = '';
                    input.focus();
                }
            }

            function cancelar() { cerrar(); resolve(false); }
            function keyHandler(e) { if (e.key === 'Enter') confirmar(); }

            ok.addEventListener('click', confirmar);
            cancel.addEventListener('click', cancelar);
            input.addEventListener('keydown', keyHandler);
        });
    }

    // ── API ───────────────────────────────────────────────────────────────────

    async function apiGet(endpoint) {
        const r = await fetch(API_BASE + endpoint);
        return r.json();
    }
    async function apiPost(endpoint, data) {
        const r = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return r.json();
    }
    async function apiPut(endpoint, id, data) {
        const r = await fetch(`${API_BASE}${endpoint}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return r.json();
    }
    async function apiDelete(endpoint, id) {
        const r = await fetch(`${API_BASE}${endpoint}/${id}`, { method: 'DELETE' });
        return r.json();
    }

    // ── Tabla dinámica ────────────────────────────────────────────────────────

    function crearSeccionTabla(titulo) {
        // Contenedor de tabla debajo del formulario
        let sec = document.getElementById('vc-tabla-seccion');
        if (!sec) {
            sec = document.createElement('section');
            sec.id = 'vc-tabla-seccion';
            sec.innerHTML = `
              <div class="vc-tabla-header">
                <h2 id="vc-tabla-titulo"></h2>
                <span class="vc-badge" id="vc-badge">0 registros</span>
              </div>
              <div class="vc-tabla-wrap">
                <table id="vc-tabla">
                  <thead><tr id="vc-tabla-head"></tr></thead>
                  <tbody id="vc-tabla-body"></tbody>
                </table>
              </div>`;
            const main = document.querySelector('main') || document.body;
            // Insertar ANTES del btn-back
            const btnBack = document.querySelector('.btn-back');
            if (btnBack) main.insertBefore(sec, btnBack);
            else main.appendChild(sec);
        }
        document.getElementById('vc-tabla-titulo').textContent = titulo;
    }

    function renderTabla(docs, campos, columnas, endpoint) {
        const head = document.getElementById('vc-tabla-head');
        const body = document.getElementById('vc-tabla-body');
        const badge = document.getElementById('vc-badge');

        // Cabecera
        head.innerHTML = columnas.map(c => `<th>${c}</th>`).join('') + '<th>Acciones</th>';

        // Filas
        body.innerHTML = '';
        if (!docs.length) {
            body.innerHTML = `<tr><td colspan="${columnas.length + 1}" class="vc-empty">Sin registros aún.</td></tr>`;
        } else {
            docs.forEach(doc => {
                const tr = document.createElement('tr');
                tr.innerHTML = campos.map(c => `<td>${doc[c] ?? '—'}</td>`).join('');
                tr.innerHTML += `
                  <td class="vc-acciones">
                    <button class="vc-btn-edit" data-id="${doc._id}">✏️ Editar</button>
                    <button class="vc-btn-del"  data-id="${doc._id}">🗑️ Eliminar</button>
                  </td>`;

                // Editar
                tr.querySelector('.vc-btn-edit').addEventListener('click', async () => {
                    const ok = await pedirPassword('editar este registro');
                    if (!ok) return;
                    abrirFormEdicion(doc, campos, endpoint);
                });

                // Eliminar
                tr.querySelector('.vc-btn-del').addEventListener('click', async () => {
                    const ok = await pedirPassword('eliminar este registro');
                    if (!ok) return;
                    try {
                        await apiDelete(endpoint, doc._id);
                        mostrarToast('✅ Registro eliminado correctamente.');
                        cargarTabla();
                    } catch (e) {
                        mostrarToast('❌ Error al eliminar.', 'error');
                    }
                });

                body.appendChild(tr);
            });
        }

        badge.textContent = docs.length + (docs.length === 1 ? ' registro' : ' registros');
    }

    // ── Formulario de edición ─────────────────────────────────────────────────

    function abrirFormEdicion(doc, campos, endpoint) {
        let overlay = document.getElementById('vc-edit-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'vc-edit-overlay';
            document.body.appendChild(overlay);
        }

        const filas = campos.map(c => `
          <div class="vc-edit-group">
            <label>${c.replace(/_/g,' ').toUpperCase()}</label>
            <input type="text" name="${c}" value="${doc[c] ?? ''}" placeholder="${c}">
          </div>`).join('');

        overlay.innerHTML = `
          <div class="vc-edit-modal">
            <h3>✏️ Editar Registro</h3>
            <div class="vc-edit-campos">${filas}</div>
            <div class="vc-modal-btns">
              <button id="vc-edit-save" class="vc-btn-ok">Guardar Cambios</button>
              <button id="vc-edit-cancel" class="vc-btn-cancel">Cancelar</button>
            </div>
          </div>`;
        overlay.classList.add('vc-modal-visible');

        overlay.querySelector('#vc-edit-cancel').addEventListener('click', () => {
            overlay.classList.remove('vc-modal-visible');
        });

        overlay.querySelector('#vc-edit-save').addEventListener('click', async () => {
            const inputs = overlay.querySelectorAll('input');
            const datos = {};
            inputs.forEach(i => datos[i.name] = i.value);
            try {
                await apiPut(endpoint, doc._id, datos);
                mostrarToast('✅ Registro actualizado correctamente.');
                overlay.classList.remove('vc-modal-visible');
                cargarTabla();
            } catch (e) {
                mostrarToast('❌ Error al actualizar.', 'error');
            }
        });
    }

    // ── Cargar tabla ──────────────────────────────────────────────────────────

    let _cfg = null;
    async function cargarTabla() {
        if (!_cfg) return;
        try {
            const docs = await apiGet(_cfg.apiEndpoint);
            renderTabla(docs, _cfg.campos, _cfg.columnas, _cfg.apiEndpoint);
        } catch (e) {
            console.error('Error cargando tabla:', e);
            mostrarToast('⚠️ No se pudo conectar al servidor.', 'error');
        }
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    function init() {
        if (typeof VETECARE_CONFIG === 'undefined') return; // página sin config
        _cfg = VETECARE_CONFIG;

        // Inyectar estilos
        inyectarEstilos();

        // Preparar tabla
        crearSeccionTabla(_cfg.titulo);
        cargarTabla();

        // Capturar submit del formulario
        const form = document.getElementById(_cfg.formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = {};
            _cfg.campos.forEach(c => {
                const el = form.querySelector(`[name="${c}"]`);
                if (el) datos[c] = el.value;
            });

            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            try {
                const res = await apiPost(_cfg.apiEndpoint, datos);
                if (res.error) throw new Error(res.error);
                mostrarToast('✅ ' + (res.mensaje || 'Registro guardado correctamente.'));
                form.reset();
                cargarTabla();
            } catch (err) {
                mostrarToast('❌ Error: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || 'Registrar';
            }
        });

        // Guardar texto original del botón
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.dataset.originalText = btn.textContent;
    }

    // ── Estilos ───────────────────────────────────────────────────────────────

    function inyectarEstilos() {
        if (document.getElementById('vc-styles')) return;
        const style = document.createElement('style');
        style.id = 'vc-styles';
        style.textContent = `
/* ── Toast ── */
.vc-toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: #2C3E50; color: #fff; padding: 14px 22px;
  border-radius: 8px; font-family: Poppins, sans-serif; font-size: 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,.25);
  transform: translateY(80px); opacity: 0;
  transition: all .35s cubic-bezier(.34,1.56,.64,1);
  max-width: 320px;
}
.vc-toast--visible { transform: translateY(0); opacity: 1; }
.vc-toast--error   { background: #C0392B; }

/* ── Modal contraseña ── */
#vc-modal-overlay, #vc-edit-overlay {
  display:none; position:fixed; inset:0; z-index:9000;
  background: rgba(0,0,0,.55); backdrop-filter: blur(4px);
  align-items:center; justify-content:center;
}
#vc-modal-overlay.vc-modal-visible,
#vc-edit-overlay.vc-modal-visible { display:flex; }

.vc-modal, .vc-edit-modal {
  background:#fff; border-radius:12px; padding:32px 28px;
  width:min(420px, 92vw); box-shadow:0 20px 60px rgba(0,0,0,.3);
  font-family: Poppins, sans-serif; animation: vcPopIn .3s ease;
}
@keyframes vcPopIn { from{transform:scale(.85);opacity:0} to{transform:scale(1);opacity:1} }
.vc-modal h3, .vc-edit-modal h3 { margin:0 0 6px; color:#E67E22; font-size:1.2rem; }
.vc-modal-sub { color:#666; font-size:13px; margin:0 0 18px; }
.vc-modal input, .vc-edit-modal input {
  width:100%; padding:11px 14px; border:2px solid #ddd; border-radius:6px;
  font-family:Poppins,sans-serif; font-size:14px; margin-bottom:14px;
  transition: border-color .2s;
}
.vc-modal input:focus, .vc-edit-modal input:focus { border-color:#E67E22; outline:none; }
.vc-modal-btns { display:flex; gap:10px; }
.vc-btn-ok {
  flex:1; background:#E67E22; color:#fff; border:none; padding:11px;
  border-radius:6px; font-family:Poppins,sans-serif; font-weight:700;
  cursor:pointer; transition:background .2s;
}
.vc-btn-ok:hover { background:#D35400; }
.vc-btn-cancel {
  flex:1; background:#ECF0F1; color:#333; border:none; padding:11px;
  border-radius:6px; font-family:Poppins,sans-serif; font-weight:600;
  cursor:pointer; transition:background .2s;
}
.vc-btn-cancel:hover { background:#BDC3C7; }
.vc-modal-error { color:#C0392B; font-size:13px; margin:10px 0 0; min-height:18px; }

/* ── Edición ── */
.vc-edit-campos { max-height:55vh; overflow-y:auto; padding-right:4px; }
.vc-edit-group { margin-bottom:14px; }
.vc-edit-group label { display:block; font-size:12px; color:#E67E22; font-weight:600; margin-bottom:4px; }

/* ── Tabla ── */
#vc-tabla-seccion {
  width:min(860px, 95vw); margin-top:30px;
  background:#fff; border-radius:12px; border:2px solid #E0D5C8;
  overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.07);
}
.vc-tabla-header {
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 24px; background:#FDF3E6; border-bottom:2px solid #E0D5C8;
}
.vc-tabla-header h2 { margin:0; font-size:1rem; color:#444; font-family:Poppins,sans-serif; }
.vc-badge {
  background:#E67E22; color:#fff; font-size:12px; font-weight:700;
  padding:4px 12px; border-radius:20px; font-family:Poppins,sans-serif;
}
.vc-tabla-wrap { overflow-x:auto; }
#vc-tabla {
  width:100%; border-collapse:collapse; font-family:Poppins,sans-serif; font-size:13px;
}
#vc-tabla thead { background:#FDF3E6; }
#vc-tabla th {
  padding:12px 16px; text-align:left; font-weight:700;
  color:#E67E22; font-size:12px; text-transform:uppercase;
  letter-spacing:.05em; white-space:nowrap;
}
#vc-tabla td { padding:12px 16px; border-top:1px solid #F0EAE0; color:#333; }
#vc-tabla tbody tr:hover { background:#FDEBD0; transition:background .15s; }
.vc-empty { text-align:center; color:#999; font-style:italic; padding:30px !important; }
.vc-acciones { display:flex; gap:8px; white-space:nowrap; }
.vc-btn-edit, .vc-btn-del {
  border:none; padding:6px 12px; border-radius:5px; font-family:Poppins,sans-serif;
  font-size:12px; font-weight:600; cursor:pointer; transition:all .2s;
}
.vc-btn-edit { background:#EBF5FB; color:#2980B9; }
.vc-btn-edit:hover { background:#2980B9; color:#fff; }
.vc-btn-del  { background:#FDEDEC; color:#C0392B; }
.vc-btn-del:hover  { background:#C0392B; color:#fff; }
`;
        document.head.appendChild(style);
    }

    // Arrancar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
