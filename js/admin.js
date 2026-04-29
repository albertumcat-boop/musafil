// ─────────────────────────────────────────────
// js/admin.js
// Panel de administración — login, slots, render
// Usa Firebase Auth para el login
// Usa photos.js para guardar/borrar fotos
// ─────────────────────────────────────────────

// ── Slots por sección ──────────────────────────
window.SLOTS = {
  hero: [
    { id: 'hero-main',     label: 'Foto principal (grande)',     type: 'foto'  },
    { id: 'hero-proceso',  label: 'Proceso de desfibrado',       type: 'foto'  },
    { id: 'hero-musafil',  label: 'Muestra de Musafil',          type: 'foto'  },
  ],
  campo: [
    { id: 'campo-finca',      label: 'Finca El Vigía — panorámica', type: 'foto'  },
    { id: 'campo-pseudo',     label: 'Pseudotallo post-cosecha',    type: 'foto'  },
    { id: 'campo-transporte', label: 'Recolección y transporte',    type: 'foto'  },
    { id: 'campo-video',      label: 'Video recorrido finca',        type: 'video' },
  ],
  proceso: [
    { id: 'proc-video',   label: 'Video desfibrado mecánico',    type: 'video' },
    { id: 'proc-maquina', label: 'Maquinaria importada',         type: 'foto'  },
    { id: 'proc-corte',   label: 'Corte fibra 25–38mm',          type: 'foto'  },
    { id: 'proc-humedad', label: 'Control de humedad',           type: 'foto'  },
    { id: 'proc-qc',      label: 'Control de calidad',           type: 'foto'  },
  ],
  fibra: [
    { id: 'fibra-macro', label: 'Fibra Musafil — vista macro',   type: 'foto'  },
    { id: 'fibra-lote',  label: 'Lote embalado 50kg',            type: 'foto'  },
    { id: 'fibra-comp',  label: 'Comparativa fibra vs algodón',  type: 'foto'  },
    { id: 'fibra-hilo',  label: 'Muestra hilo Musafil 30/70',    type: 'foto'  },
  ],
  lab: [
    { id: 'lab-informe',     label: 'Informe ULA Mérida',        type: 'foto'  },
    { id: 'lab-resistencia', label: 'Prueba de resistencia',     type: 'foto'  },
    { id: 'lab-hilatura',    label: 'Prueba hilatura Open-end',  type: 'foto'  },
  ],
  equipo: [
    { id: 'equipo-albert', label: 'Foto Albert Peña',            type: 'foto'  },
    { id: 'equipo-planta', label: 'Equipo en planta',            type: 'foto'  },
    { id: 'equipo-finca',  label: 'Visita a finca',              type: 'foto'  },
  ],
  videos: [
    { id: 'video-principal', label: 'Video principal — proceso completo', type: 'video' },
    { id: 'video-finca',     label: 'Video recorrido finca',              type: 'video' },
    { id: 'video-maquina',   label: 'Demo maquinaria desfibrado',         type: 'video' },
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
  const isVideo = slot.type === 'video';
  const data    = window.photos[slot.id]; // para video: { url, title }; para foto: { src, name }
  const hasFoto = !isVideo && !!data?.src;
  const hasVideo = isVideo && !!data?.url;

  if (isVideo) {
    // ── Slot de video: botón de subida igual que foto ──
    const hasVideoFile = !!data?.src || !!data?.url;
    const videoSrc = data?.url || data?.src || '';
    return `
      <div class="adm-slot">
        <div class="adm-slot-preview" data-slot="${slot.id}"
          style="background:${hasVideoFile ? '#111' : 'var(--adm-bg2)'}">
          ${hasVideoFile
            ? `<video src="${videoSrc}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"
                 muted playsinline preload="metadata"></video>`
            : `<div class="adm-slot-icon">🎥</div>
               <div class="adm-slot-empty-txt">${slot.label}</div>`
          }
          <div class="adm-slot-overlay">
            <div style="font-size:1.5rem">${hasVideoFile ? '🔄' : '↑'}</div>
            <div class="adm-overlay-txt">${hasVideoFile ? 'Cambiar video' : 'Subir video'}</div>
          </div>
        </div>
        <div class="adm-slot-info">
          <div class="adm-slot-name" title="${data ? data.name : slot.label}">
            ${data ? (data.name + (data.duration ? ' · ' + data.duration.toFixed(1) + 's' : '')) : slot.label}
          </div>
          <div class="adm-slot-actions">
            <div class="adm-action-btn" data-slot="${slot.id}" data-action="upload">
              ${hasVideoFile ? '↑ Cambiar' : '↑ Subir'}
            </div>
            ${hasVideoFile
              ? `<div class="adm-action-btn del" data-slot="${slot.id}" data-action="delete">✕</div>`
              : ''}
          </div>
        </div>
      </div>`;
  }

  // ── Slot de foto normal ──
  return `
    <div class="adm-slot">
      <div class="adm-slot-preview" data-slot="${slot.id}">
        ${hasFoto
          ? `<img src="${data.src}" alt="${slot.label}"
               style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
          : `<div class="adm-slot-icon">📷</div>
             <div class="adm-slot-empty-txt">${slot.label}</div>`
        }
        <div class="adm-slot-overlay">
          <div style="font-size:1.5rem">${hasFoto ? '🔄' : '↑'}</div>
          <div class="adm-overlay-txt">${hasFoto ? 'Cambiar foto' : 'Subir foto'}</div>
        </div>
      </div>
      <div class="adm-slot-info">
        <div class="adm-slot-name" title="${data ? data.name : slot.label}">
          ${data ? data.name : slot.label}
        </div>
        <div class="adm-slot-actions">
          <div class="adm-action-btn" data-slot="${slot.id}" data-action="upload">
            ${hasFoto ? '↑ Cambiar' : '↑ Subir'}
          </div>
          ${hasFoto
            ? `<div class="adm-action-btn del" data-slot="${slot.id}" data-action="delete">✕</div>`
            : ''}
        </div>
      </div>
    </div>`;
}

// Extrae el ID de cualquier formato de URL de YouTube
function extractYouTubeId(url) {
  if (!url) return '';
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return url; // si ya es el ID directo
}

// ── Delegación de eventos en botones de slot ───
document.addEventListener('click', e => {
  const btn = e.target.closest('.adm-action-btn[data-action]');
  if (!btn) return;
  const { slot, action } = btn.dataset;

  if (action === 'upload') {
    window.currentSlot = slot;
    const inp = document.getElementById('adm-file-input');
    const slotDef = Object.values(window.SLOTS).flat().find(s => s.id === slot);
    inp.accept = slotDef?.type === 'video' ? 'video/*' : 'image/*';
    inp.click();
  }
  if (action === 'delete') deletePhoto(slot);


});

// ── Guardar URL de video ──────────────────────
async function saveVideoUrl(slotId, url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) { admToast('URL de YouTube no válida', 'err'); return; }
  admToast('Guardando...');
  try {
    const data = { url, videoId, type: 'video', date: new Date().toLocaleDateString('es-VE') };
    await savePhotoToFirestore(slotId, data);
    applyPhotosToLanding();
    renderAllSlots();
    updateStats();
    admToast('✓ Video guardado — aparece en la landing');
  } catch(e) {
    admToast('Error: ' + e.message, 'err');
  }
}

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

// ── File input → abre editor de foto o video ──
document.getElementById('adm-file-input')
  ?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || !window.currentSlot) return;

    const isVideo = file.type.startsWith('video/');
    const maxMB   = isVideo ? 500 : 20;

    if (file.size > maxMB * 1024 * 1024) {
      admToast(`Archivo muy grande. Máximo ${maxMB}MB`, 'err');
      this.value = '';
      return;
    }

    if (isVideo) {
      // Abre el editor de video
      openVideoEditor(file, window.currentSlot);
    } else {
      // Abre el editor de imagen
      const reader = new FileReader();
      reader.onload = ev => openImageEditor(ev.target.result, file.name);
      reader.readAsDataURL(file);
    }
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
