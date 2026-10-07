// Rotations panel: the other runs of the same seed (same personas in the same slots,
// different persona→model assignment). Lets you jump between them and follow one persona.
import { listRuns, loadRun, familyColor } from './data.js';

const LONG = { 'gpt-oss': 'gpt-oss', 'Qwen': 'Qwen3', 'Mag': 'Magistral', 'GLM-4': 'GLM-4', 'Gemma': 'Gemma' };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtS = v => (v == null || Number.isNaN(v)) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
const tc = f => `color-mix(in srgb, ${familyColor(f)} var(--fam-text-mix, 100%), black)`;
const CSS = `
.rt-list{display:flex;flex-direction:column;gap:4px;margin-top:4px}
.rt-row{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:4px 6px;border:1px solid transparent;cursor:pointer;font-family:var(--mono);font-size:11px}
.rt-row:hover{border-color:var(--rule,#d8d8d8)}
.rt-row.cur{border-color:var(--ink,#151515);cursor:default}
.rt-row .rt-lab{color:var(--muted,#6a6a6a);min-width:3.5em}
.rt-row.cur .rt-lab{color:var(--ink,#151515);font-weight:700}
.rt-strip{display:flex;height:12px;gap:2px}
.rt-strip i{flex:1 1 0;display:block;background:var(--c);position:relative}
.rt-strip i.me::after{content:"";position:absolute;left:50%;top:-4px;width:0;height:0;border:4px solid transparent;border-top-color:var(--ink,#151515)}
.rt-h{display:flex;gap:10px;white-space:nowrap}
.rt-h span{min-width:4.2em;text-align:right}
.rt-persona{margin-top:8px;border-top:1px dashed var(--rule,#d8d8d8);padding-top:6px}
.rt-persona table{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:11px;font-variant-numeric:tabular-nums}
.rt-persona th{font-weight:400;color:var(--muted,#6a6a6a);text-align:right;padding:0 0 2px}
.rt-persona th:first-child,.rt-persona td:first-child{text-align:left}
.rt-persona td{text-align:right;padding:2px 0;border-top:1px solid var(--rule-2,rgba(0,0,0,.06))}
.rt-persona tr.cur td{font-weight:700}
.rt-persona tr{cursor:pointer}.rt-persona tr.cur{cursor:default}
.rt-note{font-family:"Inter",system-ui,sans-serif;font-size:11px;color:var(--muted,#6a6a6a);margin-top:6px;line-height:1.35}`;

export function mount(el, ctx) {
  const { state, on } = ctx;
  if (!document.getElementById('rt-css')) { const s = document.createElement('style'); s.id = 'rt-css'; s.textContent = CSS; document.head.appendChild(s); }
  const sec = document.createElement('section'); sec.className = 'mx-panel rt';
  sec.innerHTML = `<h3 class="mx-h"><span>Rotations</span><span class="mx-sub rt-sub"></span></h3>
    <div class="rt-list"></div><div class="rt-persona" hidden></div><div class="rt-note"></div>`;
  el.prepend(sec);
  const Q = s => sec.querySelector(s);
  let index = null, sibs = [], bundles = new Map(), curId = null, token = 0;
  const key = e => `${e.regime}|${[...e.families].sort().join('+')}|${e.stats?.seed}`;
  const rotLabel = e => e.stats?.rotation ? `r${e.stats.rotation}` : e.run_id.replace(/^runs__(tetratic__)?sweep_(tri_)?/, '').replace(/_s\d+$/, '').replace(/_BA$/, '·BA');

  async function bundle(e) {
    if (!bundles.has(e.run_id)) bundles.set(e.run_id, loadRun(e.file));
    return bundles.get(e.run_id);
  }
  function blocks(b) {                       // persona slots are contiguous agent-id blocks; one model per block
    const out = []; let cur = null;
    for (const a of [...b.agents].sort((x, y) => x.id - y.id)) {
      if (!cur || cur.family !== a.family) { cur = { family: a.family, n: 0, from: a.id }; out.push(cur); }
      cur.n++;
    }
    return out;
  }
  function personaStats(b, name) {
    const a = b.agents.find(x => x.persona === name); if (!a) return null;
    const fam = new Map(b.agents.map(x => [x.id, x.family]));
    const mine = new Set(b.posts.filter(p => p.agent === a.id).map(p => p.id));
    let cross = 0, all = 0;
    for (const c of b.comments) if (mine.has(c.post)) { all++; if (fam.get(c.agent) !== a.family) cross++; }
    return { id: a.id, family: a.family, posts: mine.size, cross, all, cpp: mine.size ? cross / mine.size : null };
  }
  function go(e, agentId) {
    const h = `#run=${encodeURIComponent(e.run_id)}&step=${state.step}` + (agentId != null ? `&agent=${agentId}` : '');
    location.hash = h;                     // main.js listens to hashchange and switches run
  }

  async function render() {
    const run = state.run; if (!run) return;
    const my = ++token;
    if (!index) index = await listRuns();
    if (my !== token) return;
    const me = index.find(e => e.run_id === run.run_id);
    if (!me) { sec.hidden = true; return; }
    sec.hidden = false;
    if (curId !== run.run_id) {
      curId = run.run_id;
      sibs = index.filter(e => key(e) === key(me)).sort((a, b) => (+a.stats.rotation || 0) - (+b.stats.rotation || 0) || a.run_id.localeCompare(b.run_id));
    }
    Q('.rt-sub').textContent = `seed ${me.stats?.seed ?? '?'} · ${sibs.length} assignment${sibs.length === 1 ? '' : 's'}`;
    const sel = state.agent != null ? run.agents.find(a => a.id === state.agent) : null;
    // rows need each sibling's block assignment: load bundles (cached; ~0.5 MB each)
    const bs = await Promise.all(sibs.map(bundle)); if (my !== token) return;
    const list = Q('.rt-list'); list.innerHTML = '';
    sibs.forEach((e, i) => {
      const b = bs[i]; const bl = blocks(b);
      const row = document.createElement('div'); row.className = 'rt-row' + (e.run_id === run.run_id ? ' cur' : '');
      row.title = e.run_id;
      const strip = bl.map(k => `<i style="--c:${familyColor(k.family)};flex-grow:${k.n}" class="${sel && sel.id >= k.from && sel.id < k.from + k.n ? 'me' : ''}" title="${k.n} agents · ${LONG[k.family]}"></i>`).join('');
      const H = e.stats?.H_in || {};
      const hs = run.families.map(f => `<span style="color:${tc(f)}">${fmtS(H[f])}</span>`).join('');
      row.innerHTML = `<span class="rt-lab">${esc(rotLabel(e))}</span><span class="rt-strip">${strip}</span><span class="rt-h">${hs}</span>`;
      if (e.run_id !== run.run_id) row.addEventListener('click', () => go(e, sel ? (b.agents.find(a => a.persona === sel.persona)?.id ?? null) : null));
      list.appendChild(row);
    });
    const pp = Q('.rt-persona');
    if (sel) {
      const rows = sibs.map((e, i) => ({ e, s: personaStats(bs[i], sel.persona) })).filter(x => x.s);
      pp.hidden = false;
      pp.innerHTML = `<div class="mx-k">${esc(sel.persona)} across assignments</div>
        <table><thead><tr><th>run</th><th>model</th><th>posts</th><th>cross recv</th><th>cpp</th></tr></thead><tbody>` +
        rows.map(({ e, s }) => `<tr class="${e.run_id === run.run_id ? 'cur' : ''}" data-run="${esc(e.run_id)}" data-agent="${s.id}"><td>${esc(rotLabel(e))}</td><td style="color:${tc(s.family)}">${LONG[s.family]}</td><td>${s.posts}</td><td>${s.cross}</td><td>${s.cpp == null ? '—' : s.cpp.toFixed(1)}</td></tr>`).join('') + '</tbody></table>';
      pp.querySelectorAll('tr[data-run]').forEach(tr => { if (!tr.classList.contains('cur')) tr.addEventListener('click', () => go(sibs.find(e => e.run_id === tr.dataset.run), Number(tr.dataset.agent))); });
    } else { pp.hidden = true; pp.innerHTML = ''; }
    Q('.rt-note').textContent = sibs.length > 1
      ? `Same ${run.n_agents} personas in the same slots; only which model powers each block changes. Strip = blocks by model; numbers = final incoming H per family. Click a row to open that run${sel ? ' with this persona selected' : ''}.`
      : 'No other assignment of this seed is in the release.';
  }
  let t = null; const schedule = () => { clearTimeout(t); t = setTimeout(() => render().catch(console.error), 30); };
  on('run', schedule); on('change', keys => { if (!keys || keys.some(k => k === 'agent' || k === 'run')) schedule(); });
  schedule();
}
