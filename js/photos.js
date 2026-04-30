// ─────────────────────────────────────────────
// js/photos.js
// Lectura y escritura de fotos en Firestore
// Cada foto = 1 documento en /fotos/{slotId}
// Base64 comprimido < 950KB por documento
//
// Para cambiar la colección: cambia 'fotos'
// ─────────────────────────────────────────────

const COLLECTION = 'fotos';

// Estado en memoria — compartido con admin.js y editor.js
window.photos      = {};
window.currentSlot = null;

// ── Mapa: slotId → selector DOM de la landing ──
// LANDING_MAP: usa data-slot-id en el HTML para encontrar cada slot
// El selector es: [data-slot-id="slotId"] .gal-cell-inner
// Para el hero y equipo usa selectores directos
window.LANDING_MAP = {
  'hero-main':       '.hero-img-main',
  'hero-proceso':    '.hero-visual-grid .hero-img-placeholder:nth-child(2)',
  'hero-musafil':    '.hero-visual-grid .hero-img-placeholder:nth-child(3)',
  'equipo-albert':   '.founder-avatar',
  // Galería — encontrados por data-slot-id
  'campo-finca':     '[data-slot-id="campo-finca"] .gal-cell-inner',
  'campo-pseudo':    '[data-slot-id="campo-pseudo"] .gal-cell-inner',
  'campo-transporte':'[data-slot-id="campo-transporte"] .gal-cell-inner',
  'campo-video':     '[data-slot-id="campo-video"] .gal-cell-inner',
  'proc-video':      '[data-slot-id="proc-video"] .gal-cell-inner',
  'proc-maquina':    '[data-slot-id="proc-maquina"] .gal-cell-inner',
  'proc-corte':      '[data-slot-id="proc-corte"] .gal-cell-inner',
  'proc-humedad':    '[data-slot-id="proc-humedad"] .gal-cell-inner',
  'proc-qc':         '[data-slot-id="proc-qc"] .gal-cell-inner',
  'fibra-macro':     '[data-slot-id="fibra-macro"] .gal-cell-inner',
  'fibra-lote':      '[data-slot-id="fibra-lote"] .gal-cell-inner',
  'fibra-comp':      '[data-slot-id="fibra-comp"] .gal-cell-inner',
  'fibra-hilo':      '[data-slot-id="fibra-hilo"] .gal-cell-inner',
  'lab-informe':     '[data-slot-id="lab-informe"] .gal-cell-inner',
  'lab-resistencia': '[data-slot-id="lab-resistencia"] .gal-cell-inner',
  'lab-hilatura':    '[data-slot-id="lab-hilatura"] .gal-cell-inner',
};

// ── Cargar todas las fotos desde Firestore ──────
async function loadPhotosFromFirestore() {
  try {
    const snap = await db.collection(COLLECTION).get();
    snap.forEach(doc => {
      window.photos[doc.id] = doc.data();
    });
    applyPhotosToLanding();
  } catch(e) {
    console.warn('[photos.js] Error al cargar:', e.message);
  }
}

// ── Guardar una foto en Firestore ───────────────
async function savePhotoToFirestore(slotId, photoData) {
  try {
    await db.collection(COLLECTION).doc(slotId).set(photoData);
    window.photos[slotId] = photoData;
  } catch(e) {
    // Si falla por auth, intenta de todas formas con reglas permisivas
    if (e.code === 'permission-denied') {
      throw new Error('Permiso denegado en Firestore. Ve a Firebase → Firestore → Reglas y cambia a: allow write: if true');
    }
    throw e;
  }
}

// ── Eliminar una foto de Firestore ──────────────
async function deletePhotoFromFirestore(slotId) {
  await db.collection(COLLECTION).doc(slotId).delete();
  delete window.photos[slotId];
}

// ── Eliminar todas las fotos ────────────────────
async function deleteAllPhotosFromFirestore() {
  const snap  = await db.collection(COLLECTION).get();
  const batch = db.batch();
  snap.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  window.photos = {};
}

// ── Inyectar img en el DOM ──────────────────────
function injectImg(el, photo) {
  if (!el) return;
  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.querySelectorAll('.img-icon,.img-label,.media-icon,.adm-slot-empty-txt')
    .forEach(ch => ch.style.display = 'none');
  let img = el.querySelector('img.injected');
  if (!img) {
    img = document.createElement('img');
    img.className  = 'injected';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;';
    el.appendChild(img);
  }
  img.src = photo.src;
  img.alt = photo.caption || photo.name || '';

  // Actualizar título de la card si hay caption
  const card = el.closest('.gallery-card');
  if (card && photo.caption) {
    const titleEl = card.querySelector('.card-title');
    if (titleEl) titleEl.textContent = photo.caption;
  }
}

// ── Aplicar todas las fotos al DOM ─────────────
function applyPhotosToLanding() {
  Object.entries(window.photos).forEach(([slotId, data]) => {
    if (!data) return;
    if (!window.LANDING_MAP[slotId]) return;

    const el = document.querySelector(window.LANDING_MAP[slotId]);
    if (!el) return;

    // ── Video YouTube (URL) ─────────────────
    if (data.type === 'video' && data.videoId) {
      el.style.background = '#000';
      el.style.position   = 'relative';
      el.style.overflow   = 'hidden';
      el.querySelectorAll('.media-icon,.video-play-btn,.img-label')
        .forEach(ch => ch.style.display = 'none');
      let iframe = el.querySelector('iframe.injected');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className     = 'injected';
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture');
        el.appendChild(iframe);
      }
      iframe.src = `https://www.youtube.com/embed/${data.videoId}?rel=0&modestbranding=1`;
      return;
    }

    // ── Video Cloudinary ───────────────────────
    if (data.type === 'cloudinary' && data.url) {
      el.style.position = 'relative';
      el.style.overflow = 'hidden';
      el.style.background = '#111';
      // Ocultar placeholders
      el.querySelectorAll('.media-icon,.video-play-btn,.img-label,.adm-slot-empty-txt,.media-type-badge')
        .forEach(ch => ch.style.display = 'none');
      // Reutilizar o crear el elemento video
      let vid = el.querySelector('video.injected');
      if (!vid) {
        vid = document.createElement('video');
        vid.className = 'injected';
        vid.style.cssText = [
          'position:absolute', 'inset:0', 'width:100%', 'height:100%',
          'object-fit:cover', 'display:block', 'z-index:1'
        ].join(';');
        vid.controls  = true;
        vid.playsInline = true;
        vid.preload   = 'metadata';
        el.appendChild(vid);
      }
      // Solo actualizar src si cambió
      if (vid.getAttribute('data-src') !== data.url) {
        vid.setAttribute('data-src', data.url);
        vid.src = data.url;
        vid.load();
      }
      return;
    }

    // ── Video comprimido (base64 webm) ───────
    if (data.type === 'video-file' && data.src) {
      el.style.background = '#000';
      el.style.position   = 'relative';
      el.style.overflow   = 'hidden';
      el.querySelectorAll('.media-icon,.video-play-btn,.img-label,.media-type-badge')
        .forEach(ch => ch.style.display = 'none');
      let vid = el.querySelector('video.injected');
      if (!vid) {
        vid = document.createElement('video');
        vid.className    = 'injected';
        vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
        vid.setAttribute('controls', '');
        vid.setAttribute('playsinline', '');
        vid.setAttribute('loop', '');
        el.appendChild(vid);
      }
      vid.src = data.src;
      return;
    }

    // ── Founder avatar ──────────────────────
    if (slotId === 'equipo-albert' && data.src) {
      el.style.backgroundImage    = `url(${data.src})`;
      el.style.backgroundSize     = 'cover';
      el.style.backgroundPosition = 'center';
      el.textContent = '';
      return;
    }

    // ── Foto normal ─────────────────────────
    if (data.src) injectImg(el, data);
  });
}

// ── Init al cargar la página ────────────────────
window.addEventListener('load', () => {
  loadPhotosFromFirestore();
});
