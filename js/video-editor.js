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
  window.uploadToCloudinary = async function () {
    if (!currentFile) return;

    const btn        = document.getElementById('ve-upload-btn');
    const progress   = document.getElementById('ve-progress');
    const progressBar= document.getElementById('ve-progress-bar');
    const progressTxt= document.getElementById('ve-progress-txt');
    const spinner    = document.getElementById('ve-spinner');

    function setPhase(phase, pct) {
      progress.style.display = 'block';
      if (phase === 'upload') {
        progressBar.style.width = pct + '%';
        progressBar.style.background = 'var(--adm-green)';
        progressTxt.textContent = `Subiendo al servidor... ${pct}%`;
        if (spinner) spinner.style.display = 'none';
      } else if (phase === 'process') {
        progressBar.style.width = '100%';
        progressBar.style.background = 'var(--adm-brown)';
        progressTxt.textContent = '⏳ Cloudinary procesando el video — puede tardar 1-2 minutos...';
        if (spinner) spinner.style.display = 'inline';
      } else if (phase === 'saving') {
        progressBar.style.background = 'var(--adm-green2)';
        progressTxt.textContent = '💾 Guardando en Firebase...';
      }
    }

    function resetBtn() {
      btn.disabled = false;
      btn.textContent = '☁ Subir a Cloudinary';
      progress.style.display = 'none';
      progressBar.style.width = '0%';
      if (spinner) spinner.style.display = 'none';
    }

    btn.disabled    = true;
    btn.textContent = 'Subiendo...';
    setPhase('upload', 0);

    try {
      const formData = new FormData();
      formData.append('file',          currentFile);
      formData.append('upload_preset', CLOUDINARY_PRESET);

      // Usar XHR para progreso real de subida
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
        xhr.timeout = 600000; // 10 min para videos grandes

        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 100);
            setPhase('upload', pct);
            // Al llegar a 100% de subida, Cloudinary empieza a procesar
            if (pct === 100) setPhase('process');
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch(e) { reject(new Error('Respuesta inválida de Cloudinary')); }
          } else {
            let msg = `Error ${xhr.status}`;
            try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch(e){}
            reject(new Error(msg));
          }
        };
        xhr.onerror   = () => reject(new Error('Error de red. Verifica tu conexión.'));
        xhr.ontimeout = () => reject(new Error('Tiempo agotado (10 min). Intenta con un video más corto.'));

        xhr.send(formData);
      });

      // Cloudinary respondió correctamente
      console.log('[Cloudinary] OK:', result.secure_url);
      setPhase('saving');

      const data = {
        type:     'cloudinary',
        url:      result.secure_url,
        publicId: result.public_id  || '',
        duration: result.duration   || 0,
        format:   result.format     || '',
        width:    result.width      || 0,
        height:   result.height     || 0,
        size:     result.bytes      || 0,
        name:     currentFile.name,
        date:     new Date().toLocaleDateString('es-VE'),
      };

      await savePhotoToFirestore(currentSlotId, data);
      applyPhotosToLanding();
      renderAllSlots();
      updateStats();
      closeVideoEditor();

      const sizeMB = ((result.bytes||0) / 1024 / 1024).toFixed(1);
      const dur    = result.duration ? ` · ${parseFloat(result.duration).toFixed(1)}s` : '';
      admToast(`✓ Video guardado — ${sizeMB} MB${dur}`);

    } catch (err) {
      console.error('[Cloudinary] Error:', err.message);
      admToast('Error: ' + err.message, 'err');
      resetBtn();
      return;
    }
    resetBtn();
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
