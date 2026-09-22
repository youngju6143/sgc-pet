import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';
import { getCharacter } from '../src/renderer/characters/index.js';

/**
 * 메뉴바 아이콘을 캐릭터 도트에서 만든다.
 *   node tools/make-tray-icon.mjs [캐릭터id]
 *
 * macOS 템플릿 이미지라 색은 검정 하나뿐이고 알파만 의미가 있다 — 메뉴바
 * 밝기에 맞춰 OS 가 알아서 반전한다. 그래서 얼굴 무늬는 다 버리고 실루엣만
 * 남기고, 눈만 구멍으로 뚫어 준다. 안 뚫으면 그냥 검은 덩어리로 보인다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const ch = getCharacter(process.argv[2] || 'chodang');

/** 머리만 쓴다 — 전신을 22px 로 줄이면 뭉개져서 뭔지 알아볼 수 없다. */
function headRows() {
  const width = (row) => {
    const l = row.search(/[^.]/);
    return l < 0 ? 0 : [...row].reduce((n, c, i) => (c === '.' ? n : i), 0) - l + 1;
  };
  const eyeBottom = ch.eyes.left.y + ch.eyes.left.h;
  // 눈 아래에서 실루엣이 가장 좁아지는 곳 = 목
  let neck = eyeBottom;
  let min = Infinity;
  for (let y = eyeBottom + 2; y < Math.min(ch.torso.length, eyeBottom + 24); y++) {
    const w = width(ch.torso[y]);
    if (w < min) {
      min = w;
      neck = y;
    }
  }
  return ch.torso.slice(0, neck);
}

const rows = headRows();
const eyes = [ch.eyes.left, ch.eyes.right];

const box = (() => {
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  rows.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c === '.') return;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    });
  });
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
})();

/** @param {number} size 정사각 캔버스 한 변 (22 = 1x, 44 = 2x) */
function render(size) {
  const pad = Math.round(size * 0.09);
  const inner = size - pad * 2;
  const scale = Math.min(inner / box.w, inner / box.h);
  const w = Math.round(box.w * scale);
  const h = Math.round(box.h * scale);
  const ox = Math.round((size - w) / 2);
  const oy = Math.round((size - h) / 2);

  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // 최근접 샘플링 — 도트 그대로 줄인다
      const sx = box.x0 + Math.floor((x + 0.5) / scale);
      const sy = box.y0 + Math.floor((y + 0.5) / scale);
      const c = rows[sy]?.[sx];
      if (!c || c === '.') continue;
      const inEye = eyes.some((e) => sx >= e.x && sx < e.x + e.w && sy >= e.y && sy < e.y + e.h);
      if (inEye) continue; // 눈은 구멍으로 남긴다
      const i = ((oy + y) * size + ox + x) * 4;
      rgba[i + 3] = 255; // 검정 + 불투명. RGB 는 0 그대로.
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(root, 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'trayTemplate.png'), render(22));
fs.writeFileSync(path.join(outDir, 'trayTemplate@2x.png'), render(44));
console.log(`wrote assets/trayTemplate.png (+@2x) from ${ch.id} — 머리 ${box.w}x${box.h} 도트`);
