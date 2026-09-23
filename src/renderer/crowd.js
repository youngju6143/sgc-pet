'use strict';

/**
 * 펫끼리 겹쳤을 때의 처리.
 *
 * 서로 밀어내고 목적지를 반대로 돌려 버리면 둘이 튕겨 나기만 해서 왼쪽 애는
 * 영영 왼쪽, 오른쪽 애는 영영 오른쪽에 남는다. 그래서 **서로를 그냥 지나가게**
 * 둔다. 대신 겹친 동안에는 걷는 속도를 올려서 가려져 있는 시간을 줄이고,
 * 둘 다 멈춰 있어서 스스로 풀 수 없는 경우에만 옆으로 비켜 준다.
 */

/** 이 비율 이상 겹치면 개입한다 (좁은 쪽 폭 기준) */
const OVERLAP_THRESHOLD = 0.3;
/** 겹친 동안 걷기/뛰기 속도에 곱하는 배수 */
const MAX_BOOST = 2.6;
/** 둘 다 멈춰 있을 때 옆으로 밀어내는 속도 (px/s, scale 1 기준) */
const PUSH_SPEED = 26;

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

      // 겹친 만큼 비례해서 서두른다 — 가던 방향 그대로, 상대를 통과해서
      const boost = 1 + (MAX_BOOST - 1) * ratio;
      a.crowdBoost = Math.max(a.crowdBoost, boost);
      b.crowdBoost = Math.max(b.crowdBoost, boost);

      // 걷는 애가 하나라도 있으면 곧 알아서 빠져나간다
      if (a.isStrolling || b.isStrolling) continue;

      // 둘 다 멈춰 있으면 영영 겹쳐 있으므로 옆으로 비켜 준다.
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
