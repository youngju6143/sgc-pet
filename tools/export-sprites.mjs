import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from './png.mjs';
import { ANIMATIONS, STATES, frameFor } from '../src/renderer/frames.js';
import { CHARACTERS } from '../src/renderer/characters/index.js';

/**
 * 지금 캐릭터 디자인을 PNG 로 내보낸다.
 *   npm run export
 *
 * characters/*.js 가 디자인의 원본(문자열 비트맵 + 팔레트)이지만, 그것만으로는
 * 눈으로 확인할 수가 없다. 여기서 뽑은 PNG 는 저장소에 같이 올려서
 * 나중에 "그때 어떻게 생겼더라" 를 바로 볼 수 있게 한다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'art');
const SCALE = 4;
const PAD = 10;
const BG = [26, 26, 32, 255];

fs.mkdirSync(outDir, { recursive: true });

/** 캐릭터 한 마리 — 서 있는 모습 */
function exportPortrait(ch) {
  const frame = frameFor(ch, 'idle', 0);
  const bmp = new Bitmap(ch.width * SCALE + PAD * 2, ch.height * SCALE + PAD * 2, BG);
  bmp.blit(frame.rows, ch.palette, PAD, PAD, SCALE);
  fs.writeFileSync(path.join(outDir, `${ch.id}.png`), bmp.toPNG());
}

/** 캐릭터 한 마리 — 상태별 전체 프레임 */
function exportStates(ch) {
  const cols = Math.max(...STATES.map((s) => ANIMATIONS[s].frames.length));
  const cw = ch.width * SCALE + PAD;
  const chh = ch.height * SCALE + PAD;
  const bmp = new Bitmap(cols * cw + PAD, STATES.length * chh + PAD, BG);
  STATES.forEach((state, r) => {
    const anim = ANIMATIONS[state];
    for (let i = 0; i < anim.frames.length; i++) {
      const frame = frameFor(ch, state, i, state === 'sleep');
      bmp.blit(frame.rows, ch.palette, PAD + i * cw, PAD + r * chh + frame.dy * SCALE, SCALE);
    }
  });
  fs.writeFileSync(path.join(outDir, `${ch.id}-states.png`), bmp.toPNG());
}

/** 다섯 마리 한 줄 — README 용 */
function exportLineup() {
  const maxH = Math.max(...CHARACTERS.map((c) => c.height));
  const width = CHARACTERS.reduce((s, c) => s + c.width * SCALE + PAD, PAD);
  const bmp = new Bitmap(width, maxH * SCALE + PAD * 2, BG);
  let x = PAD;
  for (const ch of CHARACTERS) {
    const frame = frameFor(ch, 'idle', 0);
    // 바닥 정렬 — 화면에서 보이는 그대로
    bmp.blit(frame.rows, ch.palette, x, PAD + (maxH - ch.height) * SCALE, SCALE);
    x += ch.width * SCALE + PAD;
  }
  fs.writeFileSync(path.join(outDir, 'lineup.png'), bmp.toPNG());
}

/** 팔레트까지 포함한 텍스트 기록 — 색을 다시 찾을 때 */
function exportPalettes() {
  const lines = CHARACTERS.map((ch) => {
    const colors = Object.entries(ch.palette).map(([k, v]) => `  ${k} ${v}`).join('\n');
    return `${ch.name} (${ch.id}) ${ch.width}x${ch.height}\n${colors}`;
  });
  fs.writeFileSync(path.join(outDir, 'palettes.txt'), lines.join('\n\n') + '\n');
}

for (const ch of CHARACTERS) {
  exportPortrait(ch);
  exportStates(ch);
}
exportLineup();
exportPalettes();

console.log(`art/ 에 내보냄 — ${CHARACTERS.length}종 × (초상 + 상태시트) + lineup.png + palettes.txt`);
