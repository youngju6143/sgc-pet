'use strict';

/**
 * 던지기 물리. 전부 scale 1 기준 값이고 실제로는 pet.scale 을 곱해서 쓴다.
 */

/** 중력 (px/s²) */
export const GRAVITY = 1500;
/** 공기저항 — 매 프레임 속도에 곱한다 */
export const AIR_DRAG = 0.992;
/** 벽/바닥 반발계수. 튈 때마다 이만큼만 남는다 */
export const RESTITUTION = 0.5;
/** 바닥에 닿을 때 수평 속도에 곱하는 마찰 */
export const GROUND_FRICTION = 0.72;
/** 이보다 느리면 더 안 튀고 멈춘다 (px/s) */
export const SETTLE_SPEED = 55;
/** 던지기 속도 상한 — 너무 세게 던져도 화면을 한 번에 가로지르지 않게 */
export const MAX_THROW_SPEED = 2600;

/**
 * 드래그 중 최근 몇 프레임의 커서 이동량을 기억했다가 던지기 속도를 낸다.
 * 놓기 직전 순간속도만 쓰면 손 떨림이 그대로 튀어서 평균을 쓴다.
 */
export function createThrowTracker(samples = 5) {
  /** @type {{x:number,y:number,t:number}[]} */
  const history = [];

  return {
    reset() {
      history.length = 0;
    },
    push(x, y, t) {
      history.push({ x, y, t });
      if (history.length > samples) history.shift();
    },
    /** @returns {{vx:number, vy:number}} px/s */
    velocity() {
      if (history.length < 2) return { vx: 0, vy: 0 };
      const first = history[0];
      const last = history[history.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt <= 0) return { vx: 0, vy: 0 };
      let vx = (last.x - first.x) / dt;
      let vy = (last.y - first.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_THROW_SPEED) {
        const k = MAX_THROW_SPEED / speed;
        vx *= k;
        vy *= k;
      }
      return { vx, vy };
    },
  };
}

/**
 * 한 스텝 적분. body 는 { x, y, vx, vy, width, height } 를 가진 아무 객체.
 * @returns {{ bounced: 'floor'|'wall'|null, settled: boolean }}
 */
export function step(body, dtMs, world, scale = 1) {
  const dt = dtMs / 1000;
  let bounced = null;

  body.vy += GRAVITY * scale * dt;
  body.vx *= AIR_DRAG;
  body.vy *= AIR_DRAG;
  body.x += body.vx * dt;
  body.y += body.vy * dt;

  // 좌우 벽
  const maxX = world.width - body.width;
  if (body.x < 0) {
    body.x = 0;
    body.vx = -body.vx * RESTITUTION;
    bounced = 'wall';
  } else if (body.x > maxX) {
    body.x = maxX;
    body.vx = -body.vx * RESTITUTION;
    bounced = 'wall';
  }

  // 천장 — 세게 던져도 화면 밖으로 안 나가게
  if (body.y < 0) {
    body.y = 0;
    body.vy = Math.abs(body.vy) * RESTITUTION;
    bounced = 'wall';
  }

  // 바닥
  const floorY = world.groundY - body.height;
  let settled = false;
  if (body.y >= floorY) {
    body.y = floorY;
    body.vx *= GROUND_FRICTION;
    if (Math.abs(body.vy) < SETTLE_SPEED * scale) {
      body.vy = 0;
      settled = Math.abs(body.vx) < SETTLE_SPEED * scale;
      if (settled) body.vx = 0;
    } else {
      body.vy = -body.vy * RESTITUTION;
      bounced = 'floor';
    }
  }

  return { bounced, settled };
}
