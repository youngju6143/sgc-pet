'use strict';

/**
 * 캐릭터별 상태 프레임 조립.
 *
 * 5종이 몸 구조가 전부 달라서(양·허스키·레서판다·새·고양이) 몸통을 공유하지 않는다.
 * 대신 원본 도트에서 **다리 갈라지는 지점**을 찾아 그 아래 행만 갈아끼우는 식으로
 * 걷기를 만든다. 앉기/자기는 추출 단계에서 미리 구워 둔다.
 * (tools/extract-characters.mjs 참고)
 */

/**
 * 상태별 애니메이션.
 * dy 는 그릴 때 적용하는 세로 오프셋(숨쉬기/통통 튐) — 프레임 자체를 늘리지 않는다.
 * walk/run 은 fps 대신 **이동 거리**로 프레임을 넘긴다(stepDistance). 속도를 바꿔도
 * 발이 헛돌지 않는다.
 */
export const ANIMATIONS = {
  idle: { fps: 2.5, frames: [
    { legs: 'stand', dy: 0 },
    { legs: 'stand', dy: -1 },
  ]},
  walk: { stepDistance: 4, frames: [
    { legs: 'stand', dy: 0 },
    { legs: 'stepLeft', dy: -1 },
    { legs: 'stand', dy: 0 },
    { legs: 'stepRight', dy: -1 },
  ]},
  run: { stepDistance: 5, frames: [
    { legs: 'stand', dy: 0 },
    { legs: 'stepLeft', dy: -2 },
    { legs: 'stand', dy: 0 },
    { legs: 'stepRight', dy: -2 },
  ]},
  // --- 아래는 물리/입력으로 강제되는 상태 (stateMachine 이 자율 전환하지 않는다) ---
  drag: { fps: 11, frames: [
    { legs: 'stepLeft', dy: -1 },
    { legs: 'stepRight', dy: 1 },
  ]},
  fall: { fps: 7, frames: [
    { legs: 'stepLeft', dy: 0 },
    { legs: 'stepRight', dy: 0 },
  ]},
  land: { fps: 1, frames: [
    { legs: 'stand', dy: 0 },
  ]},
  // 잠은 선 자세로 눈만 감는다. 앉기 자세는 원본 도트에 없어서 다리를 잘라
  // 만들었던 건데, 몸이 뭉텅 잘린 것처럼 보여서 뺐다.
  sleep: { fps: 0.8, frames: [
    { legs: 'stand', eyes: 'closed', dy: 0 },
    { legs: 'stand', eyes: 'closed', dy: 1 },
  ]},
};

export const STATES = Object.keys(ANIMATIONS);

function replaceRange(row, start, text) {
  return row.slice(0, start) + text + row.slice(start + text.length);
}

/**
 * 감은 눈 — 5종 모두 납작한 `ㅡ ㅡ` 한 줄로 통일한다.
 * 눈 칸(character.eyes)은 추출 때 **실제로 찍힌 눈 크기**라 그 칸만 얼굴색으로
 * 덮으면 안광이든 반달이든 자국 없이 지워진다. 그 위에 가운데 한 줄만 긋는다.
 */
function closeEyes(rows, eyes, rowOffset) {
  const out = rows.slice();
  for (const box of [eyes.left, eyes.right]) {
    const top = box.y + rowOffset;
    for (let i = 0; i < box.h; i++) {
      const y = top + i;
      if (!out[y]) continue;
      out[y] = replaceRange(out[y], box.x, eyes.fill.repeat(box.w));
    }
    // 양 끝을 한 칸씩 줄여 눈매를 둥글게 — 꽉 채우면 눈썹처럼 보인다.
    const inset = box.w >= 6 ? 1 : 0;
    const lineY = top + Math.floor((box.h - 1) / 2);
    if (out[lineY]) {
      out[lineY] = replaceRange(out[lineY], box.x + inset, eyes.line.repeat(box.w - inset * 2));
    }
  }
  return out;
}

const cache = new Map();

/**
 * @param {object} character characters/*.js 의 기본 export
 * @param {string} state ANIMATIONS 키
 * @param {number} index 프레임 인덱스
 * @param {boolean} blink 깜빡이는 중이면 눈을 감는다
 */
export function frameFor(character, state, index, blink = false) {
  const anim = ANIMATIONS[state] || ANIMATIONS.idle;
  const spec = anim.frames[index % anim.frames.length];
  const legs = spec.legs || 'stand';
  const eyesClosed = blink || spec.eyes === 'closed';
  const key = `${character.id}|${legs}|${eyesClosed ? 'shut' : 'open'}`;

  let rows = cache.get(key);
  if (!rows) {
    rows = [...character.torso.slice(0, character.legTop), ...character.legFrames[legs]];
    if (eyesClosed) rows = closeEyes(rows, character.eyes, 0);
    cache.set(key, rows);
  }
  return { rows, dy: spec.dy || 0, key };
}

export function animationLength(state) {
  return (ANIMATIONS[state] || ANIMATIONS.idle).frames.length;
}

export function animationFps(state) {
  return (ANIMATIONS[state] || ANIMATIONS.idle).fps || 0;
}

/** walk/run 처럼 이동 거리로 프레임을 넘기는 상태면 스프라이트 픽셀 단위 보폭 */
export function animationStepDistance(state) {
  return (ANIMATIONS[state] || ANIMATIONS.idle).stepDistance || 0;
}

export function clearFrameCache() {
  cache.clear();
}
