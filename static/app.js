/* MindMetric — instrument frontend */

const form = document.querySelector('#profile-form');
const emptyState = document.querySelector('#empty-state');
const resultState = document.querySelector('#result-state');
const submitButton = form.querySelector('.submit-button');
const btnLabel = submitButton.querySelector('.btn-label');
const toast = document.querySelector('#toast');
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DEFAULTS = {
  gender: 'Female', country: 'India', academic_level: 'Undergraduate',
  platform: 'Instagram', purpose: 'Entertainment', stress_level: 'Medium',
};
const NUMERIC = ['age', 'daily_usage_hours', 'daily_unlocks', 'study_hours', 'physical_activity_hours', 'sleep_hours'];

/* ---------- oscilloscope ---------- */
// A single canvas trace. Idles as a low-amplitude calm line; on a reading it
// morphs — amplitude, frequency, turbulence, and hue all encode the score.
class Oscilloscope {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
    this.state = { amp: 6, freq: 1.1, noise: 0, hue: '#8b96a5', speed: 0.6, glow: 0 };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (prefersReduced) this.drawFrame(); // static single frame
  }

  // pseudo-random but stable turbulence per x
  turbulence(x) {
    return Math.sin(x * 0.9 + 1.3) * Math.sin(x * 2.7 + 0.4) * Math.sin(x * 0.37);
  }

  drawFrame() {
    const { ctx, w, h, state } = this;
    ctx.clearRect(0, 0, w, h);
    const mid = h / 2;
    const step = 2;

    // soft glow underlay when a signal is present
    if (state.glow > 0) {
      ctx.save();
      ctx.globalAlpha = 0.16 * state.glow;
      ctx.strokeStyle = state.hue;
      ctx.lineWidth = 9;
      ctx.filter = 'blur(6px)';
      this.tracePath(ctx, mid, step);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = state.hue;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    this.tracePath(ctx, mid, step);
    ctx.stroke();

    // leading dot
    const lastY = mid + this.sampleY(w);
    ctx.fillStyle = state.hue;
    ctx.beginPath();
    ctx.arc(w - 1, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  sampleY(x) {
    const { state, w } = this;
    const phase = (x / w) * Math.PI * 2 * (2 + state.freq * 3);
    const base = Math.sin(phase + this.t) * state.amp;
    const chaos = this.turbulence(x / w * 12 + this.t) * state.amp * state.noise;
    // gentle envelope so the trace eases in from the left edge
    const env = Math.min(1, x / (w * 0.12));
    return (base + chaos) * env;
  }

  tracePath(ctx, mid, step) {
    ctx.beginPath();
    for (let x = 0; x <= this.w; x += step) {
      const y = mid + this.sampleY(x);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }

  loop() {
    if (prefersReduced) return;
    this.t += this.state.speed * 0.02;
    this.drawFrame();
    requestAnimationFrame(() => this.loop());
  }

  // animate to a target state over time (score → visuals)
  tune(target, duration = 1.2) {
    if (prefersReduced || !window.gsap) { Object.assign(this.state, target); this.drawFrame(); return; }
    gsap.to(this.state, { ...target, duration, ease: 'power3.out' });
  }
}

/* map a 0–10 score to signal visuals: calm teal → jittery amber → red */
function scopeTargetFor(score) {
  const c = score / 10;
  const hue = score >= 7 ? '#14b8a6' : score >= 5 ? '#f59e0b' : '#ef4444';
  return {
    amp: 10 + (1 - c) * 34,        // lower score → bigger swings
    freq: 0.6 + (1 - c) * 2.6,     // lower score → busier
    noise: (1 - c) * 0.9,          // lower score → more turbulence
    hue,
    speed: 0.5 + (1 - c) * 1.4,
    glow: 1,
  };
}

const scope = new Oscilloscope(document.querySelector('#scope-canvas'));
scope.loop();

/* ---------- options ---------- */
async function loadOptions() {
  const response = await fetch('/api/options');
  if (!response.ok) throw new Error('options');
  const options = await response.json();
  document.querySelectorAll('[data-options]').forEach((select) => {
    (options[select.dataset.options] || []).forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (DEFAULTS[select.name] && [...select.options].some((o) => o.value === DEFAULTS[select.name])) {
      select.value = DEFAULTS[select.name];
    }
  });
  document.querySelector('#status-text').textContent = 'Instrument online';
}

/* ---------- heuristic factors (honest: rule-based, not model-derived) ---------- */
function deriveFactors(payload) {
  const rules = [
    { ok: payload.sleep_hours >= 7, up: 'Rest supports your signal', down: 'Short sleep pulls it down', val: `${payload.sleep_hours}h sleep` },
    { ok: payload.stress_level === 'Low' || payload.stress_level === 'Medium', up: 'Stress in a manageable range', down: 'High stress weighs heavily', val: payload.stress_level },
    { ok: payload.daily_usage_hours <= 4, up: 'Screen time in check', down: 'Heavy screen time', val: `${payload.daily_usage_hours}h/day` },
    { ok: payload.physical_activity_hours >= 1, up: 'Movement most days', down: 'Little movement', val: `${payload.physical_activity_hours}h/day` },
  ];
  // prefer showing what's *hurting* first, then what's helping — cap at 3
  const sorted = [...rules].sort((a, b) => Number(a.ok) - Number(b.ok));
  return sorted.slice(0, 3).map((r) => ({
    ok: r.ok,
    text: r.ok ? r.up : r.down,
    val: r.val,
  }));
}

function renderFactors(payload) {
  const list = document.querySelector('#factor-list');
  list.innerHTML = '';
  deriveFactors(payload).forEach((f) => {
    const row = document.createElement('div');
    row.className = 'factor';
    row.innerHTML = `<span class="dir ${f.ok ? 'up' : 'down'}">${f.ok ? '↑' : '↓'}</span><span>${f.text}</span><span class="fval">${f.val}</span>`;
    list.appendChild(row);
  });
  document.querySelector('#factors').hidden = false;
}

/* ---------- count-up ---------- */
function countScore(el, to) {
  if (prefersReduced || !window.gsap) { el.textContent = to.toFixed(2); return; }
  const obj = { v: 0 };
  gsap.to(obj, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => { el.textContent = obj.v.toFixed(2); } });
}

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  toast.innerHTML = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
}

/* ---------- submit ---------- */
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  btnLabel.textContent = 'Reading…';

  const payload = Object.fromEntries(new FormData(form));
  NUMERIC.forEach((key) => { payload[key] = Number(payload[key]); });

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('predict');
    const data = await response.json();

    const outlookText = document.querySelector('#outlook-text');
    const swatch = document.querySelector('#outlook-swatch');
    const hue = data.score >= 7 ? 'var(--signal)' : data.score >= 5 ? 'var(--amber)' : 'var(--red)';

    outlookText.textContent = data.outlook;
    swatch.style.background = hue;
    document.querySelector('#scope-state').textContent = 'resolved';
    document.querySelector('#scope-value').textContent = `${data.score.toFixed(2)} / 10`;
    document.querySelector('.scope-tag').innerHTML = `signal &middot; ${(data.score / 10 * 2.4).toFixed(2)} Hz`;

    renderFactors(payload);
    scope.tune(scopeTargetFor(data.score));

    // reveal sequence
    emptyState.classList.add('hidden');
    resultState.classList.remove('hidden');
    countScore(document.querySelector('#score'), data.score);

    if (window.gsap && !prefersReduced) {
      gsap.fromTo(resultState.children,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' });
    }
  } catch (error) {
    showToast('Could not read the signal. Check the values and <b>try again</b>.');
  } finally {
    submitButton.disabled = false;
    btnLabel.textContent = 'Read my signal';
  }
});

document.querySelector('#reset-button').addEventListener('click', () => {
  resultState.classList.add('hidden');
  emptyState.classList.remove('hidden');
  document.querySelector('#scope-state').textContent = 'idle';
  document.querySelector('#scope-value').textContent = '—';
  document.querySelector('.scope-tag').innerHTML = 'baseline &middot; 0.00 Hz';
  scope.tune({ amp: 6, freq: 1.1, noise: 0, hue: '#8b96a5', speed: 0.6, glow: 0 });
  document.querySelector('#age').focus();
});

/* ---------- entrance ---------- */
function playEntrance() {
  document.body.classList.add('is-ready');
  if (!window.gsap || prefersReduced) return;
  gsap.from('[data-reveal]', { y: 24, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out', clearProps: 'opacity' });
}

loadOptions()
  .then(playEntrance)
  .catch(() => {
    playEntrance();
    document.querySelector('#status-dot').style.background = 'var(--amber)';
    document.querySelector('#status-text').textContent = 'API offline';
    showToast('Could not reach the model API. Is the server running?');
  });
