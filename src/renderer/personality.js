'use strict';

/**
 * 캐릭터별 성격 — 상태 전환 가중치에 곱하는 배수.
 * 1 보다 크면 그 상태로 더 자주 가고, 작으면 덜 간다.
 *
 * 다섯이 똑같이 움직이면 그냥 색만 다른 다섯 마리로 보인다.
 */
export const PERSONALITY = {
  // 강초당 — 먹보. 서서 우물거리느라 자주 멈춘다
  chodang: { idle: 1.5, sleep: 0.8 },
  // 구라베 — 라떼. 느긋해서 잘 안 뛴다
  rave: { idle: 1.6, walk: 0.9, run: 0.5 },
  // 망난이 — 제일 부산스럽다. 뛰어다니고 잘 안 잔다
  mangnani: { run: 3, walk: 1.4, sleep: 0.25, idle: 0.6 },
  // 송몽숙 — 제일 자주 잔다
  mongsuk: { sleep: 3.5, walk: 0.6, run: 0.3, idle: 1.4 },
  // 장폰주 — 게임하느라 자주 멈춘다
  ponzoo: { idle: 2.2, walk: 0.8, sleep: 0.7 },
};

export function personalityOf(characterId) {
  return PERSONALITY[characterId] || {};
}
