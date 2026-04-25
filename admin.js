/* ═══════════════════════════════════════════════
   INMOTEX — admin.js
   Panel de administración para gestión de fotos

   CLAVE INICIAL: inmotex2026
   Cámbiala desde el panel → sección Seguridad
═══════════════════════════════════════════════ */

const ADMIN_KEY  = 'adm_pw';
const PHOTOS_KEY = 'inmotex_photos';
const DEFAULT_PWD = 'inmotex2026';

// ── Slots por sección ──────────────────────────
const SLOTS = {
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
    { id: 'lab-informe',    label: 'Informe ULA Mérida' },
    { id: 'lab-resistencia',label: 'Prueba de resistencia' },
    { id: 'lab-hilatura',   label: 'Prueba hilatura Open-end' },
  ],
  equipo: [
    { id: 'equipo-albert', label: 'Foto Albert Peña' },
    { id: 'equipo-planta', label: 'Equipo en planta' },
    { id: 'equipo-finca',  label: 'Visita a finca' },
  ],
};

// Mapa: slotId → selector en la landing
const LANDING_MAP = {
  'campo-finca':       '#tab-campo .gallery-card:nth-child(1) .media-placeholder',
  'campo-pseudo':      '#tab-campo .gallery-card:nth-child(2) .media-placeholder',
  'campo-transporte':  '#tab-campo .gallery-card:nth-child(3) .media-placeholder',
  'proc-maquina':      '#tab-proceso .gallery-card:nth-child(2) .media-placeholder',
  'proc-corte':        '#tab-proceso .gallery-card:nth-child(3) .media-placeholder',
  'proc-humedad':      '#tab-proceso .gallery-card:nth-child(4) .media-placeholder',
  'proc-qc':           '#tab-proceso .gallery-card:nth-child(5) .media-placeholder',
  'fibra-macro':       '#tab-fibra .gallery-card:nth-child(1) .media-placeholder',
  'fibra-lote':        '#tab-fibra .gallery-card:nth-child(2) .media-placeholder',
  'fibra-comp':        '#tab-fibra .gallery-card:nth-child(3) .media-placeholder',
  'fibra-hilo':        '#tab-fibra .gallery-card:nth-child(4) .media-placeholder',
  'lab-informe':       '#tab-laboratorio .gallery-card:nth-child(1) .media-placeholder',
  'lab-resistencia':   '#tab-laboratorio .gallery-card:nth-child(2) .media-placeholder',
  'lab-hilatura':      '#tab-laboratorio .gallery-card:nth-child(3) .media-placeholder',
};

// ── Estado ─────────────────────────────────────
let photos = {};
let currentSlot = null;

// ── Persistencia ───────────────────────────────
function loadPhotos() {
  try {
    const raw = localStorage.getItem(PHOTOS_KEY);
    photos = raw ? JSON.parse(raw) : {};
  } catch { photos = {}; }
}

function savePhotos() {
  localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
  updateStats();
  applyPhotosToLanding();
}

// ── Password ───────────────────────────────────
function getPassword() {
  return localStorage.getItem(ADMIN_KEY) || DEFAULT_PWD;
}

// ── Login ──────────────────────────────────────
function doAdminLogin() {
  const input = document.getElementById('adm-pwd-input');
  const errEl = document.getElementById('adm-err');
  if (input.value === getPassword()) {
    document.getElementById('adm-login-overlay').classList.remove('open');
    input.value = '';
    errEl.style.display = 'none';
    openAdminPanel();
  } else {
    errEl.style.display = 'block';
    input.value = '';
    input.focus();
    // Shake effect
    input.style.borderColor = '#ff6b6b';
    setTimeout(() => input.style.borderColor = '', 1000);
  }
}

function openAdminPanel() {
  loadPhotos();
  renderAllSlots();
  updateStats();
  document.getElementById('admin-panel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdminPanel() {
  document.getElementById('admin-panel').classList.remove('open');
  document.body.style.overflow = '';
}

function adminLogout() {
  closeAdminPanel();
  admToast('Sesión cerrada correctamente');
}

function changePassword() {
  const newPwd = document.getElementById('new-pwd').value.trim();
  if (newPwd.length < 6) {
    admToast('La clave debe tener al menos 6 caracteres', 'err');
    return;
  }
  localStorage.setItem(ADMIN_KEY, newPwd);
  document.getElementById('new-pwd').value = '';
  admToast('✓ Clave actualizada. Guárdala en un lugar seguro.');
}

// ── Render de slots ─────────────────────────────
function renderAllSlots() {
  Object.entries(SLOTS).forEach(([section, slots]) => {
    const container = document.getElementById('slots-' + section);
    if (!container) return;
    container.innerHTML = slots.map(slot => renderSlot(slot)).join('');
  });

  // Eventos en previews
  document.querySelectorAll('.adm-slot-preview[data-slot]').forEach(el => {
    el.addEventListener('click', () => {
      currentSlot = el.dataset.slot;
      document.getElementById('adm-file-input').click();
    });
  });
}

function renderSlot(slot) {
  const photo    = photos[slot.id];
  const hasPhoto = !!photo;
  const isVideo  = slot.id.includes('video');

  return `
    <div class="adm-slot">
      <div class="adm-slot-preview" data-slot="${slot.id}">
        ${hasPhoto
          ? `<img src="${photo.src}" alt="${slot.label}">`
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
            ? `<div class="adm-action-btn del" data-slot="${slot.id}" data-action="delete">✕ Borrar</div>`
            : ''
          }
        </div>
      </div>
    </div>`;
}

// Delegación de eventos en botones de acción
document.addEventListener('click', e => {
  const btn = e.target.closest('.adm-action-btn[data-action]');
  if (!btn) return;
  const { slot, action } = btn.dataset;
  if (action === 'upload') {
    currentSlot = slot;
    document.getElementById('adm-file-input').click();
  }
  if (action === 'delete') {
    deletePhoto(slot);
  }
});

// ── File input ─────────────────────────────────
document.getElementById('adm-file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file || !currentSlot) return;

  const maxMB = 8;
  if (file.size > maxMB * 1024 * 1024) {
    admToast(`Archivo muy grande. Máximo ${maxMB}MB`, 'err');
    this.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    photos[currentSlot] = {
      src:  ev.target.result,
      name: file.name,
      type: file.type,
      size: file.size,
      date: new Date().toLocaleDateString('es-VE'),
    };
    savePhotos();
    renderAllSlots();
    admToast(`✓ Guardado — ${file.name}`);
    currentSlot = null;
  };
  reader.readAsDataURL(file);
  this.value = '';
});

// ── Aplicar fotos a la landing ─────────────────
function applyPhotosToLanding() {
  Object.entries(photos).forEach(([slotId, photo]) => {

    // Galería
    if (LANDING_MAP[slotId]) {
      const el = document.querySelector(LANDING_MAP[slotId]);
      if (!el) return;
      let img = el.querySelector('img.injected');
      if (!img) {
        img = document.createElement('img');
        img.className = 'injected';
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
        el.appendChild(img);
        // Ocultar iconos placeholder
        el.querySelectorAll('.media-icon, .img-label').forEach(c => c.style.display = 'none');
      }
      img.src  = photo.src;
      img.alt  = photo.name;
    }

    // Hero main
    if (slotId === 'hero-main') {
      const el = document.querySelector('.hero-img-main');
      if (el) {
        el.style.backgroundImage    = `url(${photo.src})`;
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        el.querySelectorAll('.img-icon, .img-label').forEach(c => c.style.display = 'none');
      }
    }

    // Hero slot 2
    if (slotId === 'hero-proceso') {
      const el = document.querySelector('.hero-visual-grid .hero-img-placeholder:nth-child(2)');
      if (el) {
        el.style.backgroundImage    = `url(${photo.src})`;
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        el.querySelectorAll('.img-icon, .img-label').forEach(c => c.style.display = 'none');
      }
    }

    // Hero slot 3
    if (slotId === 'hero-musafil') {
      const el = document.querySelector('.hero-visual-grid .hero-img-placeholder:nth-child(3)');
      if (el) {
        el.style.backgroundImage    = `url(${photo.src})`;
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        el.querySelectorAll('.img-icon, .img-label').forEach(c => c.style.display = 'none');
      }
    }

    // Foto de Albert Peña
    if (slotId === 'equipo-albert') {
      const el = document.querySelector('.founder-avatar');
      if (el) {
        el.style.backgroundImage    = `url(${photo.src})`;
        el.style.backgroundSize     = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      }
    }
  });
}

// ── Borrar foto ────────────────────────────────
function deletePhoto(slotId) {
  if (!confirm('¿Eliminar esta foto? La acción no se puede deshacer.')) return;
  delete photos[slotId];
  savePhotos();
  renderAllSlots();
  admToast('Foto eliminada');
  setTimeout(() => location.reload(), 700);
}

function clearAllPhotos() {
  if (!confirm('¿Eliminar TODAS las fotos? Esta acción no se puede deshacer.')) return;
  photos = {};
  localStorage.removeItem(PHOTOS_KEY);
  admToast('Todas las fotos eliminadas');
  setTimeout(() => location.reload(), 700);
}

// ── Stats ──────────────────────────────────────
function updateStats() {
  const total    = Object.keys(photos).length;
  const allSlots = Object.values(SLOTS).flat().length;
  const pending  = allSlots - total;
  const sizeB    = Object.values(photos).reduce((s, p) => s + (p.size || 0), 0);
  const sizeMB   = (sizeB / (1024 * 1024)).toFixed(1);

  const get = id => document.getElementById(id);
  if (get('stat-total'))   get('stat-total').textContent   = total;
  if (get('stat-pending')) get('stat-pending').textContent = pending;
  if (get('stat-size'))    get('stat-size').textContent    = sizeMB + ' MB';
}

// ── Toast ──────────────────────────────────────
let _toastTimer;
function admToast(msg, type = '') {
  const el = document.getElementById('adm-toast');
  if (!el) return;
  el.textContent         = msg;
  el.style.borderColor   = type === 'err' ? 'rgba(163,45,45,0.4)' : 'rgba(82,183,136,0.3)';
  el.style.color         = type === 'err' ? '#ff8080' : '#B7E4C7';
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Esc para cerrar ────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('adm-login-overlay').classList.remove('open');
    closeAdminPanel();
  }
});

// ── Enter en input de clave ────────────────────
document.getElementById('adm-pwd-input')
  ?.addEventListener('keydown', e => { if (e.key === 'Enter') doAdminLogin(); });

// ── Init al cargar ─────────────────────────────
window.addEventListener('load', () => {
  loadPhotos();
  applyPhotosToLanding();
});
