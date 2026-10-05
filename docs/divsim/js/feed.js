// js/feed.js — agent replay: phone-style feed of what an agent SAW and DID at a step.
// Contract: export mount(el, ctx) with ctx = {state, set, on, d3}. Talks only via state.
// Reads state.run indexes: byPost, byComment, byAgent, commentsByPost, activationsByAgent,
// activationAt(agent, step). familyColor comes from ./data.js. Styles are injected once
// (scoped by the .fd- prefix) and use the shell's tokens --bg/--ink/--muted/--rule with fallbacks.

import { familyColor } from './data.js';

const SERIF = '"EB Garamond","Palatino Linotype",Palatino,Georgia,serif';
const MONO = '"Ubuntu Mono",ui-monospace,Menlo,monospace';
// family colour for TEXT: darkened on the light theme, as-is on dark (see css/app.css --fam-text-mix)
const textColor = f => `color-mix(in srgb, ${familyColor(f)} var(--fam-text-mix, 100%), black)`;
const CSS = `
.fd-root{font-family:"Inter",system-ui,sans-serif;font-size:13px;line-height:1.4;
  color:var(--ink,#111);height:100%;display:flex;flex-direction:column;align-items:center;
  font-variant-numeric:tabular-nums}
.fd-phone{width:100%;max-width:360px;height:100%;min-height:420px;border:1px solid var(--rule,#ddd);
  background:var(--bg,#fff);display:flex;flex-direction:column;outline:none;overflow:hidden;box-sizing:border-box}
.fd-phone:focus-visible{box-shadow:inset 0 0 0 2px var(--accent,#6d0061)}
.fd-status{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid var(--rule,#ddd);
  font-family:${MONO};font-size:12px;color:var(--muted,#666)}
.fd-status .fd-handle{color:var(--ink,#111);font-weight:700}
.fd-status .fd-time{margin-left:auto}
.fd-tabs{display:flex;border-bottom:1px solid var(--rule,#ddd)}
.fd-tab{flex:1;background:none;border:0;border-right:1px solid var(--rule,#ddd);padding:6px 0;
  font:inherit;color:var(--muted,#666);cursor:pointer;text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:500}
.fd-tab:last-child{border-right:0}
.fd-tab:hover{color:var(--accent,#6d0061)}
.fd-tab[aria-selected="true"]{color:var(--ink,#111);font-weight:600;box-shadow:inset 0 -2px 0 var(--accent,#6d0061)}
.fd-scroll{flex:1;overflow-y:auto;overflow-x:hidden}
.fd-chip{display:inline-block;font-family:${MONO};font-size:10px;padding:0 5px;border:1px solid currentColor;line-height:15px;
  letter-spacing:.04em;vertical-align:middle;white-space:nowrap}
.fd-avatar{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;
  justify-content:center;color:#0b0b0c;font-weight:600;font-size:14px;line-height:1;font-family:${SERIF}}
.fd-muted{color:var(--muted,#666)}
.fd-btn{background:none;border:1px solid var(--rule,#ddd);color:var(--ink,#111);font:inherit;font-family:${MONO};font-size:12px;
  padding:1px 7px;cursor:pointer;line-height:18px}
.fd-btn:hover{border-color:var(--accent,#6d0061);color:var(--accent,#6d0061)}
.fd-btn:disabled{opacity:.35;cursor:default}
.fd-head{padding:7px 10px;border-bottom:1px solid var(--rule,#ddd);display:flex;align-items:center;gap:8px}
.fd-head .fd-k{font-family:${SERIF};font-size:16px;font-weight:600;line-height:1.15}
.fd-head .fd-t{margin-left:auto;color:var(--muted,#666);font-family:${MONO}}
.fd-stepper{height:14px;display:block;width:100%;border-bottom:1px solid var(--rule,#ddd);cursor:pointer}
.fd-note{padding:5px 10px;font-size:12px;color:var(--muted,#666);border-bottom:1px solid var(--rule,#ddd)}
.fd-thought{margin:8px 10px 4px;padding:8px 10px;border:1px solid var(--rule,#ddd);border-left:2px solid var(--accent,#6d0061);
  font-style:italic;font-size:12px;color:var(--ink,#111)}
.fd-thought .fd-lbl{font-style:normal;font-size:10px;text-transform:uppercase;letter-spacing:.08em;
  color:var(--muted,#666);margin-bottom:4px;display:flex;gap:8px;align-items:baseline}
.fd-thought .fd-body{white-space:pre-wrap;word-wrap:break-word}
.fd-thought .fd-body.fd-clamp{display:-webkit-box;-webkit-line-clamp:7;-webkit-box-orient:vertical;overflow:hidden}
.fd-post{padding:8px 10px 6px;border-bottom:1px solid var(--rule,#ddd);border-left:2px solid transparent;position:relative}
.fd-post.fd-hit{background:var(--bg-2,rgba(0,0,0,.035))}
.fd-slot{position:absolute;right:8px;top:6px;font-family:${MONO};font-size:10px;color:var(--muted,#666)}
.fd-ph{display:flex;align-items:center;gap:7px;margin-bottom:5px;padding-right:22px;min-width:0}
.fd-ph .fd-handle{font-family:${SERIF};font-size:14px;font-weight:600;line-height:1.15;color:var(--ink,#111);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fd-ph .fd-ts{color:var(--muted,#666);font-family:${MONO};font-size:11px;margin-left:auto;flex:none}
.fd-text{cursor:pointer;white-space:pre-wrap;word-wrap:break-word;font-size:12.5px}
.fd-text.fd-clamp{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.fd-text:hover{text-decoration:underline;text-decoration-color:var(--accent,#6d0061)}
.fd-more{padding:0;border:0;background:none;color:var(--muted,#666);cursor:pointer;font:inherit;font-size:11px;
  font-style:normal;text-decoration:underline}
.fd-foot{display:flex;gap:10px;margin-top:5px;font-family:${MONO};font-size:11px;color:var(--muted,#666);align-items:center}
.fd-badge{margin-left:auto;font-family:${MONO};font-size:11px;font-weight:700}
.fd-reply{margin:6px 0 0 20px;padding:6px 8px;border-left:1px solid var(--rule,#bbb);font-size:12px;white-space:pre-wrap;
  word-wrap:break-word}
.fd-reply .fd-ph{margin-bottom:3px;padding-right:0}
.fd-prior{margin:6px 0 0 20px;border-left:1px solid var(--rule,#bbb)}
.fd-prior .fd-cmt{padding:4px 8px;border-bottom:1px dotted var(--rule,#ddd);border-left:0}
.fd-prior .fd-cmt.fd-clip{color:var(--ink-2,#444)}
.fd-prior .fd-reply{margin:0;border-left:0;background:var(--bg-2,rgba(0,0,0,.035))}
.fd-cmt.fd-nest,.fd-reply.fd-nest{margin-left:18px;border-left:1px solid var(--rule,#bbb)}
.fd-prior .fd-nest{margin-left:14px}
.fd-to{font-size:10px;color:var(--muted,#666);margin-bottom:2px;font-style:italic}
.fd-addr{font-family:${MONO};font-size:11px;font-weight:400;white-space:nowrap}
.fd-earlier{display:block;width:100%;text-align:left;padding:3px 8px;background:none;border:0;
  border-bottom:1px dotted var(--rule,#ddd);color:var(--muted,#666);font:inherit;font-size:11px;cursor:pointer;text-decoration:underline}
.fd-none{padding:10px;border-bottom:1px solid var(--rule,#ddd);color:var(--muted,#666);font-style:italic}
.fd-prof{padding:10px}
.fd-prof h3{margin:12px 0 4px;font-family:${SERIF};font-weight:600;font-size:15px;line-height:1.2;border-bottom:1px solid var(--rule,#ddd)}
.fd-prof .fd-name{font-family:${SERIF};font-size:20px;font-weight:600;line-height:1.1}
.fd-prof .fd-bio{white-space:pre-wrap;word-wrap:break-word;font-size:12px;margin:4px 0 8px}
.fd-list{list-style:none;margin:0;padding:0;font-size:12px}
.fd-list li{display:flex;gap:6px;padding:2px 0;border-bottom:1px dotted var(--rule,#ddd);cursor:pointer;align-items:center}
.fd-list li:hover{background:var(--bg-2,rgba(0,0,0,.035))}
.fd-list li .fd-st{font-family:${MONO};color:var(--muted,#666);width:38px;flex:none}
.fd-list li .fd-tx{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.fd-list li.fd-cur{font-weight:600}
.fd-kv{display:grid;grid-template-columns:auto 1fr;gap:1px 10px;font-size:12px;margin:0}
.fd-kv dt{color:var(--muted,#666)}.fd-kv dd{margin:0;font-family:${MONO}}
.fd-spark{display:block;width:100%;height:44px}
.fd-thread-post{padding:10px;border-bottom:1px solid var(--rule,#ddd)}
.fd-thread-post .fd-text{cursor:default;font-size:13px}
.fd-thread-post .fd-text:hover{text-decoration:none}
.fd-cmt{padding:7px 10px;border-bottom:1px solid var(--rule,#ddd);border-left:2px solid transparent;font-size:12px;
  white-space:pre-wrap;word-wrap:break-word}
.fd-cmt.fd-mine{background:var(--bg-2,rgba(0,0,0,.035));border-left-color:var(--accent,#6d0061)}
.fd-cmt .fd-ph{margin-bottom:3px;padding-right:0}
.fd-tfoot{padding:7px 10px;font-family:${MONO};font-size:11px;color:var(--muted,#666)}
.fd-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  padding:20px;text-align:center;color:var(--muted,#666)}
.fd-empty p{margin:0;max-width:240px;font-family:${SERIF};font-size:15px}
`;


function injectCSS() {
  if (document.getElementById('fd-css')) return;
  const s = document.createElement('style');
  s.id = 'fd-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// tiny hyperscript
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    e.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return e;
};

// Strip fenced code blocks (the JSON action payload) from a thought — the action itself is
// rendered as the reply/post below, so the fence is noise. Keep the prose.
function cleanThought(t) {
  if (!t) return '';
  return String(t).replace(/```[\s\S]*?(```|$)/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

const CLAMP_CHARS = 320, THOUGHT_CHARS = 420;

export function mount(el, ctx) {
  const { state, set, on, d3 } = ctx;
  injectCSS();
  el.classList.add('fd-root');

  let tab = 'feed';             // 'feed' | 'profile' | 'thread'
  let expanded = new Set();     // post ids expanded past the clamp
  let thoughtOpen = false;
  let lastAgent = null, lastHit = null, lastPost = null, lastTab = null;
  let phone = null, scroller = null;

  // ---- helpers over the run ----------------------------------------------------
  const run = () => state.run;
  const agentOf = id => run()?.byAgent?.get(id);
  const postOf = id => run()?.byPost?.get(id);
  const cmtOf = id => run()?.byComment?.get(id);
  const cmtsOn = id => run()?.commentsByPost?.get(id) ?? [];
  const cmtsOnUpTo = (id, step) => cmtsOn(id).filter(c => c.step <= step);
  const acts = a => run()?.activationsByAgent?.get(a) ?? [];
  const actAt = (a, step) => run()?.activationAt?.(a, step) ?? null;
  const famOf = a => agentOf(a)?.family ?? '?';
  const handle = a => agentOf(a)?.persona ?? `agent ${a}`;
  const initial = a => (handle(a)[0] || '?').toUpperCase();
  const isCross = (c, ownerAgent) => c.cross ?? (famOf(c.agent) !== famOf(ownerAgent));

  // persona -> agent id (rebuilt when the run object changes)
  let personaRun = null, personaMap = new Map();
  const agentByPersona = name => {
    if (personaRun !== run()) { personaRun = run(); personaMap = new Map((run()?.agents || []).map(a => [a.persona, a.id])); }
    return personaMap.get(name);
  };
  const parentOf = c => (c && c.parent != null) ? c.parent : null;
  // whom a comment opens by addressing ("@handle ..."), excluding the post author and itself
  const ADDR = /^\s*@?([A-Za-z0-9_.-]+)[,:!\s]/;
  function addressee(c, postAuthor) {
    const m = ADDR.exec(c.text || '');
    if (!m) return null;
    const id = agentByPersona(m[1]);
    if (id == null || id === c.agent || id === postAuthor) return null;
    return id;
  }
  const avatar = a => h('span', { class: 'fd-avatar', style: `background:${familyColor(famOf(a))}`, text: initial(a) });
  const chip = f => h('span', { class: 'fd-chip', style: `color:${textColor(f)}`, text: f });

  function openThread(id) {
    tab = 'thread';
    if (state.post === id) render(['tab']);   // set() would not emit
    else set({ post: id });                   // change handler renders (and switches tab)
  }

  // ---- pieces --------------------------------------------------------------------
  function statusBar(a) {
    return h('div', { class: 'fd-status' },
      h('span', { class: 'fd-handle', text: '@' + handle(a) }),
      chip(famOf(a)),
      h('span', { class: 'fd-time', text: `step ${state.step}` }));
  }

  function tabs() {
    const mk = (id, label) => h('button', {
      class: 'fd-tab', role: 'tab', 'aria-selected': String(tab === id), 'data-tab': id,
      onclick: () => { tab = id; render(['tab']); }
    }, label);
    return h('div', { class: 'fd-tabs', role: 'tablist' }, mk('feed', 'Feed'), mk('profile', 'Profile'), mk('thread', 'Thread'));
  }

  function postHeader(a, step) {
    return h('div', { class: 'fd-ph' }, avatar(a),
      h('span', { class: 'fd-handle', text: handle(a) }), chip(famOf(a)),
      h('span', { class: 'fd-ts', text: `step ${step}` }));
  }

  function postCard(pid, opts = {}) {
    const p = postOf(pid);
    if (!p) return h('div', { class: 'fd-post fd-muted', 'data-post': pid, text: `post ${pid} (missing)` });
    const txt = p.text || '';
    const long = txt.length > CLAMP_CHARS || txt.split('\n').length > 6;
    const open = expanded.has(pid);
    const n = cmtsOnUpTo(pid, state.step).length;
    const col = familyColor(famOf(p.agent));
    return h('div', { class: 'fd-post' + (opts.hit ? ' fd-hit' : ''), 'data-post': pid,
      style: opts.hit ? `border-left-color:${col}` : null },
      opts.slot != null ? h('span', { class: 'fd-slot', text: `#${opts.slot + 1}` }) : null,
      postHeader(p.agent, p.step),
      h('div', { class: 'fd-text' + (long && !open ? ' fd-clamp' : ''), text: txt, title: 'open thread',
        onclick: () => openThread(pid) }),
      long ? h('button', { class: 'fd-more', text: open ? 'less' : 'more',
        onclick: () => { open ? expanded.delete(pid) : expanded.add(pid); render(['expand']); } }) : null,
      h('div', { class: 'fd-foot' },
        h('span', { text: `${n} comment${n === 1 ? '' : 's'}` }),
        opts.badge ? h('span', { class: 'fd-badge', style: `color:${textColor(famOf(p.agent))}`, text: opts.badge }) : null),
      opts.reply || null);
  }

  // header for a comment: avatar · handle · [→ @addressee] · chip · step
  function commentHeader(c, postAuthor) {
    const hd = postHeader(c.agent, c.step);
    const to = addressee(c, postAuthor);
    if (to != null) hd.insertBefore(h('span', { class: 'fd-addr', style: `color:${textColor(famOf(to))}`, text: `→ @${handle(to)}` }), hd.children[2]);
    return hd;
  }
  const replyLine = (c, byId) => {
    const par = parentOf(c) != null ? (byId?.get(parentOf(c)) ?? cmtOf(parentOf(c))) : null;
    return par ? h('div', { class: 'fd-to', text: `↳ replying to @${handle(par.agent)}` }) : null;
  };

  // the agent's own comment, as an indented reply under the post it acted on
  function replyCard(c, postAuthor, nested) {
    return h('div', { class: 'fd-reply' + (nested ? ' fd-nest' : ''), 'data-comment': c.id },
      replyLine(c), commentHeader(c, postAuthor), c.text || '');
  }

  // compact prior comment (clipped to ~160 chars, click to expand)
  function priorCard(c, postAuthor, nested) {
    const txt = c.text || '';
    const open = expanded.has('c' + c.id);
    const clip = txt.length > 160 && !open;
    return h('div', { class: 'fd-cmt' + (nested ? ' fd-nest' : '') + (clip ? ' fd-clip' : ''), 'data-comment': c.id,
      title: clip ? 'click to expand' : null,
      onclick: clip ? () => { expanded.add('c' + c.id); render(['expand']); } : null },
      replyLine(c), commentHeader(c, postAuthor), clip ? txt.slice(0, 160).trimEnd() + '…' : txt);
  }

  // one-level tree: top-level comments in order, each followed by its replies (deeper parents flatten to level 1)
  function threadTree(cmts) {
    const ids = new Set(cmts.map(c => c.id));
    const rootOf = new Map();
    const root = c => {
      if (rootOf.has(c.id)) return rootOf.get(c.id);
      let cur = c, guard = 0;
      while (parentOf(cur) != null && ids.has(parentOf(cur)) && guard++ < 50) cur = cmts.find(x => x.id === parentOf(cur)) || cur;
      rootOf.set(c.id, cur.id); return cur.id;
    };
    const kids = new Map();
    const tops = [];
    for (const c of cmts) {
      if (parentOf(c) != null && ids.has(parentOf(c))) { const r = root(c); if (!kids.has(r)) kids.set(r, []); kids.get(r).push(c); }
      else tops.push(c);
    }
    const out = [];
    for (const t of tops) { out.push({ c: t, nested: false }); for (const k of kids.get(t.id) || []) out.push({ c: k, nested: true }); }
    return out;
  }

  // thread under the acted-on post as of the activation step, with the agent's new comment in place
  function priorThread(pid, step, mine) {
    const p = postOf(pid);
    const author = p?.agent;
    const prior = cmtsOn(pid).filter(c => c.step < step && (!mine || c.id !== mine.id));
    const all = mine ? prior.concat([mine]) : prior;
    const tree = threadTree(all);
    const mineIdx = mine ? tree.findIndex(x => x.c === mine) : -1;
    const shown = tree.filter((x, i) => i !== mineIdx);
    const CAP = 6;
    const key = 'p' + pid + '@' + step;
    const collapsed = shown.length > CAP && !expanded.has(key);
    const start = collapsed ? shown.length - CAP : 0;
    const box = h('div', { class: 'fd-prior' });
    if (collapsed) box.appendChild(h('button', { class: 'fd-earlier', text: `show ${start} earlier`,
      onclick: () => { expanded.add(key); render(['expand']); } }));
    // render in tree order, inserting the agent's comment where it belongs
    let out = [];
    tree.forEach((x, i) => {
      if (i === mineIdx) out.push(replyCard(mine, author, x.nested));
      else if (shown.indexOf(x) >= start) out.push(priorCard(x.c, author, x.nested));
    });
    for (const n of out) box.appendChild(n);
    return box;
  }

  // tick strip of this agent's activation steps; click jumps to the nearest one
  function stepper(a, cur) {
    const list = acts(a), S = run().steps || 100;
    const W = 340, H = 14;
    const svg = d3.create('svg').attr('class', 'fd-stepper').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'none');
    const x = d3.scaleLinear().domain([0, S]).range([4, W - 4]);
    svg.append('line').attr('x1', x(0)).attr('x2', x(S)).attr('y1', H / 2).attr('y2', H / 2)
      .attr('stroke', 'var(--rule,#ccc)');
    svg.selectAll('line.t').data(list).join('line').attr('class', 't')
      .attr('x1', d => x(d.step)).attr('x2', d => x(d.step)).attr('y1', 3).attr('y2', H - 3)
      .attr('stroke', d => d === cur ? familyColor(famOf(a)) : 'var(--ink,#111)')
      .attr('stroke-width', d => d === cur ? 3 : 1).attr('opacity', d => d.step <= state.step ? 1 : .35)
      .append('title').text(d => `step ${d.step} · ${d.action}`);
    svg.append('line').attr('x1', x(state.step)).attr('x2', x(state.step)).attr('y1', 0).attr('y2', H)
      .attr('stroke', 'var(--muted,#888)').attr('stroke-dasharray', '2 2');
    svg.on('click', ev => {
      const [mx] = d3.pointer(ev);
      const st = x.invert(mx * W / ev.currentTarget.getBoundingClientRect().width);
      let best = null;
      for (const d of list) if (best == null || Math.abs(d.step - st) < Math.abs(best.step - st)) best = d;
      if (best) set({ step: best.step });
    });
    return svg.node();
  }

  // ---- FEED tab -----------------------------------------------------------------
  function feedTab(a) {
    const list = acts(a);
    const act = actAt(a, state.step);
    const frag = document.createDocumentFragment();
    if (!act) {
      frag.appendChild(h('div', { class: 'fd-head' }, h('span', { class: 'fd-k', text: 'not yet active' }),
        h('span', { class: 'fd-t', text: `step ${state.step}` })));
      frag.appendChild(stepper(a, null));
      frag.appendChild(h('div', { class: 'fd-none', text: list.length
        ? `first activation at step ${list[0].step}` : 'this agent was never activated' }));
      return { frag, hit: null };
    }
    const k = list.indexOf(act);
    const prev = list[k - 1], next = list[k + 1];
    frag.appendChild(h('div', { class: 'fd-head' },
      h('button', { class: 'fd-btn', text: '‹', title: 'previous activation  [', disabled: !prev,
        onclick: () => prev && set({ step: prev.step }) }),
      h('span', { class: 'fd-k', text: `activation ${k + 1} of ${list.length}` }),
      h('button', { class: 'fd-btn', text: '›', title: 'next activation  ]', disabled: !next,
        onclick: () => next && set({ step: next.step }) }),
      h('span', { class: 'fd-t', text: `step ${act.step}` })));
    frag.appendChild(stepper(a, act));
    if (act.step !== state.step)
      frag.appendChild(h('div', { class: 'fd-note', text: `last active at step ${act.step}` }));

    const th = cleanThought(act.thought);
    if (th) {
      const long = th.length > THOUGHT_CHARS;
      frag.appendChild(h('div', { class: 'fd-thought' },
        h('div', { class: 'fd-lbl' }, h('span', { text: 'thinking…' }),
          long ? h('button', { class: 'fd-more', text: thoughtOpen ? 'less' : 'more',
            onclick: () => { thoughtOpen = !thoughtOpen; render(['expand']); } }) : null),
        h('div', { class: 'fd-body' + (long && !thoughtOpen ? ' fd-clamp' : ''), text: th })));
    }

    const own = act.action === 'create_post' ? act.target : null;
    const hitId = act.action === 'create_comment' ? act.target : null;
    const cmt = act.comment != null ? cmtOf(act.comment) : null;
    if (own != null && postOf(own)) frag.appendChild(postCard(own, { hit: true, badge: '↑ posted' }));
    if (act.action === 'none') frag.appendChild(h('div', { class: 'fd-none', text: 'scrolled and did nothing this turn' }));
    const feed = act.feed || [];
    if (!feed.length) frag.appendChild(h('div', { class: 'fd-none', text: 'empty feed' }));
    feed.forEach((pid, i) => {
      const hit = pid === hitId;
      frag.appendChild(postCard(pid, { slot: i, hit, badge: hit ? '↳ commented here' : null,
        reply: hit ? priorThread(pid, act.step, cmt) : null }));
    });
    // defensive: the target should be in the feed, but render it anyway if not
    if (hitId != null && !feed.includes(hitId) && postOf(hitId))
      frag.appendChild(postCard(hitId, { hit: true, badge: '↳ commented here (not in feed)', reply: priorThread(hitId, act.step, cmt) }));
    return { frag, hit: hitId ?? own };
  }

  // ---- PROFILE tab --------------------------------------------------------------
  function profileTab(a) {
    const ag = agentOf(a) || {};
    const r = run();
    const S = r.steps || 100;
    const allPosts = (r.posts || []).filter(p => p.agent === a);
    const posts = allPosts.filter(p => p.step <= state.step);
    const allRecv = allPosts.flatMap(p => cmtsOn(p.id)).filter(c => c.agent !== a);
    const received = allRecv.filter(c => c.step <= state.step);
    const cross = received.filter(c => isCross(c, a)).length;

    // sparkline: cumulative comments received over steps, cursor at state.step
    const cum = new Array(S + 1).fill(0);
    for (const c of allRecv) if (c.step >= 0 && c.step <= S) cum[c.step]++;
    for (let i = 1; i <= S; i++) cum[i] += cum[i - 1];
    const W = 340, H = 44;
    const x = d3.scaleLinear().domain([0, S]).range([2, W - 2]);
    const y = d3.scaleLinear().domain([0, Math.max(1, cum[S])]).range([H - 3, 3]);
    const svg = d3.create('svg').attr('class', 'fd-spark').attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'none');
    const line = d3.line().x((d, i) => x(i)).y(d => y(d)).curve(d3.curveStepAfter);
    svg.append('path').attr('d', line(cum)).attr('fill', 'none').attr('stroke', familyColor(ag.family)).attr('stroke-width', 1.5);
    svg.append('line').attr('x1', x(state.step)).attr('x2', x(state.step)).attr('y1', 0).attr('y2', H)
      .attr('stroke', 'var(--muted,#888)').attr('stroke-dasharray', '2 2');
    svg.append('circle').attr('cx', x(state.step)).attr('cy', y(cum[Math.min(state.step, S)])).attr('r', 2.5)
      .attr('fill', familyColor(ag.family));

    const list = acts(a);
    const cur = actAt(a, state.step);
    return h('div', { class: 'fd-prof' },
      h('div', { style: 'display:flex;align-items:center;gap:8px' }, avatar(a),
        h('span', { class: 'fd-name', text: ag.persona || `agent ${a}` }), chip(ag.family)),
      h('div', { class: 'fd-bio', text: ag.bio || '' }),
      h('dl', { class: 'fd-kv' },
        h('dt', { text: 'model' }), h('dd', { text: `${ag.model || '?'} · ${ag.family}` }),
        h('dt', { text: 'agent id' }), h('dd', { text: String(a) }),
        h('dt', { text: 'activations' }), h('dd', { text: `${list.filter(x => x.step <= state.step).length} of ${list.length} by step ${state.step}` })),
      h('h3', { text: `comments received · ${received.length}` }),
      h('div', { class: 'fd-muted', style: 'font-size:12px', text: `${cross} cross-model · ${received.length - cross} own-family` }),
      svg.node(),
      h('h3', { text: `posts written · ${posts.length}` }),
      posts.length ? h('ul', { class: 'fd-list' }, posts.map(p => h('li', { onclick: () => openThread(p.id) },
        h('span', { class: 'fd-st', text: `s${p.step}` }), h('span', { class: 'fd-tx', text: p.text || '' }),
        h('span', { class: 'fd-muted', text: `${cmtsOnUpTo(p.id, state.step).length}` }))))
        : h('div', { class: 'fd-muted', style: 'font-size:12px', text: 'none yet' }),
      h('h3', { text: `activation history · ${list.length}` }),
      h('ul', { class: 'fd-list' }, list.map(x => {
        const tgtAgent = x.action === 'create_comment' ? postOf(x.target)?.agent : null;
        const what = x.action === 'create_comment' ? `comment → ${tgtAgent != null ? handle(tgtAgent) : '?'}`
          : x.action === 'create_post' ? 'post' : 'none';
        return h('li', { class: x === cur ? 'fd-cur' : '', style: x.step > state.step ? 'opacity:.45' : null,
          onclick: () => { tab = 'feed'; if (state.step === x.step) render(['tab']); else set({ step: x.step }); } },
          h('span', { class: 'fd-st', text: `s${x.step}` }),
          h('span', { class: 'fd-tx', text: what }),
          tgtAgent != null ? chip(famOf(tgtAgent)) : null);
      })));
  }

  // ---- THREAD tab ---------------------------------------------------------------
  function threadTab(a) {
    const pid = state.post;
    const p = pid != null ? postOf(pid) : null;
    if (!p) return h('div', { class: 'fd-empty' }, h('p', { text: 'No post open. Click a post in the feed to read its thread.' }));
    const cmts = cmtsOnUpTo(pid, state.step);
    const cross = cmts.filter(c => isCross(c, p.agent)).length;
    const frag = document.createDocumentFragment();
    frag.appendChild(h('div', { class: 'fd-thread-post', 'data-post': pid },
      postHeader(p.agent, p.step),
      h('div', { class: 'fd-text', text: p.text || '' }),
      p.step > state.step ? h('div', { class: 'fd-muted', style: 'font-size:11px;margin-top:4px', text: `(not yet posted at step ${state.step})` }) : null));
    const byId = new Map(cmts.map(c => [c.id, c]));
    for (const { c, nested } of threadTree(cmts))
      frag.appendChild(h('div', { class: 'fd-cmt' + (c.agent === a ? ' fd-mine' : '') + (nested ? ' fd-nest' : ''), 'data-comment': c.id },
        replyLine(c, byId), commentHeader(c, p.agent), c.text || ''));
    frag.appendChild(h('div', { class: 'fd-tfoot',
      text: `${cmts.length} comment${cmts.length === 1 ? '' : 's'} · ${cross} cross-model · ${cmts.length - cross} own-family` }));
    return frag;
  }

  // ---- empty state --------------------------------------------------------------
  function emptyState() {
    const r = run();
    return h('div', { class: 'fd-phone' }, h('div', { class: 'fd-empty' },
      h('p', { text: 'Select an agent in the network to replay what it saw and did.' }),
      h('button', { class: 'fd-btn', text: 'pick a random agent', disabled: !r,
        onclick: () => { const n = r?.agents?.length || 0; if (n) set({ agent: r.agents[Math.floor(Math.random() * n)].id }); } })));
  }

  // ---- render -------------------------------------------------------------------
  function render(keys = []) {
    const a = state.agent;
    if (a == null || !run() || !agentOf(a)) {
      el.replaceChildren(emptyState());
      phone = scroller = null; lastAgent = null; lastHit = null; lastTab = null;
      return;
    }
    if (a !== lastAgent) { expanded = new Set(); thoughtOpen = false; if (tab === 'thread' && state.post == null) tab = 'feed'; }
    if (keys.includes('post') && state.post != null && !keys.includes('agent') && !keys.includes('run')) tab = 'thread';

    const prevScroll = scroller ? scroller.scrollTop : 0;
    const hadFocus = phone && phone.contains(document.activeElement);
    let hit = null, body;
    if (tab === 'feed') { const r = feedTab(a); body = r.frag; hit = r.hit; }
    else if (tab === 'profile') body = profileTab(a);
    else body = threadTab(a);

    scroller = h('div', { class: 'fd-scroll', role: 'tabpanel', 'data-panel': tab }, body);
    phone = h('div', { class: 'fd-phone', tabindex: '0', onkeydown: onKey }, statusBar(a), tabs(), scroller);
    el.replaceChildren(phone);
    if (hadFocus) phone.focus({ preventScroll: true });

    // scroll policy
    const sameCtx = a === lastAgent && tab === lastTab;
    const soft = keys.every(k => k === 'step' || k === 'expand');   // nothing structural changed
    if (tab === 'feed') {
      if (sameCtx && soft && hit != null && hit === lastHit) scroller.scrollTop = prevScroll;
      else if (hit != null) {
        const node = scroller.querySelector(`.fd-post[data-post="${hit}"]`);
        if (node) scroller.scrollTop = Math.max(0, node.offsetTop - scroller.offsetTop - 6);
      } else if (sameCtx && keys.includes('expand')) scroller.scrollTop = prevScroll;
    } else if (sameCtx && (soft || (tab === 'thread' && state.post === lastPost))) {
      scroller.scrollTop = prevScroll;
    }
    lastAgent = a; lastHit = hit; lastPost = state.post; lastTab = tab;
  }

  // [ / ] : previous / next activation of the selected agent
  function onKey(ev) {
    if (state.agent == null || !run()) return;
    if (ev.key !== '[' && ev.key !== ']') return;
    const list = acts(state.agent), cur = actAt(state.agent, state.step);
    const k = cur ? list.indexOf(cur) : -1;
    let nxt;
    if (ev.key === '[') nxt = cur && cur.step < state.step ? cur : list[k - 1];
    else nxt = list[k + 1];
    if (nxt) set({ step: nxt.step });
    ev.preventDefault(); ev.stopPropagation();
  }

  const WATCH = ['agent', 'step', 'post', 'run'];
  on('change', keys => { if ((keys || []).some(k => WATCH.includes(k))) render(keys); });
  on('run', () => render(['run']));
  render(['run']);
  return { render, get tab() { return tab; }, set tab(t) { tab = t; render(['tab']); } };
}
