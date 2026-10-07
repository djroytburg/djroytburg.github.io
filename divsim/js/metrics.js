// js/metrics.js — METRICS column: attractiveness now, timelines, board state,
// feed pressure, selected agent / post thread.  ES module, exports mount(el, ctx).
// Talks to the rest of the app only through ctx = {state, set, on, d3}.

const FIXED = { 'gpt-oss': '#ff2d55', Qwen: '#00b3ff', Mag: '#b455ff', 'GLM-4': '#00e676', Gemma: '#ff9100' };
let familyColor = f => FIXED[f] || '#7f7f7f';
// family colour for TEXT: darkened on the light theme, as-is on dark (see css/app.css --fam-text-mix)
const textColor = f => `color-mix(in srgb, ${familyColor(f)} var(--fam-text-mix, 100%), black)`;
// data.js exports familyColor; fall back to the fixed table if it is unavailable (harness).
import('./data.js?v=5').then(m => { if (typeof m.familyColor === 'function') familyColor = m.familyColor; }).catch(() => {});

const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DUR = REDUCED ? 0 : 250;
const fmtS = v => (v == null || Number.isNaN(v)) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
const fmt2 = v => (v == null || Number.isNaN(v)) ? '—' : v.toFixed(2);
const fmtN = v => (v == null) ? '—' : String(v);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.mx{font-family:"Inter",system-ui,sans-serif;font-size:12px;line-height:1.4;color:var(--ink,#151515);
  font-variant-numeric:tabular-nums;display:flex;flex-direction:column;gap:18px;min-width:0;
  --mono:"Ubuntu Mono",ui-monospace,Menlo,monospace;--serif:"EB Garamond",Georgia,serif}
.mx *{box-sizing:border-box}
.mx-panel{border-top:1px solid var(--rule,#d8d8d8);padding-top:8px;min-width:0}
.mx-h{font-family:var(--serif);font-size:15px;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink,#151515);margin:0 0 8px;display:flex;justify-content:space-between;align-items:baseline;gap:8px;line-height:1.15}
.mx-h .mx-sub{font-family:"Inter",system-ui,sans-serif;font-size:11px;font-weight:400;letter-spacing:0;text-transform:none;color:var(--muted,#6a6a6a)}
.mx-row{display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:8px;height:20px;cursor:pointer;user-select:none;transition:opacity .15s}
.mx-row.off{opacity:.28}
.mx-row:focus-visible{outline:2px solid var(--focus,#6d0061);outline-offset:1px}
.mx-row .mx-name{font-family:var(--mono);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mx-row .mx-val{font-family:var(--mono);text-align:right}
.mx-track{position:relative;height:12px}
.mx-track .mx-zero{position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:var(--ink,#151515);opacity:.5}
.mx-track .mx-bar{position:absolute;top:1px;height:10px;transition:left ${DUR}ms,width ${DUR}ms}
.mx-rank{height:22px;display:block;overflow:visible;margin-top:6px}
.mx-rank text{font-family:var(--mono);font-size:12px;font-weight:700;fill:var(--ink,#151515)}
.mx-rank text.sep{font-weight:400;fill:var(--muted,#6a6a6a)}
.mx-seg{display:inline-flex;border:1px solid var(--rule,#d8d8d8);letter-spacing:0;text-transform:none}
.mx-seg button{font:inherit;font-family:var(--mono);font-size:11px;line-height:1.3;background:none;border:0;border-left:1px solid var(--rule,#d8d8d8);padding:1px 7px;cursor:pointer;color:var(--muted,#6a6a6a)}
.mx-seg button:first-child{border-left:0}
.mx-seg button:hover{color:var(--accent,#6d0061)}
.mx-seg button.on{background:var(--accent,#6d0061);color:#fff}
.mx-chart{display:block;width:100%;cursor:crosshair;touch-action:none}
.mx-chart text{font-family:var(--mono);font-size:10px;fill:var(--muted,#6a6a6a)}
.mx-chart .axis path,.mx-chart .axis line{stroke:var(--rule,#d8d8d8)}
.mx-chart .zero{stroke:var(--ink,#151515);stroke-dasharray:2 3;opacity:.6}
.mx-chart .cursor{stroke:var(--accent,#6d0061);opacity:.7}
.mx-chart .line{fill:none;stroke-width:1.5;transition:opacity .15s}
.mx-chart .line.off{opacity:.12}
.mx-chart .endlab{font-size:11px;font-weight:700;paint-order:stroke;stroke:var(--bg,#fff);stroke-width:3px;stroke-linejoin:round}
.mx-chart .endlab.off{opacity:.25}
.mx-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;margin-bottom:8px}
.mx-k{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted,#6a6a6a)}
.mx-stat .mx-v{font-family:var(--mono);font-size:18px;line-height:1.1}
.mx-stack{position:relative;height:14px;margin-top:4px;background:var(--rule,#d8d8d8)}
.mx-stack .seg{position:absolute;top:0;height:100%;transition:left ${DUR}ms,width ${DUR}ms;overflow:hidden;color:#0b0b0c;font-family:var(--mono);font-size:10px;padding-left:3px;line-height:14px;white-space:nowrap}
.mx-stack .tick{position:absolute;top:-3px;height:20px;width:1px;background:var(--ink,#151515)}
.mx-legendline{font-family:var(--mono);font-size:10px;color:var(--muted,#6a6a6a);margin-top:4px}
.mx-fp{display:block;width:100%}
.mx-fp text{font-family:var(--mono);font-size:10px;fill:var(--ink,#151515)}
.mx-fp text.dim{fill:var(--muted,#6a6a6a)}
.mx-chip{display:inline-block;padding:0 5px;color:#0b0b0c;font-family:var(--mono);font-weight:700;font-size:11px;line-height:16px;vertical-align:1px}
.mx-agent .mx-persona{font-family:var(--serif);font-size:17px;font-weight:600;line-height:1.15}
.mx-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin-top:6px;font-family:var(--mono)}
.mx-kv .k,.mx-agent small{color:var(--muted,#6a6a6a)}
.mx-thread{margin-top:10px;border-top:1px dotted var(--rule,#d8d8d8);padding-top:6px}
.mx-thread b{font-family:var(--serif);font-size:14px;font-weight:600}
.mx-thread .mx-text{white-space:pre-wrap;word-break:break-word;margin:4px 0}
.mx-dots{display:inline-flex;gap:2px;vertical-align:middle;flex-wrap:wrap}
.mx-dots i{display:inline-block;width:7px;height:7px;border-radius:50%}
.mx-btn{font:inherit;font-family:var(--mono);font-size:11px;letter-spacing:0;text-transform:none;background:none;border:1px solid var(--rule,#d8d8d8);color:var(--ink,#151515);padding:0 6px;cursor:pointer}
.mx-btn:hover{border-color:var(--accent,#6d0061);color:var(--accent,#6d0061)}
.mx-empty{color:var(--muted,#6a6a6a)}
`;


function injectCSS() {
  if (document.getElementById('mx-css')) return;
  const s = document.createElement('style'); s.id = 'mx-css'; s.textContent = CSS; document.head.appendChild(s);
}

const at = (arr, i) => (arr && i < arr.length) ? arr[i] : null;
const isOn = (state, f) => state.families[f] !== false;

// ---------- helpers over run indexes (with fallbacks if data.js indexes are absent) ----------
const commentsUpTo = (run, s) => typeof run.commentsUpTo === 'function' ? run.commentsUpTo(s) : run.comments.filter(c => c.step <= s);
const postsUpTo = (run, s) => typeof run.postsUpTo === 'function' ? run.postsUpTo(s) : run.posts.filter(p => p.step <= s);
const agentOf = (run, id) => run.byAgent?.get ? run.byAgent.get(id) : run.agents.find(a => a.id === id);
const postOf = (run, id) => run.byPost?.get ? run.byPost.get(id) : run.posts.find(p => p.id === id);
const commentsOf = (run, pid) => run.commentsByPost?.get ? (run.commentsByPost.get(pid) || []) : run.comments.filter(c => c.post === pid);

// Feed pressure: cumulative count of post-family in slots 0-4 ("top") vs 15-19 ("bottom"),
// over all activations with step <= s. Computed incrementally and memoised per step.
function makeFeedPressure(run) {
  const fams = run.families;
  const acts = run.activations.filter(a => Number.isInteger(a.step)).sort((a, b) => a.step - b.step);
  const famOfPost = id => { const p = postOf(run, id); const a = p && agentOf(run, p.agent); return a && a.family; };
  const memo = new Map(); // step -> [{f, top, bot}]
  let cursor = 0, cum = null, lastStep = -1;
  const fresh = () => { const o = {}; fams.forEach(f => o[f] = { top: 0, bot: 0 }); return o; };
  const snap = () => fams.map(f => ({ f, top: cum[f].top, bot: cum[f].bot }));
  return step => {
    if (memo.has(step)) return memo.get(step);
    if (!cum || step < lastStep) { cursor = 0; cum = fresh(); lastStep = -1; }
    for (; cursor < acts.length && acts[cursor].step <= step; cursor++) {
      const a = acts[cursor];
      if (a.step !== lastStep && lastStep >= 0 && !memo.has(lastStep)) memo.set(lastStep, snap());
      lastStep = a.step;
      const feed = a.feed || [];
      for (let s = 0; s < feed.length && s < 20; s++) {
        if (s > 4 && s < 15) continue;
        const f = famOfPost(feed[s]); if (!f || !cum[f]) continue;
        if (s <= 4) cum[f].top++; else cum[f].bot++;
      }
    }
    lastStep = step;
    const out = snap(); memo.set(step, out); return out;
  };
}

// ---------- mount ----------
export function mount(el, ctx) {
  const { state, set, on } = ctx;
  const d3 = ctx.d3 || globalThis.d3;
  injectCSS();
  el.classList.add('mx');
  el.innerHTML = `
    <section class="mx-panel mx-attr">
      <h3 class="mx-h"><span>Attractiveness now</span><span class="mx-sub mx-attr-step"></span></h3>
      <div class="mx-rows"></div>
      <svg class="mx-rank" role="img" aria-label="ranking"></svg>
    </section>
    <section class="mx-panel mx-time">
      <h3 class="mx-h"><span class="mx-time-title">Incoming H over time</span>
        <span class="mx-seg" role="tablist" aria-label="metric">
          <button data-m="H_in" class="on">H</button><button data-m="cpp">CPP</button><button data-m="indeg">received</button>
        </span></h3>
      <svg class="mx-chart" height="150" role="img" aria-label="timeline"></svg>
    </section>
    <section class="mx-panel mx-board">
      <h3 class="mx-h"><span>Board state</span><span class="mx-sub mx-board-step"></span></h3>
      <div class="mx-grid">
        <div class="mx-stat"><div class="mx-k">posts</div><div class="mx-v" data-s="posts">—</div></div>
        <div class="mx-stat"><div class="mx-k">cross-model comments</div><div class="mx-v" data-s="xc">—</div></div>
        <div class="mx-stat"><div class="mx-k">top cpp</div><div class="mx-v" data-s="top">—</div></div>
        <div class="mx-stat"><div class="mx-k">bottom cpp</div><div class="mx-v" data-s="bot">—</div></div>
      </div>
      <div class="mx-k">post share · ticks = fair share</div>
      <div class="mx-stack"></div>
      <div class="mx-legendline mx-stack-lab"></div>
    </section>
    <section class="mx-panel mx-feedp">
      <h3 class="mx-h"><span>Feed pressure</span><span class="mx-sub">share of feed slots 0–4 vs 15–19</span></h3>
      <svg class="mx-fp" height="96" role="img" aria-label="feed pressure"></svg>
      <div class="mx-legendline">Exposure check: share of top vs bottom feed slots each family’s posts occupied, vs fair share (dotted). Compare with H above.</div>
    </section>
    <section class="mx-panel mx-sel">
      <h3 class="mx-h"><span class="mx-sel-title">Selection</span><button class="mx-btn mx-clear" hidden>clear</button></h3>
      <div class="mx-agent"></div>
      <div class="mx-thread" hidden></div>
    </section>`;

  const Q = s => el.querySelector(s);
  let mode = 'H_in';
  const TITLES = { H_in: 'Incoming H over time', cpp: 'Comments per post over time', indeg: 'Cross comments received over time' };
  Q('.mx-seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    mode = b.dataset.m; el.querySelectorAll('.mx-seg button').forEach(x => x.classList.toggle('on', x === b));
    Q('.mx-time-title').textContent = TITLES[mode]; schedule();
  });
  Q('.mx-clear').addEventListener('click', () => set({ post: null }));

  // per-run caches
  let runRef = null, feedPressure = null, yDomains = {}, hMax = 1;
  function prepRun(run) {
    runRef = run; feedPressure = makeFeedPressure(run); yDomains = {};
    for (const m of ['H_in', 'cpp', 'indeg']) {
      const vals = run.families.flatMap(f => (run.metrics[m]?.[f] || []).filter(v => v != null));
      let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
      if (!(hi > lo)) hi = lo + 1;
      yDomains[m] = [lo, hi];
    }
    hMax = Math.max(0.01, -yDomains.H_in[0], yDomains.H_in[1]);
    // reset chart scaffolding so scales/handlers bind to the new run
    Q('.mx-chart').innerHTML = ''; Q('.mx-fp').innerHTML = ''; Q('.mx-rank').innerHTML = ''; Q('.mx-rows').innerHTML = ''; Q('.mx-stack').innerHTML = '';
  }

  // ---------- rAF batching: at most one render per frame ----------
  let pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; render(); }); }
  on('change', schedule); on('run', schedule);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(el);

  const toggleFamily = f => set({ families: { ...state.families, [f]: !isOn(state, f) } });

  // ---------- panel 1: attractiveness now ----------
  function renderAttr(run, step) {
    Q('.mx-attr-step').textContent = `step ${step}`;
    const rows = run.families.map(f => ({ f, v: at(run.metrics.H_in[f], step) }))
      .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity));
    const sel = d3.select(Q('.mx-rows')).selectAll('.mx-row').data(rows, d => d.f);
    const enter = sel.enter().append('div').attr('class', 'mx-row').attr('role', 'button').attr('tabindex', 0)
      .attr('aria-pressed', 'true')
      .on('click', (e, d) => toggleFamily(d.f))
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFamily(d.f); } });
    enter.append('span').attr('class', 'mx-name');
    const tr = enter.append('span').attr('class', 'mx-track'); tr.append('span').attr('class', 'mx-zero'); tr.append('span').attr('class', 'mx-bar');
    enter.append('span').attr('class', 'mx-val');
    const all = enter.merge(sel).classed('off', d => !isOn(state, d.f)).attr('aria-pressed', d => String(isOn(state, d.f)))
      .attr('title', d => `${d.f}: incoming H ${fmtS(d.v)} — click to ${isOn(state, d.f) ? 'hide' : 'show'}`);
    all.select('.mx-name').text(d => d.f).style('color', d => textColor(d.f));
    all.select('.mx-bar').style('background', d => familyColor(d.f))
      .style('left', d => { const v = d.v ?? 0; return (v >= 0 ? 50 : 50 + 50 * v / hMax) + '%'; })
      .style('width', d => (50 * Math.abs(d.v ?? 0) / hMax) + '%');
    all.select('.mx-val').text(d => fmtS(d.v));
    all.order();
    renderRank(rows);
  }
  function renderRank(rows) {
    const node = Q('.mx-rank'); const w = node.clientWidth || 260;
    const svg = d3.select(node).attr('width', w).attr('height', 22);
    const items = [];
    rows.forEach((r, i) => { if (i) items.push({ id: 'sep' + i, txt: '›', sep: true }); items.push({ id: r.f, txt: r.f, f: r.f }); });
    const t = svg.selectAll('text').data(items, d => d.id);
    const ent = t.enter().append('text').attr('y', 15).attr('class', d => d.sep ? 'sep' : '').attr('x', 0).attr('opacity', 0);
    ent.filter(d => !d.sep).style('fill', d => textColor(d.f));
    const all = ent.merge(t).text(d => d.txt);
    all.each(function (d) { d.w = this.getComputedTextLength ? this.getComputedTextLength() : d.txt.length * 7.2; });
    let x = 0; items.forEach(d => { d.x = x; x += d.w + 6; });
    const target = d => (d.f && !isOn(state, d.f)) ? 0.3 : 1;
    if (DUR) all.transition('rank').duration(DUR).ease(d3.easeCubicOut).attr('x', d => d.x).attr('opacity', target);
    else all.attr('x', d => d.x).attr('opacity', target);
    t.exit().remove();
  }

  // ---------- panel 2: timeline ----------
  let dragging = false;
  function renderTime(run, step) {
    const node = Q('.mx-chart'); const w = node.clientWidth || 260, h = 150;
    const svg = d3.select(node).attr('width', w).attr('height', h);
    const M = { t: 8, r: 94, b: 18, l: 34 };
    const x = d3.scaleLinear().domain([0, run.steps]).range([M.l, w - M.r]);
    const y = d3.scaleLinear().domain(yDomains[mode]).nice().range([h - M.b, M.t]);
    const series = run.families.map(f => ({ f, pts: (run.metrics[mode][f] || []).map((v, i) => [i, v]).filter(p => p[1] != null) }));
    const line = d3.line().x(p => x(p[0])).y(p => y(p[1])).curve(d3.curveMonotoneX);
    let g = svg.select('g.root');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'root');
      g.append('g').attr('class', 'axis ax'); g.append('g').attr('class', 'axis ay');
      g.append('line').attr('class', 'zero'); g.append('g').attr('class', 'lines'); g.append('line').attr('class', 'cursor');
      g.append('g').attr('class', 'labels'); g.append('rect').attr('class', 'hit').attr('fill', 'transparent');
      const toStep = e => { const [px] = d3.pointer(e, node); const xs = d3.scaleLinear().domain([0, run.steps]).range([M.l, node.clientWidth - M.r]); return Math.max(0, Math.min(run.steps, Math.round(xs.invert(px)))); };
      g.select('.hit')
        .on('pointerdown', e => { dragging = true; try { node.setPointerCapture(e.pointerId); } catch (_) {} set({ step: toStep(e) }); })
        .on('pointermove', e => { if (dragging) set({ step: toStep(e) }); })
        .on('pointerup pointercancel', e => { dragging = false; try { node.releasePointerCapture(e.pointerId); } catch (_) {} });
    }
    g.select('.hit').attr('x', 0).attr('y', 0).attr('width', w).attr('height', h);
    g.select('.ax').attr('transform', `translate(0,${h - M.b})`).call(d3.axisBottom(x).ticks(5).tickSize(3));
    g.select('.ay').attr('transform', `translate(${M.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(3)
      .tickFormat(d3.format(mode === 'H_in' ? '+.1f' : mode === 'cpp' ? '.1f' : 'd')));
    const yd = y.domain();
    g.select('.zero').attr('x1', M.l).attr('x2', w - M.r).attr('y1', y(0)).attr('y2', y(0)).attr('display', (yd[0] < 0 && yd[1] > 0) ? null : 'none');
    const ls = g.select('.lines').selectAll('path').data(series, d => d.f);
    ls.enter().append('path').attr('class', 'line').merge(ls)
      .attr('stroke', d => familyColor(d.f)).classed('off', d => !isOn(state, d.f)).attr('d', d => line(d.pts));
    ls.exit().remove();
    g.select('.cursor').attr('x1', x(step)).attr('x2', x(step)).attr('y1', M.t).attr('y2', h - M.b);
    // labels at the cursor: family name + current value, pushed apart so they don't overlap
    const labs = series.map(s => { const v = at(run.metrics[mode][s.f], step); return { f: s.f, v, y: v == null ? null : y(v) }; })
      .filter(d => d.y != null).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) if (labs[i].y - labs[i - 1].y < 11) labs[i].y = labs[i - 1].y + 11;
    for (let i = labs.length - 1; i >= 0; i--) { if (labs[i].y > h - M.b - 2) labs[i].y = h - M.b - 2; if (i && labs[i].y - labs[i - 1].y < 11) labs[i - 1].y = labs[i].y - 11; }
    const lb = g.select('.labels').selectAll('text').data(labs, d => d.f);
    lb.enter().append('text').attr('class', 'endlab').merge(lb)
      .attr('x', Math.min(x(step) + 5, w - M.r + 4)).attr('y', d => d.y + 3.5)
      .style('fill', d => textColor(d.f)).classed('off', d => !isOn(state, d.f))
      .text(d => `${d.f} ${mode === 'H_in' ? fmtS(d.v) : mode === 'cpp' ? fmt2(d.v) : fmtN(d.v)}`);
    lb.exit().remove();
  }

  // ---------- panel 3: board state ----------
  function renderBoard(run, step) {
    Q('.mx-board-step').textContent = `step ${step}`;
    const posts = run.families.map(f => ({ f, n: at(run.metrics.posts[f], step) ?? 0 }));
    const nPosts = d3.sum(posts, d => d.n);
    const xc = d3.sum(run.families, f => at(run.metrics.indeg[f], step) ?? 0);
    const cpp = run.families.map(f => ({ f, v: at(run.metrics.cpp[f], step) })).filter(d => d.v != null).sort((a, b) => b.v - a.v);
    Q('[data-s=posts]').textContent = nPosts;
    Q('[data-s=xc]').textContent = xc;
    const chip = d => d ? `<span class="mx-chip" style="background:${familyColor(d.f)}">${esc(d.f)}</span> ${fmt2(d.v)}` : '—';
    Q('[data-s=top]').innerHTML = chip(cpp[0]);
    Q('[data-s=bot]').innerHTML = chip(cpp.length > 1 ? cpp[cpp.length - 1] : null);
    let acc = 0; posts.forEach(d => { d.x0 = nPosts ? acc / nPosts : 0; acc += d.n; d.x1 = nPosts ? acc / nPosts : 0; });
    const st = d3.select(Q('.mx-stack'));
    const sg = st.selectAll('.seg').data(posts, d => d.f);
    sg.enter().append('div').attr('class', 'seg').merge(sg)
      .style('background', d => familyColor(d.f)).style('opacity', d => isOn(state, d.f) ? 1 : 0.3)
      .style('left', d => d.x0 * 100 + '%').style('width', d => (d.x1 - d.x0) * 100 + '%')
      .attr('title', d => `${d.f}: ${d.n} posts (${((d.x1 - d.x0) * 100).toFixed(0)}%)`)
      .text(d => (d.x1 - d.x0) > 0.14 ? d.f : '');
    sg.exit().remove();
    const n = run.families.length; const ticks = d3.range(1, n).map(k => k / n);
    const tk = st.selectAll('.tick').data(ticks);
    tk.enter().append('div').attr('class', 'tick').merge(tk).style('left', d => d * 100 + '%');
    tk.exit().remove();
    Q('.mx-stack-lab').innerHTML = posts.map(d => `<span style="color:${textColor(d.f)}">${esc(d.f)}</span> ${((d.x1 - d.x0) * 100).toFixed(0)}%`).join(' · ')
      + ` · fair ${(100 / n).toFixed(0)}%`;
  }

  // ---------- panel 4: feed pressure ----------
  function renderFeedPressure(run, step) {
    const node = Q('.mx-fp'); const w = node.clientWidth || 260;
    const nF = run.families.length, h = 16 + nF * 22;
    const svg = d3.select(node).attr('width', w).attr('height', h);
    const snap = feedPressure(step);
    const tTop = d3.sum(snap, d => d.top) || 1, tBot = d3.sum(snap, d => d.bot) || 1;
    const data = snap.map(d => ({ f: d.f, top: d.top / tTop, bot: d.bot / tBot }));
    const M = { t: 2, r: 64, b: 14, l: 52 };
    const y0 = d3.scaleBand().domain(run.families).range([M.t, h - M.b]).paddingInner(0.3);
    const y1 = d3.scaleBand().domain(['top', 'bot']).range([0, y0.bandwidth()]).paddingInner(0.15);
    const x = d3.scaleLinear().domain([0, Math.max(0.5, d3.max(data, d => Math.max(d.top, d.bot)) || 0)]).range([M.l, w - M.r]);
    let g = svg.select('g.root'); if (g.empty()) { g = svg.append('g').attr('class', 'root'); g.append('line').attr('class', 'fair'); g.append('text').attr('class', 'fairlab dim'); }
    const fam = g.selectAll('g.fam').data(data, d => d.f);
    const fe = fam.enter().append('g').attr('class', 'fam');
    fe.append('text').attr('class', 'name').attr('text-anchor', 'end').style('font-weight', 700);
    fe.append('rect').attr('class', 'top'); fe.append('rect').attr('class', 'bot');
    fe.append('text').attr('class', 'vt dim'); fe.append('text').attr('class', 'vb dim');
    const fa = fe.merge(fam).attr('transform', d => `translate(0,${y0(d.f)})`).attr('opacity', d => isOn(state, d.f) ? 1 : 0.3);
    fa.select('.name').attr('x', M.l - 4).attr('y', y0.bandwidth() / 2 + 3.5).text(d => d.f).style('fill', d => textColor(d.f));
    fa.select('rect.top').attr('x', M.l).attr('y', y1('top')).attr('height', y1.bandwidth()).attr('width', d => Math.max(0, x(d.top) - M.l)).attr('fill', d => familyColor(d.f));
    fa.select('rect.bot').attr('x', M.l).attr('y', y1('bot')).attr('height', y1.bandwidth()).attr('width', d => Math.max(0, x(d.bot) - M.l)).attr('fill', d => familyColor(d.f)).attr('opacity', 0.35);
    fa.select('.vt').attr('x', d => x(d.top) + 3).attr('y', y1('top') + y1.bandwidth() / 2 + 3).text(d => `top ${(d.top * 100).toFixed(0)}%`);
    fa.select('.vb').attr('x', d => x(d.bot) + 3).attr('y', y1('bot') + y1.bandwidth() / 2 + 3).text(d => `bottom ${(d.bot * 100).toFixed(0)}%`);
    fam.exit().remove();
    const fair = 1 / nF;
    g.select('.fair').attr('x1', x(fair)).attr('x2', x(fair)).attr('y1', M.t).attr('y2', h - M.b + 2).attr('stroke', 'currentColor').attr('stroke-dasharray', '2 3').attr('opacity', 0.6);
    g.select('.fairlab').attr('x', x(fair) + 3).attr('y', h - 3).attr('text-anchor', 'start').text('fair');
  }

  // ---------- panel 5: selection ----------
  function renderSel(run, step) {
    const agentBox = Q('.mx-agent'), thread = Q('.mx-thread'), clear = Q('.mx-clear');
    const a = state.agent != null ? agentOf(run, state.agent) : null;
    const p = state.post != null ? postOf(run, state.post) : null;
    Q('.mx-sel-title').textContent = a ? 'Selected agent' : (p ? 'Selected post' : 'Selection');
    if (a) {
      const myPosts = postsUpTo(run, step).filter(q => q.agent === a.id);
      const cs = commentsUpTo(run, step);
      const ids = new Set(myPosts.map(q => q.id));
      const recv = cs.filter(c => ids.has(c.post) && c.agent !== a.id);
      const cross = recv.filter(c => c.cross).length, own = recv.length - cross;
      const allPosts = postsUpTo(run, step).length;
      const allCross = cs.filter(c => c.cross).length;
      // random-mixing expectation: cross comments spread uniformly over posts
      const expected = allPosts ? myPosts.length * allCross / allPosts : 0;
      const ratio = expected > 0 ? cross / expected : null;
      const written = cs.filter(c => c.agent === a.id).length;
      agentBox.innerHTML = `
        <div class="mx-persona">${esc(a.persona)} <span class="mx-chip" style="background:${familyColor(a.family)}">${esc(a.family)}</span></div>
        <div class="mx-kv">
          <span class="k">model</span><span>${esc(a.model || '')}</span>
          <span class="k">posts</span><span>${myPosts.length}</span>
          <span class="k">received</span><span>${recv.length} <small>(${cross} cross · ${own} own-family)</small></span>
          <span class="k">written</span><span>${written}</span>
          <span class="k">pull</span><span>${ratio == null ? `${cross} cross <small>(no baseline yet)</small>` : `${ratio.toFixed(2)}× <small>cross received / random-mixing expectation</small>`}</span>
        </div>`;
    } else if (!p) {
      agentBox.innerHTML = `<div class="mx-empty">click an agent in the graph or a post in the feed</div>`;
    } else agentBox.innerHTML = '';
    thread.hidden = !p; clear.hidden = !p;
    if (p) {
      const au = agentOf(run, p.agent) || { persona: '?', family: '?' };
      const cs = commentsOf(run, p.id).filter(c => c.step <= step);
      const famOf = c => (agentOf(run, c.agent) || {}).family;
      const byF = d3.rollup(cs, v => v.length, famOf);
      const dots = cs.map(c => `<i style="background:${familyColor(famOf(c))}" title="${esc(famOf(c))}"></i>`).join('');
      const brk = Array.from(byF, ([f, n]) => `<span style="color:${textColor(f)}">${esc(f)}</span> ${n}`).join(' · ');
      const full = p.text || ''; const txt = full.slice(0, 200) + (full.length > 200 ? '…' : '');
      thread.innerHTML = `
        <div><span class="mx-chip" style="background:${familyColor(au.family)}">${esc(au.family)}</span> <b>${esc(au.persona)}</b>
          <span class="mx-empty">· post #${p.id} · step ${p.step}${p.step > step ? ' · not yet visible' : ''}</span></div>
        <div class="mx-text">${esc(txt)}</div>
        <div>${cs.length} comment${cs.length === 1 ? '' : 's'} <span class="mx-dots">${dots}</span></div>
        <div class="mx-legendline">${brk || '—'}</div>`;
    }
  }

  // ---------- render ----------
  function render() {
    const run = state.run;
    if (!run || !run.metrics) { el.querySelectorAll('.mx-panel').forEach(s => s.style.opacity = 0.4); return; }
    el.querySelectorAll('.mx-panel').forEach(s => s.style.opacity = '');
    if (run !== runRef) prepRun(run);
    const step = Math.max(0, Math.min(run.steps, state.step | 0));
    const parts = [renderAttr, renderTime, renderBoard, renderFeedPressure, renderSel];
    for (const fn of parts) { try { fn(run, step); } catch (e) { console.error(`[metrics] ${fn.name}`, e); } }
  }
  schedule();
  return { render: schedule };
}
