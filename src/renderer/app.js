'use strict';

/**
 * 오버레이 렌더러.
 * 고정 타임스텝(60fps)으로 펫을 갱신하고, 화면이 바뀐 프레임만 그린다.
 */

import { CHARACTERS } from './characters/index.js';
import { Pet } from './pet.js';
import { createHitTracker } from './hitTracker.js';
import { createChat } from './chat.js';
import { createNameTags, TAG_HEIGHT } from './nameTag.js';
import { relieveCrowding } from './crowd.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { alpha: true });

const STEP_MS = 1000 / 60;
const MAX_STEPS = 5;
/** 작업영역 하단에서 살짝 띄워 바닥선을 만든다 */
const FLOOR_MARGIN = 2;
/** 이만큼 안 움직이고 놓으면 드래그가 아니라 클릭으로 본다 */
const CLICK_SLOP = 5;

const viewport = { width: 0, height: 0, dpr: 1 };
const world = { width: 0, height: 0, groundY: 0 };

/** @type {Pet[]} */
const pets = [];

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  viewport.width = window.innerWidth;
  viewport.height = window.innerHeight;
  viewport.dpr = dpr;
  canvas.width = Math.round(viewport.width * dpr);
  canvas.height = Math.round(viewport.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  const previousWidth = world.width;
  world.width = viewport.width;
  world.height = viewport.height;
  world.groundY = viewport.height - FLOOR_MARGIN;

  // 띠가 좁아질 때 그냥 클램프하면 밖에 있던 애들이 전부 오른쪽 끝에 쌓인다.
  // 가로 위치를 **비율 그대로** 옮겨서 좁은 띠 안에도 고르게 흩어지게 한다.
  const ratio = previousWidth > 0 ? world.width / previousWidth : 1;
  for (const pet of pets) {
    if (!pet.isHeld && ratio !== 1) {
      const center = (pet.x + pet.width / 2) * ratio;
      pet.x = center - pet.width / 2;
    }
    pet.x = Math.min(Math.max(0, pet.x), Math.max(0, world.width - pet.width));
    if (!pet.isHeld) pet.y = world.groundY - pet.height;
  }
  markDirty();
}

/**
 * 설정 (메뉴바 → 설정…). characters 가 비어 있으면 "전부"라는 뜻이다 —
 * 캐릭터를 나중에 추가해도 설정을 안 건드린 사람 화면에 자동으로 끼워진다.
 */
let settings = { characters: [], scale: 1, speed: 1, chatter: true, nameTags: true, noClick: false };

function enabledCharacters() {
  const picked = CHARACTERS.filter((c) => settings.characters?.includes(c.id));
  return picked.length ? picked : CHARACTERS;
}

/** 켜져 있는 캐릭터 순서에서 몇 번째인지로 고정 스폰 위치를 정한다 */
function spawnX(character, pet) {
  const list = enabledCharacters();
  const i = Math.max(0, list.indexOf(character));
  return Math.round((world.width * (i + 1)) / (list.length + 1) - pet.width / 2);
}

function makePet(character) {
  const pet = new Pet(character, { scale: settings.scale, speedScale: settings.speed });
  pet.x = clampX(spawnX(character, pet), pet);
  pet.y = world.groundY - pet.height;
  return pet;
}

function clampX(x, pet) {
  return Math.min(Math.max(0, x), Math.max(0, world.width - pet.width));
}

/** 처음 띄울 때만 전원 소환 */
function spawn() {
  pets.length = 0;
  for (const character of enabledCharacters()) pets.push(makePet(character));
  markDirty();
}

/**
 * 구성이 바뀌었을 때. **이미 있던 애들은 건드리지 않는다** —
 * 전부 다시 소환하면 돌아다니던 위치가 매번 초기화돼서 아쉽다.
 * 새로 켠 캐릭터만 고정 위치에 스폰하고, 끈 캐릭터만 치운다.
 */
function syncRoster() {
  const wanted = enabledCharacters();

  for (let i = pets.length - 1; i >= 0; i--) {
    if (wanted.includes(pets[i].character)) continue;
    if (chat.target === pets[i]) chat.close(false);
    chat.forget(pets[i]);
    pets.splice(i, 1);
  }

  for (const character of wanted) {
    if (pets.some((p) => p.character === character)) continue;
    pets.push(makePet(character));
  }

  // 화면 순서를 켜진 순서대로 맞춰 둔다 (겹칠 때 그리는 순서)
  pets.sort((a, b) => wanted.indexOf(a.character) - wanted.indexOf(b.character));
  nameTags.prune(pets);
  markDirty();
}

/** 설정이 바뀌었을 때. 구성이 그대로면 다시 소환하지 않고 값만 갈아끼운다. */
function applySettings(next) {
  const before = enabledCharacters().map((c) => c.id).join(',');
  settings = { ...settings, ...next };
  nameTags.setVisible(settings.nameTags !== false);
  syncBubbleLift();
  if (settings.noClick) {
    // 켜는 순간 들고 있던 펫은 놔주고 입력창도 닫는다
    if (grab) { grab.pet.cancelGrab(); grab = null; }
    if (chat.isOpen) chat.close(true);
  }
  refreshHit();
  const after = enabledCharacters().map((c) => c.id).join(',');

  if (before !== after) {
    syncRoster();
    refreshHit();
  }
  for (const pet of pets) {
    pet.setScale(settings.scale);
    pet.speedScale = settings.speed;
    // 커진 만큼 화면 밖으로 밀려나지 않게
    pet.x = clampX(pet.x, pet);
    if (!pet.isHeld) pet.y = world.groundY - pet.height;
  }
  markDirty();
}

// ---------------------------------------------------------------------------
// 말풍선
// ---------------------------------------------------------------------------

const nameTags = createNameTags({ layer: document.getElementById('nametags') });

// 말풍선은 이름표 위로 띄운다
function syncBubbleLift() {
  document.getElementById('bubbles').style.setProperty(
    '--bub-lift',
    nameTags.visible ? `${TAG_HEIGHT + 4}px` : '0px',
  );
}

const chat = createChat({
  layer: document.getElementById('bubbles'),
  requestFocus: () => window.petAPI?.requestFocus(),
});

chat.onSubmit = (pet) => {
  pet.machine.release('idle');
};

// ---------------------------------------------------------------------------
// 히트 테스트 + 클릭 통과 토글
// ---------------------------------------------------------------------------

const hits = createHitTracker({
  onChange(interactive) {
    window.petAPI?.setInteractive(interactive);
  },
});

let cursor = { x: -1, y: -1 };

function petAt(px, py) {
  for (let i = pets.length - 1; i >= 0; i--) {
    if (pets[i].hitTest(px, py)) return pets[i];
  }
  return null;
}

/**
 * 입력창 위에서도 클릭을 받아야 하지만, 화면 전체를 막으면 안 된다 —
 * 입력창이 열려 있는 동안에도 빈 곳은 계속 아래 창으로 통과시킨다.
 */
function refreshHit() {
  // '펫 클릭 막기' 가 켜져 있으면 아무것도 잡지 않는다 — 전부 아래 창으로 통과
  if (settings.noClick) {
    hits.update(false);
    return;
  }
  if (grab) {
    hits.update(true);
    return;
  }
  if (cursor.x < 0) {
    hits.update(false);
    return;
  }
  hits.update(Boolean(petAt(cursor.x, cursor.y)) || chat.hitTest(cursor.x, cursor.y));
}


// ---------------------------------------------------------------------------
// 집기 / 던지기 / 클릭
// ---------------------------------------------------------------------------

/** @type {{pet: Pet, startX: number, startY: number, moved: number}|null} */
let grab = null;

window.addEventListener('mousedown', (event) => {
  if (event.button !== 0 || settings.noClick) return;
  const pet = petAt(event.clientX, event.clientY);
  if (!pet) {
    if (chat.isOpen) chat.close(true);
    return;
  }
  // 입력창이 열려 있던 펫을 다시 누르면 유지한다.
  // preventDefault 로 input 의 blur 를 막아야 더블클릭 때 열고 닫기가 반복되지 않는다.
  if (chat.isOpen && chat.target === pet) {
    event.preventDefault();
    return;
  }
  if (chat.isOpen) chat.close(true);

  grab = { pet, startX: event.clientX, startY: event.clientY, moved: 0 };
  pet.grab(event.clientX, event.clientY, performance.now());
  markDirty();
});

window.addEventListener('mousemove', (event) => {
  cursor = { x: event.clientX, y: event.clientY };
  if (grab) {
    grab.moved = Math.max(
      grab.moved,
      Math.hypot(event.clientX - grab.startX, event.clientY - grab.startY),
    );
    grab.pet.dragTo(event.clientX, event.clientY, performance.now());
    markDirty();
  }
  refreshHit();
});

window.addEventListener('mouseup', (event) => {
  if (!grab) return;
  const { pet, moved } = grab;
  grab = null;
  if (moved < CLICK_SLOP) {
    // 드래그가 아니라 클릭 — 말풍선에 타이핑
    pet.cancelGrab();
    pet.machine.force('idle');
    chat.open(pet);
  } else {
    pet.release();
  }
  markDirty();
  refreshHit();
});

window.addEventListener('mouseleave', () => {
  cursor = { x: -1, y: -1 };
  refreshHit();
});

// ---------------------------------------------------------------------------
// 루프
// ---------------------------------------------------------------------------

let dirty = true;
let accumulator = 0;
let lastTime = performance.now();

function markDirty() {
  dirty = true;
}

function update(dtMs) {
  // 겹친 애들 먼저 떼어 놓는다 (속도 배수도 여기서 정해진다)
  if (relieveCrowding(pets, world, dtMs)) markDirty();
  for (const pet of pets) {
    if (pet.update(dtMs, world)) markDirty();
    // 10분쯤에 한 번 혼잣말. 입력창이 열려 있는 펫은 건너뛴다.
    if (!settings.chatter) continue;
    const line = pet.takeChatter();
    if (line && !(chat.isOpen && chat.target === pet)) chat.say(pet, line);
  }
}

function render() {
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  for (const pet of pets) pet.draw(ctx);
}

function frame(now) {
  let delta = now - lastTime;
  lastTime = now;
  if (delta > STEP_MS * MAX_STEPS) delta = STEP_MS * MAX_STEPS;
  accumulator += delta;

  let steps = 0;
  while (accumulator >= STEP_MS && steps < MAX_STEPS) {
    update(STEP_MS);
    accumulator -= STEP_MS;
    steps += 1;
  }

  if (dirty) {
    render();
    dirty = false;
    refreshHit();
  }
  // 이름표·말풍선은 DOM 이라 캔버스와 별개로 매 프레임 펫을 따라간다
  nameTags.update(pets);
  if (chat.busy) chat.update(now);

  requestAnimationFrame(frame);
}

window.addEventListener('resize', resizeCanvas);
window.petAPI?.onOverlayResized?.(() => resizeCanvas());

resizeCanvas();
// 저장된 설정을 먼저 읽고 소환한다. 설정 창에서 바꾸면 그때그때 따라간다.
settings = (await window.petAPI?.getSettings?.()) || settings;
nameTags.setVisible(settings.nameTags !== false);
spawn();
window.petAPI?.onSettingsChanged?.(applySettings);
requestAnimationFrame(frame);

// Phase 5 에서 트레이 설정이 붙을 자리
window.petDebug = { pets, nameTags, chat, syncBubbleLift };

console.log(`[pet] overlay booted ${viewport.width}x${viewport.height} @${viewport.dpr}x, pets=${pets.length}`);
