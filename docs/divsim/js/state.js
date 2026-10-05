// js/state.js — store + event bus (shell owns; everyone consumes)
// Modules read `state` directly but mutate ONLY via set().

export const state = {
  run: null,          // loaded bundle + indexes from data.js
  step: 0,            // current step 0..run.steps
  playing: false,
  speed: 1,
  agent: null,        // selected agent id or null
  post: null,         // selected post id or null
  hover: null,        // {type:'agent'|'post', id} or null
  families: {}        // family -> boolean visible
};

const listeners = { change: new Set(), run: new Set() };

export function on(evt, fn) {
  if (!listeners[evt]) listeners[evt] = new Set();
  listeners[evt].add(fn);
  return () => off(evt, fn);
}

export function off(evt, fn) {
  listeners[evt]?.delete(fn);
}

export function emit(evt, payload) {
  const set_ = listeners[evt];
  if (!set_) return;
  for (const fn of Array.from(set_)) {
    try { fn(payload, state); }
    catch (e) { console.error(`[state] listener for '${evt}' threw`, e); }
  }
}

// Shallow merge; emits 'change' with the list of keys whose value actually changed.
// `families` is compared by reference like everything else — pass a new object to change it.
export function set(patch) {
  const keys = [];
  for (const k of Object.keys(patch)) {
    if (!Object.is(state[k], patch[k])) {
      state[k] = patch[k];
      keys.push(k);
    }
  }
  if (keys.length) emit('change', keys);
  return keys;
}
