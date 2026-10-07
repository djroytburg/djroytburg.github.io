// js/main.js — bootstrap, transport, run picker, theme, keyboard, URL hash sync.
import { state, set, on, off, emit } from './state.js?v=5';
import { listRuns, loadRun } from './data.js?v=5';
import * as graph from './graph.js?v=5';
import * as feed from './feed.js?v=5';
import * as metrics from './metrics.js?v=5';
import * as rotations from './rotations.js?v=5';

const $ = (id) => document.getElementById(id);
const ctx = { state, set, on, off, d3: window.d3 };

// ---------- URL hash ----------
function readHash() {
  const h = location.hash.replace(/^#/, '');
  const out = {};
  for (const kv of h.split('&')) {
    if (!kv) continue;
    const i = kv.indexOf('=');
    const k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i));
    const v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1));
    out[k] = v;
  }
  return out;
}
let hashTimer = null;
let suppressHash = false;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    if (!state.run) return;
    const parts = [`run=${encodeURIComponent(state.run.run_id)}`, `step=${state.step}`];
    if (state.agent != null) parts.push(`agent=${state.agent}`);
    const next = '#' + parts.join('&');
    if (location.hash !== next) {
      suppressHash = true;
      history.replaceState(null, '', next);
      suppressHash = false;
    }
  }, 150);
}

// ---------- theme ----------
const THEME_KEY = 'divsim.theme';
function applyTheme(t) {
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  const b = $('theme');
  if (b) { b.textContent = t === 'dark' ? 'light' : 'dark'; b.setAttribute('aria-pressed', String(t === 'dark')); }
  try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
}
function initTheme() {
  let t = 'dark';
  try { t = localStorage.getItem(THEME_KEY) || 'dark'; } catch (_) {}
  applyTheme(t);
  $('theme').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(dark ? 'light' : 'dark');
  });
}

// ---------- transport ----------
let rafId = null, lastT = 0, acc = 0;
function tick(t) {
  if (!state.playing || !state.run) { rafId = null; return; }
  if (lastT) {
    acc += (t - lastT) / 1000 * state.speed * 2;   // speed×2 steps per second
    if (acc >= 1) {
      const n = Math.floor(acc); acc -= n;
      const next = Math.min(state.run.steps, state.step + n);
      if (next !== state.step) set({ step: next });
      if (next >= state.run.steps) { set({ playing: false }); rafId = null; return; }
    }
  }
  lastT = t;
  rafId = requestAnimationFrame(tick);
}
function startTimer() {
  if (rafId != null) return;
  lastT = 0; acc = 0;
  rafId = requestAnimationFrame(tick);
}
function stopTimer() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
}
function togglePlay() {
  if (!state.run) return;
  if (!state.playing && state.step >= state.run.steps) set({ step: 0 });
  set({ playing: !state.playing });
}
function stepBy(d) {
  if (!state.run) return;
  set({ step: Math.max(0, Math.min(state.run.steps, state.step + d)) });
}

function renderTransport() {
  const r = state.run;
  const max = r ? r.steps : 0;
  const play = $('play');
  play.textContent = state.playing ? '❚❚' : '▶';
  play.setAttribute('aria-label', state.playing ? 'pause' : 'play');
  play.classList.toggle('on', state.playing);
  const sc = $('scrub');
  sc.max = max;
  if (Number(sc.value) !== state.step) sc.value = state.step;
  $('step-readout').textContent = `${state.step} / ${max}`;
  document.querySelectorAll('#speeds .btn').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === state.speed));
  if (r && $('run-select').value !== r.run_id) $('run-select').value = r.run_id;
}

// ---------- run loading ----------
let runs = [];
async function switchRun(runId, opts = {}) {
  const entry = runs.find(x => x.run_id === runId) || runs.find(x => x.regime === 'tetrad') || runs[0];
  if (!entry) throw new Error('no runs in data/index.json');
  document.body.classList.add('loading');
  const bundle = await loadRun(entry.file);
  const families = {};
  for (const f of bundle.families) families[f] = true;
  const steps = bundle.steps;
  const step = Math.max(0, Math.min(steps, Number.isFinite(opts.step) ? opts.step : 0));
  const agent = Number.isFinite(opts.agent) && bundle.agents.some(a => a.id === opts.agent) ? opts.agent : null;
  set({ playing: false });
  set({ run: bundle, step, agent, post: null, hover: null, families });
  emit('run', bundle);
  $('run-label').textContent = bundle.label || bundle.run_id;
  $('run-meta').textContent = `${bundle.n_agents} agents · ${bundle.steps} steps · ${bundle.families.join(' / ')}`;
  document.body.classList.remove('loading');
}

function renderEmptyFeed() {
}

// ---------- keyboard ----------
function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' && t.type !== 'range' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
function onKey(e) {
  if (isTyping(e)) return;
  const big = e.shiftKey ? 10 : 1;
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowLeft': e.preventDefault(); stepBy(-big); break;
    case 'ArrowRight': e.preventDefault(); stepBy(big); break;
    case 'Home': e.preventDefault(); set({ step: 0 }); break;
    case 'End': e.preventDefault(); if (state.run) set({ step: state.run.steps }); break;
    case 'Escape': set({ agent: null, post: null }); break;
    case '1': case '2': case '4': case '8': set({ speed: Number(e.key) }); break;
  }
}

// ---------- boot ----------
async function boot() {
  initTheme();
  runs = await listRuns();
  const sel = $('run-select');
  sel.innerHTML = '';
  // grouped by mixture size, then by model mixture, so 200+ runs stay navigable
  const REG = { dyad: 'two-way', triad: 'three-way', tetrad: 'four-way' };
  const groups = new Map();
  for (const r of runs) {
    const k = `${REG[r.regime] || r.regime} · ${(r.families || []).join(' + ')}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const order = ['two-way', 'three-way', 'four-way'];
  for (const k of [...groups.keys()].sort((a, b) => order.findIndex(o => a.startsWith(o)) - order.findIndex(o => b.startsWith(o)) || a.localeCompare(b))) {
    const g = document.createElement('optgroup'); g.label = `${k} (${groups.get(k).length})`;
    for (const r of groups.get(k)) {
      const o = document.createElement('option');
      o.value = r.run_id; o.textContent = (r.label || r.run_id).split(' · ').slice(-1)[0];
      g.appendChild(o);
    }
    sel.appendChild(g);
  }
  sel.addEventListener('change', () => switchRun(sel.value).catch(showError));

  $('play').addEventListener('click', togglePlay);
  $('scrub').addEventListener('input', (e) => set({ step: Number(e.target.value) }));
  document.querySelectorAll('#speeds .btn').forEach(b => b.addEventListener('click', () => set({ speed: Number(b.dataset.speed) })));
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => {
    if (suppressHash) return;
    const h = readHash();
    if (h.run && state.run && h.run !== state.run.run_id) {
      switchRun(h.run, { step: Number(h.step), agent: h.agent === undefined ? NaN : Number(h.agent) }).catch(showError);
    } else {
      const p = {};
      if (h.step !== undefined && Number.isFinite(Number(h.step))) p.step = Number(h.step);
      if (h.agent !== undefined) p.agent = Number.isFinite(Number(h.agent)) ? Number(h.agent) : null;
      set(p);
    }
  });

  on('change', (keys) => {
    if (keys.includes('playing')) state.playing ? startTimer() : stopTimer();
    renderTransport();
    if (keys.includes('agent')) renderEmptyFeed();
    if (keys.some(k => k === 'step' || k === 'agent' || k === 'run')) writeHash();
  });

  const h = readHash();
  await switchRun(h.run, { step: Number(h.step), agent: h.agent === undefined ? NaN : Number(h.agent) });

  graph.mount($('graph'), ctx);
  feed.mount($('feed'), ctx);
  metrics.mount($('metrics'), ctx);
  rotations.mount($('metrics'), ctx);
  renderTransport();
  renderEmptyFeed();
  writeHash();
}

function showError(e) {
  console.error(e);
  const el = $('run-label');
  if (el) el.textContent = `error: ${e.message}`;
  document.body.classList.remove('loading');
}

boot().catch(showError);
