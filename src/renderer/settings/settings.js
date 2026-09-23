'use strict';

/**
 * 설정 창.
 * 캐릭터 목록은 레지스트리에서 직접 읽고, 미리보기도 오버레이와 같은
 * 스프라이트 코드로 그린다 — 설정 창에만 따로 그림을 두면 서로 어긋난다.
 */

import { CHARACTERS } from '../characters/index.js';
import { frameFor } from '../frames.js';
import { drawFrame } from '../sprite.js';

const api = window.settingsAPI;

const SCALE_CHOICES = [
  { value: 1, label: '기본', sub: '1배' },
  { value: 2, label: '크게', sub: '2배' },
  { value: 3, label: '아주 크게', sub: '3배' },
];
const SPEED_CHOICES = [
  { value: 0.6, label: '느긋', sub: '설렁설렁' },
  { value: 1, label: '보통', sub: '뽈뽈뽈' },
  { value: 1.6, label: '촐싹', sub: '부산하게' },
];
const WIDTH_CHOICES = [
  { value: 1, label: '전체', sub: '화면 끝까지' },
  { value: 0.5, label: '절반', sub: '1/2 너비' },
  { value: 1 / 3, label: '좁게', sub: '1/3 너비' },
];
const ALIGN_CHOICES = [
  { value: 'left', label: '왼쪽', sub: '좌측에 붙임' },
  { value: 'center', label: '가운데', sub: '중앙' },
  { value: 'right', label: '오른쪽', sub: '우측에 붙임' },
];

/** 저장된 설정. characters 가 비어 있으면 "전부"라는 뜻이다. */
let settings = {
  characters: [], scale: 1, speed: 1, chatter: true, nameTags: true, noClick: false,
  width: 1, align: 'center', display: null, launchAtLogin: false,
};

/** 지금 붙어 있는 모니터 목록 (메인이 알려준다) */
let displays = [];

const els = {
  characters: document.getElementById('characters'),
  scale: document.getElementById('scale'),
  speed: document.getElementById('speed'),
  width: document.getElementById('width'),
  align: document.getElementById('align'),
  displays: document.getElementById('displays'),
  nameTags: document.getElementById('nametags'),
  noClick: document.getElementById('noclick'),
  chatter: document.getElementById('chatter'),
  launch: document.getElementById('launch'),
};

/** 화면에 실제로 뜨는 캐릭터 id 집합 */
function enabledIds() {
  const known = new Set(CHARACTERS.map((c) => c.id));
  const picked = settings.characters.filter((id) => known.has(id));
  return new Set(picked.length ? picked : CHARACTERS.map((c) => c.id));
}

async function patch(next) {
  settings = (await api.set(next)) || { ...settings, ...next };
  render();
}

// --- 캐릭터 타일 -----------------------------------------------------------

const PREVIEW_SCALE = 1;
const previewHeight = Math.max(...CHARACTERS.map((c) => c.height)) * PREVIEW_SCALE;

function buildCharacters() {
  els.characters.replaceChildren(
    ...CHARACTERS.map((character) => {
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.type = 'button';
      tile.dataset.id = character.id;

      const canvas = document.createElement('canvas');
      canvas.width = character.width * PREVIEW_SCALE;
      canvas.height = previewHeight;
      // 키가 캐릭터마다 달라서 발끝을 바닥에 맞춘다 (오버레이와 같은 규칙)
      const frame = frameFor(character, 'idle', 0);
      const ctx = canvas.getContext('2d');
      drawFrame(ctx, frame.rows, character.palette, {
        cacheKey: `settings|${character.id}`,
        x: 0,
        y: previewHeight - character.height * PREVIEW_SCALE,
        scale: PREVIEW_SCALE,
      });

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = character.name;

      const check = document.createElement('span');
      check.className = 'check';
      check.textContent = '✓';

      tile.append(canvas, name, check);
      tile.addEventListener('click', () => toggleCharacter(character.id));
      return tile;
    }),
  );
}

function toggleCharacter(id) {
  const next = enabledIds();
  if (next.has(id)) {
    // 마지막 한 마리는 못 끈다 — 아무도 없는 오버레이는 고장처럼 보인다
    if (next.size === 1) return;
    next.delete(id);
  } else {
    next.add(id);
  }
  // 레지스트리 순서를 유지해서 저장한다
  patch({ characters: CHARACTERS.map((c) => c.id).filter((cid) => next.has(cid)) });
}

// --- 라디오 줄 -------------------------------------------------------------

function buildChoices(el, choices, key) {
  el.replaceChildren(
    ...choices.map((choice) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.type = 'button';
      button.dataset.value = String(choice.value);
      button.innerHTML = '';
      button.append(choice.label, Object.assign(document.createElement('small'), { textContent: choice.sub }));
      button.addEventListener('click', () => patch({ [key]: choice.value }));
      return button;
    }),
  );
}

// --- 모니터 ----------------------------------------------------------------

/**
 * 모니터는 개수가 그때그때 달라서(케이블을 꽂고 뽑는다) 목록을 다시 받아 그린다.
 * 한 대뿐이면 고를 게 없으니 섹션을 통째로 숨긴다.
 */
async function refreshDisplays() {
  displays = (await api.displays?.()) || [];
  const section = els.displays.closest('section');
  if (section) section.hidden = displays.length < 2;

  els.displays.replaceChildren(
    ...displays.map((display) => {
      const button = document.createElement('button');
      button.className = 'choice';
      button.type = 'button';
      button.dataset.id = String(display.id);
      const sub = `${display.width}×${display.height}${display.primary ? ' · 주 화면' : ''}`;
      button.append(display.label, Object.assign(document.createElement('small'), { textContent: sub }));
      // 주 디스플레이를 고르면 id 를 박지 않고 null 로 둔다 — 그래야 나중에
      // 주 화면이 바뀌어도 "지금 주 화면"을 따라간다.
      button.addEventListener('click', () => patch({ display: display.primary ? null : display.id }));
      return button;
    }),
  );
  render();
}

/** 지금 오버레이가 올라가 있는 화면 (설정값이 없거나 뽑힌 모니터면 주 화면) */
function activeDisplayId() {
  const picked = displays.find((d) => d.id === settings.display);
  return (picked || displays.find((d) => d.primary))?.id;
}

// --- 그리기 ----------------------------------------------------------------

function render() {
  const on = enabledIds();
  for (const tile of els.characters.children) {
    tile.setAttribute('aria-pressed', String(on.has(tile.dataset.id)));
  }
  for (const button of els.scale.children) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.value) === settings.scale));
  }
  for (const button of els.speed.children) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.value) === settings.speed));
  }
  for (const button of els.width.children) {
    button.setAttribute('aria-pressed', String(Math.abs(Number(button.dataset.value) - settings.width) < 1e-6));
  }
  for (const button of els.align.children) {
    button.setAttribute('aria-pressed', String(button.dataset.value === settings.align));
  }
  const active = activeDisplayId();
  for (const button of els.displays.children) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.id) === active));
  }
  els.nameTags.setAttribute('aria-pressed', String(settings.nameTags !== false));
  els.noClick.setAttribute('aria-pressed', String(Boolean(settings.noClick)));
  els.chatter.setAttribute('aria-pressed', String(settings.chatter));
  els.launch.setAttribute('aria-pressed', String(settings.launchAtLogin));
}

els.nameTags.addEventListener('click', () => patch({ nameTags: settings.nameTags === false }));
els.noClick.addEventListener('click', () => patch({ noClick: !settings.noClick }));
els.chatter.addEventListener('click', () => patch({ chatter: !settings.chatter }));
els.launch.addEventListener('click', () => patch({ launchAtLogin: !settings.launchAtLogin }));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') api.close();
});

buildCharacters();
buildChoices(els.scale, SCALE_CHOICES, 'scale');
buildChoices(els.speed, SPEED_CHOICES, 'speed');
buildChoices(els.width, WIDTH_CHOICES, 'width');
buildChoices(els.align, ALIGN_CHOICES, 'align');

// 설정 창을 보는 동안 모니터를 꽂거나 뽑을 수 있다 — 돌아올 때마다 다시 받는다
window.addEventListener('focus', refreshDisplays);

// 트레이 메뉴에서 바꾼 값도 따라간다
api.onChanged((next) => {
  settings = next;
  render();
});

settings = (await api.get()) || settings;
await refreshDisplays();
render();
