/* ═══════════════════════════════════════════════
   styles/admin.css
   Panel de administración + Editor de imágenes
   Paleta: beige cálido + verde bosque + marrón
═══════════════════════════════════════════════ */

:root {
  --adm-bg:     #F7F2E8;
  --adm-bg2:    #EDE5D2;
  --adm-card:   #FDFAF4;
  --adm-border: rgba(123,79,46,0.18);
  --adm-border2:rgba(58,107,34,0.22);
  --adm-green:  #3A6B22;
  --adm-green2: #4E8C30;
  --adm-brown:  #7B4F2E;
  --adm-brown2: #A0703F;
  --adm-text:   #2A1F14;
  --adm-muted:  #6B5840;
}

#admin-trigger {
  position:fixed;bottom:2rem;right:2rem;z-index:900;
  width:46px;height:46px;border-radius:50%;
  background:rgba(58,107,34,0.88);
  border:1.5px solid rgba(78,140,48,0.5);
  color:#D4EDBA;font-size:1.05rem;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.2s;backdrop-filter:blur(8px);
  box-shadow:0 2px 12px rgba(45,80,22,0.25);
}
#admin-trigger:hover {
  background:var(--adm-green);color:#fff;
  transform:scale(1.08);box-shadow:0 4px 20px rgba(45,80,22,0.35);
}

.adm-overlay {
  display:none;position:fixed;inset:0;z-index:1000;
  background:rgba(42,31,20,0.5);backdrop-filter:blur(4px);
  align-items:center;justify-content:center;
}
.adm-overlay.open{display:flex;}

/* ── Login ── */
.adm-login {
  background:var(--adm-card);border:1px solid var(--adm-border);
  border-radius:14px;padding:2.5rem;width:360px;
  box-shadow:0 20px 60px rgba(42,31,20,0.22);
}
.adm-login-logo {
  font-family:'DM Mono',monospace;font-size:0.62rem;
  color:var(--adm-green);letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1rem;
}
.adm-login h2 {
  font-family:'Cormorant Garamond',serif;font-size:1.75rem;
  font-weight:400;color:var(--adm-text);margin-bottom:0.2rem;
}
.adm-login p {
  font-family:'DM Mono',monospace;font-size:0.6rem;
  color:var(--adm-muted);margin-bottom:1.75rem;line-height:1.6;
}
.adm-label {
  font-family:'DM Mono',monospace;font-size:0.57rem;color:var(--adm-muted);
  text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:0.3rem;
}
.adm-input {
  width:100%;background:var(--adm-bg);border:1px solid var(--adm-border);
  color:var(--adm-text);font-family:'DM Mono',monospace;font-size:0.78rem;
  padding:0.7rem 1rem;outline:none;border-radius:8px;
  margin-bottom:0.85rem;transition:border-color 0.2s;
}
.adm-input:focus{border-color:var(--adm-green2);}
.adm-input::placeholder{color:rgba(107,88,64,0.4);}
.adm-btn {
  width:100%;background:var(--adm-green);color:#F7F2E8;
  font-family:'DM Mono',monospace;font-size:0.72rem;font-weight:500;
  letter-spacing:0.08em;padding:0.82rem;border:none;cursor:pointer;
  text-transform:uppercase;border-radius:8px;transition:background 0.2s,transform 0.1s;
}
.adm-btn:hover{background:var(--adm-green2);transform:translateY(-1px);}
.adm-err {
  font-family:'DM Mono',monospace;font-size:0.6rem;color:#B91C1C;
  margin-top:0.75rem;text-align:center;background:rgba(185,28,28,0.07);
  border:1px solid rgba(185,28,28,0.2);border-radius:6px;padding:0.4rem;display:none;
}

/* ── Panel principal ── */
#admin-panel {
  display:none;position:fixed;inset:0;z-index:1000;
  background:var(--adm-bg);overflow-y:auto;
}
#admin-panel.open{display:block;}

.adm-header {
  background:var(--adm-card);border-bottom:1.5px solid var(--adm-border);
  padding:0.9rem 2rem;display:flex;align-items:center;gap:1rem;
  position:sticky;top:0;z-index:10;
  box-shadow:0 2px 8px rgba(42,31,20,0.08);
}
.adm-header-title {
  font-family:'DM Mono',monospace;font-size:0.72rem;
  color:var(--adm-green);letter-spacing:0.1em;text-transform:uppercase;
}
.adm-header-sub {
  font-family:'DM Mono',monospace;font-size:0.58rem;color:var(--adm-muted);margin-top:1px;
}
.adm-close-btn {
  margin-left:auto;background:var(--adm-bg2);border:1px solid var(--adm-border);
  color:var(--adm-muted);font-family:'DM Mono',monospace;font-size:0.63rem;
  padding:0.4rem 1rem;cursor:pointer;border-radius:6px;
  transition:all 0.15s;text-transform:uppercase;letter-spacing:0.05em;
}
.adm-close-btn:hover{background:var(--adm-green);border-color:var(--adm-green);color:#fff;}
.adm-logout-btn {
  background:rgba(185,28,28,0.07);border:1px solid rgba(185,28,28,0.22);color:#B91C1C;
  font-family:'DM Mono',monospace;font-size:0.63rem;padding:0.4rem 1rem;
  cursor:pointer;border-radius:6px;transition:all 0.15s;
  text-transform:uppercase;letter-spacing:0.05em;
}
.adm-logout-btn:hover{background:rgba(185,28,28,0.14);}

.adm-body{padding:2rem;max-width:1100px;margin:0 auto;}
.adm-section{margin-bottom:2.5rem;}
.adm-section-title {
  font-family:'DM Mono',monospace;font-size:0.6rem;color:var(--adm-green);
  letter-spacing:0.18em;text-transform:uppercase;margin-bottom:1rem;
  display:flex;align-items:center;gap:0.6rem;
  padding-bottom:0.5rem;border-bottom:1px solid var(--adm-border2);
}
.adm-section-title::before{
  content:'';width:1.5rem;height:2px;background:var(--adm-green);border-radius:2px;
}

/* ── Stats ── */
.adm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem;}
.adm-stat {
  background:var(--adm-card);border:1px solid var(--adm-border);
  border-radius:10px;padding:1rem;text-align:center;
  box-shadow:0 1px 4px rgba(42,31,20,0.06);
}
.adm-stat-num {
  font-family:'Cormorant Garamond',serif;font-size:2rem;
  font-weight:600;color:var(--adm-green);line-height:1;
}
.adm-stat-lbl {
  font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--adm-muted);
  margin-top:0.3rem;text-transform:uppercase;letter-spacing:0.08em;
}

/* ── Slots ── */
.adm-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:1rem;}
.adm-slot {
  background:var(--adm-card);border:1.5px solid var(--adm-border);
  border-radius:10px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;
  box-shadow:0 1px 4px rgba(42,31,20,0.06);
}
.adm-slot:hover{border-color:var(--adm-green2);box-shadow:0 4px 14px rgba(58,107,34,0.14);}
.adm-slot-preview {
  width:100%;aspect-ratio:4/3;background:var(--adm-bg2);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0.5rem;position:relative;overflow:hidden;cursor:pointer;
}
.adm-slot-preview img {
  position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;transition:transform 0.3s;
}
.adm-slot-preview:hover img{transform:scale(1.04);}
.adm-slot-overlay {
  position:absolute;inset:0;background:rgba(42,31,20,0.5);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:0.5rem;opacity:0;transition:opacity 0.2s;
}
.adm-slot-preview:hover .adm-slot-overlay{opacity:1;}
.adm-slot-icon{font-size:1.75rem;opacity:0.35;}
.adm-slot-empty-txt {
  font-family:'DM Mono',monospace;font-size:0.56rem;
  color:var(--adm-muted);text-align:center;padding:0 0.75rem;
}
.adm-overlay-txt {
  font-family:'DM Mono',monospace;font-size:0.62rem;
  color:#fff;letter-spacing:0.08em;text-transform:uppercase;
}
.adm-slot-info{padding:0.65rem 0.75rem;background:var(--adm-card);}
.adm-slot-name {
  font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--adm-muted);
  margin-bottom:0.45rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.adm-slot-actions{display:flex;gap:0.4rem;}
.adm-action-btn {
  flex:1;padding:0.38rem;background:var(--adm-bg2);
  border:1px solid var(--adm-border);color:var(--adm-green);
  font-family:'DM Mono',monospace;font-size:0.54rem;cursor:pointer;
  border-radius:5px;text-align:center;transition:all 0.15s;
  text-transform:uppercase;letter-spacing:0.04em;font-weight:500;
}
.adm-action-btn:hover{background:var(--adm-green);border-color:var(--adm-green);color:#fff;}
.adm-action-btn.del{color:#B91C1C;border-color:rgba(185,28,28,0.2);background:rgba(185,28,28,0.05);}
.adm-action-btn.del:hover{background:rgba(185,28,28,0.12);border-color:rgba(185,28,28,0.35);}

/* ── Toast ── */
#adm-toast {
  position:fixed;bottom:5rem;right:2rem;z-index:2000;
  background:var(--adm-card);border:1px solid var(--adm-border2);
  color:var(--adm-text);font-family:'DM Mono',monospace;font-size:0.68rem;
  padding:0.7rem 1.25rem;border-radius:8px;
  opacity:0;transform:translateY(8px);transition:all 0.22s;pointer-events:none;
  box-shadow:0 4px 16px rgba(42,31,20,0.14);max-width:320px;line-height:1.5;
}
#adm-toast.show{opacity:1;transform:translateY(0);}
#adm-file-input{display:none;}

/* ═══════════════════════════════════════════
   EDITOR DE IMÁGENES
═══════════════════════════════════════════ */
#img-editor-overlay {
  display:none;position:fixed;inset:0;z-index:2000;
  background:rgba(42,31,20,0.75);backdrop-filter:blur(6px);
  align-items:center;justify-content:center;
}
#img-editor-overlay.open{display:flex;}
.img-editor-box {
  background:var(--adm-card);border:1.5px solid var(--adm-border);
  border-radius:14px;width:min(95vw,880px);max-height:92vh;
  display:flex;flex-direction:column;overflow:hidden;
  box-shadow:0 32px 80px rgba(42,31,20,0.3);
}
.ie-header {
  padding:0.9rem 1.25rem;border-bottom:1px solid var(--adm-border);
  display:flex;align-items:center;gap:0.75rem;flex-shrink:0;background:var(--adm-bg2);
}
.ie-title {
  font-family:'DM Mono',monospace;font-size:0.72rem;
  color:var(--adm-green);letter-spacing:0.1em;text-transform:uppercase;flex:1;
}
.ie-body{display:flex;flex:1;overflow:hidden;min-height:0;}
.ie-canvas-wrap {
  flex:1;background:var(--adm-bg2);
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;min-width:0;
}
#ie-canvas{max-width:100%;max-height:100%;display:block;cursor:crosshair;touch-action:none;}
.ie-sidebar {
  width:225px;min-width:225px;background:var(--adm-card);
  border-left:1px solid var(--adm-border);
  padding:1rem;overflow-y:auto;display:flex;flex-direction:column;gap:0.85rem;
}
.ie-section-lbl {
  font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--adm-green);
  letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.45rem;
  display:block;font-weight:500;
}
.ie-row{display:flex;gap:0.4rem;align-items:center;}
.ie-btn {
  flex:1;padding:0.45rem 0.5rem;background:var(--adm-bg2);
  border:1px solid var(--adm-border);color:var(--adm-text);
  font-family:'DM Mono',monospace;font-size:0.6rem;cursor:pointer;
  border-radius:6px;text-align:center;transition:all 0.15s;
}
.ie-btn:hover{background:var(--adm-green);border-color:var(--adm-green);color:#fff;}
.ie-btn.active{background:var(--adm-brown);border-color:var(--adm-brown);color:#fff;}
.ie-btn:disabled{opacity:0.35;cursor:not-allowed;pointer-events:none;}
.ie-input {
  width:100%;padding:0.42rem 0.6rem;background:var(--adm-bg);
  border:1px solid var(--adm-border);color:var(--adm-text);
  font-family:'DM Mono',monospace;font-size:0.7rem;border-radius:6px;
  outline:none;transition:border-color 0.15s;
}
.ie-input:focus{border-color:var(--adm-green2);}
.ie-slider{width:100%;accent-color:var(--adm-green);cursor:pointer;}
.ie-val {
  font-family:'DM Mono',monospace;font-size:0.63rem;
  color:var(--adm-green);min-width:32px;text-align:right;font-weight:500;
}
.ie-divider{height:1px;background:var(--adm-border);margin:0.1rem 0;}
.ie-save-btn {
  width:100%;padding:0.72rem;background:var(--adm-green);border:none;color:#F7F2E8;
  font-family:'DM Mono',monospace;font-size:0.72rem;font-weight:500;
  letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
  border-radius:7px;transition:background 0.15s;
}
.ie-save-btn:hover{background:var(--adm-green2);}
.ie-save-btn:disabled{opacity:0.5;cursor:not-allowed;}
.ie-cancel-btn {
  width:100%;padding:0.5rem;background:transparent;
  border:1px solid var(--adm-border);color:var(--adm-muted);
  font-family:'DM Mono',monospace;font-size:0.63rem;cursor:pointer;
  border-radius:7px;transition:all 0.15s;text-transform:uppercase;letter-spacing:0.05em;
}
.ie-cancel-btn:hover{background:rgba(185,28,28,0.08);border-color:rgba(185,28,28,0.3);color:#B91C1C;}
.ie-size-info {
  font-family:'DM Mono',monospace;font-size:0.57rem;
  color:var(--adm-muted);text-align:center;margin-top:0.2rem;
}
.ie-crop-hint {
  font-family:'DM Mono',monospace;font-size:0.56rem;color:var(--adm-brown);
  text-align:center;padding:0.4rem 0.5rem;
  background:rgba(123,79,46,0.08);border:1px solid rgba(123,79,46,0.18);
  border-radius:5px;line-height:1.5;
}
#crop-overlay {
  position:absolute;border:2px solid var(--adm-brown2);
  box-shadow:0 0 0 9999px rgba(42,31,20,0.45);pointer-events:none;display:none;
}
