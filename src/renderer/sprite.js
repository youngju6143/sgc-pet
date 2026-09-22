'use strict';

/**
 * 문자열 비트맵 → 캔버스 래스터라이저.
 *
 * 프레임은 ['..oo..', '.owwo.', ...] 처럼 한 글자가 한 픽셀이고,
 * 글자는 팔레트 키다. 팔레트에 없는 키('.')는 투명.
 *
 * 성능: 프레임×팔레트 조합을 1배율 오프스크린 캔버스로 한 번만 굽고,
 * 그릴 때는 정수 배율 drawImage 만 한다. imageSmoothingEnabled=false 라
 * 확대해도 픽셀이 또렷하다.
 */

export function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

/** DOM 없이 동작한다 — 스프라이트 디버그용 PNG 생성 도구에서도 그대로 쓴다. */
export function frameToRGBA(rows, palette) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  const rgb = new Map();
  for (const [k, hex] of Object.entries(palette)) rgb.set(k, hexToRgb(hex));
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const c = rgb.get(row[x]);
      if (!c) continue;
      const i = (y * width + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

export function assertRectangular(rows, label) {
  const w = rows[0].length;
  rows.forEach((row, y) => {
    if (row.length !== w) {
      throw new Error(`${label}: row ${y} has width ${row.length}, expected ${w}`);
    }
  });
}

const bakery = new Map();

function bake(rows, palette, cacheKey) {
  let canvas = bakery.get(cacheKey);
  if (canvas) return canvas;
  const { width, height, data } = frameToRGBA(rows, palette);
  canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  c.putImageData(new ImageData(data, width, height), 0, 0);
  bakery.set(cacheKey, canvas);
  return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} rows      프레임 비트맵
 * @param {object}  palette    키 → '#rrggbb'
 * @param {object}  opts       { cacheKey, x, y, scale, flip }
 */
export function drawFrame(ctx, rows, palette, { cacheKey, x, y, scale = 1, flip = false, width, height }) {
  const canvas = bake(rows, palette, cacheKey);
  // width/height 를 주면 그 크기로 늘려 그린다 (착지 스쿼시). 정수 배율이 아니라
  // 픽셀 크기가 들쭉날쭉해지지만, 몇 프레임짜리 연출이라 오히려 찌그러져 보인다.
  const w = width ?? canvas.width * scale;
  const h = height ?? canvas.height * scale;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(Math.round(x) + w, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, 0, 0, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(canvas, Math.round(x), Math.round(y), w, h);
  }
}

export function clearSpriteCache() {
  bakery.clear();
}
