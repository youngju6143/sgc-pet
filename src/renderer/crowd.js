'use strict';

/**
 * 펫끼리 겹쳤을 때 빨리 흩어지게 한다.
 *
 * 다섯이 한 띠 안을 돌아다니다 보면 자주 겹치는데, 그대로 두면 뒤에 있는
 * 애가 통째로 가려진다. 겹친 동안에는 (1) 서로 밀어내고 (2) 걷는 속도를
 * 올려서 "빨리 지나가게" 하고 (3) 겹친 채로 서 있거나 자지 않게 옆으로 비킨다.
 */

/** 이 비율 이상 겹치면 개입한다 (좁은 쪽 폭 기준) */
const OVERLAP_THRESHOLD = 0.3;
/** 겹친 동안 서로 밀어내는 속도 (px/s, scale 1 기준) */
const PUSH_SPEED = 26;
/** 겹친 동안 걷기/뛰기 속도에 곱하는 배수 */
const MAX_BOOST = 2.6;

/** 가로로 얼마나 겹쳤는지 — 0(안 겹침) ~ 1(완전히 가림) */
function overlapRatio(a, b) {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const span = right - left;
  if (span <= 0) return 0;
  return span / Math.min(a.width, b.width);
}

/**
 * @returns {boolean} 위치를 건드렸으면 true (다시 그려야 한다)
 */
export function relieveCrowding(pets, world, dtMs) {
  for (const pet of pets) pet.crowdBoost = 1;
  if (pets.length < 2) return false;

  const dt = dtMs / 1000;
  let touched = false;

  for (let i = 0; i < pets.length; i++) {
    for (let j = i + 1; j < pets.length; j++) {
      const a = pets[i];
      const b = pets[j];
      // 들고 있거나 날아가는 중인 애는 물리가 따로 돈다 — 건드리지 않는다
      if (a.isHeld || b.isHeld || a.state === 'fall' || b.state === 'fall') continue;

      const ratio = overlapRatio(a, b);
      if (ratio < OVERLAP_THRESHOLD) continue;

      // 겹친 만큼 비례해서 서두른다
      const boost = 1 + (MAX_BOOST - 1) * ratio;
      a.crowdBoost = Math.max(a.crowdBoost, boost);
      b.crowdBoost = Math.max(b.crowdBoost, boost);

      // 중심이 왼쪽인 쪽이 왼쪽으로 빠진다. 완전히 겹쳤으면 index 로 가른다.
      const ca = a.x + a.width / 2;
      const cb = b.x + b.width / 2;
      const dir = ca === cb ? (i < j ? -1 : 1) : ca < cb ? -1 : 1;

      const push = PUSH_SPEED * ratio * dt;
      a.x += dir * push * a.scale;
      b.x -= dir * push * b.scale;
      a.stepAside(dir, world);
      b.stepAside(-dir, world);
      touched = true;
    }
  }

  if (touched) {
    for (const pet of pets) {
      if (pet.isHeld) continue;
      pet.x = Math.min(Math.max(0, pet.x), Math.max(0, world.width - pet.width));
    }
  }
  return touched;
}
