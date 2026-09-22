'use strict';

/**
 * 강초당 — 강초당.png 에서 자동 추출.
 * 직접 고치지 말 것: `node tools/extract-characters.mjs` 로 다시 생성된다.
 */

export default {
  id: 'chodang',
  name: '강초당',

  width: 57,
  height: 83,

  // 원본에서 뽑은 팔레트 (a = 외곽선/눈)
  palette: {
    a: '#221d24',
    b: '#f6c7b3',
    c: '#7b7b7b',
    d: '#ededed',
    e: '#3a3a3a',
    f: '#d8d8d8',
    g: '#c1c1c1',
  },

  /** 서 있는 기본 프레임 (다리 포함) */
  torso: [
    '.........aaaaaa...........................aaaaaa.........',
    '.........aaaaaa...........................aaaaaa.........',
    '.......aaaaeeaaaa.......................aaaaeeaaaa.......',
    '.......aaaaeeaaaa.......................aaaaeeaaaa.......',
    '.....aaaaeeeeeeaaaa...................aaaaeeeeeeaaaa.....',
    '.....aaaaccceeeaaaa...................aaaaeeecccaaaa.....',
    '...aaaaeedddeeeeeaaaa................aaaeeeeeddddeaaaa...',
    '...aaaaggdddgeeeeaaaa................aaaeeeegddddgaaaa...',
    '...aaeedddddddeeeeeaa................aaeeeeeddddddeeaa...',
    '...aaeedddddddgeeeeaaa.............aaaaeeeggddddddeeaa...',
    '...aaeeddddddddeeeeaaaaaaaaaaaaaaaaaaaaeeeddddddddeeaa...',
    '...aaeeddddddddeeeeeaaaaaaaaaaaaaaaaaeeeeeddddddddeeaa...',
    '...aaeeddddddddddeaaaeeeeeeeeeeeeeeeaaaaddddddddddeeaa...',
    '...aaeeddddddggddeaaaeeeeeeeeeeeeeeeaaaaedggddddddeeaa...',
    '...aaeeddddddgaaaeeeeeeeeeeeeeeeeeeeeeeeaaagddddddeeaa...',
    '..aaaeedddddaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaadddddeeaaa..',
    '..aaaeedddddaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaadddddeeaaa..',
    '..aaeeeddddaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaadddeeeaaa.',
    '..aaaeeddaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaddeeaaaa.',
    '..aaaeeddaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeacdeeaaaa.',
    '...aaeeaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaeeaa...',
    '...aaeeaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaeeaa...',
    '...aaaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaaa...',
    '...aaaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaaa...',
    '...aaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaa...',
    '....aaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaa....',
    '..aaaaeeeeeeeeedddddddeeeeeeeeeeeeedddddddeeeeeeeeeaaaa..',
    '..aaaaeeeeeeeedddddddddeeeeeddeeeedddddddddeeeeeeeeaaaa..',
    '..aaeeeeeeeeedddddddddddeaeddddeedddddddddddeeeeeeeeeaa..',
    '..aaeeeeeeeeedddddddddddeaeddddeedddddddddddeeeeeeeeeaa..',
    'aaaaeeeeeeeeeedddddddddeeaddddddeedddddddddeeeeeeeeeeaaaa',
    'aaaaeeeeeeeeeeedddddddeeedddddddeeedddddddeeeeeeeeeeeaaaa',
    'aaeeeeeeeeeeeeeeeeeeeeeeedddddddeeeeeeeeeeeeeeeeeeeeeeeaa',
    'aaeeeeeeeeeeeeeedddddddddddddddddddddddddeeeeeeeeeeeeeeaa',
    'aaeeeeeeeeeeeeegdddddddddddddddddddddddddgeeeeeeeeeeeeeaa',
    'aaeeeeeeeeeeeeedddddddddddddddddddddddddddeeeeeeeeeeeeeaa',
    'aaeeeeeeeeeedddddddddddddddddddddddddddddddddeeeeeeeeeeaa',
    'aaeeeeeeddddddddddaaaadddddddddddddaaaaddddddddddeeeeeeaa',
    'aaeeeedddddddddddaaaaaadddddddddddaaaaaadddddddddddeeeeaa',
    'aaeedddddddddddddaaaaaadddddddddddaaaaaadddddddddddddeeaa',
    'aadddddddddddddddaaaaaadddddccddddaaaaaaddddddddddddddaaa',
    'aadddddddddddbbbbdaaaadddddfaadddddaaaadbbbbdddddddddddaa',
    '..aaddddddddbbbbbbddddddddddaddddddddddbbbbbbddddddddaa..',
    '..aadddddddbbbbbbbbdddddddaaddaaddddddbbbbbbbbdddddddaa..',
    '..aagdddddddbbbbbbdddddddddddddddddddddbbbbbbdddddddgaa..',
    '..aagddddddddbbbbdddddddddddddddddddddddbbbbddddddddgaa..',
    '...aadddddddddddddddddddddddddddddddddddddddddddddddaa...',
    '...aadddddddddddddddddddddddddddddddddddddddddddddddaa...',
    '...aaggdddddddddddddddddddddddddddddddddddddddddddggaa...',
    '.....aaggdddddddddddddddddddddddddddddddddddddddggaa.....',
    '.....aaggdddddddddddddddddddddddddddddddddddddddggaa.....',
    '.......aaggdddddddddddddddddddddddddddddddddddggaa.......',
    '.......aaggdddddddddddddddddddddddddddddddddddggaa.......',
    '.........aaaaggggdddddddddddddddddddddddggggaaaa.........',
    '............aaaaggggdddddddddddddddddgggggaaa............',
    '.............aaaggggdddddddddddddddddgggggaaa............',
    '...........aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa...........',
    '..........aaadddddgggggggggggggggggggggdddddaaa..........',
    '..........aaddddddddddgggggggggggggddddddddddda..........',
    '........aadddddddddddddddddddddddddddddddddddddaa........',
    '.......aaaddddddddddddddddddddddddddddddddddddddaa.......',
    '.......aadddddddddddddddgggggggggdddddddddddddddaa.......',
    '.......aaddddddddddddddgggggggggggddddddddddddddda.......',
    '.....aaddddddggddddddggggggggggggggdddddddddddddddaa.....',
    '.....aadddddgggdddddggggggggggggggggddddddgggdddddaa.....',
    '.....aaaddddgadddddgggggggggggggggggggdddddaggddddaa.....',
    '.......aadddgadddddgggggggggggggggggggdddddaggddaa.......',
    '........aaaaaadddddgggggggggggggggggggdddddaaaaaa........',
    '.........aaaaadddddgggggggggggggggggggdddddaaaaa.........',
    '.............adddddgggggggggggggggggggdddddaa............',
    '.............addddddgggggggggggggggggddddddaa............',
    '.............aggddddgggggggggggggggggddddggaa............',
    '.............aggdddddgggggggggggggggdddddggaa............',
    '.............aggggdddddgggggggggggddddddgggaa............',
    '..............aaggddddddgggggggggdddddddgga..............',
    '..............aaggddddddddddddddddddddddgaa..............',
    '..............aaggddddddddddddddddddddddgaa..............',
    '..............aaggddddddaaaaaaaaaddddddggaa..............',
    '...............aagddddddaa.....aaddddddgaa...............',
    '...............aagdddddaaa.....aaadddddgaa...............',
    '.................aagggga.........agggggaa................',
    '.................aaagaaa.........aaagaaa.................',
    '..................aaaaa...........aaaaa..................',
  ],

  /** 실루엣이 갈라지는 지점부터가 다리. 걷기는 이 아래 행만 갈아끼운다. */
  legTop: 78,
  legFrames: {
    stand: [
      '...............aagddddddaa.....aaddddddgaa...............',
      '...............aagdddddaaa.....aaadddddgaa...............',
      '.................aagggga.........agggggaa................',
      '.................aaagaaa.........aaagaaa.................',
      '..................aaaaa...........aaaaa..................',
    ],
    stepLeft: [
      '................aagdddddaaa....aaddddddgaa...............',
      '..................aagggga......aaadddddgaa...............',
      '..................aaagaaa........agggggaa................',
      '...................aaaaa.........aaagaaa.................',
      '..................................aaaaa..................',
    ],
    stepRight: [
      '...............aagddddddaa....aaadddddgaa................',
      '...............aagdddddaaa......agggggaa.................',
      '.................aagggga........aaagaaa..................',
      '.................aaagaaa.........aaaaa...................',
      '..................aaaaa..................................',
    ],
  },

  /** 눈 감기(깜빡임/잠)용 좌표 */
  eyes: { left: { x: 17, y: 37, w: 6, h: 5 }, right: { x: 34, y: 37, w: 6, h: 5 }, fill: 'd', line: 'a' },

  /** 눈높이에서 잰 얼굴 가로 중심(도트). 좌우 반전 보정에 쓴다 */
  faceCx: 28,

  /** 원본 도트가 바라보는 방향 (1=오른쪽). 꼬리처럼 방향이 있는 부위 때문에 필요하다 */
  artFacing: 1,

  lines: ["한 입만?","배고파…","케첩 어딨어"],
};
