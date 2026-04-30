// ─────────────────────────────────────────────
// js/video-editor.js
// Editor de video con recorte + subida Cloudinary
// Recorta en el navegador, sube solo el fragmento
// Cloud: dsu0vdcvx  |  Preset: wkw1pitw
// ─────────────────────────────────────────────

const CLOUDINARY_CLOUD  = 'dsu0vdcvx';
const CLOUDINARY_PRESET = 'wkw1pitw';

(function () {

  const VE = {
    file:      null,
    slotId:    null,
    startTime: 0,
    endTime:   0,
    duration:  0,
  };

  // ── Abrir editor ───────────────────────────
  window.openVideoEditor = function (file, slotId) {
    VE.file   = file;
    VE.slotId = slotId;

    if (!document.getElementById('ve-overlay')) buildUI();

    const url = URL.createObjectURL(file);
    const vid = document.getElementById('ve-source');
    vid.src = url;
    vid.onloadedmetadata = () => {
      VE.duration  = vid.duration;
      VE.startTime = 0;
      VE.endTime   = vid.duration;

      // Info del archivo
      document.getElementById('ve-file-name').textContent =
        file.name.length > 35 ? file.name.substring(0,35)+'...' : file.name;
      document.getElementById('ve-file-size').textContent =
        (file.size / 1024 / 1024).toFixed(1) + ' MB';
      document.getElementById('ve-total-dur').textContent =
        formatTime(vid.duration);

      // Configurar sliders
      const startEl = document.getElementById('ve-start');
      const endEl   = document.getElementById('ve-end');
      startEl.max   = vid.duration;
      startEl.step  = 0.1;
      startEl.value = 0;
      endEl.max     = vid.duration;
      endEl.step    = 0.1;
      endEl.value   = vid.duration;
      updateClipInfo();

      document.getElementById('ve-error').style.display = 'none';
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
    VE.file = null;
  };

  function formatTime(s) {
    if (!s || isNaN(s)) return '0s';
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  }

  function updateClipInfo() {
    const dur = Math.max(0, VE.endTime - VE.startTime);
    document.getElementById('ve-clip-dur').textContent = formatTime(dur);
    document.getElementById('ve-start-val').textContent = formatTime(VE.startTime);
    document.getElementById('ve-end-val').textContent   = formatTime(VE.endTime);
  }

  // ── Vista previa del recorte ───────────────
  window.previewClip = function () {
    const vid = document.getElementById('ve-source');
    if (!vid || VE.endTime <= VE.startTime) return;
    vid.currentTime = VE.startTime;
    vid.play();
    const check = setInterval(() => {
      if (vid.currentTime >= VE.endTime) {
        vid.pause();
        clearInterval(check);
      }
    }, 200);
  };

  // ── Recortar con Canvas + MediaRecorder ───
  // Genera un Blob del clip recortado, luego lo sube a Cloudinary
  window.uploadToCloudinary = function () {
    if (!VE.file) return;

    const btn         = document.getElementById('ve-upload-btn');
    const progressDiv = document.getElementById('ve-progress');
    const progressBar = document.getElementById('ve-progress-bar');
    const progressTxt = document.getElementById('ve-progress-txt');
    const errDiv      = document.getElementById('ve-error');

    const needsTrim = VE.startTime > 0.1 || VE.endTime < VE.duration - 0.1;
    const dur = VE.endTime - VE.startTime;

    if (dur < 0.5) { showError('El clip debe tener al menos 0.5 segundos.'); return; }

    function showStatus(msg, pct, color) {
      progressDiv.style.display = 'block';
      progressBar.style.width   = pct + '%';
      progressBar.style.background = color || 'var(--adm-green)';
      progressTxt.textContent   = msg;
      errDiv.style.display      = 'none';
    }
    function showError(msg) {
      errDiv.textContent    = '⚠ ' + msg;
      errDiv.style.display  = 'block';
      btn.disabled          = false;
      btn.textContent       = '☁ Subir a Cloudinary';
      progressDiv.style.display = 'none';
    }

    btn.disabled    = true;
    btn.textContent = needsTrim ? 'Recortando...' : 'Subiendo...';

    if (needsTrim) {
      // Recortar usando Canvas + MediaRecorder
      showStatus('Procesando recorte...', 5, 'var(--adm-brown)');
      trimAndUpload(dur, showStatus, showError, btn);
    } else {
      // Sin recorte — subir directamente
      showStatus('Preparando subida...', 2);
      uploadBlob(VE.file, showStatus, showError, btn);
    }
  };

  // ── Recortar con MediaRecorder ─────────────
  function trimAndUpload(dur, showStatus, showError, btn) {
    const vid    = document.getElementById('ve-source');
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = vid.videoWidth  || 640;
    canvas.height = vid.videoHeight || 360;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm' : 'video/mp4';

    const stream   = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
    const chunks   = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      showStatus('Subiendo a Cloudinary...', 15);
      uploadBlob(blob, showStatus, showError, btn);
    };

    vid.currentTime = VE.startTime;
    vid.onseeked = () => {
      vid.play();
      recorder.start();

      const interval = setInterval(() => {
        if (!vid.paused) ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const pct = Math.min(90, 5 + ((vid.currentTime - VE.startTime) / dur) * 85);
        showStatus(`Procesando recorte... ${Math.round(pct)}%`, pct, 'var(--adm-brown)');

        if (vid.currentTime >= VE.endTime - 0.1 || vid.ended) {
          clearInterval(interval);
          vid.pause();
          recorder.stop();
        }
      }, 200);
    };
  }

  // ── Subir Blob a Cloudinary ────────────────
  function uploadBlob(fileOrBlob, showStatus, showError, btn) {
    const formData = new FormData();
    formData.append('file',          fileOrBlob);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
    xhr.timeout = 600000;

    xhr.upload.onprogress = e => {
      if (!e.lengthComputable) return;
      const pct = Math.round(e.loaded / e.total * 100);
      if (pct < 100) {
        showStatus(`Subiendo... ${pct}%`, 15 + pct * 0.8);
      } else {
        showStatus('✓ Subido. Cloudinary procesando (espera)...', 95, 'var(--adm-brown2)');
        btn.textContent = 'Procesando...';
      }
    };

    xhr.onload = function () {
      if (xhr.status === 200) {
        let res;
        try { res = JSON.parse(xhr.responseText); }
        catch(e) { showError('Respuesta inesperada de Cloudinary. Intenta de nuevo.'); return; }

        if (!res.secure_url) {
          showError('Error: ' + JSON.stringify(res.error || res));
          return;
        }

        showStatus('💾 Guardando en Firebase...', 98, 'var(--adm-green2)');

        const data = {
          type:     'cloudinary',
          url:      res.secure_url,
          publicId: res.public_id || '',
          duration: res.duration  || 0,
          format:   res.format    || '',
          width:    res.width     || 0,
          height:   res.height    || 0,
          size:     res.bytes     || 0,
          name:     VE.file ? VE.file.name : 'video',
          date:     new Date().toLocaleDateString('es-VE'),
        };

        savePhotoToFirestore(VE.slotId, data)
          .then(() => {
            applyPhotosToLanding();
            renderAllSlots();
            updateStats();
            closeVideoEditor();
            const mb  = ((res.bytes||0) / 1024 / 1024).toFixed(1);
            const dur = res.duration ? ' · ' + parseFloat(res.duration).toFixed(1) + 's' : '';
            admToast(`✓ Video guardado — ${mb} MB${dur}`);
          })
          .catch(e => showError('Firebase error: ' + e.message));
      } else {
        let msg = `Error HTTP ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch(e) {}
        showError(msg);
      }
    };

    xhr.onerror   = () => showError('Error de red. Verifica tu conexión.');
    xhr.ontimeout = () => showError('Tiempo agotado. Intenta con un clip más corto.');
    xhr.send(formData);
  }

  // ── Construir UI ───────────────────────────
  function buildUI() {
    const div = document.createElement('div');
    div.id        = 've-overlay';
    div.className = 've-overlay';
    div.innerHTML = `
      <div class="ve-box">

        <div class="ve-header">
          <div class="ve-title">🎬 Editor de video</div>
          <button class="adm-close-btn" onclick="closeVideoEditor()">✕</button>
        </div>

        <div class="ve-preview">
          <video id="ve-source" controls playsinline
            style="max-width:100%;max-height:260px;display:block;
                   margin:0 auto;border-radius:8px;background:#000">
          </video>
        </div>

        <div class="ve-controls">

          <!-- Info archivo -->
          <div class="ve-info-card">
            <div class="ve-info-row">
              <span class="ve-label">Archivo:</span>
              <span id="ve-file-name" class="ve-val" style="word-break:break-all;flex:1">—</span>
              <span id="ve-file-size" class="ve-val" style="margin-left:.5rem;white-space:nowrap">—</span>
            </div>
            <div class="ve-info-row" style="margin-top:.4rem">
              <span class="ve-label">Duración total:</span>
              <span id="ve-total-dur" class="ve-val">—</span>
              <span class="ve-label" style="margin-left:1rem">Clip seleccionado:</span>
              <span id="ve-clip-dur" class="ve-val" style="color:var(--adm-green);font-weight:600">—</span>
            </div>
          </div>

          <!-- Recorte inicio -->
          <div class="ve-control-group">
            <div class="ve-info-row">
              <span class="ve-label">▶ Inicio del clip:</span>
              <span id="ve-start-val" class="ve-val">0s</span>
            </div>
            <input type="range" id="ve-start" class="ve-slider"
              min="0" max="100" step="0.1" value="0">
          </div>

          <!-- Recorte fin -->
          <div class="ve-control-group">
            <div class="ve-info-row">
              <span class="ve-label">⏹ Fin del clip:</span>
              <span id="ve-end-val" class="ve-val">0s</span>
            </div>
            <input type="range" id="ve-end" class="ve-slider"
              min="0" max="100" step="0.1" value="100">
          </div>

          <!-- Nota -->
          <div class="ve-note">
            <div>
              Si <strong>no mueves los sliders</strong>, se sube el video completo sin recorte.<br>
              Si <strong>ajustas inicio/fin</strong>, el navegador recortará el clip antes de subir a Cloudinary.
            </div>
          </div>

          <!-- Error -->
          <div id="ve-error" style="display:none;background:rgba(185,28,28,0.1);
            border:1px solid rgba(185,28,28,0.3);border-radius:8px;padding:.7rem 1rem;
            font-family:'DM Mono',monospace;font-size:.62rem;color:#B91C1C;line-height:1.6">
          </div>

          <!-- Progreso -->
          <div id="ve-progress" style="display:none">
            <div id="ve-progress-txt" style="font-family:'DM Mono',monospace;font-size:.62rem;
              color:var(--adm-text);margin-bottom:.5rem">Procesando...</div>
            <div style="background:var(--adm-bg2);border-radius:20px;height:10px;
              overflow:hidden;border:1px solid var(--adm-border)">
              <div id="ve-progress-bar" style="height:100%;width:0%;background:var(--adm-green);
                border-radius:20px;transition:width .4s,background .3s">
              </div>
            </div>
            <div style="font-family:'DM Mono',monospace;font-size:.57rem;color:var(--adm-muted);
              margin-top:.4rem">No cierres esta ventana mientras se procesa.</div>
          </div>

          <!-- Botones -->
          <div class="ve-btn-row">
            <button class="ve-btn-secondary" onclick="previewClip()">▶ Vista previa</button>
            <button class="ve-btn-secondary" onclick="closeVideoEditor()">Cancelar</button>
            <button id="ve-upload-btn" class="ve-btn-primary" onclick="uploadToCloudinary()">
              ☁ Subir a Cloudinary
            </button>
          </div>

        </div>
      </div>`;

    document.body.appendChild(div);

    // Eventos sliders
    document.getElementById('ve-start').addEventListener('input', function () {
      VE.startTime = parseFloat(this.value);
      if (VE.startTime >= VE.endTime - 0.5) {
        VE.endTime = Math.min(VE.duration, VE.startTime + 0.5);
        document.getElementById('ve-end').value = VE.endTime;
      }
      // Mover video al punto de inicio
      const vid = document.getElementById('ve-source');
      if (vid) vid.currentTime = VE.startTime;
      updateClipInfo();
    });

    document.getElementById('ve-end').addEventListener('input', function () {
      VE.endTime = parseFloat(this.value);
      if (VE.endTime <= VE.startTime + 0.5) {
        VE.startTime = Math.max(0, VE.endTime - 0.5);
        document.getElementById('ve-start').value = VE.startTime;
      }
      // Mover video al punto de fin para previsualizar
      const vid = document.getElementById('ve-source');
      if (vid) vid.currentTime = VE.endTime;
      updateClipInfo();
    });

    div.addEventListener('click', e => { if (e.target === div) closeVideoEditor(); });
  }

})();
