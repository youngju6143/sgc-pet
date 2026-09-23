'use strict';

import { frameFor, animationFps, animationLength, animationStepDistance } from './frames.js';
import { drawFrame } from './sprite.js';
import { createStateMachine } from './stateMachine.js';
import { ZZZ_FRAME, ZZZ_PALETTE, zzzPuffs } from './effects.js';
import { createThrowTracker, step as physicsStep } from './physics.js';
import { personalityOf } from './personality.js';

const BLINK_MIN = 2200;
const BLINK_MAX = 7000;
const BLINK_MS = 140;

/** 상태별 이동 속도 (px/s, scale 1 기준). 뽈뽈뽈 걷는 속도라 일부러 느리다. */
const SPEED = { walk: 13, run: 28 };

/** 새 목적지는 현재 위치에서 최소 이만큼(띠 너비 대비) 떨어진 곳으로 고른다 */
const WANDER_MIN_SPAN = 0.3;

/** 겹쳐서 비킨 뒤 다시 비키기까지의 최소 간격 */
const ASIDE_COOLDOWN_MS = 800;

/** Zzz 가 한 칸 떠오르는 주기 (너무 자주 갱신하면 자는 동안 CPU 를 먹는다) */
const ZZZ_STEP_MS = 190;

/** 착지 스쿼시가 원래대로 돌아오는 속도 (ms) */
const SQUASH_RECOVER_MS = 110;
/** 착지 후 어지러워하는 시간 */
const LAND_MS = 300;

/** 이만큼 가만히 있으면 이름표 상태 점이 빨강으로 바뀐다 */
const IDLE_RED_MS = 25000;

/** 혼자 말풍선 띄우는 간격. 5마리가 동시에 떠들지 않게 폭을 준다. */
const CHATTER_MIN = 8 * 60 * 1000;
const CHATTER_MAX = 12 * 60 * 1000;

export class Pet {
  constructor(character, { x = 0, y = 0, scale = 1, speedScale = 1 } = {}) {
    this.character = character;
    this.scale = scale;
    this.speedScale = speedScale;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    /** 1 = 오른쪽, -1 = 왼쪽. 정면 스프라이트를 좌우 반전해서 표현한다. */
    this.facing = Math.random() < 0.5 ? -1 : 1;

    this.frameIndex = 0;
    this.frameTimer = 0;

    this.blinkIn = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
    this.blinking = 0;
    this.zzzTimer = 0;
    this.zzzStep = 0;

    /** 집혀 있는 동안은 물리/자율이동을 모두 멈춘다 */
    this.held = false;
    this.grabOffset = { x: 0, y: 0 };
    this.thrower = createThrowTracker(5);
    /** 1 = 평소, <1 = 착지해서 눌린 상태 */
    this.squash = 1;
    // 첫 대사는 간격 안에서 아무 때나 — 켠 직후 5마리가 줄줄이 떠드는 걸 막는다
    this.chatterIn = Math.random() * CHATTER_MAX;
    this.lastLine = null;
    /** 가만히 있은 시간 — 이름표 상태 점 색에 쓴다 */
    this.idleFor = 0;

    /** 걸어갈 목적지 (없으면 update 에서 새로 고른다) */
    this.targetX = null;
    /** 겹쳤을 때 잠깐 올라가는 속도 배수 (crowd.js 가 매 프레임 정한다) */
    this.crowdBoost = 1;
    this.asideCooldown = 0;

    this.machine = createStateMachine({
      weights: personalityOf(character.id),
      onEnter: (name) => this.onStateEnter(name),
    });
  }

  // --- 집기 / 던지기 -------------------------------------------------------

  /** @param {number} t performance.now() */
  grab(px, py, t) {
    this.held = true;
    this.grabOffset = { x: px - this.x, y: py - this.y };
    this.vx = 0;
    this.vy = 0;
    this.squash = 1;
    this.thrower.reset();
    this.thrower.push(px, py, t);
    this.machine.force('drag');
  }

  dragTo(px, py, t) {
    if (!this.held) return;
    this.x = px - this.grabOffset.x;
    this.y = py - this.grabOffset.y;
    this.thrower.push(px, py, t);
  }

  /** 놓는 순간의 커서 속도로 날아간다 */
  release() {
    if (!this.held) return;
    this.held = false;
    const v = this.thrower.velocity();
    this.vx = v.vx;
    this.vy = v.vy;
    this.machine.force('fall');
  }

  /** 던지지 않고 그냥 놓는다 (클릭이었을 때) */
  cancelGrab() {
    this.held = false;
    this.vx = 0;
    this.vy = 0;
    this.thrower.reset();
  }

  get isHeld() {
    return this.held;
  }

  get spriteWidth() {
    return this.character.width;
  }

  get spriteHeight() {
    return this.character.height;
  }

  get width() {
    return this.spriteWidth * this.scale;
  }

  get height() {
    return this.spriteHeight * this.scale;
  }

  get state() {
    return this.machine.state;
  }

  /** 지금 스스로 걸어 다니는 중인가 (겹쳐도 알아서 빠져나갈 수 있는가) */
  get isStrolling() {
    return !this.held && Boolean(SPEED[this.state]);
  }

  /**
   * 좌우 반전 보정 (화면 픽셀).
   * 구라베처럼 꼬리가 한쪽으로 삐져나온 캐릭터는 얼굴이 스프라이트 박스 중심에서
   * 벗어나 있다. 그냥 미러링하면 뒤돌 때마다 얼굴이 옆으로 튀어서, 얼굴 중심이
   * 제자리에 남도록 그리는 위치를 밀어 준다. (박스 중심에 있는 캐릭터는 0)
   */
  /**
   * 스프라이트를 좌우로 뒤집어 그려야 하는지.
   * 원본 도트가 어느 쪽을 보는 그림인지는 캐릭터마다 다르다 — 구라베는 꼬리가
   * 오른쪽에 있어서 **왼쪽을 보는 그림**이다. 그냥 `facing < 0` 으로 뒤집으면
   * 오른쪽으로 갈 때 꼬리가 앞에 와서 꼬리를 쫓아가는 꼴이 된다.
   */
  get flipped() {
    return this.facing !== (this.character.artFacing ?? 1);
  }

  get flipShift() {
    if (!this.flipped) return 0;
    const faceCx = this.character.faceCx ?? (this.spriteWidth - 1) / 2;
    return (2 * faceCx - (this.spriteWidth - 1)) * this.scale;
  }


  onStateEnter(name) {
    this.frameIndex = 0;
    this.frameTimer = 0;
    // 목적지는 일부러 버리지 않는다 — 걷기가 짧게 끊겨도 같은 방향으로
    // 이어서 가야 띠 전체를 돌아다닌다. 도착했을 때만 새로 고른다.
  }

  /**
   * 겹친 상대에게서 옆으로 비킨다.
   * 서 있거나 자고 있었으면 잠깐 걷게 해서 자리를 비워 준다.
   */
  stepAside(dir, world) {
    if (this.asideCooldown > 0) return;
    this.asideCooldown = ASIDE_COOLDOWN_MS;
    const maxX = Math.max(0, world.width - this.width);
    const away = dir > 0
      ? Math.min(maxX, this.x + this.width * 1.8)
      : Math.max(0, this.x - this.width * 1.8);
    this.targetX = away;
    if (!SPEED[this.state]) this.machine.force('walk', 900 + Math.random() * 700);
  }

  /** 지금 위치에서 충분히 떨어진 목적지를 고른다 */
  chooseTarget(world) {
    const maxX = Math.max(0, world.width - this.width);
    if (maxX <= 0) return 0;
    const span = maxX * WANDER_MIN_SPAN;
    for (let i = 0; i < 6; i++) {
      const candidate = Math.random() * maxX;
      if (Math.abs(candidate - this.x) >= span) return candidate;
    }
    // 여섯 번 뽑아도 가까우면 그냥 반대쪽 끝으로
    return this.x < maxX / 2 ? maxX : 0;
  }

  setScale(scale) {
    if (scale === this.scale) return;
    const cx = this.x + this.width / 2;
    const bottom = this.y + this.height;
    this.scale = scale;
    this.x = cx - this.width / 2;
    this.y = bottom - this.height;
  }

  /** @returns {boolean} 화면이 바뀌었으면 true (유휴 시 렌더를 건너뛰기 위함) */
  update(dtMs, world) {
    let changed = false;
    const dt = dtMs / 1000;

    this.machine.update(dtMs);

    let moved = 0;
    if (this.held) {
      // 위치는 dragTo 가 정한다. 화면 밖으로만 못 나가게 잡아 둔다.
      this.x = Math.min(Math.max(this.x, -this.width * 0.3), world.width - this.width * 0.7);
      this.y = Math.min(Math.max(this.y, -this.height * 0.2), world.groundY - this.height * 0.4);
      changed = true;
    } else if (this.state === 'fall') {
      const r = physicsStep(this, dtMs, world, this.scale);
      changed = true;
      if (r.bounced === 'floor') this.squash = 0.84;
      if (r.settled) {
        this.squash = 0.72;
        this.machine.force('land', LAND_MS);
      }
    } else {
      // --- 자율 이동 ---
      const speed = SPEED[this.state];
      if (speed) {
        if (this.targetX === null) this.targetX = this.chooseTarget(world);
        this.facing = this.targetX >= this.x ? 1 : -1;

        const before = this.x;
        this.x += this.facing * speed * this.scale * this.speedScale * (this.crowdBoost || 1) * dt;
        const maxX = Math.max(0, world.width - this.width);

        // 목적지를 지나쳤으면 딱 맞춰 세우고 다음 목적지를 고른다
        if ((this.facing > 0 && this.x >= this.targetX) || (this.facing < 0 && this.x <= this.targetX)) {
          this.x = this.targetX;
          this.targetX = this.chooseTarget(world);
        }
        if (this.x < 0) {
          this.x = 0;
          this.targetX = this.chooseTarget(world);
        } else if (this.x > maxX) {
          this.x = maxX;
          this.targetX = this.chooseTarget(world);
        }
        moved = this.x - before;
        if (moved !== 0) changed = true;
      }

      // 바닥에 붙인다
      const groundY = world.groundY - this.height;
      if (this.y !== groundY) {
        this.y = groundY;
        changed = true;
      }
    }

    // --- 착지 스쿼시 복구 ---
    if (this.squash !== 1) {
      const k = Math.min(1, dtMs / SQUASH_RECOVER_MS);
      this.squash += (1 - this.squash) * k;
      if (Math.abs(1 - this.squash) < 0.01) this.squash = 1;
      changed = true;
    }

    // --- 프레임 전진 ---
    // 걷기/뛰기는 이동 거리로 프레임을 넘긴다. 시간 기반이면 속도를 바꿀 때마다
    // 발이 헛돌거나 미끄러져 보인다.
    const stride = animationStepDistance(this.state);
    if (stride) {
      this.frameTimer += Math.abs(moved) / this.scale;
      while (this.frameTimer >= stride) {
        this.frameTimer -= stride;
        this.frameIndex = (this.frameIndex + 1) % animationLength(this.state);
        changed = true;
      }
    } else {
      const fps = animationFps(this.state);
      if (fps > 0) {
        this.frameTimer += dtMs;
        const step = 1000 / fps;
        while (this.frameTimer >= step) {
          this.frameTimer -= step;
          this.frameIndex = (this.frameIndex + 1) % animationLength(this.state);
          changed = true;
        }
      }
    }

    // --- 눈 깜빡임 ---
    if (this.blinking > 0) {
      this.blinking -= dtMs;
      if (this.blinking <= 0) changed = true;
    } else {
      this.blinkIn -= dtMs;
      if (this.blinkIn <= 0) {
        this.blinking = BLINK_MS;
        this.blinkIn = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
        changed = true;
      }
    }

    if (this.asideCooldown > 0) this.asideCooldown -= dtMs;

    // --- 가만히 있은 시간 (이름표 상태 점) ---
    if (this.held || this.state === 'walk' || this.state === 'run' || this.state === 'fall' || this.state === 'land') {
      if (this.idleFor > IDLE_RED_MS) changed = true;
      this.idleFor = 0;
    } else {
      const before = this.idleFor > IDLE_RED_MS;
      this.idleFor += dtMs;
      if (!before && this.idleFor > IDLE_RED_MS) changed = true;
    }

    // --- 혼잣말 타이머 ---
    if (this.chatterIn > 0) this.chatterIn -= dtMs;

    // --- 자는 중 Zzz ---
    if (this.state === 'sleep') {
      this.zzzTimer += dtMs;
      while (this.zzzTimer >= ZZZ_STEP_MS) {
        this.zzzTimer -= ZZZ_STEP_MS;
        this.zzzStep += 1;
        changed = true;
      }
    }

    return changed;
  }

  currentFrame() {
    return frameFor(this.character, this.state, this.frameIndex, this.blinking > 0);
  }

  draw(ctx) {
    const frame = this.currentFrame();
    const sq = this.squash;
    // 눌린 만큼 옆으로 퍼진다 (스쿼시 & 스트레치). 발바닥을 기준으로 붙인다.
    const h = this.height * sq;
    const w = this.width * (1 + (1 - sq) * 0.7);
    const px = Math.round(this.x + this.flipShift - (w - this.width) / 2);
    const py = Math.round(this.y + this.height - h + frame.dy * this.scale);

    // 눈은 얼굴 중심 기준으로 대칭이라(extract-lib 의 patchFace 참고) 반전은 순수
    // 미러링이다. 얼굴이 박스 중심에서 벗어난 캐릭터만 flipShift 로 되돌린다.
    drawFrame(ctx, frame.rows, this.character.palette, {
      cacheKey: frame.key,
      x: px,
      y: py,
      scale: this.scale,
      flip: this.flipped,
      width: sq === 1 ? undefined : w,
      height: sq === 1 ? undefined : h,
    });

    if (this.state === 'sleep') this.drawZzz(ctx, px, py);
  }

  /**
   * 이름표 상태 점 색.
   * 'active' 녹색 / 'sleep' 주황 / 'idle' 빨강(오래 가만히)
   */
  activity() {
    if (this.state === 'sleep') return 'sleep';
    if (this.held || SPEED[this.state] || this.state === 'fall' || this.state === 'land') return 'active';
    return this.idleFor > IDLE_RED_MS ? 'idle' : 'active';
  }

  /**
   * 혼잣말할 차례가 됐으면 대사를 하나 뽑아 준다. 안 됐으면 null.
   * 자거나 들려 있을 때는 말하지 않고 타이머만 흘려보낸다.
   */
  takeChatter() {
    if (this.chatterIn > 0) return null;
    this.chatterIn = CHATTER_MIN + Math.random() * (CHATTER_MAX - CHATTER_MIN);
    if (this.held || this.state === 'sleep' || this.state === 'fall') return null;
    const lines = this.character.lines;
    if (!lines || !lines.length) return null;
    // 같은 말을 연달아 하면 고장난 것처럼 보인다 — 한 번 다시 뽑는다
    let line = lines[Math.floor(Math.random() * lines.length)];
    if (line === this.lastLine && lines.length > 1) {
      line = lines[Math.floor(Math.random() * lines.length)];
    }
    this.lastLine = line;
    return line;
  }

  /** 말풍선을 붙일 머리 꼭대기 좌표 (화면 기준) */
  headAnchor() {
    const frame = this.currentFrame();
    const top = this.y + this.height - this.height * this.squash + frame.dy * this.scale;
    return { x: this.x + this.width / 2, y: top };
  }

  /** 머리 위로 Zzz 가 둥실 떠오른다 */
  drawZzz(ctx, px, py) {
    const w = this.spriteWidth;
    const baseX = px + (this.facing > 0 ? w - 12 : 6) * this.scale;
    const baseY = py + 3 * this.scale;
    for (const puff of zzzPuffs(this.zzzStep)) {
      ctx.save();
      ctx.globalAlpha = puff.alpha;
      drawFrame(ctx, ZZZ_FRAME, ZZZ_PALETTE, {
        cacheKey: 'fx|zzz',
        x: baseX + puff.dx * this.scale,
        y: baseY + puff.dy * this.scale,
        scale: this.scale,
      });
      ctx.restore();
    }
  }

  /**
   * 클릭 통과 토글용 히트 테스트.
   * 사각형이 아니라 **픽셀 단위**로 본다 — 스프라이트 모서리는 투명이라
   * 사각형으로 잡으면 캐릭터 옆 빈 공간에서도 클릭이 막힌다.
   * pad 는 스프라이트 픽셀 단위 여유(잡기 쉽게).
   */
  hitTest(px, py, pad = 1) {
    const frame = this.currentFrame();
    const top = this.y + frame.dy * this.scale;
    const w = this.spriteWidth;
    let lx = Math.floor((px - this.x - this.flipShift) / this.scale);
    const ly = Math.floor((py - top) / this.scale);
    if (this.flipped) lx = w - 1 - lx; // 반전해서 그렸으니 좌표도 되돌린다
    if (lx < -pad || ly < -pad || lx > w + pad || ly > this.spriteHeight + pad) return false;

    for (let dy = -pad; dy <= pad; dy++) {
      for (let dx = -pad; dx <= pad; dx++) {
        const row = frame.rows[ly + dy];
        const c = row && row[lx + dx];
        if (c && c !== '.') return true;
      }
    }
    return false;
  }
}
