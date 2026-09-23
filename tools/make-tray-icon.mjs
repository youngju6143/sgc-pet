import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';

/**
 * 메뉴바 아이콘 — `ㅇㅅㅇ` 표정.
 *   node tools/make-tray-icon.mjs
 *
 * macOS 템플릿 이미지라 색은 의미가 없고 **알파만** 쓴다(메뉴바 밝기에 맞춰
 * OS 가 알아서 반전한다). 그래서 캐릭터 도트를 줄여 넣으면 눈·무늬가 다 뭉개져
 * 검은 덩어리가 된다 — 눈 두 개와 ㅅ 만 큼직하게 그리는 편이 훨씬 잘 읽힌다.
 *
 * 22pt 짜리 작은 그림이라 도형을 **슈퍼샘플링**해서 가장자리를 부드럽게 만든다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SS = 4; // 슈퍼샘플 배수

/** 22 기준 좌표. 실제 크기는 여기에 비례해서 키운다. */
const BASE = 22;
const EYE_R = 2.9;
const EYE_Y = 10.4;
const EYE_DX = 6.0; // 중심에서 좌우로
const NOSE_TOP = 7.6;
const NOSE_BOTTOM = 14.6;
const NOSE_HALF_W = 2.9;
const STROKE = 2.2;

const inCircle = (px, py, cx, cy, r) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

/** 선분(캡슐 모양)까지의 거리로 두께 있는 획을 그린다 */
function onSegment(px, py, x1, y1, x2, y2, thickness) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return (px - qx) ** 2 + (py - qy) ** 2 <= (thickness / 2) ** 2;
}

/** @param {number} size 정사각 캔버스 한 변 (22 = 1x, 44 = 2x) */
function render(size) {
  const k = size / BASE;
  const c = size / 2;
  const eyeR = EYE_R * k;
  const eyeY = EYE_Y * k;
  const eyeDx = EYE_DX * k;
  const apex = [c, NOSE_TOP * k];
  const left = [c - NOSE_HALF_W * k, NOSE_BOTTOM * k];
  const right = [c + NOSE_HALF_W * k, NOSE_BOTTOM * k];
  const stroke = STROKE * k;

  const covers = (px, py) =>
    inCircle(px, py, c - eyeDx, eyeY, eyeR) ||
    inCircle(px, py, c + eyeDx, eyeY, eyeR) ||
    onSegment(px, py, apex[0], apex[1], left[0], left[1], stroke) ||
    onSegment(px, py, apex[0], apex[1], right[0], right[1], stroke);

  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          if (covers(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hit++;
        }
      }
      if (!hit) continue;
      rgba[(y * size + x) * 4 + 3] = Math.round((hit / (SS * SS)) * 255); // 검정 + 알파
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(root, 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'trayTemplate.png'), render(BASE));
fs.writeFileSync(path.join(outDir, 'trayTemplate@2x.png'), render(BASE * 2));
console.log('wrote assets/trayTemplate.png (+@2x) — ㅇㅅㅇ');
