'use strict';

const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 설정 저장소. userData/settings.json 한 장이 전부다.
 *
 * 캐릭터 id 는 여기서 검증하지 않는다 — 목록을 아는 건 렌더러의 캐릭터
 * 레지스트리(src/renderer/characters/index.js)뿐이고, 메인에 목록을 한 벌 더
 * 두면 캐릭터를 추가할 때마다 두 군데를 고쳐야 한다. 메인은 형태만 본다.
 */

const DEFAULTS = {
  /** 화면에 띄울 캐릭터 id. 빈 배열이면 렌더러가 전부 띄운다. */
  characters: [],
  /** 도트 확대 배율 */
  scale: 1,
  /** 돌아다니는 속도 배수 */
  speed: 1,
  /** 가끔 혼잣말 하기 */
  chatter: true,
  /** 머리 위 이름표 보이기 */
  nameTags: true,
  /** 펫 클릭 막기 — 켜면 클릭이 전부 아래 창으로 통과한다 */
  noClick: false,
  /** 펫이 돌아다니는 띠의 너비 (작업영역 대비 비율) */
  width: 1,
  /** 그 띠를 화면 어디에 붙일지 */
  align: 'center',
  /** 로그인 시 자동 실행 (실제 적용은 OS 설정, 여기 값은 거울) */
  launchAtLogin: false,
};

const SCALES = [1, 2, 3];
const WIDTHS = [1, 0.5, 1 / 3];
const ALIGNS = ['left', 'center', 'right'];
const SPEEDS = [0.6, 1, 1.6];

let current = { ...DEFAULTS };
const listeners = new Set();

function file() {
  return path.join(app.getPath('userData'), 'settings.json');
}

/** 저장된 값이 깨져 있어도 앱이 뜨긴 해야 한다 — 이상한 값은 기본값으로 되돌린다. */
function sanitize(raw) {
  const out = { ...DEFAULTS };
  if (!raw || typeof raw !== 'object') return out;

  if (Array.isArray(raw.characters)) {
    out.characters = raw.characters.filter((id) => typeof id === 'string').slice(0, 20);
  }
  if (SCALES.includes(raw.scale)) out.scale = raw.scale;
  if (SPEEDS.includes(raw.speed)) out.speed = raw.speed;
  if (typeof raw.chatter === 'boolean') out.chatter = raw.chatter;
  if (typeof raw.nameTags === 'boolean') out.nameTags = raw.nameTags;
  if (typeof raw.noClick === 'boolean') out.noClick = raw.noClick;
  if (WIDTHS.some((w) => Math.abs(w - raw.width) < 1e-6)) out.width = raw.width;
  if (ALIGNS.includes(raw.align)) out.align = raw.align;
  if (typeof raw.launchAtLogin === 'boolean') out.launchAtLogin = raw.launchAtLogin;
  return out;
}

function load() {
  try {
    current = sanitize(JSON.parse(fs.readFileSync(file(), 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('[settings] 읽기 실패, 기본값으로 시작', err.message);
    current = { ...DEFAULTS };
  }
  // OS 의 로그인 항목이 진짜다 — 설정 파일과 어긋나면 OS 쪽을 따른다.
  current.launchAtLogin = Boolean(app.getLoginItemSettings().openAtLogin);
  return current;
}

function save() {
  const target = file();
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    // 쓰다 죽으면 설정이 통째로 날아가므로 임시 파일에 쓰고 갈아끼운다.
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(current, null, 2)}\n`);
    fs.renameSync(tmp, target);
  } catch (err) {
    console.warn('[settings] 저장 실패', err.message);
  }
}

function get() {
  return { ...current };
}

/** 바뀐 값만 넘겨도 된다. @returns 합쳐진 설정 */
function merge(patch) {
  const next = sanitize({ ...current, ...(patch || {}) });
  const changed = JSON.stringify(next) !== JSON.stringify(current);
  current = next;
  if (!changed) return get();

  if (app.getLoginItemSettings().openAtLogin !== current.launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: current.launchAtLogin });
  }
  save();
  for (const fn of listeners) fn(get());
  return get();
}

/** @returns 구독 해제 함수 */
function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

module.exports = { DEFAULTS, SCALES, SPEEDS, load, get, merge, onChange };
