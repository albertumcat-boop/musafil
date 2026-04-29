// ─────────────────────────────────────────────
// js/video-editor.js
// Editor de video — recortar inicio/fin,
// seleccionar resolución y comprimir
// usando Canvas API + MediaRecorder
//
// Límite Firestore: 950KB por documento
// Para videos: apunta a 800KB máximo
// ─────────────────────────────────────────────

(function () {

  const VE = {
    file:       null,
    videoEl:    null,
    startTime:  0,
    endTime:    0,
    duration:   0,
    resolution: 360,
    quality:    0.6,
    slotId:     null,
  };

  function formatTime(s) {
    if (isNaN(s)) return '0.0s';
    return s.toFixed(1) + 's';
  }

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
      VE.endTime   = Math.min(vid.duration, 10);

      document.getElementById('ve-duration').textContent   = formatTime(vid.duration);
      document.getElementById('ve-start').max              = vid.duration;
      document.getElementById('ve-start').value            = 0;
      document.getElementById('ve-end').max                = vid.duration;
      document.getElementById('ve-end').value              = VE.endTime;
      document.getElementById('ve-start-val').textContent  = '0.0s';
      document.getElementById('ve-end-val').textContent    = formatTime(VE.endTime);
      document.getElementById('ve-clip-dur').textContent   = formatTime(VE.endTime);
      updateEst();
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

  function updateEst() {
    const dur  = Math.max(0, VE.endTime - VE.startTime);
    const bps  = VE.resolution * (VE.resolution * 16/9) * 3 * VE.quality * 0.07;
    const estKB = Math.round((bps * dur) / 8 / 1024);
    const txt   = estKB > 1024 ? (estKB/1024).toFixed(1)+' MB' : estKB+' KB';
    const info  = document.getElementById('ve-size-info');
    const warn  = document.getElementById('ve-size-warn');
    if (info) { info.textContent = 'Tamaño estimado: ~'+txt; info.style.color = estKB > 900 ? '#C4760A' : 'var(--adm-green)'; }
    if (warn) warn.style.display = estKB > 900 ? 'block' : 'none';
  }

  function getSupportedMime() {
    for (const t of ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4']) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return 'video/webm';
  }

  window.previewClip = function () {
    const vid = document.getElementById('ve-source');
    if (!vid) return;
    vid.currentTime = VE.startTime;
    vid.play();
    const t = setInterval(() => { if (vid.currentTime >= VE.endTime) { vid.pause(); clearInterval(t); } }, 100);
  };

  window.compressAndSave = async function () {
    const dur = VE.endTime - VE.startTime;
    if (dur < 1)  { admToast('El clip debe tener al menos 1 segundo', 'err'); return; }
    if (dur > 15) { admToast('Máximo 15 segundos para caber en Firestore', 'err'); return; }

    const btn = document.getElementById('ve-save-btn');
    btn.disabled = true; btn.textContent = 'Comprimiendo...';

    try {
      const vid    = document.getElementById('ve-source');
      const canvas = document.createElement('canvas');
      const ctx    = canvas.getContext('2d');
      const aspect = vid.videoWidth / vid.videoHeight;
      canvas.height = VE.resolution;
      canvas.width  = Math.round(VE.resolution * aspect);

      const mime     = getSupportedMime();
      const stream   = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: Math.round(VE.resolution * 800 * VE.quality),
      });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        const blob   = new Blob(chunks, { type: mime });
        const sizeKB = Math.round(blob.size / 1024);
        if (blob.size > 950*1024) {
          admToast(`Video muy grande (${sizeKB}KB). Reduce duración, resolución o calidad.`, 'err');
          btn.disabled = false; btn.textContent = '✓ Comprimir y guardar';
          return;
        }
        btn.textContent = 'Guardando en Firebase...';
        const reader = new FileReader();
        reader.onload = async ev => {
          try {
            await savePhotoToFirestore(VE.slotId, {
              src: ev.target.result, type: 'video-file',
              mimeType: mime, name: VE.file.name,
              size: blob.size, duration: dur,
              date: new Date().toLocaleDateString('es-VE'),
            });
            applyPhotosToLanding();
            renderAllSlots();
            updateStats();
            closeVideoEditor();
            admToast(`✓ Video guardado — ${sizeKB} KB · ${formatTime(dur)}`);
          } catch(e) { admToast('Error al guardar: '+e.message, 'err'); }
          finally { btn.disabled = false; btn.textContent = '✓ Comprimir y guardar'; }
        };
        reader.readAsDataURL(blob);
      };

      vid.currentTime = VE.startTime;
      await new Promise(r => { vid.onseeked = r; });
      vid.play();
      recorder.start();
      const loop = () => {
        if (vid.currentTime >= VE.endTime || vid.ended) { vid.pause(); recorder.stop(); return; }
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch(err) {
      admToast('Error: '+err.message, 'err');
      btn.disabled = false; btn.textContent = '✓ Comprimir y guardar';
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
          <div class="ve-title">🎬 Editor de video</div>
          <button class="adm-close-btn" onclick="closeVideoEditor()">✕</button>
        </div>
        <div class="ve-preview">
          <video id="ve-source" controls playsinline
            style="max-width:100%;max-height:260px;display:block;margin:0 auto;border-radius:8px;background:#000">
          </video>
        </div>
        <div class="ve-controls">
          <div class="ve-info-row">
            <span class="ve-label">Duración original:</span>
            <span id="ve-duration" class="ve-val">—</span>
            <span class="ve-label" style="margin-left:1.5rem">Clip:</span>
            <span id="ve-clip-dur" class="ve-val" style="color:var(--adm-green)">—</span>
          </div>
          <div class="ve-control-group">
            <div class="ve-info-row">
              <span class="ve-label">▶ Inicio:</span>
              <span id="ve-start-val" class="ve-val">0.0s</span>
            </div>
            <input type="range" id="ve-start" class="ve-slider" min="0" max="18" step="0.1" value="0">
          </div>
          <div class="ve-control-group">
            <div class="ve-info-row">
              <span class="ve-label">⏹ Fin:</span>
              <span id="ve-end-val" class="ve-val">10.0s</span>
            </div>
            <input type="range" id="ve-end" class="ve-slider" min="0" max="18" step="0.1" value="10">
          </div>
          <div class="ve-control-group">
            <span class="ve-label">Resolución:</span>
            <div class="ve-btn-row" style="margin-top:.4rem">
              <button class="ve-res-btn" data-res="240">240p</button>
              <button class="ve-res-btn active" data-res="360">360p ✓</button>
              <button class="ve-res-btn" data-res="480">480p</button>
            </div>
          </div>
          <div class="ve-control-group">
            <div class="ve-info-row">
              <span class="ve-label">Calidad:</span>
              <span id="ve-quality-val" class="ve-val">60%</span>
            </div>
            <input type="range" id="ve-quality" class="ve-slider" min="10" max="100" value="60">
          </div>
          <div class="ve-size-row">
            <span id="ve-size-info" style="font-family:'DM Mono',monospace;font-size:.62rem">Tamaño estimado: —</span>
            <div id="ve-size-warn" style="display:none;color:#C4760A;font-family:'DM Mono',monospace;font-size:.6rem;margin-top:.2rem">
              ⚠ Muy grande. Reduce duración, resolución o calidad.
            </div>
          </div>
          <div class="ve-btn-row" style="margin-top:.85rem;gap:.6rem">
            <button class="ve-btn-secondary" onclick="previewClip()">▶ Vista previa del clip</button>
            <button id="ve-save-btn" class="ve-btn-primary" onclick="compressAndSave()">✓ Comprimir y guardar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div);

    document.getElementById('ve-start').addEventListener('input', function() {
      VE.startTime = parseFloat(this.value);
      if (VE.startTime >= VE.endTime) { VE.endTime = Math.min(VE.startTime+1, VE.duration); document.getElementById('ve-end').value = VE.endTime; }
      document.getElementById('ve-start-val').textContent = formatTime(VE.startTime);
      document.getElementById('ve-clip-dur').textContent  = formatTime(VE.endTime - VE.startTime);
      updateEst();
    });

    document.getElementById('ve-end').addEventListener('input', function() {
      VE.endTime = parseFloat(this.value);
      if (VE.endTime <= VE.startTime) { VE.startTime = Math.max(VE.endTime-1,0); document.getElementById('ve-start').value = VE.startTime; }
      document.getElementById('ve-end-val').textContent  = formatTime(VE.endTime);
      document.getElementById('ve-clip-dur').textContent = formatTime(VE.endTime - VE.startTime);
      updateEst();
    });

    document.querySelectorAll('.ve-res-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ve-res-btn').forEach(b => { b.classList.remove('active'); b.textContent = b.dataset.res+'p'; });
        btn.classList.add('active'); btn.textContent = btn.dataset.res+'p ✓';
        VE.resolution = parseInt(btn.dataset.res);
        updateEst();
      });
    });

    document.getElementById('ve-quality').addEventListener('input', function() {
      VE.quality = this.value/100;
      document.getElementById('ve-quality-val').textContent = this.value+'%';
      updateEst();
    });

    div.addEventListener('click', e => { if (e.target === div) closeVideoEditor(); });
  }

})();
