// node js/data.test.mjs [data/<run>.json ...]   — offline tests for js/data.js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// polyfill fetch: serve relative paths from viz_v2/
globalThis.fetch = async (rel) => {
  const buf = await readFile(path.join(ROOT, rel));
  return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), text: async () => buf.toString('utf8') };
};

const { listRuns, loadRun, familyColor } = await import('./data.js');

const HEX = { 'gpt-oss': '#ff2d55', Qwen: '#00b3ff', Mag: '#b455ff', 'GLM-4': '#00e676', Gemma: '#ff9100' };
for (const [f, h] of Object.entries(HEX)) assert.equal(familyColor(f), h, `familyColor(${f})`);
assert.match(familyColor('nope'), /^#[0-9a-f]{6}$/);
console.log('familyColor ok');

const index = await listRuns();
assert.ok(Array.isArray(index) && index.length > 0, 'index.json non-empty');
for (const e of index) for (const k of ['run_id', 'label', 'regime', 'families', 'file']) assert.ok(k in e, `index entry has ${k}`);

const files = process.argv.length > 2 ? process.argv.slice(2) : index.map((e) => e.file);
let fails = 0;
for (const file of files) {
  try {
    const run = await loadRun(file);
    const S = run.steps;

    // 1. every activation's feed post ids resolve in byPost
    let nFeed = 0;
    for (const a of run.activations) for (const id of a.feed) { assert.ok(run.byPost.has(id), `feed post ${id} unknown (agent ${a.agent} step ${a.step})`); nFeed++; }
    assert.equal(run.byAgent.size, run.agents.length);
    for (const c of run.comments) assert.ok(run.byPost.has(c.post), `comment ${c.id} on unknown post ${c.post}`);

    // 2. activationAt is monotone: step of result non-decreasing in step, and <= step; null before first
    for (const agent of run.byAgent.keys()) {
      let prev = -1;
      for (let s = 0; s <= S; s++) {
        const a = run.activationAt(agent, s);
        if (a) { assert.ok(a.step <= s, 'activationAt step <= s'); assert.ok(a.step >= prev, 'activationAt monotone'); prev = a.step; }
        else assert.equal(prev, -1, 'null after non-null');
        // feedAt follows activationAt semantics
        const f = run.feedAt(agent, s);
        assert.equal(f.length, a ? a.feed.length : 0, 'feedAt length');
        if (a) a.feed.forEach((id, i) => assert.equal(f[i].id, id, 'feedAt slot order'));
      }
    }

    // 3. edgesUpTo(S) total weight == comments (with step) whose post owner != commenter
    const expected = run.comments.filter((c) => Number.isInteger(c.step) && run.byPost.get(c.post).agent !== c.agent).length;
    const edges = run.edgesUpTo(S);
    assert.equal(edges.reduce((t, e) => t + e.weight, 0), expected, 'edge weight total');
    for (const e of edges) assert.equal(e.cross, run.byAgent.get(e.source).family !== run.byAgent.get(e.target).family, 'edge cross flag');
    assert.equal(run.edgesUpTo(-1).length, 0);
    // memoisation returns the same array instance
    assert.equal(run.edgesUpTo(S), edges);
    assert.equal(run.postsUpTo(10), run.postsUpTo(10));
    assert.equal(run.commentsUpTo(10), run.commentsUpTo(10));
    // views are of the underlying objects, and monotone prefixes
    assert.ok(run.postsUpTo(S).every((p) => run.byPost.get(p.id) === p));
    for (let s = 1; s <= S; s++) {
      assert.ok(run.commentsUpTo(s).length >= run.commentsUpTo(s - 1).length);
      assert.ok(run.commentsUpTo(s).every((c) => c.step <= s));
    }
    assert.equal(run.postsUpTo(S).length, run.posts.filter((p) => Number.isInteger(p.step)).length);

    // indegAt: sum per family at final step == metrics.indeg[f][S]
    for (const f of run.families) {
      const sum = run.agentsByFamily.get(f).reduce((t, a) => t + run.indegAt(a.id, S), 0);
      assert.equal(sum, run.metrics.indeg[f][S], `indeg family ${f}`);
    }

    // 4. metrics arrays have length steps+1
    for (const k of ['H_in', 'cpp', 'indeg', 'posts']) for (const f of run.families) assert.equal(run.metrics[k][f].length, S + 1, `metrics.${k}.${f} length`);
    assert.deepEqual([...run.agentsByFamily.keys()], run.families);

    console.log(`ok  ${file}  agents=${run.agents.length} posts=${run.posts.length} comments=${run.comments.length} activations=${run.activations.length} feedIds=${nFeed} edges=${edges.length}`);
  } catch (e) { fails++; console.error(`FAIL ${file}: ${e.message}`); }
}
if (fails) { console.error(`${fails} run(s) failed`); process.exit(1); }
console.log(`all ${files.length} runs passed`);
