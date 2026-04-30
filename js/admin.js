// ─────────────────────────────────────────────
// js/admin.js
// Panel de administración — login, slots, render
// Usa Firebase Auth para el login
// Usa photos.js para guardar/borrar fotos
// ─────────────────────────────────────────────

// ── Slots por sección ──────────────────────────
// ═══ SLOTS ═══════════════════════════════════
// Solo los que tienen espacio real en el front.
// Foto → se ve en la galería de esa sección.
// Video → se ve en la tab de Videos o en Campo/Proceso.
window.SLOTS = {
  hero: [
    { id: 'hero-main',    label: 'Foto principal — izquierda grande', type: 'foto'  },
    { id: 'hero-proceso', label: 'Foto superior derecha',             type: 'foto'  },
    { id: 'hero-musafil', label: 'Foto inferior derecha',             type: 'foto'  },
  ],
  campo: [
    { id: 'campo-finca',      label: 'Foto 1 — Finca panorámica',    type: 'foto'  },
    { id: 'campo-pseudo',     label: 'Foto 2 — Pseudotallo',          type: 'foto'  },
    { id: 'campo-transporte', label: 'Foto 3 — Transporte',           type: 'foto'  },
    { id: 'campo-video',      label: 'Video — Recorrido finca',       type: 'video' },
  ],
  proceso: [
    { id: 'proc-video',   label: 'Video — Desfibrado mecánico',  type: 'video' },
    { id: 'proc-maquina', label: 'Foto 1 — Maquinaria',          type: 'foto'  },
    { id: 'proc-corte',   label: 'Foto 2 — Corte fibra',         type: 'foto'  },
    { id: 'proc-humedad', label: 'Foto 3 — Control humedad',     type: 'foto'  },
    { id: 'proc-qc',      label: 'Foto 4 — Control calidad',     type: 'foto'  },
  ],
  fibra: [
    { id: 'fibra-macro', label: 'Foto 1 — Fibra macro',          type: 'foto'  },
    { id: 'fibra-lote',  label: 'Foto 2 — Lote embalado',        type: 'foto'  },
    { id: 'fibra-comp',  label: 'Foto 3 — Comparativa',          type: 'foto'  },
    { id: 'fibra-hilo',  label: 'Foto 4 — Hilo Musafil',         type: 'foto'  },
  ],
  lab: [
    { id: 'lab-informe',     label: 'Foto 1 — Informe ULA',      type: 'foto'  },
    { id: 'lab-resistencia', label: 'Foto 2 — Resistencia',      type: 'foto'  },
    { id: 'lab-hilatura',    label: 'Foto 3 — Hilatura',         type: 'foto'  },
  ],
  equipo: [
    { id: 'equipo-albert', label: 'Foto Albert Peña (avatar)', type: 'foto' },
  ],
  videos: [
    { id: 'video-principal', label: 'Video principal (tab Videos)', type: 'video' },
    { id: 'video-finca',     label: 'Video finca (tab Videos)',     type: 'video' },
    { id: 'video-maquina',   label: 'Video maquinaria (tab Videos)',type: 'video' },
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

  // Persistencia LOCAL para que el login sobreviva recargas
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => auth.signInWithEmailAndPassword(email, pwd))
    .then(() => {
      document.getElementById('adm-login-overlay').classList.remove('open');
      document.getElementById('adm-pwd-input').value = '';
      errEl.style.display = 'none';
      openAdminPanel();
    })
    .catch(err => {
      // Si falla por red, intentar abrir panel de todas formas
      // (las reglas de Firestore permiten write: true)
      if (err.code === 'auth/network-request-failed') {
        errEl.textContent   = 'Error de red con Firebase. Usando modo sin autenticación.';
        errEl.style.color   = '#C4760A';
        errEl.style.display = 'block';
        setTimeout(() => {
          document.getElementById('adm-login-overlay').classList.remove('open');
          openAdminPanel();
        }, 1500);
      } else {
        errEl.textContent   = 'Email o contraseña incorrectos.';
        errEl.style.color   = '#B91C1C';
        errEl.style.display = 'block';
        document.getElementById('adm-pwd-input').value = '';
      }
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
  renderTextEditor();
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
    const sizeInfo = data?.size ? ' · ' + (data.size/1024/1024).toFixed(1) + 'MB' : '';
    const durInfo  = data?.duration ? ' · ' + parseFloat(data.duration).toFixed(1) + 's' : '';
    return `
      <div class="adm-slot">
        <div class="adm-slot-preview" data-slot="${slot.id}"
          style="cursor:pointer;background:${hasVideoFile ? '#111' : 'var(--adm-bg2)'}">
          ${hasVideoFile
            ? `<video src="${videoSrc}"
                 style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1"
                 muted playsinline preload="metadata"></video>
               <div style="position:absolute;bottom:.4rem;right:.4rem;z-index:2;
                 background:rgba(0,0,0,.6);color:#fff;font-family:'DM Mono',monospace;
                 font-size:.5rem;padding:2px 6px;border-radius:4px">
                 🎥${durInfo}${sizeInfo}
               </div>`
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
  const caption = (data && data.caption) ? data.caption : '';
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
        ${hasFoto ? `
        <input type="text"
          class="adm-caption-input"
          data-slot="${slot.id}"
          placeholder="Título o descripción de la foto..."
          value="${caption.replace(/"/g,'&quot;')}"
          style="width:100%;margin:.35rem 0;padding:.35rem .5rem;font-family:'DM Mono',monospace;
            font-size:.58rem;border:1px solid var(--adm-border);border-radius:5px;
            background:var(--adm-bg);color:var(--adm-text);outline:none;">
        <div style="display:flex;gap:.4rem;margin-bottom:.35rem">
          <div class="adm-action-btn" data-slot="${slot.id}" data-action="save-caption"
            style="background:var(--adm-green);color:#fff;border-color:var(--adm-green)">
            ✓ Guardar título
          </div>
        </div>` : ''}
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

  if (action === 'save-caption') {
    const input = btn.closest('.adm-slot')?.querySelector('.adm-caption-input');
    const caption = input?.value?.trim() || '';
    const photo = window.photos[slot];
    if (!photo) return;
    photo.caption = caption;
    savePhotoToFirestore(slot, photo)
      .then(() => { applyPhotosToLanding(); admToast('✓ Título guardado'); })
      .catch(e => admToast('Error: ' + e.message, 'err'));
  }
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

// ═══════════════════════════════════════════
// EDITOR DE TEXTOS UNIVERSAL
// Detecta automáticamente todos los elementos
// con data-eid en la landing y los hace editables
// ═══════════════════════════════════════════

const TEXTS_KEY = 'inmotex_texts';
let savedTexts  = {};

// Cargar textos desde Firestore
async function loadTexts() {
  try {
    const doc = await db.collection('config').doc('textos').get();
    if (doc.exists) { savedTexts = doc.data(); applyTextsToLanding(); }
  } catch(e) {
    try { savedTexts = JSON.parse(localStorage.getItem(TEXTS_KEY) || '{}'); applyTextsToLanding(); } catch(e2){}
  }
}

// Aplicar textos al DOM
function applyTextsToLanding() {
  Object.entries(savedTexts).forEach(([eid, value]) => {
    const el = document.querySelector('[data-eid="' + eid + '"]');
    if (!el || !value) return;
    // Si tiene hijos de estructura (em, strong) usa innerHTML
    if (el.querySelector('em,strong,span')) {
      el.innerHTML = value;
    } else {
      el.textContent = value;
    }
  });
}

// Guardar un texto
async function saveText(eid, value) {
  savedTexts[eid] = value;
  try {
    await db.collection('config').doc('textos').set(savedTexts, { merge: true });
  } catch(e) {
    localStorage.setItem(TEXTS_KEY, JSON.stringify(savedTexts));
  }
  applyTextsToLanding();
}

// Renderizar editor de textos — detecta TODOS los data-eid del DOM
function renderTextEditor() {
  const container = document.getElementById('text-editor-slots');
  if (!container) return;

  // Encontrar todos los elementos editables en la landing
  const editableEls = Array.from(document.querySelectorAll('[data-eid]'));
  if (!editableEls.length) {
    container.innerHTML = '<div style="font-family:'DM Mono',monospace;font-size:.62rem;color:var(--adm-muted)">No se encontraron textos editables.</div>';
    return;
  }

  // Agrupar por sección basado en el prefijo del eid
  const groups = {};
  editableEls.forEach(el => {
    const eid     = el.dataset.eid;
    const prefix  = eid.split('-')[0];
    const labels  = {
      hero:'Hero', stat:'Estadísticas', proc:'Proceso',
      ev:'Galería', gal:'Galería', prod:'Producto',
      founder:'Equipo', inv:'Inversión', contact:'Contacto',
    };
    const group = labels[prefix] || prefix;
    if (!groups[group]) groups[group] = [];
    groups[group].push({ eid, el });
  });

  container.innerHTML = Object.entries(groups).map(([group, items]) => `
    <div style="margin-bottom:1.25rem">
      <div style="font-family:'DM Mono',monospace;font-size:.58rem;color:var(--adm-green);
        text-transform:uppercase;letter-spacing:.12em;margin-bottom:.6rem;
        padding-bottom:.4rem;border-bottom:1px solid var(--adm-border2)">
        ${group}
      </div>
      ${items.map(({eid, el}) => {
        const currentVal = savedTexts[eid] || el.textContent?.trim() || el.innerText?.trim() || '';
        const label = el.dataset.label || eid.replace(/-/g,' ').replace(/\w/g,l=>l.toUpperCase());
        const isLong = currentVal.length > 80 || eid.includes('desc') || eid.includes('sub');
        return `
          <div style="background:var(--adm-card);border:1px solid var(--adm-border);
            border-radius:8px;padding:.8rem 1rem;margin-bottom:.5rem;">
            <div style="font-family:'DM Mono',monospace;font-size:.56rem;color:var(--adm-muted);
              margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.08em">${label}</div>
            ${isLong
              ? `<textarea id="txt-${eid}" rows="3"
                   style="width:100%;resize:vertical;font-family:'DM Mono',monospace;font-size:.72rem;
                     padding:.55rem .7rem;border:1px solid var(--adm-border);border-radius:6px;
                     background:var(--adm-bg);color:var(--adm-text);outline:none;line-height:1.6;
                     font-family:inherit">${currentVal}</textarea>`
              : `<input type="text" id="txt-${eid}" value="${currentVal.replace(/"/g,'&quot;').replace(/</g,'&lt;')}"
                   style="width:100%;font-family:'DM Mono',monospace;font-size:.72rem;
                     padding:.55rem .7rem;border:1px solid var(--adm-border);border-radius:6px;
                     background:var(--adm-bg);color:var(--adm-text);outline:none;">`
            }
            <button onclick="saveSingleText('${eid}')"
              style="margin-top:.45rem;padding:.35rem .9rem;background:var(--adm-green);border:none;
                color:#F7F2E8;font-family:'DM Mono',monospace;font-size:.58rem;font-weight:500;
                text-transform:uppercase;letter-spacing:.06em;cursor:pointer;border-radius:5px;">
              ✓ Guardar
            </button>
          </div>`;
      }).join('')}
    </div>`
  ).join('');
}

window.saveSingleText = async function(eid) {
  const input = document.getElementById('txt-' + eid);
  if (!input) return;
  await saveText(eid, input.value.trim());
  admToast('✓ Texto actualizado en la landing');
};

window.addEventListener('load', () => { loadTexts(); });
