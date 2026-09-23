import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadImage,
  boundingBox,
  nativeBlockSize,
  sampleGrid,
  quantize,
  mapToKeys,
  detectLegs,
  detectEyes,
  faceKeyAround,
  faceCenterX,
  moveMouth,
  liftLeg,
  outlineMask,
  forceOutline,
  patchFace,
  luma,
  KEYS,
  hex,
} from "./extract-lib.mjs";

/**
 * 루트의 원본 도트 PNG 5장 → src/renderer/characters/*.js 생성.
 *   node tools/extract-characters.mjs
 *
 * 원본을 다시 받으면 이 스크립트만 다시 돌리면 된다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * 원본 도트 PNG 위치. 저장소에는 올리지 않고 art-source/ 에 둔다
 * (용량도 크고 최종 결과는 characters/*.js 에 다 들어 있다).
 * 예전처럼 루트에 두어도 동작하게 둘 다 본다.
 */
function sourceFile(name) {
  const candidates = [path.join(root, "art-source", name), path.join(root, name)];
  const found = candidates.find((f) => fs.existsSync(f));
  if (found) return found;
  throw new Error(
    `원본 도트를 못 찾았다: ${name}\n` +
      `art-source/ 에 넣어 주세요. (README 의 '원본 도트' 참고)`,
  );
}
/** 추출 기준 높이. 실제 키는 얼굴 폭을 맞추면서 캐릭터마다 조금씩 달라진다. */
const TARGET_HEIGHT = 70;
/**
 * 5종의 **얼굴 폭**(눈높이에서 잰 실루엣 폭)을 이 값으로 맞춘다.
 * 키만 통일하면 원본마다 머리 비율이 달라서 라베 머리만 유독 커 보인다.
 * 얼굴을 맞추면 키는 캐릭터마다 달라지는데, 어차피 바닥에 붙여 그리니 괜찮다.
 */
const TARGET_FACE_WIDTH = 57;
/**
 * 얼굴 폭 자동 측정이 안 맞는 캐릭터만 보정한다.
 * 장폰주는 눈높이에서 양털이 같이 잡혀 얼굴 폭이 부풀려 나온다 — 자동값대로
 * 맞추면 정작 얼굴은 쪼그라들고 도트도 뭉갠다.
 */
const FACE_WIDTH_BIAS = {
  ponzoo: 1.175,
  // 구라베는 머리가 크고 몸이 짧아서, 얼굴 폭을 맞추면 전체 키만 유독 작아진다
  rave: 1.06,
};
/**
 * 리샘플 배율이 원본 격자의 정수배가 아니면 1px 테두리가 곳에 따라 2~3px 로
 * 뭉쳐서 실루엣이 지저분해진다. 테두리를 지우고 다시 그리는 보정은
 * 망난이 머리 깃털처럼 가느다란 부분을 망가뜨렸다.
 *
 * 대신 **샘플링 단계에서** 해결한다 — 블록 안에 원본 외곽선 픽셀이 이만큼 이상
 * 들어 있으면 그 칸을 무조건 외곽선으로 찍는다. 형태는 원본 그대로 두면서
 * 테두리만 끊김 없이 이어진다.
 */
const OUTLINE_PRIORITY = 0.3;
const COLORS = 8;
/**
 * 캐릭터별 색 수 조정. 구라베는 아래턱(주황)과 배 무늬(회색)가 한 클러스터로
 * 합쳐져 회갈색 평균이 나온다 — 색을 늘려야 갈라진다.
 * (quantize 가 가까운 클러스터는 합치므로 실제 색 수는 이보다 적다)
 */
const COLORS_BY_ID = { rave: 14 };

/**
 * 자동 눈 검출이 빗나가는 캐릭터는 여기서 덮어쓴다.
 * (장폰주는 양털 무늬를, 송몽숙은 입을 눈으로 잡았다)
 */
/**
 * 눈은 원본 도트 자체가 좌우 비대칭이고 캐릭터마다 스타일이 제각각이라
 * 검출한 자리에 **다시 찍는다**. (tools/extract-lib.mjs 의 EYE_STYLES)
 */
const FACES = {
  chodang: {
    style: "plain", // 원본 하이라이트 제거
    // 원본 눈썹 패치가 좌우로 11칸/10칸이라 비뚤어 보인다 — 대칭으로 다시 찍는다
    brow: {
      style: "bar",
      color: "#ededed",
      clearWith: "#3a3a3a", // 눈썹이 검은 머리 위에 있다 — 얼굴색으로 밀면 안 된다
      over: ["#3a3a3a", "#221d24", "#7b7b7b", "#d8d8d8", "#ededed"],
      clear: { w: 13, h: 8 },
      dx: 10,
      dy: -10,
    },
  },
  rave: {
    style: "plain",
    brow: {
      style: "oval",
      color: "#e0d4c8",
      edge: "#81472f",
      clearWith: "#dfab79", // 눈썹 주변은 주황 얼굴
      over: ["#dfab79", "#e0d4c8", "#81472f", "#b1998a", "#a58775"],
      clear: { w: 17, h: 13 },
      dx: 10.5,
      // eyeDy 로 눈이 올라간 만큼 되돌린다 — 눈두덩은 제자리
      dy: -10,
    },
    // 볼이 주황 얼굴과 흰 볼털에 걸쳐 있다 — 둘 다 허용해야 온전히 찍힌다
    // 기본 위치면 눈에 겹친다 — 눈 바깥·아래로 뺀다
    blush: { color: "#db9567", dx: 17, dy: 5, anywhere: true },
  },
  mangnani: {
    style: "plain",
    // 눈이 원본 도트에서 한 칸 처져 있다
    eyeDy: -1,
    /**
     * 눈두덩. 원본 도트 그대로면 두껍고 반듯해서 멍한 인상이라, 한 칸 얇게
     * 다시 찍고 안쪽 끝을 내려(tilt) 살짝 찌푸리게 만든다.
     * clear 는 원본 무늬를 밀어내는 상자 — 무늬보다 넉넉해야 자국이 안 남는다.
     */
    brow: {
      style: "lid",
      color: "#e2f2fd",
      over: ["#b5dffa", "#e2f2fd", "#8fc6ee"],
      clear: { w: 18, h: 13 },
      dx: 10.5,
      dy: -11,
    },
  },
  // 얘만 초롱초롱하게. 입은 원본 도트에서 한 칸 처져 있어 올려 준다.
  mongsuk: { style: "sparkle", mouthDy: -1 },
  // 안광이 순백이면 너무 튀어서 살짝 회색으로 낮춘다
  ponzoo: {
    style: "crescent",
    highlight: "#dcdcdc",
    eyeSpread: 1,
    // 반달 윗줄을 한 칸 깎았으니(EYE_STYLES.crescent) 그만큼 내려 찍는다.
    // 안 그러면 윗변은 그대로고 아랫변만 올라와서 "위를 자른" 모양이 안 된다.
    eyeDy: 1,
    /**
     * 이마의 둥근 주황 무늬. 원본 도트 PNG 에는 밋밋한 양털 그늘만 있고
     * 일러스트에만 있어서 눈처럼 다시 찍는다.
     * dx/dy 는 얼굴 중심·눈높이 기준 칸수 — 일러스트에서 재서(무늬 47x28px,
     * 눈 중심에서 40px 위, 얼굴 폭 310px) 지금 얼굴 폭 68칸으로 환산했다.
     */
    // dy 는 eyeDy 만큼 되돌린 값이다 — 눈이 내려가도 이마 무늬는 제자리
    brow: { style: "patch", color: "#eaad5a", over: ["#f5e1af", "#e8d09d"], dx: 9, dy: -13 },
  },
};

const EYE_OVERRIDES = {
  // 장폰주는 자동 검출이 양털 곱슬 무늬를 눈으로 잡는다. TARGET_HEIGHT 기준 좌표.
  ponzoo: {
    left: { x: 23, y: 32, w: 3, h: 4 },
    right: { x: 37, y: 32, w: 3, h: 4 },
  },
};

/** 덮어쓴 눈 좌표는 TARGET_HEIGHT 기준이다 — 실제 격자 높이로 환산해서 쓴다. */
function scaleEyes(eyes, gh) {
  const k = gh / TARGET_HEIGHT;
  if (!eyes) return eyes;
  // 반드시 복사본을 준다 — extractOne 이 eyes.left/right 를 찍은 칸으로 덮어쓴다
  const box = (b) => ({
    x: Math.round(b.x * k),
    y: Math.round(b.y * k),
    w: Math.max(2, Math.round(b.w * k)),
    h: Math.max(2, Math.round(b.h * k)),
  });
  return { left: box(eyes.left), right: box(eyes.right) };
}

/**
 * 공식 일러스트(5종 단체 컷)에서 직접 뽑은 기준색. 원본 도트 PNG 는 그걸
 * 다시 찍은 것이라 색이 조금씩 틀어져 있어서, 양자화로 나온 색은 여기 있는
 * 가장 가까운 색으로 스냅한다. 픽셀 매핑은 그대로 centers 로 하고 파일에
 * 적히는 팔레트 hex 만 바뀐다. 어두운 순으로 적어 둘 것.
 */
const REFERENCE_PALETTES = {
  chodang: [
    "#221d24", // 외곽선
    "#3a3a3a", // 검은 털
    "#7b7b7b", // 회색 그늘
    "#c1c1c1", // 배 무늬
    "#d8d8d8", // 밝은 회색
    "#ededed", // 흰 털
    "#f6c7b3", // 볼터치
  ],
  rave: [
    "#331408", // 외곽선
    "#8f6047", // 꼬리 줄무늬 / 그늘
    "#a67052", // 몸통 갈색
    "#db9567", // 볼터치
    "#dfab79", // 얼굴 주황
    "#b1998a", // 배 무늬
    "#e0d4c8", // 눈썹 / 주둥이
  ],
  mangnani: [
    "#102336", // 외곽선
    "#c99a3f", // 부리 그늘
    "#8fc6ee", // 파랑 그늘
    "#b5dffa", // 몸통 하늘색
    "#f2b096", // 볼터치
    "#f8dd94", // 부리
    "#454b57", // 눈두덩 테두리
    "#e2f2fd", // 배
  ],
  mongsuk: [
    "#2e042e", // 외곽선
    "#8a5f93", // 보라 그늘
    "#b890d2", // 머리 줄무늬
    "#e7abc9", // 볼터치
    "#e8cdfa", // 몸통 보라
    "#f3e7fc", // 배
  ],
  ponzoo: [
    "#38200a", // 외곽선
    "#624424", // 뿔 그늘
    "#b48e54", // 뿔
    "#eaad5a", // 이마 무늬 (일러스트에선 눈 위 작은 점 두 개뿐이다)
    // 양털 그늘. 일러스트는 평면 채색이라 이런 중간톤이 없는데, 원본 도트는
    // 이마~옆머리에 넓게 깔아 놨다. 기준색에 없으면 제일 가까운 이마 주황으로
    // 붙어서 **주황 눈썹 띠**가 생긴다 — 양털에 뿔색을 살짝 섞은 톤으로 둔다.
    "#e8d09d",
    "#f5e1af", // 양털
    "#f8d6b9", // 볼터치
    "#fdf7e3", // 얼굴
  ],
};

/**
 * 볼터치는 1:1 매칭에서 다른 살색에 뺏기기 쉽다 — 구라베는 얼굴 주황이 볼터치
 * 기준색에 더 가까워서 둘이 뒤바뀌었다. 볼터치 클러스터만 먼저 고정한다.
 */
const BLUSH_REF = {
  chodang: "#f6c7b3",
  rave: "#db9567",
  mangnani: "#f2b096",
  mongsuk: "#e7abc9",
  ponzoo: "#f8d6b9",
};

/**
 * 배 무늬처럼 "어느 자리인지"로만 구분되는 색은 좌표로 못 박는다.
 * 강초당 배 무늬는 원본 PNG 에서 흰 털과 거의 붙어 있어서 그냥 두면 제일 밝은
 * 회색으로 붙고, 화면에선 무늬가 안 보인다.
 */
const SNAP_ANCHORS = {
  chodang: [{ x: 27, y: 62, color: "#c1c1c1" }], // 배 무늬
};

/** 기준색을 못 받은 색에 물리는 벌점. 웬만한 색 거리보다 커서 최후의 수단이 된다. */
const UNMATCHED_COST = 2e5;

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** 사람 눈에 가까운 RGB 거리(redmean). 팔레트 스냅 정도에는 이걸로 충분하다. */
function colorDistance(a, b) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0],
    dg = a[1] - b[1],
    db = a[2] - b[2];
  return (
    (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db
  );
}

/**
 * 양자화 색 ↔ 기준색을 1:1 로 맺는다. 두 색이 같은 기준색으로 뭉개지면
 * 명암 단계가 사라지므로 1:1 을 지키고, 거리 합이 최소인 조합을 완전탐색으로
 * 고른다(색이 8개 이하라 탐색량이 얼마 안 된다). 가까운 쌍부터 집는 방식은
 * 작은 차이를 먼저 집어가다 밝기 순서를 뒤집어 놓는다.
 */
function snapPalette(id, centers, tight = new Set(), rows = []) {
  const refs = REFERENCE_PALETTES[id];
  if (!refs) return centers.map(hex);
  const refRgb = refs.map(toRgb);
  const cost = centers.map((c) => refRgb.map((r) => colorDistance(c, r)));

  // 볼터치는 거리만 보면 다른 살색에 뺏긴다 — 구라베는 얼굴 주황이 볼터치
  // 기준색에 더 가까워서 전체 비용 최소 조합에서도 둘이 뒤바뀐다. 못 박아 둔다.
  const blushIndex = [...tight][0];
  const blushSlot = BLUSH_REF[id] ? refs.indexOf(BLUSH_REF[id]) : -1;
  if (blushIndex !== undefined && blushSlot >= 0) {
    cost[blushIndex] = refRgb.map((_, j) => (j === blushSlot ? 0 : 1e9));
  }

  // 좌표로 못 박은 자리도 같은 식으로 고정한다.
  for (const a of SNAP_ANCHORS[id] || []) {
    const i = KEYS.indexOf(rows[a.y]?.[a.x]);
    const slot = refs.indexOf(a.color);
    if (i < 0 || slot < 0) continue;
    cost[i] = refRgb.map((_, j) => (j === slot ? 0 : 1e9));
  }

  let best = null;
  let bestCost = Infinity;
  const taken = new Array(refs.length).fill(false);
  const pick = new Array(centers.length);
  (function search(i, acc) {
    if (acc >= bestCost) return; // 이미 진 가지
    if (i === centers.length) {
      bestCost = acc;
      best = pick.slice();
      return;
    }
    for (let j = 0; j < refs.length; j++) {
      if (taken[j]) continue;
      taken[j] = true;
      pick[i] = j;
      search(i + 1, acc + cost[i][j]);
      taken[j] = false;
    }
    // 기준색보다 추출색이 많으면 남는 색이 생긴다. 미배정을 허용하지 않으면
    // 완성된 조합이 하나도 안 나와서 전부 원색으로 떨어진다.
    pick[i] = -1;
    search(i + 1, acc + UNMATCHED_COST);
  })(0, 0);

  // 미배정은 양자화가 뽑은 원색을 그대로 쓴다
  return best
    ? best.map((j, i) => (j < 0 ? hex(centers[i]) : refs[j]))
    : centers.map(hex);
}

export const SOURCES = [
  {
    id: "chodang",
    name: "강초당",
    file: "강초당.png",
    lines: ["한 입만?", "배고파…", "케첩 어딨어"],
  },
  {
    id: "rave",
    name: "구라베",
    file: "구라베.png",
    // 꼬리가 오른쪽에 그려져 있다 = 왼쪽으로 걷는 그림이다. 이걸 안 알려주면
    // 오른쪽으로 갈 때 꼬리가 진행 방향 앞에 와서 꼬리를 쫓아가는 꼴이 된다.
    artFacing: -1,
    lines: ["짐이로다"],
  },
  {
    id: "mangnani",
    name: "망난이",
    file: "망난이.png",
    lines: ["왜!", "뭐!", "아 진짜", "하지 마"],
  },
  {
    id: "mongsuk",
    name: "송몽숙",
    file: "송몽숙.png",
    lines: ["…5분만", "zzz", "졸려…", "깨우지 마"],
  },
  {
    id: "ponzoo",
    name: "장폰주",
    file: "장폰주.png",
    lines: ["잠깐만 이판만 하고", "한 판만 더", "…졌다", "이거 좀 어려운데"],
  },
];

/** 손으로 찍은 수정본이 놓이는 곳 (tools/pixel-editor.mjs 가 쓴다) */
export const OVERRIDE_DIR = path.join(root, "tools", "overrides");

export function overrideFile(id) {
  return path.join(OVERRIDE_DIR, `${id}.json`);
}

/**
 * 손수정본을 얹는다.
 *
 * 추출은 원본 PNG 에서 다시 돌릴 때마다 결과가 조금씩 달라지므로, 수정본은
 * **바뀐 칸 목록**으로만 들고 있다가 여기서 덮어쓴다. 색은 팔레트 글자가 아니라
 * hex 로 저장한다 — 글자는 양자화할 때마다 뒤바뀌기 때문이다.
 * 크기가 달라졌으면(원본을 새로 받았거나 추출 기준을 바꿨거나) 좌표가 의미를
 * 잃으므로 조용히 버리지 말고 경고하고 건너뛴다.
 */
function applyOverride(id, rows, palette) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(overrideFile(id), "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") return { rows, note: `수정본을 못 읽었다 — ${err.message}` };
    return { rows };
  }
  if (!data.cells?.length) return { rows };
  if (data.width !== rows[0].length || data.height !== rows.length) {
    // 얼굴 폭을 맞추느라 여러 번 뽑는 도중에도 불리므로, 여기서 바로 찍지 않고
    // 최종 결과에만 메모를 달아 호출한 쪽이 한 번만 알리게 한다.
    return {
      rows,
      note:
        `수정본은 ${data.width}x${data.height} 기준인데 결과가 ` +
        `${rows[0].length}x${rows.length} 라 건너뛴다 (tools/overrides/${id}.json)`,
    };
  }

  const keyOf = (hex) => {
    const found = Object.keys(palette).find((k) => palette[k] === hex);
    if (found) return found;
    const next = KEYS[Object.keys(palette).length]; // 팔레트에 없던 색이면 한 칸 늘린다
    if (!next) return null;
    palette[next] = hex;
    return next;
  };

  const grid = rows.map((r) => r.split(""));
  let applied = 0;
  for (const [x, y, hex] of data.cells) {
    if (!grid[y] || grid[y][x] === undefined) continue;
    const key = hex === null ? "." : keyOf(hex);
    if (!key) continue;
    grid[y][x] = key;
    applied++;
  }
  return { rows: grid.map((r) => r.join("")), applied };
}

const silhouetteWidth = (row) => {
  const l = row.search(/[^.]/);
  return l < 0
    ? 0
    : row.length - row.split("").reverse().join("").search(/[^.]/) - l;
};

export function extractOne(src, gh = TARGET_HEIGHT) {
  const img = loadImage(sourceFile(src.file));
  const bb = boundingBox(img);
  const block = nativeBlockSize(img, bb);
  const gw = Math.round((bb.w / bb.h) * gh);

  const grid = sampleGrid(img, bb, gw, gh);
  const { centers, tight } = quantize(grid, COLORS_BY_ID[src.id] || COLORS);
  let rows = mapToKeys(grid, centers, tight);
  const palette = Object.fromEntries(
    snapPalette(src.id, centers, tight, rows).map((h, i) => [KEYS[i], h]),
  );

  // 검출은 테두리를 손대기 **전** 그림에서 한다 — 테두리를 굵히고 나면
  // 가장자리 덩어리가 늘어나 눈 검출이 엉뚱한 곳을 잡는다.
  const legs = detectLegs(rows);
  const eyes = scaleEyes(EYE_OVERRIDES[src.id], gh) || detectEyes(rows, KEYS[0]);

  // 블록 안에 원본 외곽선이 충분히 들어 있으면 그 칸은 외곽선으로 못 박는다
  rows = forceOutline(rows, outlineMask(img, bb, gw, gh, OUTLINE_PRIORITY), KEYS[0]);
  const outline = KEYS[0];
  const fill = eyes ? faceKeyAround(rows, eyes.left, outline) : outline;
  eyes.fill = fill;

  const face = FACES[src.id] || { style: "plain" };

  // 안광 색. 기본은 팔레트에서 가장 밝은 색이고, FACES 에 hex 를 적으면
  // 그 색을 팔레트에 한 칸 추가해서 쓴다 (순백이 너무 튈 때).
  let highlight;
  if (face.highlight) {
    highlight = KEYS[centers.length];
    palette[highlight] = face.highlight;
  } else {
    highlight = centers
      .map((c, i) => [KEYS[i], luma(c)])
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  // 무늬 색은 팔레트 글자가 아니라 hex 로 적어 둔다 — 글자는 양자화 때마다 바뀐다.
  const keyOf = (value) =>
    Object.keys(palette).find((k) => palette[k] === value);
  const brow =
    face.brow && keyOf(face.brow.color)
      ? {
          ...face.brow,
          key: keyOf(face.brow.color),
          edgeKey: face.brow.edge ? keyOf(face.brow.edge) : undefined,
          clearKey: face.brow.clearWith ? keyOf(face.brow.clearWith) : undefined,
          over: face.brow.over.map(keyOf).filter(Boolean),
        }
      : undefined;

  // face 를 먼저 펼친다 — 나중에 펼치면 face.highlight(hex) 가 위에서 만든
  // 팔레트 **키**를 덮어써서 비트맵에 hex 문자열이 박힌다. brow 도 마찬가지.
  // 볼터치 색 = quantize 가 따로 고정해 둔 클러스터 (KEYS[tight]).
  // 색 수를 늘린 캐릭터는 이 자동 검출이 종종 빈손으로 돌아온다 — 그때는
  // FACES 에 적어 둔 hex 로 찾는다. 검출이 실패했다고 볼터치를 원본 도트
  // 그대로 두면 좌우가 어긋난 채로 남는다(구라베).
  const blushKey = tight.size
    ? KEYS[[...tight][0]]
    : (face.blush?.color && keyOf(face.blush.color)) || null;
  const blush = blushKey
    ? {
        key: blushKey,
        ...(face.blush || {}),
        overKeys: (face.blush?.over || []).map(keyOf).filter(Boolean),
      }
    : null;

  const patched = patchFace(rows, { eyes, outline, ...face, highlight, brow, blush });
  rows = patched.rows;
  // 눈 좌표는 **실제로 찍힌 칸**으로 바꿔 둔다. 검출한 칸보다 큰 눈 스타일이
  // 있어서, 검출 칸만 지우면 눈 감을 때 눈꼬리가 남는다.
  eyes.left = patched.boxes.left;
  eyes.right = patched.boxes.right;

  // 입 높이 보정 (원본 도트에서 눈과의 간격이 어긋난 캐릭터만)
  if (face.mouthDy) {
    const eyeRowForMouth = Math.round(eyes.left.y + eyes.left.h / 2);
    rows = moveMouth(rows, {
      eyes,
      faceCx: faceCenterX(rows, eyeRowForMouth) ?? (gw - 1) / 2,
      fill,
      dy: face.mouthDy,
    });
  }

  // 손수정본은 여기서 얹는다 — 걷기/앉기 프레임을 만들기 **전**이라야
  // 고친 도트가 모든 자세에 그대로 따라간다.
  const override = applyOverride(src.id, rows, palette);
  rows = override.rows;

  // 걷기 프레임은 다리 행만 갈아끼우면 되므로 그 부분만 만들어 둔다.
  const legFrames = {
    stand: rows.slice(legs.top),
    stepLeft: liftLeg(rows, legs, "left", 1).slice(legs.top),
    stepRight: liftLeg(rows, legs, "right", -1).slice(legs.top),
  };
  // 눈높이 행의 실루엣 폭 = 얼굴 폭. 5종을 이걸로 맞춘다.
  const eyeRow = Math.round(eyes.left.y + eyes.left.h / 2);
  const faceWidth = silhouetteWidth(rows[eyeRow] || "");
  // 얼굴 중심이 스프라이트 박스 중심과 다른 캐릭터가 있다(구라베는 꼬리 때문에
  // 2.5칸 어긋난다). 좌우 반전할 때 얼굴이 제자리에 있게 하려면 렌더러도 이 값이
  // 필요하다 — 여기서 재서 같이 구워 둔다.
  const faceCx = faceCenterX(rows, eyeRow) ?? (gw - 1) / 2;

  return {
    src,
    rows,
    override,
    faceWidth,
    faceCx,
    palette,
    legs,
    eyes,
    fill,
    outline,
    legFrames,
    gw,
    gh,
    block,
    bb,
  };
}

/**
 * 캐릭터 한 마리를 완성해서 돌려준다.
 *
 * 1차로 뽑아 얼굴 폭을 재고, 그 폭이 TARGET_FACE_WIDTH 가 되도록 높이를 고쳐
 * 다시 뽑는다. 파일을 굽는 쪽과 도트 에디터가 **같은 결과**를 봐야 해서
 * 함수로 빼 두었다 — 에디터가 extractOne 을 직접 부르면 얼굴 폭 보정이 빠져
 * 크기가 어긋난다.
 */
export function buildCharacter(src) {
  const target = TARGET_FACE_WIDTH * (FACE_WIDTH_BIAS[src.id] || 1);
  let r = extractOne(src);
  for (let i = 0; i < 4 && Math.abs(r.faceWidth - target) > 0.5; i++) {
    const gh = Math.round((r.gh * target) / r.faceWidth);
    if (gh === r.gh) break;
    const next = extractOne(src, gh);
    if (Math.abs(next.faceWidth - target) >= Math.abs(r.faceWidth - target)) break;
    r = next;
  }
  return r;
}

function emit(r) {
  const q = (v) => JSON.stringify(v);
  const box = (b) => `{ x: ${b.x}, y: ${b.y}, w: ${b.w}, h: ${b.h} }`;
  return `'use strict';

/**
 * ${r.src.name} — ${r.src.file} 에서 자동 추출.
 * 직접 고치지 말 것: \`node tools/extract-characters.mjs\` 로 다시 생성된다.
 */

export default {
  id: '${r.src.id}',
  name: '${r.src.name}',

  width: ${r.gw},
  height: ${r.gh},

  // 원본에서 뽑은 팔레트 (a = 외곽선/눈)
  palette: {
${Object.entries(r.palette)
  .map(([k, v]) => `    ${k}: '${v}',`)
  .join("\n")}
  },

  /** 서 있는 기본 프레임 (다리 포함) */
  torso: [
${r.rows.map((row) => `    '${row}',`).join("\n")}
  ],

  /** 실루엣이 갈라지는 지점부터가 다리. 걷기는 이 아래 행만 갈아끼운다. */
  legTop: ${r.legs.top},
  legFrames: {
${Object.entries(r.legFrames)
  .map(
    ([k, v]) =>
      `    ${k}: [\n${v.map((row) => `      '${row}',`).join("\n")}\n    ],`,
  )
  .join("\n")}
  },

  /** 눈 감기(깜빡임/잠)용 좌표 */
  eyes: { left: ${box(r.eyes.left)}, right: ${box(r.eyes.right)}, fill: '${r.fill}', line: '${r.outline}' },

  /** 눈높이에서 잰 얼굴 가로 중심(도트). 좌우 반전 보정에 쓴다 */
  faceCx: ${r.faceCx},

  /** 원본 도트가 바라보는 방향 (1=오른쪽). 꼬리처럼 방향이 있는 부위 때문에 필요하다 */
  artFacing: ${r.src.artFacing ?? 1},

  lines: ${q(r.src.lines)},
};
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = path.join(root, "src", "renderer", "characters");
  for (const src of SOURCES) {
    const r = buildCharacter(src);
    if (r.override?.note) console.warn(`  ⚠︎ ${src.id}: ${r.override.note}`);
    else if (r.override?.applied) console.log(`  · ${src.id}: 손수정 ${r.override.applied}칸 적용`);
    fs.writeFileSync(path.join(outDir, `${src.id}.js`), emit(r));
    console.log(
      `${r.src.id.padEnd(9)} ${r.gw}x${r.gh}  face=${r.faceWidth}  block=${r.block}  ` +
        `legs=${r.legs ? `top ${r.legs.top} L[${r.legs.left}] R[${r.legs.right}]` : "NOT FOUND"}  ` +
        `eyes=${r.eyes ? `L(${r.eyes.left.x},${r.eyes.left.y} ${r.eyes.left.w}x${r.eyes.left.h}) R(${r.eyes.right.x},${r.eyes.right.y} ${r.eyes.right.w}x${r.eyes.right.h})` : "NOT FOUND"}`,
    );
    console.log(`          palette ${Object.values(r.palette).join(" ")}`);
  }

  const index = `'use strict';

/**
 * 캐릭터 레지스트리.
 * 캐릭터 파일은 tools/extract-characters.mjs 가 원본 PNG 에서 생성한다.
 */

${SOURCES.map((s) => `import ${s.id} from './${s.id}.js';`).join("\n")}

export const CHARACTERS = [${SOURCES.map((s) => s.id).join(", ")}];

export const CHARACTERS_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id) {
  return CHARACTERS_BY_ID[id] || CHARACTERS[0];
}
`;
  fs.writeFileSync(path.join(outDir, "index.js"), index);
  console.log("\nwrote", SOURCES.length, "character files + index.js");
  process.exit(0);
}
