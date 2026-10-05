// js/data.js — data layer for the divsim dashboard (see CONTRACT.md).
// Pure ES module: no globals, no d3. Loads a run bundle and decorates it with
// indexes and memoised per-step views. Steps can be null on a few rows; a
// null-step post/comment is treated as never appearing in any step view.

const FAMILY_COLORS = {
  'gpt-oss': '#ff2d55',
  'Qwen':    '#00b3ff',
  'Mag':     '#b455ff',
  'GLM-4':   '#00e676',
  'Gemma':   '#ff9100',
};
const FALLBACK_COLOR = '#7f7f7f';

/** Colour for a family short name (exact house palette); grey for unknown. */
export function familyColor(family) {
  return FAMILY_COLORS[family] ?? FALLBACK_COLOR;
}

/** Fetch `data/index.json` -> array of {run_id,label,regime,families,file}. */
export async function listRuns() {
  const r = await fetch('data/index.json');
  if (!r.ok) throw new Error(`index.json: HTTP ${r.status}`);
  return r.json();
}

/** Fetch a bundle by its index `file` (relative path) and attach indexes. */
export async function loadRun(file) {
  const r = await fetch(file);
  if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return indexRun(await r.json());
}

const hasStep = (x) => Number.isInteger(x.step);

/**
 * Decorate a raw bundle (mutates and returns it). Exposed so tests / offline
 * tooling can build indexes without fetch.
 */
export function indexRun(run) {
  const byPost = new Map(run.posts.map((p) => [p.id, p]));
  const byComment = new Map(run.comments.map((c) => [c.id, c]));
  const byAgent = new Map(run.agents.map((a) => [a.id, a]));

  const commentsByPost = new Map();
  for (const c of run.comments) {
    if (!commentsByPost.has(c.post)) commentsByPost.set(c.post, []);
    commentsByPost.get(c.post).push(c);
  }
  for (const arr of commentsByPost.values()) {
    arr.sort((a, b) => (a.step ?? Infinity) - (b.step ?? Infinity) || a.id - b.id);
  }

  const agentsByFamily = new Map();
  for (const f of run.families) agentsByFamily.set(f, []);
  for (const a of run.agents) {
    if (!agentsByFamily.has(a.family)) agentsByFamily.set(a.family, []);
    agentsByFamily.get(a.family).push(a);
  }

  const activationsByAgent = new Map();
  for (const a of run.activations) {
    if (!hasStep(a)) continue;
    if (!activationsByAgent.has(a.agent)) activationsByAgent.set(a.agent, []);
    activationsByAgent.get(a.agent).push(a);
  }
  for (const arr of activationsByAgent.values()) arr.sort((a, b) => a.step - b.step || a.idx - b.idx);

  // Posts / comments sorted by step once, so per-step views are prefix slices.
  const postsSorted = run.posts.filter(hasStep).sort((a, b) => a.step - b.step || a.id - b.id);
  const commentsSorted = run.comments.filter(hasStep).sort((a, b) => a.step - b.step || a.id - b.id);

  const clampStep = (s) => Math.max(-1, Math.min(run.steps, Math.floor(Number(s) || 0)));

  // upper bound: number of items with step <= s
  const countUpTo = (sorted, s) => {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m].step <= s) lo = m + 1; else hi = m; }
    return lo;
  };

  const postsMemo = new Map(), commentsMemo = new Map();
  /** Posts with step <= step (array of the underlying objects, memoised). */
  function postsUpTo(step) {
    const s = clampStep(step);
    let v = postsMemo.get(s);
    if (!v) { v = postsSorted.slice(0, countUpTo(postsSorted, s)); postsMemo.set(s, v); }
    return v;
  }
  /** Comments with step <= step (array of the underlying objects, memoised). */
  function commentsUpTo(step) {
    const s = clampStep(step);
    let v = commentsMemo.get(s);
    if (!v) { v = commentsSorted.slice(0, countUpTo(commentsSorted, s)); commentsMemo.set(s, v); }
    return v;
  }

  /** Latest activation of `agent` with activation.step <= step, or null. */
  function activationAt(agent, step) {
    const arr = activationsByAgent.get(agent);
    if (!arr || !arr.length) return null;
    const s = clampStep(step);
    let lo = 0, hi = arr.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m].step <= s) lo = m + 1; else hi = m; }
    return lo ? arr[lo - 1] : null;
  }

  /**
   * Feed the agent saw at its latest activation <= step (activationAt
   * semantics: NOT restricted to exactly `step`), as post objects in slot
   * order. [] if the agent has no activation <= step or the feed is empty.
   * Unknown post ids are dropped.
   */
  function feedAt(agent, step) {
    const a = activationAt(agent, step);
    if (!a || !a.feed) return [];
    const out = [];
    for (const id of a.feed) { const p = byPost.get(id); if (p) out.push(p); }
    return out;
  }

  // Aggregated comment edges commenter -> post author, cumulative to step.
  // Self-comments (owner === commenter) are excluded. `cross` = any comment
  // on the edge is cross-model (families differ; constant per pair anyway).
  const edgesMemo = new Map();
  /** [{source, target, weight, cross}] for comments with step <= step, memoised. */
  function edgesUpTo(step) {
    const s = clampStep(step);
    let v = edgesMemo.get(s);
    if (v) return v;
    const acc = new Map();
    for (const c of commentsUpTo(s)) {
      const p = byPost.get(c.post);
      if (!p || p.agent === c.agent) continue;
      const k = c.agent * 65536 + p.agent;
      let e = acc.get(k);
      if (!e) { e = { source: c.agent, target: p.agent, weight: 0, cross: false }; acc.set(k, e); }
      e.weight += 1;
      if (c.cross) e.cross = true;
    }
    v = [...acc.values()];
    edgesMemo.set(s, v);
    return v;
  }

  // Cross-model comments received per agent, cumulative to step.
  const indegMemo = new Map();
  function indegMap(s) {
    let m = indegMemo.get(s);
    if (m) return m;
    m = new Map();
    for (const c of commentsUpTo(s)) {
      if (!c.cross) continue;
      const p = byPost.get(c.post);
      if (!p || p.agent === c.agent) continue;
      m.set(p.agent, (m.get(p.agent) ?? 0) + 1);
    }
    indegMemo.set(s, m);
    return m;
  }
  /** Cross-model comments received by agentId on its posts up to step. */
  function indegAt(agentId, step) {
    return indegMap(clampStep(step)).get(agentId) ?? 0;
  }

  Object.assign(run, {
    byPost, byComment, byAgent, commentsByPost, agentsByFamily, activationsByAgent,
    activationAt, feedAt, postsUpTo, commentsUpTo, edgesUpTo, indegAt,
  });
  return run;
}
