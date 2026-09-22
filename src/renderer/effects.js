'use strict';

/** 스프라이트 위에 얹는 작은 이펙트들. 캐릭터 팔레트와 무관하게 자체 색을 쓴다. */

export const ZZZ_PALETTE = {
  o: '#2e2e38',
  Z: '#fdfdff',
};

export const ZZZ_FRAME = [
  'oooooo',
  'oZZZZo',
  'oooZZo',
  'oZZooo',
  'oZZZZo',
  'oooooo',
];

/** Zzz 한 덩이가 떠오르는 경로. step 은 느린 카운터(약 5fps). */
export function zzzPuffs(step, count = 2, period = 10) {
  const puffs = [];
  for (let i = 0; i < count; i++) {
    const phase = ((step + i * Math.floor(period / count)) % period) / period;
    puffs.push({
      dx: Math.round(Math.sin(phase * Math.PI * 2) * 2),
      dy: -Math.round(phase * 9),
      alpha: 1 - phase * 0.85,
    });
  }
  return puffs;
}
