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
window.LANDING_MAP = {
  // Fotos
  'hero-main':       '.hero-img-main',
  'hero-proceso':    '.hero-visual-grid .hero-img-placeholder:nth-child(2)',
  'hero-musafil':    '.hero-visual-grid .hero-img-placeholder:nth-child(3)',
  'campo-finca':     '#tab-campo .gallery-card:nth-child(1) .media-placeholder',
  'campo-pseudo':    '#tab-campo .gallery-card:nth-child(2) .media-placeholder',
  'campo-transporte':'#tab-campo .gallery-card:nth-child(3) .media-placeholder',
  'proc-maquina':    '#tab-proceso .gallery-card:nth-child(2) .media-placeholder',
  'proc-corte':      '#tab-proceso .gallery-card:nth-child(3) .media-placeholder',
  'proc-humedad':    '#tab-proceso .gallery-card:nth-child(4) .media-placeholder',
  'proc-qc':         '#tab-proceso .gallery-card:nth-child(5) .media-placeholder',
  'fibra-macro':     '#tab-fibra .gallery-card:nth-child(1) .media-placeholder',
  'fibra-lote':      '#tab-fibra .gallery-card:nth-child(2) .media-placeholder',
  'fibra-comp':      '#tab-fibra .gallery-card:nth-child(3) .media-placeholder',
  'fibra-hilo':      '#tab-fibra .gallery-card:nth-child(4) .media-placeholder',
  'lab-informe':     '#tab-laboratorio .gallery-card:nth-child(1) .media-placeholder',
  'lab-resistencia': '#tab-laboratorio .gallery-card:nth-child(2) .media-placeholder',
  'lab-hilatura':    '#tab-laboratorio .gallery-card:nth-child(3) .media-placeholder',
  'equipo-albert':   '.founder-avatar',
  // Videos
  'campo-video':     '#tab-campo .gallery-card:nth-child(4) .media-placeholder',
  'proc-video':      '#tab-proceso .gallery-card:nth-child(1) .media-placeholder',
  'video-principal': '#tab-video .gallery-card:nth-child(1) .media-placeholder',
  'video-finca':     '#tab-video .gallery-card:nth-child(2) .media-placeholder',
  'video-maquina':   '#tab-video .gallery-card:nth-child(3) .media-placeholder',
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
  await db.collection(COLLECTION).doc(slotId).set(photoData);
  window.photos[slotId] = photoData;
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
}

// ── Aplicar todas las fotos al DOM ─────────────
function applyPhotosToLanding() {
  Object.entries(window.photos).forEach(([slotId, data]) => {
    if (!data) return;
    if (!window.LANDING_MAP[slotId]) return;

    const el = document.querySelector(window.LANDING_MAP[slotId]);
    if (!el) return;

    // ── Video slot ──────────────────────────
    if (data.type === 'video' && data.videoId) {
      el.style.background = '#000';
      el.style.position   = 'relative';
      el.style.overflow   = 'hidden';
      // Ocultar placeholders
      el.querySelectorAll('.media-icon,.video-play-btn,.img-label')
        .forEach(ch => ch.style.display = 'none');
      // Insertar o actualizar iframe
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
