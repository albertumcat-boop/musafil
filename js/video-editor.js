// ─────────────────────────────────────────────
// js/video-editor.js
// Sube videos a Cloudinary (compresión real)
// Guarda la URL en Firestore
// Cloud: su0vdcvx  |  Preset: wkw1pitw
// ─────────────────────────────────────────────

const CLOUDINARY_CLOUD  = 'su0vdcvx';
const CLOUDINARY_PRESET = 'wkw1pitw';

(function () {

  let currentFile   = null;
  let currentSlotId = null;

  // ── Abrir editor ───────────────────────────
  window.openVideoEditor = function (file, slotId) {
    currentFile   = file;
    currentSlotId = slotId;

    if (!document.getElementById('ve-overlay')) buildUI();

    const url = URL.createObjectURL(file);
    const vid = document.getElementById('ve-source');
    vid.src = url;
    vid.onloadedmetadata = () => {
      const dur = vid.duration;
      document.getElementById('ve-file-name').textContent = file.name;
      document.getElementById('ve-file-size').textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      document.getElementById('ve-duration').textContent  = dur.toFixed(1) + 's';
      document.getElementById('ve-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };
  };

  window.closeVideoEditor = function () {
    const ov = document.getElementById('ve-overlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
    const vid = document.getElementById('ve-source');
    if (vid) { vid.pause(); vid.src = ''; }
    currentFile = null;
  };

  // ── Subir a Cloudinary ─────────────────────
  window.uploadToCloudinary = function () {
    if (!currentFile) return;

    const btn         = document.getElementById('ve-upload-btn');
    const progressDiv = document.getElementById('ve-progress');
    const progressBar = document.getElementById('ve-progress-bar');
    const progressTxt = document.getElementById('ve-progress-txt');
    const errDiv      = document.getElementById('ve-error');

    // Mostrar mensaje de error visible en la UI
    function showError(msg) {
      if (errDiv) {
        errDiv.textContent = '⚠ ' + msg;
        errDiv.style.display = 'block';
      }
      btn.disabled    = false;
      btn.textContent = '☁ Subir a Cloudinary';
      progressDiv.style.display = 'none';
      progressBar.style.width   = '0%';
    }

    function showStatus(msg, pct, color) {
      progressDiv.style.display = 'block';
      progressBar.style.width   = pct + '%';
      progressBar.style.background = color || 'var(--adm-green)';
      progressTxt.textContent   = msg;
      if (errDiv) errDiv.style.display = 'none';
    }

    btn.disabled    = true;
    btn.textContent = 'Iniciando...';
    if (errDiv) errDiv.style.display = 'none';
    showStatus('Preparando subida...', 2, 'var(--adm-green)');

    const formData = new FormData();
    formData.append('file',          currentFile);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST',
      'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/video/upload');
    xhr.timeout = 600000;

    xhr.upload.onprogress = function(e) {
      if (!e.lengthComputable) return;
      const pct = Math.round(e.loaded / e.total * 100);
      if (pct < 100) {
        showStatus('Subiendo... ' + pct + '%', pct, 'var(--adm-green)');
      } else {
        showStatus('✓ Subido. Cloudinary procesando (espera 1-2 min)...', 100, 'var(--adm-brown2)');
        btn.textContent = 'Procesando...';
      }
    };

    xhr.onload = function() {
      if (xhr.status === 200) {
        let res;
        try { res = JSON.parse(xhr.responseText); }
        catch(e) { showError('Respuesta inesperada de Cloudinary. Intenta de nuevo.'); return; }

        if (!res.secure_url) {
          showError('Cloudinary no devolvió URL. Error: ' + JSON.stringify(res.error || res));
          return;
        }

        showStatus('💾 Guardando en Firebase...', 100, 'var(--adm-green2)');

        const data = {
          type:     'cloudinary',
          url:      res.secure_url,
          publicId: res.public_id || '',
          duration: res.duration  || 0,
          format:   res.format    || '',
          width:    res.width     || 0,
          height:   res.height    || 0,
          size:     res.bytes     || 0,
          name:     currentFile.name,
          date:     new Date().toLocaleDateString('es-VE'),
        };

        savePhotoToFirestore(currentSlotId, data)
          .then(function() {
            applyPhotosToLanding();
            renderAllSlots();
            updateStats();
            closeVideoEditor();
            const mb  = ((res.bytes||0)/1024/1024).toFixed(1);
            const dur = res.duration ? ' · ' + parseFloat(res.duration).toFixed(1) + 's' : '';
            admToast('✓ Video guardado — ' + mb + ' MB' + dur);
          })
          .catch(function(e) {
            showError('Firebase error: ' + e.message);
          });

      } else {
        let msg = 'Error HTTP ' + xhr.status;
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch(e) {}
        showError(msg);
      }
    };

    xhr.onerror = function() {
      showError('Error de red. Verifica tu conexión a internet.');
    };

    xhr.ontimeout = function() {
      showError('Tiempo agotado (10 min). Intenta con un video más corto.');
    };

    xhr.send(formData);
  };

  // ── Construir UI ───────────────────────────
  function buildUI() {
    const div = document.createElement('div');
    div.id        = 've-overlay';
    div.className = 've-overlay';
    div.innerHTML = `
      <div class="ve-box">

        <div class="ve-header">
          <div class="ve-title">🎬 Subir video</div>
          <button class="adm-close-btn" onclick="closeVideoEditor()">✕</button>
        </div>

        <!-- Preview -->
        <div class="ve-preview">
          <video id="ve-source" controls playsinline
            style="max-width:100%;max-height:280px;display:block;
                   margin:0 auto;border-radius:8px;background:#000">
          </video>
        </div>

        <!-- Info del archivo -->
        <div class="ve-controls">

          <div class="ve-info-card">
            <div class="ve-info-row">
              <span class="ve-label">Archivo:</span>
              <span id="ve-file-name" class="ve-val" style="word-break:break-all">—</span>
            </div>
            <div class="ve-info-row" style="margin-top:.4rem">
              <span class="ve-label">Tamaño:</span>
              <span id="ve-file-size" class="ve-val">—</span>
              <span class="ve-label" style="margin-left:1rem">Duración:</span>
              <span id="ve-duration" class="ve-val">—</span>
            </div>
          </div>

          <!-- Nota sobre Cloudinary -->
          <div class="ve-note">
            <div style="font-size:1.1rem;margin-bottom:.35rem">☁</div>
            <div>
              <strong>Cloudinary comprime automáticamente</strong> el video con
              calidad profesional. No necesitas ajustar nada — sube el video
              original y Cloudinary hace el resto.
            </div>
            <div style="margin-top:.35rem;opacity:.75">
              Gratis hasta 25 GB · Sin pérdida visible de calidad
            </div>
          </div>

          <!-- Barra de progreso -->
          <div id="ve-progress" style="display:none">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">
              <span id="ve-progress-txt" style="font-family:'DM Mono',monospace;font-size:.62rem;
                color:var(--adm-text);flex:1">Subiendo...</span>
              <span id="ve-spinner" style="display:none;font-size:.9rem;animation:spin 1s linear infinite">⏳</span>
            </div>
            <div style="background:var(--adm-bg2);border-radius:20px;height:10px;overflow:hidden;
                        border:1px solid var(--adm-border)">
              <div id="ve-progress-bar"
                style="height:100%;width:0%;background:var(--adm-green);
                       border-radius:20px;transition:width .4s,background .3s">
              </div>
            </div>
            <div style="font-family:'DM Mono',monospace;font-size:.57rem;color:var(--adm-muted);
              margin-top:.4rem;line-height:1.5">
              No cierres esta ventana mientras se procesa el video.
            </div>
          </div>
          <style>
            @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          </style>

          <!-- Botones -->
          <!-- Error visible en pantalla -->
          <div id="ve-error" style="display:none;background:rgba(185,28,28,0.1);
            border:1px solid rgba(185,28,28,0.3);border-radius:8px;padding:.7rem 1rem;
            font-family:'DM Mono',monospace;font-size:.62rem;color:#B91C1C;
            line-height:1.6;word-break:break-word">
          </div>

          <div class="ve-btn-row">
            <button class="ve-btn-secondary" onclick="closeVideoEditor()">
              Cancelar
            </button>
            <button id="ve-upload-btn" class="ve-btn-primary"
              onclick="uploadToCloudinary()">
              ☁ Subir a Cloudinary
            </button>
          </div>

        </div>
      </div>`;

    document.body.appendChild(div);
    div.addEventListener('click', e => { if (e.target === div) closeVideoEditor(); });
  }

})();
