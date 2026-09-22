import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePNG } from './png.mjs';
import { getCharacter } from '../src/renderer/characters/index.js';
import { frameFor } from '../src/renderer/frames.js';
import { frameToRGBA } from '../src/renderer/sprite.js';

/**
 * 앱 아이콘(1024px)을 캐릭터 도트에서 만든다.
 *   node tools/make-app-icon.mjs [캐릭터id]
 *
 * 모서리는 **슈퍼샘플링**으로 둥글게 깎고, 캐릭터는 **정수 배율 최근접**으로
 * 얹는다. 전체를 한 번에 축소하면 모서리는 매끈해지지만 도트가 뭉개진다 —
 * 배경만 부드럽게, 도트는 또렷하게 가는 게 요령이다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SIZE = 1024;
const RADIUS = SIZE * 0.2237; // macOS 스퀘어클 근사
const SS = 4; // 모서리 계산용 슈퍼샘플 배수
/** 일러스트 배경과 같은 계열의 어두운 남보라 — 도트가 어느 배경에서도 뜬다 */
const BG_TOP = [0x3a, 0x33, 0x44];
const BG_BOTTOM = [0x22, 0x20, 0x2c];

const ch = getCharacter(process.argv[2] || 'chodang');

/** 둥근 사각형 안쪽이면 1, 모서리 밖이면 0, 경계는 0~1 (슈퍼샘플 평균) */
function coverage(x, y) {
  let hit = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS;
      const py = y + (sy + 0.5) / SS;
      const dx = Math.max(RADIUS - px, px - (SIZE - RADIUS), 0);
      const dy = Math.max(RADIUS - py, py - (SIZE - RADIUS), 0);
      if (dx * dx + dy * dy <= RADIUS * RADIUS) hit++;
    }
  }
  return hit / (SS * SS);
}

const rgba = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  const t = y / (SIZE - 1);
  const bg = BG_TOP.map((c, i) => Math.round(c + (BG_BOTTOM[i] - c) * t));
  for (let x = 0; x < SIZE; x++) {
    const a = coverage(x, y);
    if (a <= 0) continue;
    const i = (y * SIZE + x) * 4;
    rgba[i] = bg[0];
    rgba[i + 1] = bg[1];
    rgba[i + 2] = bg[2];
    rgba[i + 3] = Math.round(a * 255);
  }
}

// 캐릭터는 여백을 남기고 정수 배율로 최대한 크게
const frame = frameFor(ch, 'idle', 0);
const sprite = frameToRGBA(frame.rows, ch.palette);
const inner = SIZE * 0.72;
const scale = Math.max(1, Math.floor(Math.min(inner / sprite.width, inner / sprite.height)));
const ox = Math.round((SIZE - sprite.width * scale) / 2);
const oy = Math.round((SIZE - sprite.height * scale) / 2);

for (let y = 0; y < sprite.height * scale; y++) {
  for (let x = 0; x < sprite.width * scale; x++) {
    const s = (((y / scale) | 0) * sprite.width + ((x / scale) | 0)) * 4;
    if (!sprite.data[s + 3]) continue;
    const d = ((oy + y) * SIZE + ox + x) * 4;
    rgba[d] = sprite.data[s];
    rgba[d + 1] = sprite.data[s + 1];
    rgba[d + 2] = sprite.data[s + 2];
    rgba[d + 3] = 255;
  }
}

const out = path.join(root, 'assets', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, encodePNG(SIZE, SIZE, rgba));
console.log(`wrote assets/icon.png — ${ch.id} ${sprite.width}x${sprite.height} ×${scale}`);
