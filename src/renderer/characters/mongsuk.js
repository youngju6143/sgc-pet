'use strict';

/**
 * 송몽숙 — 송몽숙.png 에서 자동 추출.
 * 직접 고치지 말 것: `node tools/extract-characters.mjs` 로 다시 생성된다.
 */

export default {
  id: 'mongsuk',
  name: '송몽숙',

  width: 65,
  height: 77,

  // 원본에서 뽑은 팔레트 (a = 외곽선/눈)
  palette: {
    a: '#2e042e',
    b: '#e7abc9',
    c: '#8a5f93',
    d: '#f3e7fc',
    e: '#b890d2',
    f: '#6a376f',
    g: '#e8cdfa',
  },

  /** 서 있는 기본 프레임 (다리 포함) */
  torso: [
    '.......................aaaaaaaaaaaaaaaaa.........................',
    '.......................aaaaaaaaaaaaaaaaa.........................',
    '...................aaaaaaggggeeeeeeeggaaaaaa.....................',
    '...................aaaaagggggeeeeeegggggaaaa.....................',
    '....aaaaaaaaaa.....aaaaeggggeeeeeeeeegggfaaaa......aaaaaaaaaa....',
    '....aaaaaaaaaa...aaaeeeeggggeeeeeeeeeggggeeeaaaa...aaaaaaaaaa....',
    '..aaaaggggggaaaaaaaaeeeeggggeeeeeeeeeggggeeeaaaaaaaaaggggggaaaa..',
    '..aaagggggggggaaaeeeeeeeggggeeeeeeeeeggggeeeeeeaaaagggggggggaaa..',
    'aaaaggggggggggaaceeeeeeeggggeeeeeeeeeggggeeeeeeecagggggggggggaaaa',
    'aaggggggggggggcageeeeeeeggggeeeeeeeeeggggeeeeeeegaggggggggggggaaa',
    'aaggggddddggggaggeeeeeeeggggeeeeeeeeeggggeeeeeeegacgggdddddggggaa',
    'aaggggdddddgaagggeeeeeeeggggeeeeeeeeeggggeeeeeeeggaaggdddddggggaa',
    'aaggggddddddfagggeeeeeeeggggeeeeeeeeeggggeeeeeeeggffggdddddgggaaa',
    'aaggggdddddaeggggeeeeeeeggggeeeeeeeeeggggeeeeeeeggggaadddddgggaaa',
    '..aagdddddgaeggggeeeeeegggggeeeeeeeeggggggeeeeeeggggaadddddggaa..',
    '..aaggdddaagggggggeeeeeggggggeeeeeegggggggeeeeegggggggacdddggaa..',
    '..aaggdddaagggggggeeeeeggggggeeeeeegggggggeeeeggggggggacdddggaa..',
    '..aagggddaaggggggggeeegggggggeeeeeeggggggggeeeggggggggacddgggaa..',
    '....aagaaggggggggggggggggggggggeeegggggggggggggggggggggaaggaa....',
    '....aagaaggggggggggggggggggggggeeegggggggggggggggggggggaaggaa....',
    '......aaaggggggggggggggggggggggggggggggggggggggggggggggaaaa......',
    '......aaaggggggggggggggggggggggggggggggggggggggggggggggaaaa......',
    '......aagggggggggggaaaaaeggggggggggggggcaaaaaggggggggggggaa......',
    '....aaaagggggggggffggggggggggggggggggggggggggffggggggggggaaaa....',
    '....aagggggggggggaaggggggggggggggggggggggggggaagggggggggggaaa....',
    '....aagggggggggggggggggggggggggggggggggggggggggggggggggggggaa....',
    '....aagggggggggggggggggggggggggggggggggggggggggggggggggggggaa....',
    '....aagggggggggggggggaaagggggggggggggggggaaagggggggggggggggaa....',
    '....aaggggggggggggggaaaaagggggggggggggggaaaaaggggggggggggggaa....',
    '....aagggggggggggggaaaaddagggggggggggggaaaaddagggggggggggggaa....',
    '....aagggggggggggggaaaaddagggggggggggggaaaaddagggggggggggggaa....',
    '....aagggggggggggggaaaaaaagggggggggggggaaaaaaagggggggggggggaa....',
    '....aagggggggggggggaadaaaagggggggggggggaadaaaagggggggggggggaa....',
    '....aaggggggggggggggaaaaagggggggggggggggaaaaaggggggggggggggaa....',
    '....aagggggggggggggggaaagggggggaaggggggggaaaggggggggggggggaaa....',
    '....aagggggggggbbbbggggggggggggeegggggggggggggbbbbggggggggaaa....',
    '.....aaaggggggbbbbbbgggggggggaaggaaggggggggggbbbbbbggggggaa......',
    '.....aaagggggbbbbbbbbggggggggafggffgggggggggbbbbbbbbgggggaa......',
    '.....aaaggggggbbbbbbgggggggggggggggggggggggggbbbbbbggggggaa......',
    '.....aaagggggggbbbbgggggggggggggggggggggggggggbbbbgggggggaa......',
    '.......aaggggggggggggggggggggggggggggggggggggggggggggggaa........',
    '.......aaagggggggggggggggggggggggggggggggggggggggggggggaa........',
    '.......aaaagggggggggggggggggggggggggggggggggggggggggggaaa........',
    '.........aagggggggggggggggggggggggggggggggggggggggggggaa.........',
    '..........aaggggggggggggggggggggggggggggggggggggggggaa...........',
    '..........aaagggggggggggggggggggggggggggggggggggggggaa...........',
    '............aaaggggggggggggggggggggggggggggggggggaaa.............',
    '............aaaggggggggggggggggggggggggggggggggggaaa.............',
    '...............aaaaaaggggggggggggggggggggggfaaaaa................',
    '...............aaaeeeffffffeeeeeeeeeeffffffeeeaaa................',
    '................aagggaaaaaaeeeeeeeeeeaaaaaagggeaa................',
    '..............aaggggggggggggggggggggggggggggggggaaa..............',
    '..............aaggggggggggggggggggggggggggggggggaaa..............',
    '............aaaaggggggggggggddddddddgggggggggggggaaa.............',
    '............aaggggggggggggggddddddddggggggggggggggaa.............',
    '............aaggggggggggggddddddddddddggggggggggggaaa............',
    '..........aaaggggggggggggddddddddddddddgggggggggggggaa...........',
    '..........aaaggggeegggggdddddddddddddddggggggeegggggaa...........',
    '..........aagggggeegggggdddddddddddddddggggggeegggggaa...........',
    '..........aaaggggaaggggddddddddddddddddddggggaagggggaa...........',
    '..........aaaggggaaggggddddddddddddddddddggggaagggggaa...........',
    '............aaaaaagggggddddddddddddddddddgggggeaaaaa.............',
    '............aaaaaagggggddddddddddddddddddgggggeaaaaa.............',
    '............aaaaaagggggddddddddddddddddddgggggeaaaaa.............',
    '................aaggggggdddddddddddddddgggggggeaa................',
    '................aaggggggdddddddddddddddggggggggaa................',
    '................aaggggggggddddddddddddggggggggaaa................',
    '................aaagggggggddddddddddddggggggggaaa................',
    '................aaaaggggggggddddddddgggggggggaa..................',
    '..................aagggggggggggggggggggggggggaa..................',
    '..................aagggggggggggggggggggggggggaa..................',
    '...................aaaggggggggaaaaaggggggggaa....................',
    '....................aaggggggggaaaaaagggggggaa....................',
    '....................aaggggggaa....aagggggggaa....................',
    '....................aaaaggaaaa....aaaagggaaaa....................',
    '......................aaaaaaa.......aaaaaaa......................',
    '......................aaaaaa........aaaaaaa......................',
  ],

  /** 실루엣이 갈라지는 지점부터가 다리. 걷기는 이 아래 행만 갈아끼운다. */
  legTop: 73,
  legFrames: {
    stand: [
      '....................aaggggggaa....aagggggggaa....................',
      '....................aaaaggaaaa....aaaagggaaaa....................',
      '......................aaaaaaa.......aaaaaaa......................',
      '......................aaaaaa........aaaaaaa......................',
    ],
    stepLeft: [
      '.....................aaaaggaaaa...aagggggggaa....................',
      '.......................aaaaaaa....aaaagggaaaa....................',
      '.......................aaaaaa.......aaaaaaa......................',
      '....................................aaaaaaa......................',
    ],
    stepRight: [
      '....................aaggggggaa...aaaagggaaaa.....................',
      '....................aaaaggaaaa.....aaaaaaa.......................',
      '......................aaaaaaa......aaaaaaa.......................',
      '......................aaaaaa.....................................',
    ],
  },

  /** 눈 감기(깜빡임/잠)용 좌표 */
  eyes: { left: { x: 19, y: 27, w: 7, h: 8 }, right: { x: 39, y: 27, w: 7, h: 8 }, fill: 'g', line: 'a' },

  /** 눈높이에서 잰 얼굴 가로 중심(도트). 좌우 반전 보정에 쓴다 */
  faceCx: 32,

  /** 원본 도트가 바라보는 방향 (1=오른쪽). 꼬리처럼 방향이 있는 부위 때문에 필요하다 */
  artFacing: 1,

  lines: ["…5분만","zzz","졸려…","깨우지 마"],
};
