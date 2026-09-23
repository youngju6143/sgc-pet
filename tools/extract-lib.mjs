import fs from 'node:fs';
import { PNG } from 'pngjs';

/** 원본 도트 PNG → 문자열 비트맵 + 팔레트 추출 (빌드타임 도구). */

const looksBlank = (c) => c[3] < 32 || (c[0] > 245 && c[1] > 245 && c[2] > 245);

/**
 * 배경은 "흰색/투명"이 아니라 **가장자리에서 흘러 들어올 수 있는 흰색/투명**이다.
 * 단순 색 판정으로 하면 캐릭터 안쪽의 흰 하이라이트(구라베 볼 등)까지 뚫려서
 * 투명 구멍이 생기고, 화면에서는 검은 얼룩처럼 보인다.
 */
function floodBackground(width, height, at) {
  const bg = new Uint8Array(width * height);
  const queue = [];
  const push = (x, y) => {
    const i = width * y + x;
    if (bg[i] || !looksBlank(at(x, y))) return;
    bg[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
  while (queue.length) {
    const i = queue.pop();
    const x = i % width, y = (i / width) | 0;
    if (x > 0) push(x - 1, y);
    if (x < width - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < height - 1) push(x, y + 1);
  }
  return bg;
}

export function loadImage(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = png;
  const at = (x, y) => { const i = (width * y + x) << 2; return [data[i], data[i+1], data[i+2], data[i+3]]; };
  const bg = floodBackground(width, height, at);
  const isBg = (x, y) => bg[width * y + x] === 1;
  return { width, height, data, at, isBg };
}
export const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];

export function boundingBox(img) {
  let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    if (img.isBg(x, y)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 어두운 획의 가로 런 길이 최빈값 = 원본 1픽셀 크기 */
export function nativeBlockSize(img, bb) {
  const dark = (x, y) => { const c = img.at(x, y); return c[3] > 128 && luma(c) < 120; };
  const runs = new Map();
  const stride = Math.max(1, Math.floor(bb.h / 100));
  for (let y = bb.y0; y <= bb.y1; y += stride) {
    let r = 0;
    for (let x = bb.x0; x <= bb.x1; x++) {
      if (dark(x, y)) r++;
      else { if (r > 0 && r < 60) runs.set(r, (runs.get(r) || 0) + 1); r = 0; }
    }
  }
  return [...runs].sort((a, b) => b[1] - a[1])[0][0];
}

/** 블록 중심 근처 median 샘플 — 업스케일 보간을 걷어내고 원본색을 복원 */
export function sampleGrid(img, bb, GW, GH) {
  const bw = bb.w / GW, bh = bb.h / GH;
  const rad = Math.max(1, Math.floor(Math.min(bw, bh) * 0.2));
  const grid = [];
  for (let gy = 0; gy < GH; gy++) {
    const row = [];
    for (let gx = 0; gx < GW; gx++) {
      const cx = Math.round(bb.x0 + (gx + 0.5) * bw);
      const cy = Math.round(bb.y0 + (gy + 0.5) * bh);
      const acc = [];
      let bgVotes = 0;
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        const sx = Math.min(img.width - 1, Math.max(0, cx + dx));
        const sy = Math.min(img.height - 1, Math.max(0, cy + dy));
        acc.push(img.at(sx, sy));
        if (img.isBg(sx, sy)) bgVotes++;
      }
      const med = (k) => acc.map((c) => c[k]).sort((a, b) => a - b)[Math.floor(acc.length / 2)];
      const c = [med(0), med(1), med(2), med(3)];
      row.push(bgVotes * 2 > acc.length ? null : c);
    }
    grid.push(row);
  }
  return grid;
}

const d2 = (a, b) => (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;

/**
 * 색 양자화. 가장 어두운 색(외곽선)은 반드시 독립 클러스터로 남긴다 —
 * 외곽선이 몸색에 흡수되면 도트가 전부 뭉개진다.
 */
export function quantize(grid, maxColors = 7) {
  const pts = [];
  for (const row of grid) for (const c of row) if (c) pts.push(c);
  let darkest = pts[0];
  for (const c of pts) if (luma(c) < luma(darkest)) darkest = c;

  // 볼터치는 면적이 작아 빈도로는 절대 안 잡힌다 — 따로 고정하지 않으면
  // 구라베·장폰주 볼이 살색에 흡수돼서 사라진다.
  // 분홍은 "R 만 높고 G·B 는 서로 비슷하다". 주황색 몸통(G≫B)과 이걸로 구분한다.
  const tally = new Map();
  for (const c of pts) {
    const k = c.join(',');
    const e = tally.get(k) || { c, n: 0 };
    e.n++;
    tally.set(k, e);
  }
  let blush = null, blushScore = 45;
  for (const { c, n } of tally.values()) {
    if (n < 3 || luma(c) < 160) continue;
    if (Math.abs(c[1] - c[2]) > 28) continue; // 주황/살색 배제
    const score = c[0] - c[1];
    if (score > blushScore) { blushScore = score; blush = c; }
  }

  // farthest-point 로 초기 중심 잡기 (외곽선·볼터치는 고정)
  const centers = blush ? [darkest, blush] : [darkest];
  const fixed = centers.length;
  while (centers.length < maxColors) {
    let best = null, bd = -1;
    for (const p of pts) {
      const d = Math.min(...centers.map((c) => d2(c, p)));
      if (d > bd) { bd = d; best = p; }
    }
    if (bd < 400) break;
    centers.push(best);
  }
  // 로이드 반복 (0번 중심 = 외곽선은 고정)
  for (let it = 0; it < 20; it++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let b = 0, bd = Infinity;
      centers.forEach((c, i) => { const d = d2(c, p); if (d < bd) { bd = d; b = i; } });
      sum[b][0] += p[0]; sum[b][1] += p[1]; sum[b][2] += p[2]; sum[b][3]++;
    }
    for (let i = fixed; i < centers.length; i++) {
      if (sum[i][3]) centers[i] = [0, 1, 2].map((k) => Math.round(sum[i][k] / sum[i][3]));
    }
  }
  // 너무 가까운 클러스터는 합친다 — 외곽선이 두 색으로 쪼개지면
  // 눈 검출도 깨지고 팔레트 슬롯도 낭비된다.
  const merged = [];
  const tight = new Set();
  centers.forEach((c, i) => {
    if (i >= fixed && merged.some((m) => d2(m, c) < 700)) return;
    // 볼터치는 면적이 작은데 주변 살색과 가까워서, 반경 제한을 안 걸면
    // 주둥이 전체를 빨아들인다. 아주 가까운 픽셀만 받게 한다.
    if (blush && c === blush) tight.add(merged.length);
    merged.push(c);
  });
  return { centers: merged, tight };
}

/** 반경 제한이 걸린 클러스터가 픽셀을 가져갈 수 있는 최대 거리 */
const TIGHT_MAX = 520;

export const KEYS = 'abcdefghijklmnop';
export const hex = (c) => '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');

export function mapToKeys(grid, centers, tight = new Set()) {
  return grid.map((row) => row.map((c) => {
    if (!c) return '.';
    let best = -1, bd = Infinity;
    let loose = -1, ld = Infinity;
    centers.forEach((p, i) => {
      const d = d2(p, c);
      if (d < bd) { bd = d; best = i; }
      if (!tight.has(i) && d < ld) { ld = d; loose = i; }
    });
    if (tight.has(best) && bd > TIGHT_MAX && loose >= 0) best = loose;
    return KEYS[best];
  }).join(''));
}

// ---------------------------------------------------------------------------
// 구조 검출 — 다리/눈 위치를 원본에서 자동으로 찾는다
// ---------------------------------------------------------------------------

/** 한 행에서 불투명 구간(run)들을 뽑는다 */
function runsOf(row) {
  const out = [];
  let start = -1;
  for (let x = 0; x <= row.length; x++) {
    const solid = x < row.length && row[x] !== '.';
    if (solid && start < 0) start = x;
    if (!solid && start >= 0) { out.push([start, x - 1]); start = -1; }
  }
  return out;
}

/**
 * 아래에서부터 올라가며 실루엣이 좌우 둘로 갈라지는 구간 = 다리.
 * @returns {{top:number, left:[number,number], right:[number,number]}|null}
 */
export function detectLegs(rows) {
  let top = -1;
  let left = null, right = null;
  for (let y = rows.length - 1; y >= 0; y--) {
    const r = runsOf(rows[y]);
    if (r.length === 2) {
      top = y;
      left = r[0];
      right = r[1];
    } else if (top >= 0) {
      break; // 갈라진 구간이 끝났다
    }
  }
  if (top < 0 || rows.length - top < 2) return null;
  return { top, left, right };
}

/** 투명과 맞닿지 않은(=안쪽) 어두운 픽셀 덩어리들 — 눈/코/입 후보 */
export function enclosedDarkComponents(rows, darkKey) {
  const H = rows.length, W = rows[0].length;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] !== '.';
  const inner = (x, y) =>
    rows[y][x] === darkKey && solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1);

  const seen = Array.from({ length: H }, () => new Array(W).fill(false));
  const comps = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen[y][x] || !inner(x, y)) continue;
    const stack = [[x, y]];
    let x0 = x, x1 = x, y0 = y, y1 = y, area = 0;
    seen[y][x] = true;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      area++;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx;
      if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny][nx] || !inner(nx, ny)) continue;
        seen[ny][nx] = true;
        stack.push([nx, ny]);
      }
    }
    comps.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area });
  }
  return comps;
}

/** 좌우 대칭으로 짝이 맞는 두 덩어리 = 눈 */
export function detectEyes(rows, darkKey) {
  const W = rows[0].length, H = rows.length;
  const comps = enclosedDarkComponents(rows, darkKey)
    .filter((c) => c.area >= 2 && c.area <= 60 && c.y < H * 0.75);
  let best = null;
  for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
    const a = comps[i], b = comps[j];
    const [L, R] = a.x < b.x ? [a, b] : [b, a];
    const lc = L.x + L.w / 2, rc = R.x + R.w / 2;
    if (lc >= W / 2 || rc <= W / 2) continue;               // 중앙을 사이에 두고 있어야 한다
    if (Math.abs(L.y - R.y) > 1) continue;                  // 같은 높이
    if (Math.abs(L.area - R.area) > Math.max(2, L.area * 0.6)) continue;
    const symmetry = Math.abs((W - rc) - lc);
    const score = L.area + R.area - symmetry * 3;
    if (!best || score > best.score) best = { score, left: L, right: R };
  }
  return best ? { left: best.left, right: best.right } : null;
}

/**
 * 한쪽 다리를 한 칸 들어올린 프레임을 만든다.
 * 해당 열 범위만 위로 1행 밀고(다리가 몸에 붙은 채 짧아진다) 좌우로 dx 만큼 옮긴다.
 */
export function liftLeg(rows, legs, side, dx) {
  const [c0, c1] = legs[side];
  const W = rows[0].length;
  const out = rows.map((r) => r.split(''));
  const span = [];
  for (let y = legs.top; y < rows.length; y++) {
    span.push(rows[y].slice(c0, c1 + 1));
    for (let x = c0; x <= c1; x++) out[y][x] = '.';
  }
  for (let i = 0; i < span.length - 1; i++) {
    const y = legs.top + i;
    const src = span[i + 1];
    for (let k = 0; k < src.length; k++) {
      const x = c0 + k + dx;
      if (src[k] === '.' || x < 0 || x >= W) continue;
      out[y][x] = src[k];
    }
  }
  return out.map((r) => r.join(''));
}

/** 잘린 가장자리를 캐릭터 자기 외곽선 색으로 막는다 (앉은 자세 만들 때 씀) */
export function closeOutline(rows, outlineKey, diagonal = false) {
  const H = rows.length, W = rows[0].length;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && rows[y][x] !== '.';
  const offsets = diagonal
    ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]
    : [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return rows.map((row, y) => row.split('').map((c, x) => {
    if (c === '.' || c === outlineKey) return c;
    for (const [dx, dy] of offsets) if (!solid(x + dx, y + dy)) return outlineKey;
    return c;
  }).join(''));
}

/** 눈 주변 고리에서 가장 흔한 색 = 눈을 지울 때 채울 얼굴색 */
export function faceKeyAround(rows, box, outlineKey) {
  const counts = new Map();
  for (let y = box.y - 1; y <= box.y + box.h; y++) {
    for (let x = box.x - 1; x <= box.x + box.w; x++) {
      if (y >= box.y && y < box.y + box.h && x >= box.x && x < box.x + box.w) continue;
      const c = rows[y] && rows[y][x];
      if (!c || c === '.' || c === outlineKey) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : outlineKey;
}

// ---------------------------------------------------------------------------
// 얼굴 패치 — 눈은 자동 추출로 대칭·스타일을 맞출 수 없어서 직접 찍는다
// ---------------------------------------------------------------------------

/**
 * E = 눈동자(외곽선 색), H = 안광(밝은색), . = 건드리지 않음
 *
 * 안광은 **오른쪽**에 둔다. 스프라이트는 기본이 오른쪽을 보는 상태이고
 * 왼쪽으로 갈 때 통째로 좌우 반전되는데, 안광이 왼쪽에 있으면 시선이
 * 이동 방향과 계속 반대로 읽힌다.
 */
export const EYE_STYLES = {
  // 초당·라베·난이 공통. 세로보다 가로가 살짝 긴 또렷한 눈, 하이라이트 없음.
  plain: [
    '.EEEE.',
    'EEEEEE',
    'EEEEEE',
    'EEEEEE',
    '.EEEE.',
  ],
  // 장폰주. 위가 납작하고 아래가 둥근 반달 + 안광.
  // 윗변을 꽉 채우면 눈썹처럼 보여서 사나워진다 — 모서리를 깎고 안광을 키웠다.
  crescent: [
    'EEEEEEEE',
    'EEEEEHHE',
    'EEEEEHHE',
    'EEEEEEEE',
    '.EEEEHE.',
    '..EEEE..',
  ],
  // 송몽숙. 큰 안광 + 작은 안광으로 초롱초롱하게.
  sparkle: [
    '..EEE..',
    '.EEEEE.',
    'EEEEHHE',
    'EEEEHHE',
    'EEEEEEE',
    'EEHEEEE',
    '.EEEEE.',
    '..EEE..',
  ],
};

/**
 * 장폰주 이마 무늬 — 일러스트엔 눈 위에 둥근 주황 무늬가 한 쌍 있는데,
 * 원본 도트 PNG 에는 그 자리가 밋밋한 양털 그늘로만 남아 있다. 눈처럼 다시 찍는다.
 */
export const BROW_STYLES = {
  /** 강초당 눈썹 — 테두리 없는 둥근 패치 (검은 머리가 알아서 테두리 역할을 한다) */
  bar: [
    '..RRRRRRR..',
    '.RRRRRRRRR.',
    'RRRRRRRRRRR',
    'RRRRRRRRRRR',
    '.RRRRRRRRR.',
    '..RRRRRRR..',
  ],
  /** 구라베 눈썹 — 테두리 있는 큰 타원 */
  oval: [
    '...EEEEEEE...',
    '..ERRRRRRRE..',
    '.ERRRRRRRRRE.',
    'ERRRRRRRRRRRE',
    'ERRRRRRRRRRRE',
    '.ERRRRRRRRRE.',
    '..ERRRRRRRE..',
    '...EEEEEEE...',
  ],
  /** 장폰주 이마 무늬 — 테두리 있는 통통한 타원 */
  patch: [
    '..EEEEEEE..',
    '.ERRRRRRRE.',
    'ERRRRRRRRRE',
    'ERRRRRRRRRE',
    '.ERRRRRRRE.',
    '..EEEEEEE..',
  ],
  /**
   * 망난이 눈두덩 — 안쪽 끝이 내려앉아 살짝 찌푸린 눈매. 두께는 원본과 같다.
   * 기울기는 그림 자체에 넣었다(tilt 파라미터로 칸을 밀면 계단에 구멍이 생긴다).
   * 오른쪽은 stampPair 가 거울상으로 찍어 준다.
   */
  lid: [
    '.EEEEE.......',
    'ERRRRREEEE...',
    'ERRRRRRRRREE.',
    'ERRRRRRRRRRRE',
    'ERRRRRRRRRRRE',
    'ERRRRRRRRRRRE',
    '.EERRRRRRRRRE',
    '...EEERRRRRRE',
    '......EEEEEE.',
  ],
};

/** 볼터치 — 얼굴색 위에만 얹는다 */
export const BLUSH = [
  '..BBBB..',
  '.BBBBBB.',
  'BBBBBBBB',
  '.BBBBBB.',
  '..BBBB..',
];

/**
 * @param {boolean} mirror 배치를 좌우 대칭으로 잡는다. 짝수 폭이면 중심이 반 칸
 *   어긋나므로 오른쪽 눈은 이걸로 찍어야 두 눈이 얼굴 중심에 정확히 대칭이 된다.
 * @param {boolean} flipArt 그림 자체도 뒤집을지. 눈은 false — 안광이 좌우로
 *   갈라지면 데칼코마니처럼 보인다.
 */
function stampAt(grid, art, x0, y0, map, only = null) {
  for (let y = 0; y < art.length; y++) {
    for (let x = 0; x < art[y].length; x++) {
      const key = map[art[y][x]];
      if (!key) continue;
      const gy = y0 + y, gx = x0 + x;
      if (gy < 0 || gx < 0 || gy >= grid.length || gx >= grid[0].length) continue;
      if (only && !only.has(grid[gy][gx])) continue;
      grid[gy][gx] = key;
    }
  }
  return { x: x0, y: y0, w: art[0].length, h: art.length };
}

function fillRect(grid, x0, y0, w, h, key) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (y < 0 || x < 0 || y >= grid.length || x >= grid[0].length) continue;
      grid[y][x] = key;
    }
  }
}

/**
 * 검출된 눈 자리를 지우고 좌우 대칭으로 다시 찍는다.
 * 자동 추출은 눈 모양·크기가 좌우로 안 맞는데(원본 도트 자체가 그렇다),
 * 화면에서는 그게 바로 눈에 띈다.
 */
/**
 * 눈높이에서 잰 **얼굴 가로 중심**.
 * 스프라이트 중심을 쓰면 구라베처럼 꼬리가 삐져나온 캐릭터는 얼굴 중심이
 * 2~3칸 어긋나서 눈이 한쪽으로 쏠린다. 한 행만 보면 귀·뿔 같은 돌출에
 * 휘둘리므로 눈 높이 앞뒤 몇 행의 중앙값을 쓴다.
 */
/**
 * 얼굴에 얹는 무늬(볼터치·이마 무늬)를 좌우 대칭으로 한 쌍 찍는다.
 * @param {number} cx 얼굴 중심에서 좌우로 떨어진 거리(칸)
 * @param {Set<string>} only 이 색 위에만 얹는다 — 외곽선·눈을 덮지 않게
 */
/** 무늬를 다시 찍기 전에 그 자리를 얼굴색으로 밀어 둔다 (좌우 한 쌍) */
function clearPair(grid, faceCx, cx, cy, { w, h }, fill) {
  const width = grid[0].length;
  const leftX0 = Math.round(width / 2 - cx - w / 2);
  const rightX0 = width - leftX0 - w;
  const y0 = Math.round(cy) - (h >> 1); // dy 가 소수여도 행 인덱스는 정수여야 한다
  for (let j = 0; j < h; j++) {
    const y = y0 + j;
    if (y < 0 || y >= grid.length) continue;
    for (let i = 0; i < w; i++) {
      for (const x of [leftX0 + i, rightX0 + i]) {
        if (x < 0 || x >= grid[0].length) continue;
        if (grid[y][x] !== '.') grid[y][x] = fill; // 투명은 그대로 — 실루엣을 안 넓힌다
      }
    }
  }
}

function stampPair(grid, art, faceCx, cx, cy, map, only, tilt = 0, avoid = null) {
  const w = art[0].length;
  const h = art.length;
  // 미러 기준은 **얼굴 중심**이다 — 눈을 찍는 기준과 같아야 한다.
  // 스프라이트 중심을 쓰면 꼬리처럼 한쪽으로 삐져나온 부위가 있는 캐릭터에서
  // 눈은 얼굴 한가운데인데 볼터치·무늬만 옆으로 밀린다(구라베는 2.5칸).
  // 좌우 반전은 pet.js 의 flipShift 가 얼굴 중심 기준으로 보정하므로,
  // 전부 얼굴 중심에 맞춰 두는 쪽이 앞뒤가 맞는다.
  const leftX0 = Math.round(faceCx - cx - w / 2);
  const rightX0 = Math.round(2 * faceCx) - (leftX0 + w - 1); // 왼쪽 상자 오른끝의 거울상
  const y0 = Math.round(cy) - (h >> 1); // dy 가 소수여도 행 인덱스는 정수여야 한다
  const paintable = (x, y) => {
    if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false;
    const c = grid[y][x];
    if (c === '.') return false; // 투명 위에 찍으면 실루엣이 넓어진다
    if (avoid && avoid.has(c)) return false; // 눈·코·입(외곽선 색)은 절대 안 덮는다
    return !only || only.has(c);
  };
  // 안쪽(얼굴 중심 쪽)으로 갈수록 내려간다 = 살짝 찌푸린 눈매.
  // 오른쪽 무늬는 거울상이라 같은 값을 쓰면 저절로 반대로 기운다.
  const drop = (i) => Math.round((tilt * i) / (w - 1));

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const key = map[art[j][i]];
      if (!key) continue;
      const y = y0 + j + drop(i);
      const lx = leftX0 + i;
      const rx = rightX0 + (w - 1 - i); // 짝이 되는 칸
      // 한쪽만 칠할 수 있으면 둘 다 건너뛴다 — 원본 도트가 좌우로 살짝 어긋나
      // 있어서(장폰주 앞머리) 그냥 찍으면 한쪽 무늬만 깎여 나간다.
      if (!paintable(lx, y) || !paintable(rx, y)) continue;
      grid[y][lx] = key;
      grid[y][rx] = key;
    }
  }
}

/**
 * 입(코·입 덩어리)을 세로로 옮긴다.
 * 눈은 다시 찍지만 입은 원본 도트 그대로 쓰는데, 캐릭터에 따라 눈과의 간격이
 * 어긋나 입만 처져 보인다. 눈 아래 얼굴 한가운데 상자에서 **얼굴색이 아닌 칸**만
 * 통째로 집어 옮긴다 — 볼터치·외곽선은 상자 밖이라 안 딸려 온다.
 */
export function moveMouth(rows, { eyes, faceCx, fill, dy, halfWidth = 6, depth = 8 }) {
  if (!dy) return rows;
  const grid = rows.map((r) => r.split(''));
  const x0 = Math.max(0, Math.round(faceCx) - halfWidth);
  const x1 = Math.min(grid[0].length - 1, Math.round(faceCx) + halfWidth);
  const y0 = eyes.left.y + eyes.left.h;
  const y1 = Math.min(grid.length - 1, y0 + depth);

  const cells = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const key = grid[y][x];
      if (key === '.' || key === fill) continue;
      cells.push({ x, y, key });
    }
  }
  // 먼저 전부 지우고 나서 옮겨 찍는다 — 한 칸씩 옮기면 자기 꼬리를 지운다.
  for (const c of cells) grid[c.y][c.x] = fill;
  for (const c of cells) {
    const y = c.y + dy;
    if (y >= 0 && y < grid.length) grid[y][c.x] = c.key;
  }
  return grid.map((r) => r.join(''));
}

export function faceCenterX(rows, cy) {
  const centers = [];
  for (let y = Math.max(0, cy - 3); y <= Math.min(rows.length - 1, cy + 3); y++) {
    const row = rows[y];
    let l = -1, r = -1;
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '.') continue;
      if (l < 0) l = x;
      r = x;
    }
    if (l >= 0) centers.push((l + r) / 2);
  }
  if (!centers.length) return null;
  centers.sort((a, b) => a - b);
  return centers[centers.length >> 1];
}

export function patchFace(rows, opts) {
  const { eyes, outline, style = 'plain', eyeDy = 0, eyeSpread = 0, blush, brow } = opts;
  const grid = rows.map((r) => r.split(''));
  const art = EYE_STYLES[style];
  const width = grid[0].length;

  // 기존 눈 지우기 (여유 1px)
  for (const box of [eyes.left, eyes.right]) {
    fillRect(grid, box.x - 1, box.y - 1, box.w + 2, box.h + 2, eyes.fill);
  }

  const lc = eyes.left.x + eyes.left.w / 2;
  const rc = eyes.right.x + eyes.right.w / 2;
  const dx = (rc - lc) / 2;
  const cy = Math.round(eyes.left.y + eyes.left.h / 2) + eyeDy;

  /**
   * 눈은 **얼굴 중심**에 대해 정확히 대칭으로 찍는다.
   * 검출된 두 눈의 중점을 쓰면 원본 도트의 오차가 그대로 남아(장폰주는 2.5px)
   * 좌우 반전할 때마다 눈이 옆으로 튄다. 대칭으로 찍으면 반전이 순수 미러링이
   * 되고 눈은 제자리에 있는 것처럼 보인다.
   */
  const faceCx = faceCenterX(rows, cy) ?? width / 2;
  const map = { E: outline, H: opts.highlight || eyes.fill };
  const w = art[0].length;
  const h = art.length;
  // eyeSpread 는 반올림 뒤에 더한다 — dx 에 더하면 반올림이 겹쳐 2칸씩 벌어진다.
  const leftX0 = Math.round(faceCx - dx - w / 2) - eyeSpread;
  const rightX0 = Math.round(2 * faceCx) - (leftX0 + w - 1); // 왼쪽 상자 오른끝의 거울상
  const y0 = Math.round(cy) - (h >> 1); // dy 가 소수여도 행 인덱스는 정수여야 한다

  // 두 눈은 같은 그림이다 — 뒤집으면 안광이 좌우로 갈려 데칼코마니가 된다.
  const boxes = {
    left: stampAt(grid, art, leftX0, y0, map),
    right: stampAt(grid, art, rightX0, y0, map),
  };

  // 이마 무늬는 양털 위에만 — only 덕분에 외곽선·뿔·눈은 안 건드린다.
  if (brow) {
    // 원본 도트에 이미 무늬가 있으면(망난이 눈두덩) 먼저 지우고 다시 찍는다.
    // 지울 때 채울 색. 눈썹이 얼굴이 아니라 **머리** 위에 있는 캐릭터도 있어서
    // 얼굴색으로 밀면 이마가 통째로 하얘진다 (강초당).
    if (brow.clear) {
      clearPair(grid, faceCx, brow.dx, cy + brow.dy, brow.clear, brow.clearKey || eyes.fill);
    }
    stampPair(
      grid,
      BROW_STYLES[brow.style] || BROW_STYLES.patch,
      faceCx,
      brow.dx,
      cy + brow.dy,
      { R: brow.key, E: brow.edgeKey || outline },
      new Set(brow.over),
      brow.tilt || 0,
    );
  }
  if (blush && blush.key) {
    // 추출된 볼터치는 좌우 모양이 다르고 가장자리가 뜯겨 있다 —
    // 얼굴색으로 싹 지우고 좌우 대칭으로 다시 찍는다.
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === blush.key) grid[y][x] = eyes.fill;
      }
    }
    // 눈 바깥·아래가 볼 자리다. 캐릭터마다 얼굴 크기가 달라서 눈 크기에 비례시킨다.
    const bdx = blush.dx ?? dx + Math.round(w * 0.8);
    const bdy = blush.dy ?? Math.round(h * 0.7);
    // 얼굴 안쪽 밝은 색 위에만 얹는다 — 외곽선이나 몸색은 건드리지 않는다
    // 바탕색 화이트리스트로 거르면, 밑에 깔린 무늬가 좌우로 다른 캐릭터(구라베)는
    // 볼터치도 따라서 비대칭이 된다. anywhere 면 외곽선만 피하고 다 칠한다.
    const over = blush.anywhere
      ? null
      : new Set(blush.overKeys && blush.overKeys.length ? blush.overKeys : [eyes.fill]);
    stampPair(grid, BLUSH, faceCx, bdx, cy + bdy, { B: blush.key }, over, 0, new Set([outline]));
  }

  return { rows: grid.map((r) => r.join('')), boxes };
}

/**
 * 실루엣 외곽선을 **1px 로 다시 그린다**.
 *
 * 가장자리 2px 안쪽의 외곽선을 아예 지우고 몸색으로 메운 뒤 새로 1px 을 두른다. 리샘플 배율이 원본 격자의
 * 정수배가 아닐 때 생기는 들쭉날쭉한 테두리를 완전히 없앤다.
 *
 * 안쪽 깊숙한 디테일(눈·코·입)은 가장자리에서 멀어 건드리지 않는다.
 */
export function normalizeOutline(rows, outlineKey, { thickness = 1, band } = {}) {
  band = band ?? Math.max(2, thickness + 1);
  const H = rows.length, W = rows[0].length;
  const grid = rows.map((r) => r.split(''));

  // 바깥 투명 영역
  const dist = Array.from({ length: H }, () => new Int16Array(W).fill(-1));
  const queue = [];
  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (dist[y][x] >= 0 || grid[y][x] !== '.') return;
    dist[y][x] = 0;
    queue.push([x, y]);
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    if (grid[y][x] === '.') { seed(x - 1, y); seed(x + 1, y); seed(x, y - 1); seed(x, y + 1); }
  }

  // 불투명 픽셀의 가장자리로부터 거리 (8방향)
  const front = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] === '.') continue;
    for (let dy = -1; dy <= 1 && dist[y][x] < 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const a = x + dx, b = y + dy;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        if (grid[b][a] === '.' && dist[b][a] === 0) { dist[y][x] = 1; front.push([x, y]); break; }
      }
    }
  }
  for (let head = 0; head < front.length; head++) {
    const [x, y] = front[head];
    if (dist[y][x] >= band) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= W || b >= H) continue;
      if (grid[b][a] === '.' || dist[b][a] >= 0) continue;
      dist[b][a] = dist[y][x] + 1;
      front.push([a, b]);
    }
  }

  // 가장자리 띠 안의 외곽선을 안쪽 몸색으로 메운다
  const fillFor = (x, y) => {
    for (let r = 1; r <= 4; r++) {
      const tally = new Map();
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const a = x + dx, b = y + dy;
        if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const c = grid[b][a];
        if (c === '.' || c === outlineKey) continue;
        if (dist[b][a] >= 0 && dist[b][a] <= band) continue; // 띠 안쪽 색은 신뢰하지 않는다
        tally.set(c, (tally.get(c) || 0) + 1);
      }
      if (tally.size) return [...tally].sort((a, b) => b[1] - a[1])[0][0];
    }
    return null;
  };

  const patches = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] !== outlineKey) continue;
    const d = dist[y][x];
    if (d < 1 || d > band) continue;
    const fill = fillFor(x, y);
    if (fill) patches.push([x, y, fill]);
  }
  for (const [x, y, fill] of patches) grid[y][x] = fill;

  // 지정한 두께만큼 다시 두른다. 거리 계산이 **대각선까지** 보므로 계단 구간에서도
  // 몸색이 배경에 직접 닿지 않는다 — 테두리가 끊겨 보이지 않는다.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = dist[y][x];
    if (grid[y][x] === '.' || d < 1 || d > thickness) continue;
    grid[y][x] = outlineKey;
  }
  return grid.map((r) => r.join(''));
}

/** 문자열 비트맵을 정수 배율로 확대한다. 원본 도트가 그대로 N×N 블록이 된다. */
export function upscale(rows, n) {
  if (n <= 1) return rows;
  const out = [];
  for (const row of rows) {
    let wide = '';
    for (const c of row) wide += c.repeat(n);
    for (let i = 0; i < n; i++) out.push(wide);
  }
  return out;
}

/**
 * 블록마다 "원본 외곽선 픽셀이 얼마나 들어 있는지"를 재서 마스크로 돌려준다.
 *
 * 임의 배율로 리샘플하면 1px 테두리가 블록 경계에 걸려 사라지거나 두 칸으로
 * 번진다. 중앙값 샘플링은 그걸 못 잡는다 — 블록 안 어디든 외곽선이 충분히
 * 있으면 그 칸은 외곽선으로 찍어야 테두리가 끊기지 않는다.
 */
export function outlineMask(img, bb, gw, gh, threshold = 0.3) {
  const bw = bb.w / gw, bh = bb.h / gh;
  const mask = [];
  for (let gy = 0; gy < gh; gy++) {
    const row = new Uint8Array(gw);
    const ys = Math.round(bb.y0 + gy * bh), ye = Math.round(bb.y0 + (gy + 1) * bh);
    for (let gx = 0; gx < gw; gx++) {
      const xs = Math.round(bb.x0 + gx * bw), xe = Math.round(bb.x0 + (gx + 1) * bw);
      let opaque = 0, dark = 0;
      for (let y = ys; y < ye; y++) {
        for (let x = xs; x < xe; x++) {
          if (img.isBg(x, y)) continue;
          opaque++;
          if (luma(img.at(x, y)) < 118) dark++;
        }
      }
      // 블록의 절반 이상이 배경이면 그 칸은 스프라이트 밖이다
      if (opaque && opaque >= (ye - ys) * (xe - xs) * 0.42 && dark / opaque >= threshold) row[gx] = 1;
    }
    mask.push(row);
  }
  return mask;
}

/**
 * outlineMask 가 표시한 칸을 외곽선 색으로 못 박는다.
 *
 * 단 **실루엣 가장자리에서 depth 칸 안쪽까지만** 적용한다. 안쪽 깊숙한
 * 디테일(눈·코·입, 무늬 경계선)까지 굵히면 얼굴이 뭉개진다 —
 * 바깥 테두리는 또렷하게, 안쪽 선은 가늘게 남겨야 한다.
 */
export function forceOutline(rows, mask, outlineKey, depth = 2) {
  const H = rows.length, W = rows[0].length;
  const grid = rows.map((r) => r.split(''));

  // 가장자리에서 흘러드는 투명 영역
  const outside = Array.from({ length: H }, () => new Uint8Array(W));
  const stack = [];
  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (outside[y][x] || grid[y][x] !== '.') return;
    outside[y][x] = 1;
    stack.push([x, y]);
  };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const [x, y] = stack.pop();
    seed(x - 1, y); seed(x + 1, y); seed(x, y - 1); seed(x, y + 1);
  }

  // 불투명 픽셀의 가장자리로부터 거리 (8방향)
  const dist = Array.from({ length: H }, () => new Int16Array(W).fill(-1));
  const queue = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] === '.') continue;
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const a = x + dx, b = y + dy;
        if (a < 0 || b < 0 || a >= W || b >= H || (!dx && !dy)) continue;
        if (outside[b][a]) { edge = true; break; }
      }
    }
    if (edge) { dist[y][x] = 1; queue.push([x, y]); }
  }
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    if (dist[y][x] >= depth) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const a = x + dx, b = y + dy;
      if (a < 0 || b < 0 || a >= W || b >= H) continue;
      if (grid[b][a] === '.' || dist[b][a] >= 0) continue;
      dist[b][a] = dist[y][x] + 1;
      queue.push([a, b]);
    }
  }

  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (grid[y][x] === '.') continue;
    if (!mask[y] || !mask[y][x]) continue;
    const d = dist[y][x];
    if (d < 1 || d > depth) continue;
    grid[y][x] = outlineKey;
  }
  return grid.map((r) => r.join(''));
}
