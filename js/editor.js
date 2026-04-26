// ─────────────────────────────────────────────
// js/editor.js
// Editor de imágenes — recorte, redimensionar,
// rotar, voltear, comprimir y guardar en Firestore
// ─────────────────────────────────────────────

(function () {

  const state = {
    img:        null,
    canvas:     null,
    ctx:        null,
    rotation:   0,
    flipH:      false,
    flipV:      false,
    fileName:   '',
    cropMode:   false,
    cropRect:   null,
    cropStart:  null,
    quality:    0.75,
  };

  function el(id) { return document.getElementById(id); }

  // ── Abrir editor ─────────────────────────────
  window.openImageEditor = function (src, name) {
    state.fileName  = name;
    state.cropMode  = false;
    state.cropRect  = null;
    state.rotation  = 0;
    state.flipH     = false;
    state.flipV     = false;

    const img = new Image();
    img.onload = function () {
      state.img    = img;
      state.canvas = el('ie-canvas');
      state.ctx    = state.canvas.getContext('2d');
      drawImage();
      updateInfo();
      updateSizeEstimate();
      el('ie-w').value = img.naturalWidth;
      el('ie-h').value = img.naturalHeight;
      el('img-editor-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    img.src = src;
  };

  window.closeImageEditor = function () {
    el('img-editor-overlay').classList.remove('open');
    document.body.style.overflow = '';
    state.img = null;
    exitCropMode();
  };

  // ── Dibujar en canvas ─────────────────────────
  function drawImage() {
    const c = state.canvas, r = state.rotation;
    const rotated = (r === 90 || r === 270);
    c.width  = rotated ? state.img.naturalHeight : state.img.naturalWidth;
    c.height = rotated ? state.img.naturalWidth  : state.img.naturalHeight;
    state.ctx.save();
    state.ctx.translate(c.width / 2, c.height / 2);
    state.ctx.rotate(r * Math.PI / 180);
    state.ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    state.ctx.drawImage(state.img, -state.img.naturalWidth / 2, -state.img.naturalHeight / 2);
    state.ctx.restore();
    updateInfo();
  }

  function updateInfo() {
    const c = state.canvas;
    if (!c) return;
    el('ie-info-w').textContent  = c.width + 'px';
    el('ie-info-h').textContent  = c.height + 'px';
    el('ie-info-orig').textContent = state.img
      ? state.img.naturalWidth + '×' + state.img.naturalHeight : '—';
    el('ie-w').value = c.width;
    el('ie-h').value = c.height;
  }

  function updateSizeEstimate() {
    try {
      const data  = state.canvas.toDataURL('image/jpeg', state.quality);
      const bytes = Math.round((data.length * 3) / 4 / 1024);
      const txt   = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' MB' : bytes + ' KB';
      const info  = el('ie-size-info');
      info.textContent = 'Tamaño estimado: ' + txt;
      // Aviso si supera límite de Firestore ~950KB
      info.style.color = bytes > 950 ? '#C4760A' : 'var(--muted)';
    } catch (e) {}
  }

  // ── Rotar ─────────────────────────────────────
  el('btn-rot-l').addEventListener('click', () => {
    state.rotation = (state.rotation + 270) % 360;
    drawImage(); exitCropMode();
  });
  el('btn-rot-r').addEventListener('click', () => {
    state.rotation = (state.rotation + 90) % 360;
    drawImage(); exitCropMode();
  });

  // ── Voltear ───────────────────────────────────
  el('btn-flip-h').addEventListener('click', () => { state.flipH = !state.flipH; drawImage(); });
  el('btn-flip-v').addEventListener('click', () => { state.flipV = !state.flipV; drawImage(); });

  // ── Recorte ───────────────────────────────────
  let isDragging = false;

  el('btn-crop-mode').addEventListener('click', () => {
    state.cropMode = !state.cropMode;
    const btn = el('btn-crop-mode');
    if (state.cropMode) {
      btn.textContent = '✂ Modo activo';
      btn.classList.add('active');
      state.canvas.style.cursor = 'crosshair';
      el('crop-hint').textContent = 'Arrastra sobre la imagen para seleccionar';
    } else {
      exitCropMode();
    }
  });

  // Mouse
  el('ie-canvas').addEventListener('mousedown', startCrop);
  el('ie-canvas').addEventListener('mousemove', moveCrop);
  el('ie-canvas').addEventListener('mouseup',   endCrop);
  // Touch (móvil)
  el('ie-canvas').addEventListener('touchstart', e => { e.preventDefault(); startCrop(e.touches[0]); }, { passive: false });
  el('ie-canvas').addEventListener('touchmove',  e => { e.preventDefault(); moveCrop(e.touches[0]); },  { passive: false });
  el('ie-canvas').addEventListener('touchend',   e => { e.preventDefault(); endCrop(e.changedTouches[0]); }, { passive: false });

  function canvasPos(e) {
    const rect = el('ie-canvas').getBoundingClientRect();
    return {
      x: Math.round((e.clientX - rect.left) * el('ie-canvas').width  / rect.width),
      y: Math.round((e.clientY - rect.top)  * el('ie-canvas').height / rect.height),
    };
  }

  function startCrop(e) {
    if (!state.cropMode) return;
    isDragging = true;
    state.cropStart = canvasPos(e);
    state.cropRect  = null;
    el('crop-overlay').style.display = 'block';
  }

  function moveCrop(e) {
    if (!isDragging || !state.cropMode) return;
    const pos  = canvasPos(e);
    const rect = el('ie-canvas').getBoundingClientRect();
    const scX  = rect.width  / el('ie-canvas').width;
    const scY  = rect.height / el('ie-canvas').height;
    const x1 = Math.min(state.cropStart.x, pos.x);
    const y1 = Math.min(state.cropStart.y, pos.y);
    const x2 = Math.max(state.cropStart.x, pos.x);
    const y2 = Math.max(state.cropStart.y, pos.y);
    state.cropRect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    const cRect = el('ie-canvas').getBoundingClientRect();
    const ov    = el('crop-overlay');
    ov.style.position = 'fixed';
    ov.style.left   = (cRect.left + x1 * scX) + 'px';
    ov.style.top    = (cRect.top  + y1 * scY) + 'px';
    ov.style.width  = ((x2 - x1) * scX) + 'px';
    ov.style.height = ((y2 - y1) * scY) + 'px';
  }

  function endCrop() {
    if (!isDragging) return;
    isDragging = false;
    if (state.cropRect && state.cropRect.w > 10 && state.cropRect.h > 10) {
      const ab = el('btn-apply-crop');
      ab.disabled    = false;
      ab.style.opacity = '1';
      el('crop-hint').textContent = 'Área seleccionada. Clic en "Aplicar recorte".';
    }
  }

  el('btn-apply-crop').addEventListener('click', () => {
    if (!state.cropRect) return;
    const { x, y, w, h } = state.cropRect;
    const tmp = document.createElement('canvas');
    tmp.width  = w; tmp.height = h;
    tmp.getContext('2d').drawImage(state.canvas, x, y, w, h, 0, 0, w, h);
    state.canvas.width  = w;
    state.canvas.height = h;
    state.ctx.drawImage(tmp, 0, 0);
    exitCropMode();
    updateInfo();
    updateSizeEstimate();
  });

  el('btn-cancel-crop').addEventListener('click', exitCropMode);

  function exitCropMode() {
    state.cropMode  = false;
    state.cropRect  = null;
    isDragging      = false;
    const btn = el('btn-crop-mode');
    btn.textContent = '✂ Activar recorte';
    btn.classList.remove('active');
    if (state.canvas) state.canvas.style.cursor = 'default';
    el('crop-overlay').style.display = 'none';
    const ab = el('btn-apply-crop');
    ab.disabled      = true;
    ab.style.opacity = '0.4';
    el('crop-hint').textContent = 'Arrastra sobre la imagen para seleccionar el área';
  }

  // ── Proporciones rápidas ──────────────────────
  document.querySelectorAll('[data-ratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [rw, rh] = btn.dataset.ratio.split(':').map(Number);
      const c  = el('ie-canvas');
      const cw = c.width;
      const ch = Math.round(cw * rh / rw);
      const tmp = document.createElement('canvas');
      tmp.width  = cw; tmp.height = ch;
      tmp.getContext('2d').drawImage(c, 0, 0, cw, Math.min(c.height, ch), 0, 0, cw, ch);
      c.width  = cw; c.height = ch;
      state.ctx.drawImage(tmp, 0, 0);
      updateInfo(); updateSizeEstimate();
    });
  });

  // ── Redimensionar ─────────────────────────────
  let ratioLocked = true;

  el('btn-lock-ratio').addEventListener('click', () => {
    ratioLocked = !ratioLocked;
    el('btn-lock-ratio').textContent = ratioLocked ? '🔒 Proporción' : '🔓 Libre';
    el('btn-lock-ratio').classList.toggle('active', ratioLocked);
  });

  el('ie-w').addEventListener('input', () => {
    if (!ratioLocked) return;
    const nw = parseInt(el('ie-w').value) || el('ie-canvas').width;
    el('ie-h').value = Math.round(nw * el('ie-canvas').height / el('ie-canvas').width);
  });
  el('ie-h').addEventListener('input', () => {
    if (!ratioLocked) return;
    const nh = parseInt(el('ie-h').value) || el('ie-canvas').height;
    el('ie-w').value = Math.round(nh * el('ie-canvas').width / el('ie-canvas').height);
  });

  el('btn-apply-size').addEventListener('click', () => {
    const nw  = Math.max(50, parseInt(el('ie-w').value) || el('ie-canvas').width);
    const nh  = Math.max(50, parseInt(el('ie-h').value) || el('ie-canvas').height);
    const tmp = document.createElement('canvas');
    tmp.width  = nw; tmp.height = nh;
    tmp.getContext('2d').drawImage(el('ie-canvas'), 0, 0, nw, nh);
    el('ie-canvas').width  = nw;
    el('ie-canvas').height = nh;
    state.ctx.drawImage(tmp, 0, 0);
    updateInfo(); updateSizeEstimate();
  });

  // Tamaños rápidos
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mw = parseInt(btn.dataset.preset);
      const c  = el('ie-canvas');
      if (c.width <= mw) return;
      const nh  = Math.round(mw * c.height / c.width);
      const tmp = document.createElement('canvas');
      tmp.width  = mw; tmp.height = nh;
      tmp.getContext('2d').drawImage(c, 0, 0, mw, nh);
      c.width  = mw; c.height = nh;
      state.ctx.drawImage(tmp, 0, 0);
      el('ie-w').value = mw;
      el('ie-h').value = nh;
      updateInfo(); updateSizeEstimate();
    });
  });

  // ── Calidad / compresión ──────────────────────
  el('ie-quality').addEventListener('input', function () {
    state.quality = this.value / 100;
    el('ie-quality-val').textContent = this.value + '%';
    updateSizeEstimate();
  });

  // ── Guardar → Firestore ───────────────────────
  el('btn-ie-save').addEventListener('click', async () => {
    const data  = el('ie-canvas').toDataURL('image/jpeg', state.quality);
    const bytes = Math.round((data.length * 3) / 4);
    const kb    = Math.round(bytes / 1024);

    // Límite Firestore: 1MB por documento — dejamos margen en 950KB
    if (bytes > 950 * 1024) {
      admToast('Imagen demasiado grande (~' + kb + 'KB). Reduce calidad o tamaño a máx 800px / 65%.', 'err');
      return;
    }

    const saveBtn       = el('btn-ie-save');
    saveBtn.textContent = 'Guardando en Firebase...';
    saveBtn.disabled    = true;

    try {
      const photoData = {
        src:  data,
        name: state.fileName,
        size: bytes,
        date: new Date().toLocaleDateString('es-VE'),
      };
      await savePhotoToFirestore(window.currentSlot, photoData);
      applyPhotosToLanding();
      renderAllSlots();
      updateStats();
      closeImageEditor();
      window.currentSlot = null;
      admToast('✓ Foto guardada en Firebase — ' + kb + ' KB');
    } catch (e) {
      admToast('Error al guardar: ' + e.message, 'err');
    } finally {
      saveBtn.textContent = '✓ Guardar foto';
      saveBtn.disabled    = false;
    }
  });

})(); // end IIFE
