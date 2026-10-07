// js/graph.js — bird's-eye network view (agent: graph)
// Exports mount(el, ctx) with ctx = {state, set, on, d3}. Talks to other modules only via state.
// data.js is owned by the data agent; import it lazily so this module still loads if it is absent.
let familyColor = null;
try { ({ familyColor } = await import('./data.js?v=5')); } catch (e) { familyColor = null; }

const FALLBACK_COLORS = { 'gpt-oss': '#ff2d55', Qwen: '#00b3ff', Mag: '#b455ff', 'GLM-4': '#00e676', Gemma: '#ff9100' };
function colorOf(f) {
  try { const c = familyColor && familyColor(f); if (c) return c; } catch (e) { /* fall through */ }
  return FALLBACK_COLORS[f] || '#888';
}
// family colour for TEXT: darkened on the light theme, as-is on dark (see css/app.css --fam-text-mix)
const textColorOf = (f) => `color-mix(in srgb, ${colorOf(f)} var(--fam-text-mix, 100%), black)`;
const MONO = '"Ubuntu Mono", ui-monospace, monospace';
const gradId = (a, b) => 'gg-' + (a + '__' + b).replace(/[^A-Za-z0-9_-]/g, '_');
const markerId = (f) => 'ga-' + String(f).replace(/[^A-Za-z0-9_-]/g, '_');
const fmtH = (h) => (h == null || Number.isNaN(h)) ? 'H —' : 'H ' + (h >= 0 ? '+' : '−') + Math.abs(h).toFixed(2);

export function mount(el, ctx) {
  const { state, set, on } = ctx;
  const d3 = ctx.d3 || window.d3;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- DOM ----------
  el.classList.add('graph-panel');
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';   // keep the shell's absolute .fill
  el.style.overflow = 'hidden';
  el.innerHTML = '';
  const root = d3.select(el);
  const svg = root.append('svg').attr('class', 'graph-svg')
    .style('display', 'block').style('width', '100%').style('height', '100%');
  const defs = svg.append('defs');
  const viewport = svg.append('g').attr('class', 'graph-viewport');
  const gEdges = viewport.append('g').attr('class', 'graph-edges').attr('fill', 'none');
  const gNodes = viewport.append('g').attr('class', 'graph-nodes');
  const gLabels = viewport.append('g').attr('class', 'graph-node-labels').style('pointer-events', 'none');
  const gAnno = viewport.append('g').attr('class', 'graph-annotations').style('pointer-events', 'none');

  const legend = root.append('div').attr('class', 'graph-legend').style('position', 'absolute')
    .style('top', '8px').style('left', '8px').style('font', `11px/1.5 ${MONO}`)
    .style('pointer-events', 'none');
  const tooltip = root.append('div').attr('class', 'graph-tooltip').style('position', 'absolute')
    .style('display', 'none').style('pointer-events', 'none')
    .style('font', `11px/1.4 ${MONO}`)
    .style('padding', '4px 6px').style('border', '1px solid var(--rule, currentColor)')
    .style('background', 'var(--bg, #fff)').style('color', 'var(--ink, #111)').style('max-width', '240px');
  const nowStrip = root.append('div').attr('class', 'graph-now').style('position', 'absolute')
    .style('left', '0').style('right', '0').style('bottom', '0')
    .style('font', `11px/1.5 ${MONO}`)
    .style('padding', '4px 8px').style('border-top', '1px solid var(--rule, currentColor)')
    .style('background', 'var(--bg, #fff)').style('color', 'var(--ink, #111)')
    .style('pointer-events', 'none').style('font-variant-numeric', 'tabular-nums');

  // ---------- state ----------
  let width = el.clientWidth || 600, height = el.clientHeight || 400;
  let nodes = [], nodeById = new Map(), links = [], linkByKey = new Map();
  let anchors = new Map();        // family -> {x,y}
  let runId = null, lastStep = -1;
  let seenEdgeKeys = new Set();   // edges present at previous render (for highlight)
  let sim = null;
  let zoomT = d3.zoomIdentity;

  const zoom = d3.zoom().scaleExtent([0.5, 4]).on('zoom', (ev) => {
    zoomT = ev.transform; viewport.attr('transform', zoomT);
  });
  svg.call(zoom).on('dblclick.zoom', null)
    .on('dblclick', () => svg.transition().duration(reduceMotion ? 0 : 300).call(zoom.transform, d3.zoomIdentity))
    .on('click', (ev) => { if (ev.target === svg.node()) set({ agent: null }); });

  function computeAnchors(families) {
    anchors = new Map();
    const n = families.length, r = Math.min(width, height) * 0.30;
    families.forEach((f, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      anchors.set(f, { x: width / 2 + r * Math.cos(a), y: height / 2 + r * Math.sin(a) });
    });
  }

  // ---------- build per-run ----------
  function buildRun(run) {
    runId = run.run_id;
    computeAnchors(run.families);
    nodes = run.agents.map((a) => {
      const an = anchors.get(a.family) || { x: width / 2, y: height / 2 };
      return { id: a.id, family: a.family, persona: a.persona, r: 6,
        x: an.x + (Math.random() - 0.5) * 40, y: an.y + (Math.random() - 0.5) * 40 };
    });
    nodeById = new Map(nodes.map((n) => [n.id, n]));
    links = []; linkByKey = new Map(); seenEdgeKeys = new Set(); lastStep = -1;
    gEdges.selectAll('*').remove();          // edges from the previous run reference old node objects

    // gradients per family pair + markers per family
    defs.selectAll('*').remove();
    const fams = run.families;
    for (const a of fams) for (const b of fams) {
      const g = defs.append('linearGradient').attr('id', gradId(a, b)).attr('gradientUnits', 'userSpaceOnUse');
      g.append('stop').attr('offset', '0%').attr('stop-color', colorOf(a));
      g.append('stop').attr('offset', '100%').attr('stop-color', colorOf(b));
    }
    for (const f of fams) {
      defs.append('marker').attr('id', markerId(f)).attr('viewBox', '0 -4 8 8')
        .attr('refX', 7).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto').attr('markerUnits', 'userSpaceOnUse')
        .append('path').attr('d', 'M0,-3.5L8,0L0,3.5Z').attr('fill', colorOf(f));
    }
    defs.append('marker').attr('id', 'ga-white').attr('viewBox', '0 -4 8 8')
      .attr('refX', 7).attr('refY', 0).attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto').attr('markerUnits', 'userSpaceOnUse')
      .append('path').attr('d', 'M0,-3.5L8,0L0,3.5Z').attr('fill', 'var(--accent, #fff)');

    if (sim) sim.stop();
    sim = d3.forceSimulation(nodes)
      .force('x', d3.forceX((d) => anchors.get(d.family).x).strength(0.08))
      .force('y', d3.forceY((d) => anchors.get(d.family).y).strength(0.08))
      .force('charge', d3.forceManyBody().strength(-40).distanceMax(160))
      .force('collide', d3.forceCollide((d) => d.r + 3).iterations(2))
      .force('link', d3.forceLink([]).id((d) => d.id).distance(70).strength((l) => l.cross ? 0.02 : 0.05))
      .alphaDecay(0.03)
      .on('tick', tick);
    renderLegend(run);
  }

  // ---------- edges / radii for a step ----------
  function edgesFor(run, step) {
    if (typeof run.edgesUpTo === 'function') return run.edgesUpTo(step);
    // fallback aggregation
    const agg = new Map();
    for (const c of run.comments) {
      if (c.step > step) continue;
      const post = run.byPost ? run.byPost.get(c.post) : run.posts.find((p) => p.id === c.post);
      if (!post || post.agent === c.agent) continue;
      const k = c.agent + '>' + post.agent;
      let e = agg.get(k);
      if (!e) { e = { source: c.agent, target: post.agent, weight: 0, cross: !!c.cross }; agg.set(k, e); }
      e.weight++;
    }
    return [...agg.values()];
  }
  function indegFor(run, id, step) {
    if (typeof run.indegAt === 'function') return run.indegAt(id, step);
    const posts = new Set(run.posts.filter((p) => p.agent === id).map((p) => p.id));
    let n = 0;
    for (const c of run.comments) if (c.step <= step && c.cross && posts.has(c.post)) n++;
    return n;
  }
  function commentsUpTo(run, step) {
    return typeof run.commentsUpTo === 'function' ? run.commentsUpTo(step) : run.comments.filter((c) => c.step <= step);
  }
  function postAuthor(run, pid) {
    const p = run.byPost ? run.byPost.get(pid) : run.posts.find((q) => q.id === pid);
    return p ? p.agent : null;
  }

  function update(keys) {
    const run = state.run;
    if (!run) { gEdges.selectAll('*').remove(); gNodes.selectAll('*').remove(); return; }
    if (run.run_id !== runId || !sim) buildRun(run);
    const step = state.step | 0;
    const stepChanged = step !== lastStep;

    if (stepChanged) {
      // radii
      for (const n of nodes) { n.indeg = indegFor(run, n.id, step); n.r = 6 + 2.2 * Math.sqrt(n.indeg); }
      // edges (data join by key)
      const raw = edgesFor(run, step);
      const newKeys = new Set();
      const next = [];
      for (const e of raw) {
        const sid = typeof e.source === 'object' ? e.source.id : e.source;
        const tid = typeof e.target === 'object' ? e.target.id : e.target;
        const k = sid + '>' + tid; newKeys.add(k);
        let l = linkByKey.get(k);
        if (!l) {
          l = { key: k, source: nodeById.get(sid), target: nodeById.get(tid), cross: !!e.cross, weight: 0 };
          linkByKey.set(k, l);
        }
        l.prevWeight = l.weight; l.weight = e.weight;
        l.fresh = !seenEdgeKeys.has(k) || (lastStep >= 0 && step > lastStep && e.weight > l.prevWeight);
        if (l.source && l.target) next.push(l);
      }
      for (const k of linkByKey.keys()) if (!newKeys.has(k)) linkByKey.delete(k);
      links = next;
      // only highlight when moving forward by one step; on jumps just mark nothing
      const forwardOne = lastStep >= 0 && step === lastStep + 1;
      if (!forwardOne) for (const l of links) l.fresh = false;
      seenEdgeKeys = newKeys;
      sim.force('link').links(links);
      sim.force('collide').radius((d) => d.r + 3);
      sim.alpha(Math.max(sim.alpha(), 0.15)).restart();
      renderEdges();
      renderNodes();
      renderNow(run, step);
      renderLegend(run);
      lastStep = step;
    }
    applyStyles();
    renderAnnotations(run, step);
    tick();
  }

  // ---------- rendering ----------
  function renderEdges() {
    const sel = gEdges.selectAll('path.graph-edge').data(links, (d) => d.key);
    sel.exit().remove();
    const enter = sel.enter().append('path').attr('class', 'graph-edge')
      .attr('stroke', (d) => `url(#${gradId(d.source.family, d.target.family)})`)
      .attr('marker-end', (d) => `url(#${markerId(d.target.family)})`)
      .attr('stroke-linecap', 'round');
    const all = enter.merge(sel);
    all.classed('cross', (d) => d.cross)
      .attr('stroke-width', (d) => (d.cross ? 0.8 : 0.5) + (d.cross ? 1.1 : 0.7) * Math.sqrt(d.weight));
    if (!reduceMotion) {
      all.filter((d) => d.fresh).each(function (d) {
        d3.select(this).interrupt()
          .attr('stroke', 'var(--accent, #fff)').attr('marker-end', 'url(#ga-white)').style('opacity', 1)
          .attr('stroke-width', 2 + 1.1 * Math.sqrt(d.weight))
          .transition().duration(400).ease(d3.easeCubicOut)
          .attr('stroke', `url(#${gradId(d.source.family, d.target.family)})`)
          .attr('marker-end', `url(#${markerId(d.target.family)})`)
          .attr('stroke-width', (d.cross ? 0.8 : 0.5) + (d.cross ? 1.1 : 0.7) * Math.sqrt(d.weight))
          .style('opacity', edgeOpacity(d));
      });
    }
  }

  function renderNodes() {
    const sel = gNodes.selectAll('circle.graph-node').data(nodes, (d) => d.id);
    sel.enter().append('circle').attr('class', 'graph-node')
      .attr('fill', (d) => colorOf(d.family)).attr('stroke', 'var(--bg, #fff)').attr('stroke-width', 1.5)
      .classed('glow', true).style('--node-c', (d) => colorOf(d.family))
      .style('cursor', 'pointer')
      .on('click', (ev, d) => { ev.stopPropagation(); set({ agent: d.id, post: null }); })
      .on('mouseenter', (ev, d) => { set({ hover: { type: 'agent', id: d.id } }); showTip(ev, d); })
      .on('mousemove', (ev, d) => showTip(ev, d))
      .on('mouseleave', () => { set({ hover: null }); tooltip.style('display', 'none'); })
      .merge(sel)
      // family can change for the same agent id when switching to a sibling run (rotation)
      .attr('fill', (d) => colorOf(d.family)).style('--node-c', (d) => colorOf(d.family))
      .attr('r', (d) => d.r);
    const lab = gLabels.selectAll('text.graph-node-label').data(nodes, (d) => d.id);
    lab.enter().append('text').attr('class', 'graph-node-label')
      .attr('font-family', MONO).attr('font-size', 10)
      .attr('text-anchor', 'middle').attr('fill', 'var(--ink, #111)')
      .attr('paint-order', 'stroke').attr('stroke', 'var(--bg, #fff)').attr('stroke-width', 3)
      .text((d) => d.persona);
  }

  function edgeOpacity(d) {
    const base = d.cross ? Math.min(0.85, 0.35 + 0.12 * Math.sqrt(d.weight)) : Math.min(0.35, 0.12 + 0.05 * Math.sqrt(d.weight));
    const famOff = state.families && (state.families[d.source.family] === false || state.families[d.target.family] === false);
    if (famOff) return 0.1;
    if (state.agent != null) return (d.source.id === state.agent || d.target.id === state.agent) ? 1 : 0.08;
    return base;
  }

  function applyStyles() {
    const sel = state.agent, hov = state.hover && state.hover.type === 'agent' ? state.hover.id : null;
    gNodes.selectAll('circle.graph-node')
      .attr('stroke', (d) => d.id === sel ? 'var(--accent, #111)' : 'var(--bg, #fff)')
      .attr('stroke-width', (d) => d.id === sel ? 3 : 1.5)
      .style('opacity', (d) => state.families && state.families[d.family] === false ? 0.1 : 1);
    gLabels.selectAll('text.graph-node-label')
      .style('display', (d) => d.id === sel || d.id === hov ? null : 'none');
    gEdges.selectAll('path.graph-edge').each(function (d) {
      const s = d3.select(this);
      if (!d.fresh || reduceMotion) s.style('opacity', edgeOpacity(d));
      d.fresh = false;
    });
    // raise selected edges above others
    if (sel != null) gEdges.selectAll('path.graph-edge').filter((d) => d.source.id === sel || d.target.id === sel).raise();
  }

  function tick() {
    gEdges.selectAll('path.graph-edge').attr('d', (d) => {
      const sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
      const dx = tx - sx, dy = ty - sy, dist = Math.hypot(dx, dy) || 1;
      // shorten so arrowhead lands on target circle edge
      const ux = dx / dist, uy = dy / dist;
      const ex = tx - ux * (d.target.r + 2), ey = ty - uy * (d.target.r + 2);
      const bx = sx + ux * d.source.r, by = sy + uy * d.source.r;
      const mx = (bx + ex) / 2 - uy * dist * 0.18, my = (by + ey) / 2 + ux * dist * 0.18;
      const g = defs.select('#' + gradId(d.source.family, d.target.family));
      if (!g.empty()) g.attr('x1', sx).attr('y1', sy).attr('x2', tx).attr('y2', ty);
      return `M${bx},${by}Q${mx},${my} ${ex},${ey}`;
    });
    gNodes.selectAll('circle.graph-node').attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    gLabels.selectAll('text.graph-node-label').attr('x', (d) => d.x).attr('y', (d) => d.y - d.r - 4);
    positionAnnotations();
  }
  // Note: per-pair gradients are shared by all edges of that family pair; x1..y2 is set per
  // edge on each tick so the last edge of a pair wins. For same-pair edges this is a
  // reasonable approximation since both endpoints sit in the same two clusters.

  // ---------- annotations ----------
  function renderAnnotations(run, step) {
    const data = run.families.map((f) => {
      const indeg = run.metrics && run.metrics.indeg && run.metrics.indeg[f] ? run.metrics.indeg[f][step] : null;
      const H = run.metrics && run.metrics.H_in && run.metrics.H_in[f] ? run.metrics.H_in[f][step] : null;
      const cum = indeg != null ? indeg : nodes.filter((n) => n.family === f).reduce((s, n) => s + (n.indeg || 0), 0);
      return { f, text: `${f}  ${cum} recv  ${fmtH(H)}` };
    });
    const sel = gAnno.selectAll('g.graph-anno').data(data, (d) => d.f);
    const enter = sel.enter().append('g').attr('class', 'graph-anno');
    enter.append('rect').attr('fill', 'var(--bg, #fff)').attr('stroke', (d) => colorOf(d.f)).attr('stroke-width', 1).attr('fill-opacity', 0.92);
    enter.append('text').attr('font-family', MONO).attr('font-size', 11)
      .attr('font-weight', 700).style('fill', (d) => textColorOf(d.f)).attr('dominant-baseline', 'middle')
      .style('font-variant-numeric', 'tabular-nums');
    const all = enter.merge(sel);
    all.select('text').text((d) => d.text);
    all.style('opacity', (d) => state.families && state.families[d.f] === false ? 0.25 : 1);
    all.each(function () {
      const g = d3.select(this), t = g.select('text').node();
      let w = 120; try { w = t.getComputedTextLength(); } catch (e) { /* jsdom etc */ }
      g.select('rect').attr('x', -6).attr('y', -10).attr('width', w + 12).attr('height', 20);
    });
    positionAnnotations();
  }
  function positionAnnotations() {
    gAnno.selectAll('g.graph-anno').attr('transform', (d) => {
      const fam = nodes.filter((n) => n.family === d.f);
      let cx, cy, top = Infinity;
      if (fam.length) {
        cx = d3.mean(fam, (n) => n.x); cy = d3.mean(fam, (n) => n.y);
        top = d3.min(fam, (n) => n.y - n.r);
      } else { const a = anchors.get(d.f); cx = a.x; cy = a.y; top = a.y; }
      // push label outward from centre of panel
      const vx = cx - width / 2, vy = cy - height / 2, vl = Math.hypot(vx, vy) || 1;
      const rad = d3.max(fam, (n) => Math.hypot(n.x - cx, n.y - cy) + n.r) || 20;
      const lx = cx + (vx / vl) * (rad + 18), ly = cy + (vy / vl) * (rad + 18);
      return `translate(${lx - 40},${Math.min(ly, top - 4)})`;
    });
  }

  // ---------- overlays ----------
  function renderLegend(run) {
    const counts = d3.rollup(run.agents, (v) => v.length, (a) => a.family);
    const chips = legend.selectAll('div.graph-chip').data(run.families, (f) => f);
    const e = chips.enter().append('div').attr('class', 'graph-chip').style('display', 'flex').style('align-items', 'center').style('gap', '5px');
    e.append('span').style('display', 'inline-block').style('width', '9px').style('height', '9px').style('background', (f) => colorOf(f));
    e.append('span').attr('class', 'graph-chip-text');
    chips.exit().remove();
    e.merge(chips).select('.graph-chip-text').text((f) => `${f} · ${counts.get(f) || 0} agents`);
    e.merge(chips).style('opacity', (f) => state.families && state.families[f] === false ? 0.3 : 1);
  }

  function renderNow(run, step) {
    const now = commentsUpTo(run, step).filter((c) => c.step === step);
    const last = now.slice(-3).reverse();
    const byAgent = run.byAgent || new Map(run.agents.map((a) => [a.id, a]));
    const rows = last.map((c) => {
      const from = byAgent.get(c.agent), toId = postAuthor(run, c.post), to = byAgent.get(toId);
      const fam = (a) => a ? `<span style="color:${textColorOf(a.family)}">${a.family}</span>` : '?';
      return `<div>${from ? from.persona : c.agent} (${fam(from)}) → ${to ? to.persona : toId} (${fam(to)})</div>`;
    });
    nowStrip.html(`<span style="opacity:.6">step ${step} · ${now.length} comment${now.length === 1 ? '' : 's'}</span>${rows.join('')}`);
  }

  function showTip(ev, d) {
    const run = state.run;
    const postsN = run ? run.posts.filter((p) => p.agent === d.id && p.step <= state.step).length : 0;
    tooltip.style('display', 'block')
      .html(`<b style="color:${textColorOf(d.family)}">${d.persona}</b> · ${d.family}<br>${d.indeg || 0} cross-model comments received<br>${postsN} posts written`);
    const rect = el.getBoundingClientRect();
    let x = ev.clientX - rect.left + 12, y = ev.clientY - rect.top + 12;
    const tw = tooltip.node().offsetWidth, th = tooltip.node().offsetHeight;
    if (x + tw > rect.width - 8) x = ev.clientX - rect.left - tw - 12;
    if (y + th > rect.height - 8) y = ev.clientY - rect.top - th - 12;
    tooltip.style('left', x + 'px').style('top', y + 'px');
  }

  // ---------- resize ----------
  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    if (state.run) {
      computeAnchors(state.run.families);
      if (sim) {
        sim.force('x').x((d) => anchors.get(d.family).x);
        sim.force('y').y((d) => anchors.get(d.family).y);
        sim.alpha(Math.max(sim.alpha(), 0.3)).restart();
      }
    }
  }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(el);
  else window.addEventListener('resize', resize);

  on('change', update);
  on('run', update);
  update();
  return { update, resize };
}
