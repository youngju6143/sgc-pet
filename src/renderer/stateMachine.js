'use strict';

/**
 * 가중치 기반 상태 머신.
 * 각 상태는 지속시간이 끝나면 next 가중치대로 다음 상태를 뽑는다.
 * drag / fall / land 처럼 물리로 강제되는 상태는 force() 로 밀어 넣는다.
 */

export const STATE_DEFS = {
  idle: { min: 1400, max: 4200, next: { walk: 6, run: 1, idle: 2, sleep: 1 } },
  walk: { min: 2000, max: 5200, next: { idle: 4, run: 1, walk: 1 } },
  run: { min: 700, max: 1700, next: { walk: 3, idle: 2 } },
  sleep: { min: 6000, max: 16000, next: { idle: 4, walk: 2 } },
};

function pickWeighted(weights, random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = random() * total;
  for (const [key, w] of entries) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function createStateMachine({
  defs = STATE_DEFS,
  initial = 'idle',
  random = Math.random,
  onEnter = () => {},
  /** 캐릭터 성격 — 상태별 가중치에 곱한다 (personality.js) */
  weights = {},
} = {}) {
  let state = initial;
  let remaining = 0;
  let forced = false;

  function durationOf(name) {
    const def = defs[name];
    if (!def) return 1500;
    return def.min + random() * (def.max - def.min);
  }

  function enter(name, duration) {
    const previous = state;
    state = name;
    remaining = duration ?? durationOf(name);
    onEnter(name, previous);
  }

  enter(initial);

  return {
    get state() {
      return state;
    },
    get isForced() {
      return forced;
    },
    /** 물리 등으로 상태를 강제한다. duration 이 없으면 release() 할 때까지 유지 */
    force(name, duration = Infinity) {
      forced = true;
      enter(name, duration);
    },
    /** 강제 상태를 풀고 자율 전환으로 복귀 */
    release(name = 'idle', duration) {
      forced = false;
      enter(name, duration);
    },
    update(dtMs) {
      remaining -= dtMs;
      if (remaining > 0) return false;
      if (forced && remaining === -Infinity) return false;
      const def = defs[state];
      if (!def) {
        forced = false;
        enter('idle');
        return true;
      }
      forced = false;
      // 성격 배수를 곱해서 뽑는다
      const tuned = {};
      for (const [name, w] of Object.entries(def.next)) {
        const scaled = w * (weights[name] ?? 1);
        if (scaled > 0) tuned[name] = scaled;
      }
      enter(pickWeighted(Object.keys(tuned).length ? tuned : def.next, random));
      return true;
    },
  };
}
