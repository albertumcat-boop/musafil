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

    const btn = document.getElementById('ve-upload-btn');
    const progress = document.getElementById('ve-progress');
    const progressBar = document.getElementById('ve-progress-bar');
    const progressTxt = document.getElementById('ve-progress-txt');

    btn.disabled    = true;
    btn.textContent = 'Subiendo...';
    progress.style.display = 'block';

    try {
      const formData = new FormData();
      formData.append('file',         currentFile);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      formData.append('folder',        'inmotex');
      formData.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);

      // Progreso real
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round(e.loaded / e.total * 100);
          progressBar.style.width = pct + '%';
          progressTxt.textContent = pct < 100
            ? `Subiendo... ${pct}%`
            : 'Procesando en Cloudinary...';
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText);
          const data = {
            type:       'cloudinary',
            url:        res.secure_url,
            publicId:   res.public_id,
            duration:   res.duration,
            format:     res.format,
            width:      res.width,
            height:     res.height,
            size:       res.bytes,
            name:       currentFile.name,
            date:       new Date().toLocaleDateString('es-VE'),
          };
          try {
            await savePhotoToFirestore(currentSlotId, data);
            applyPhotosToLanding();
            renderAllSlots();
            updateStats();
            closeVideoEditor();
            const sizeMB = (res.bytes / 1024 / 1024).toFixed(1);
            admToast(`✓ Video subido — ${sizeMB} MB · ${res.duration?.toFixed(1)}s`);
          } catch(e) {
            admToast('Error al guardar en Firebase: ' + e.message, 'err');
          }
        } else {
          const err = JSON.parse(xhr.responseText);
          admToast('Error Cloudinary: ' + (err.error?.message || xhr.status), 'err');
        }
        btn.disabled    = false;
        btn.textContent = '☁ Subir a Cloudinary';
        progress.style.display = 'none';
        progressBar.style.width = '0%';
      };

      xhr.onerror = () => {
        admToast('Error de red al subir el video', 'err');
        btn.disabled    = false;
        btn.textContent = '☁ Subir a Cloudinary';
        progress.style.display = 'none';
      };

      xhr.send(formData);

    } catch (err) {
      admToast('Error: ' + err.message, 'err');
      btn.disabled    = false;
      btn.textContent = '☁ Subir a Cloudinary';
      progress.style.display = 'none';
    }
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
            <div id="ve-progress-txt" class="ve-label" style="margin-bottom:.4rem">Subiendo...</div>
            <div style="background:var(--adm-bg2);border-radius:20px;height:8px;overflow:hidden;
                        border:1px solid var(--adm-border)">
              <div id="ve-progress-bar"
                style="height:100%;width:0%;background:var(--adm-green);
                       border-radius:20px;transition:width .3s">
              </div>
            </div>
          </div>

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
