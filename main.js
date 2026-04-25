/* ═══════════════════════════════════════════════
   INMOTEX · MUSAFIL — main.js
   Interactividad principal de la landing page
═══════════════════════════════════════════════ */

// ── Tab switcher — galería de evidencia ────────
function switchTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

// ── Scroll fade-up animations ──────────────────
const faders = document.querySelectorAll(
  '.kpi-card, .scenario-card, .val-card, .gallery-card, .partner-card, .process-step, .adv-card'
);
faders.forEach((el, i) => {
  el.classList.add('fade-up');
  el.style.transitionDelay = (i % 4) * 0.08 + 's';
});

const scrollObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      scrollObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

faders.forEach(el => scrollObserver.observe(el));

// ── Nav scroll effect ──────────────────────────
window.addEventListener('scroll', () => {
  document.querySelector('nav').style.background =
    window.scrollY > 60 ? 'rgba(10,26,15,0.97)' : 'rgba(10,26,15,0.85)';
});

// ── Active nav link highlight ──────────────────
const sections = document.querySelectorAll('section[id], div[id="dashboard"]');
const navLinks  = document.querySelectorAll('.nav-links a');

const navObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.style.color = '');
      const active = document.querySelector(`.nav-links a[href="#${e.target.id}"]`);
      if (active) active.style.color = '#F4A261';
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => navObserver.observe(s));
