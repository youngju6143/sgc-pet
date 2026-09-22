import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bitmap } from './png.mjs';
import { ANIMATIONS, STATES, frameFor } from '../src/renderer/frames.js';
import { CHARACTERS } from '../src/renderer/characters/index.js';

/**
 * 스프라이트 시트를 PNG 로 굽는다 (브라우저 없이 도트 확인용).
 *   node tools/render-sprites.mjs [scale]
 * 행 = 캐릭터×상태, 열 = 프레임.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCALE = Number(process.argv[2]) || 5;
const PAD = 8;

const cellW = Math.max(...CHARACTERS.map((c) => c.width)) * SCALE + PAD;
const cellH = Math.max(...CHARACTERS.map((c) => c.height)) * SCALE + PAD;
const maxFrames = Math.max(...STATES.map((s) => ANIMATIONS[s].frames.length));

const lines = [];
for (const ch of CHARACTERS) for (const state of STATES) lines.push({ ch, state });

const bmp = new Bitmap(maxFrames * cellW + PAD, lines.length * cellH + PAD);

lines.forEach((line, r) => {
  const anim = ANIMATIONS[line.state];
  const oy = PAD + r * cellH;
  for (let i = 0; i < anim.frames.length; i++) {
    const frame = frameFor(line.ch, line.state, i);
    bmp.blit(frame.rows, line.ch.palette, PAD + i * cellW, oy + frame.dy * SCALE, SCALE);
  }
});

const out = path.join(root, 'tools', 'sprite-sheet.png');
fs.writeFileSync(out, bmp.toPNG());
console.log('wrote', out, `${bmp.width}x${bmp.height}`);
lines.forEach((l, i) => console.log(`row ${String(i).padStart(2)}: ${l.ch.id} / ${l.state}`));
