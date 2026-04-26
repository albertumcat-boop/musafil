// ─────────────────────────────────────────────
// js/admin.js
// Panel de administración — login, slots, render
// Usa Firebase Auth para el login
// Usa photos.js para guardar/borrar fotos
// ─────────────────────────────────────────────

// ── Slots por sección ──────────────────────────
window.SLOTS = {
  hero: [
    { id: 'hero-main',     label: 'Foto principal (grande)' },
    { id: 'hero-proceso',  label: 'Proceso de desfibrado' },
    { id: 'hero-musafil',  label: 'Muestra de Musafil' },
  ],
  campo: [
    { id: 'campo-finca',      label: 'Finca El Vigía — panorámica' },
    { id: 'campo-pseudo',     label: 'Pseudotallo post-cosecha' },
    { id: 'campo-transporte', label: 'Recolección y transporte' },
    { id: 'campo-video',      label: 'Video recorrido finca' },
  ],
  proceso: [
    { id: 'proc-video',   label: 'Video desfibrado mecánico' },
    { id: 'proc-maquina', label: 'Maquinaria importada' },
    { id: 'proc-corte',   label: 'Corte fibra 25–38mm' },
    { id: 'proc-humedad', label: 'Control de humedad' },
    { id: 'proc-qc',      label: 'Control de calidad' },
  ],
  fibra: [
    { id: 'fibra-macro', label: 'Fibra Musafil — vista macro' },
    { id: 'fibra-lote',  label: 'Lote embalado 50kg' },
    { id: 'fibra-comp',  label: 'Comparativa fibra vs algodón' },
    { id: 'fibra-hilo',  label: 'Muestra hilo Musafil 30/70' },
  ],
  lab: [
    { id: 'lab-informe',     label: 'Informe ULA Mérida' },
    { id: 'lab-resistencia', label: 'Prueba de resistencia' },
    { id: 'lab-hilatura',    label: 'Prueba hilatura Open-end' },
  ],
  equipo: [
    { id: 'equipo-albert', label: 'Foto Albert Peña' },
    { id: 'equipo-planta', label: 'Equipo en planta' },
    { id: 'equipo-finca',  label: 'Visita a finca' },
  ],
};

// ── LOGIN con Firebase Auth ────────────────────
function doAdminLogin() {
  const email = document.getElementById('adm-email-input')?.value?.trim();
  const pwd   = document.getElementById('adm-pwd-input')?.value?.trim();
  const errEl = document.getElementById('adm-err');
  const btn   = document.querySelector('.adm-btn');

  if (!email || !pwd) {
    errEl.textContent = 'Ingresa email y contraseña.';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Entrando...';
  btn.disabled    = true;

  auth.signInWithEmailAndPassword(email, pwd)
    .then(() => {
      document.getElementById('adm-login-overlay').classList.remove('open');
      document.getElementById('adm-pwd-input').value = '';
      errEl.style.display = 'none';
      openAdminPanel();
    })
    .catch(() => {
      errEl.textContent   = 'Email o contraseña incorrectos.';
      errEl.style.display = 'block';
      document.getElementById('adm-pwd-input').value = '';
    })
    .finally(() => {
      btn.textContent = 'Entrar al panel →';
      btn.disabled    = false;
    });
}

function adminLogout() {
  auth.signOut().then(() => {
    closeAdminPanel();
    admToast('Sesión cerrada');
  });
}

// ── Abrir / cerrar panel ───────────────────────
function openAdminPanel() {
  renderAllSlots();
  updateStats();
  document.getElementById('admin-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdminPanel() {
  document.getElementById('admin-panel').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Render de todos los slots ──────────────────
function renderAllSlots() {
  Object.entries(window.SLOTS).forEach(([section, slots]) => {
    const container = document.getElementById('slots-' + section);
    if (!container) return;
    container.innerHTML = slots.map(slot => renderSlot(slot)).join('');
  });
}

function renderSlot(slot) {
  const photo    = window.photos[slot.id];
  const hasPhoto = !!photo;
  const isVideo  = slot.id.includes('video');
  return `
    <div class="adm-slot">
      <div class="adm-slot-preview" data-slot="${slot.id}">
        ${hasPhoto
          ? `<img src="${photo.src}" alt="${slot.label}"
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
          : `<div class="adm-slot-icon">${isVideo ? '🎥' : '📷'}</div>
             <div class="adm-slot-empty-txt">${slot.label}</div>`
        }
        <div class="adm-slot-overlay">
          <div style="font-size:1.5rem">${hasPhoto ? '🔄' : '↑'}</div>
          <div class="adm-overlay-txt">${hasPhoto ? 'Cambiar foto' : 'Subir foto'}</div>
        </div>
      </div>
      <div class="adm-slot-info">
        <div class="adm-slot-name" title="${photo ? photo.name : slot.label}">
          ${photo ? photo.name : slot.label}
        </div>
        <div class="adm-slot-actions">
          <div class="adm-action-btn" data-slot="${slot.id}" data-action="upload">
            ${hasPhoto ? '↑ Cambiar' : '↑ Subir'}
          </div>
          ${hasPhoto
            ? `<div class="adm-action-btn del" data-slot="${slot.id}" data-action="delete">✕</div>`
            : ''}
        </div>
      </div>
    </div>`;
}

// ── Delegación de eventos en botones de slot ───
document.addEventListener('click', e => {
  const btn = e.target.closest('.adm-action-btn[data-action]');
  if (!btn) return;
  const { slot, action } = btn.dataset;
  if (action === 'upload') {
    window.currentSlot = slot;
    document.getElementById('adm-file-input').click();
  }
  if (action === 'delete') deletePhoto(slot);
});

// ── Eliminar foto ──────────────────────────────
async function deletePhoto(slotId) {
  if (!confirm('¿Eliminar esta foto?')) return;
  admToast('Eliminando...');
  try {
    await deletePhotoFromFirestore(slotId);
    renderAllSlots();
    updateStats();
    applyPhotosToLanding();
    admToast('✓ Foto eliminada');
  } catch(e) {
    admToast('Error: ' + e.message, 'err');
  }
}

async function clearAllPhotos() {
  if (!confirm('¿Eliminar TODAS las fotos? No se puede deshacer.')) return;
  admToast('Eliminando todas...');
  try {
    await deleteAllPhotosFromFirestore();
    renderAllSlots();
    updateStats();
    applyPhotosToLanding();
    admToast('✓ Todas las fotos eliminadas');
  } catch(e) {
    admToast('Error: ' + e.message, 'err');
  }
}

// ── Stats ──────────────────────────────────────
function updateStats() {
  const total    = Object.keys(window.photos).length;
  const allSlots = Object.values(window.SLOTS).flat().length;
  const sizeB    = Object.values(window.photos).reduce((s,p) => s+(p.size||0), 0);
  const sizeMB   = (sizeB / 1024 / 1024).toFixed(1);
  const get = id => document.getElementById(id);
  if (get('stat-total'))   get('stat-total').textContent   = total;
  if (get('stat-pending')) get('stat-pending').textContent = allSlots - total;
  if (get('stat-size'))    get('stat-size').textContent    = sizeMB + ' MB';
}

// ── Toast ──────────────────────────────────────
let _toastTimer;
function admToast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  if (!el) return;
  el.textContent       = msg;
  el.style.borderColor = type === 'err' ? 'rgba(163,45,45,0.5)' : 'rgba(58,107,34,0.4)';
  el.style.color       = type === 'err' ? '#ff8080' : '#5C5240';
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ── File input → abre el editor ───────────────
document.getElementById('adm-file-input')
  ?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || !window.currentSlot) return;
    if (file.size > 20 * 1024 * 1024) {
      admToast('Archivo muy grande. Máximo 20MB', 'err');
      this.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => openImageEditor(ev.target.result, file.name);
    reader.readAsDataURL(file);
    this.value = '';
  });

// ── Teclado ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('adm-login-overlay')?.classList.remove('open');
    closeAdminPanel();
  }
});
document.getElementById('adm-pwd-input')
  ?.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });
