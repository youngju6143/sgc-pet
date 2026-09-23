'use strict';

/**
 * 구라베 — 구라베.png 에서 자동 추출.
 * 직접 고치지 말 것: `node tools/extract-characters.mjs` 로 다시 생성된다.
 */

export default {
  id: 'rave',
  name: '구라베',

  width: 64,
  height: 75,

  // 원본에서 뽑은 팔레트 (a = 외곽선/눈)
  palette: {
    a: '#331408',
    b: '#db9567',
    c: '#e0d4c8',
    d: '#8f6047',
    e: '#a67052',
    f: '#81472f',
    g: '#b1998a',
    h: '#a58775',
    i: '#dfab79',
    j: '#d3b9ab',
    k: '#eebb8f',
  },

  /** 서 있는 기본 프레임 (다리 포함) */
  torso: [
    '........aaaaaaa..............................aaaaaaa............',
    '......aaaahhhaaaaa........................aaaaahhhaaaa..........',
    '....aaaacccccccaaaaa....aaaaaaaaaaaa.....aaaacccccccaaaa........',
    '....aacccccccccccaaa....aaaaaaaaaaaa....aaacccccccccccaa........',
    '..aaccccccccccccccaaaaaaaiiiiiiiiiiaaaaaaacccccccccccccca.......',
    '..aaccccfffffcccccaaaaaaiiiiiiiiiiiiaaaaaacccccffffecccca.......',
    '..aacccfffffffcccaeeiiiiiiiiiiiiiiiiiiiieeaccefffffffccca.......',
    '..aacccffffffffdcaiiiiiiiiiiiiiiiiiiiiiiiiacfffffffffccca.......',
    '.aaacccfffffffaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiaafffffffcccaaa.....',
    '.aaacccffffffaeiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaaffffffcccaaa.....',
    '.aaacccffffaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaaffffcccaaa.....',
    '.aaacccffffaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaaffffcccaaa.....',
    '.aaaccccfaaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaaafccccaaa.....',
    '.aaaccccaaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaccccaaa.....',
    '..aaccccaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiacccca.......',
    '..aacccaiiiiiiiifffffffiiiiiiiiiiiiiifffffffiiiiiiiiaccca.......',
    '....aacaiiiiiiifcccccccfiiiiiiiiiiiifcccccccfiiiiiiiacaa........',
    '....aaaaiiiiiifcccccccccfiiiiiiiiiifcccccccccfiiiiiiadaa........',
    '....aaeiiiiiifcccccccccccfiiiiiiiifcccccccccccfiiiiiiaaa........',
    '....aaiiiiiiifcccccccccccfiiiiiiiifcccccccccccfiiiiiiiaa........',
    '..aaaiiiiiiiiifcccccccccfiiiiiiiiiifcccccccccfiiiiiiiiiaa.......',
    '..aaiiiiiiiiiiifcccccccfiiiiiiiiiiiifcccccccfiiiiiiiiiiaa.......',
    '..aaiiiiiiiiiiiifffffffiiiiiiiiiiiiiifffffffiiiiiiiiiiiaa.......',
    '.aaaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaaa.....',
    '.aaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaa.....',
    '.aaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaa.....',
    '.aaiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiaa.....',
    '.aaiiiiiiiiiiiiiiiiaaaaiiiiiiiiiiiiiiaaaaiiiiiiiiiiiiiiiiaa.....',
    'aaiiiiiiiiiiiiiiiiaaaaaaiiiiiiiiiiiiaaaaaaiiiiiiiiiiiiiiiiaa....',
    'aaiiiiiiiiiiiiiiiiaaaaaaiiicccccciiiaaaaaaiiiiiiiiiiiiiiiiaa....',
    'aaiiiiiiiiiiiikkkkaaaaaaicccccccccciaaaaaakkkkiiiiiiiiiiiiaa....',
    'aaiiiiiiiiiiikkiiiiaaaaiiccccaacccciiaaaaiiiikkiiiiiiiiiiiaa....',
    'aaiiiiiiiccbbbbiiciiiiiiiccccahcccciiiiiiikiibbbbcciiiiiiiaa....',
    'aaiiiiiiccbbbbbbicciikcccccaaccaacccckkiiciibbbbbbcciiiiiiaa....',
    'aaaiiicccbbbbbbbbiiiikccccccccccccccckkiiiibbbbbbbbcciiiiaaa....',
    '.aaiicccccbbbbbbiiiiikccccccccccccccckkiiiiibbbbbbcccckiiaa.....',
    '.aaiiccccckbbbbiiiiikkkcccccccccccccckkkiiiiibbbbcccccciiaa.....',
    '.aaicccccckkkkkiiiikkkkkcccccccccccckkkkkiiiikkkkkcccccciaa.....',
    '..aacccccckkkkkkkkkkkkkkkcccccccccckkkkkkkkkkkkkkkccccccaa......',
    '..aacccccckkkkkkkkkkkkkkkkcccccccckkkkkkkkkkkkkkkkcccccaa.......',
    '....aacccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkccccaa........',
    '....aacccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkccccaa........',
    '....aaaccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkccccaaa........',
    '.....aaacckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcccaa..........',
    '.......aaackkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcaa............',
    '........aaakkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkaaaa............',
    '..........aaaakkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkaaaa..............',
    '...........aaaaaaakkkkkkkkkkkkkkkkkkkkkkkkaaaaaaa...............',
    '..............aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..................',
    '............aaaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaa.................',
    '............aaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeea.......aaaaaa....',
    '...........aaaeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeaaa...aaaaaaaaa...',
    '..........aaeeeeeeeeeeeeeeejjjjjjeeeeeeeeeeeeeeaaaaaaaaaffiaaaa.',
    '.........aeeeeeeeeeeeeeeejjjjjjjjjjeeeeeeeeeeeeeeaaaiaffffiiiaa.',
    '.......aaaeeeeeeefeeeeeejjjjjjjjjjjjeeeeeefeeeeeeeaaiifffffiiaa.',
    '.......aaeeeeeeeffeeeeejjjjjjjjjjjjjjeeeeeffeeeeeedaiiiffffiiiaa',
    '.......aaeeeeeeefeeeeejjjjjjjjjjjjjjjjeeeeefeeeeeefaiiiffffeiiaa',
    '.......aaeeeeeeefeeeejjjjjjjjjjjjjjjjjeeeeefeeeeeefaiiiiffffiiaa',
    '........aaeeeaaaeeeeejjjjjjjjjjjjjjjjjeeeeefaaaeedaaiiiiffffiiaa',
    '.........aaaaaaaeeeeejjjjjjjjjjjjjjjjjeeeeeeaaaaaaaiiiiiffffiiaa',
    '..........aaa.aaeeeeejjjjjjjjjjjjjjjjjeeeeeeaaaaaaffiiiiffffiiaa',
    '..............aaeeeeejjjjjjjjjjjjjjjjjeeeeeeafiiffffiiiifffaiaa.',
    '..............aaeeeeejjjjjjjjjjjjjjjjjeeeeeeaiiiefffiiiifffaiaa.',
    '..............aaeeeeeejjjjjjjjjjjjjjjjeeeeeeaiiiifffiiiiffaia...',
    '..............aaeeeeeeejjjjjjjjjjjjjjeeeeeeeaiiiiffffeiiaaaaa...',
    '..............aaeeeeeeeejjjjjjjjjjjjeeeeeeeeaiiiiffffaiaaaaa....',
    '...............aaeeeeeeeijjjjjjjjjjeeeeeeeeaaaiiiffaaaaaaa......',
    '...............aaeeeeeeeeeeeeeeeeeeeeeeeeeaaaaaiaaaaaaa.........',
    '...............aaaeeeeeeeeeeeeeeeeeeeeeeeeaa.aaaaaaaa...........',
    '................aaeeeeeeeeaaaaaaaaeeeeeeeea.....................',
    '................aaeeeeeeeaa......aaeeeeeeea.....................',
    '.................aaeeeeeaa........aaeeeeaa......................',
    '.................aaaeeeeaa........aaeeeeaa......................',
    '...................aaaaaa..........aaaaaa.......................',
    '....................aaaa............aaaa........................',
  ],

  /** 실루엣이 갈라지는 지점부터가 다리. 걷기는 이 아래 행만 갈아끼운다. */
  legTop: 70,
  legFrames: {
    stand: [
      '................aaeeeeeeeaa......aaeeeeeeea.....................',
      '.................aaeeeeeaa........aaeeeeaa......................',
      '.................aaaeeeeaa........aaeeeeaa......................',
      '...................aaaaaa..........aaaaaa.......................',
      '....................aaaa............aaaa........................',
    ],
    stepLeft: [
      '..................aaeeeeeaa......aaeeeeeeea.....................',
      '..................aaaeeeeaa.......aaeeeeaa......................',
      '....................aaaaaa........aaeeeeaa......................',
      '.....................aaaa..........aaaaaa.......................',
      '....................................aaaa........................',
    ],
    stepRight: [
      '................aaeeeeeeeaa......aaeeeeaa.......................',
      '.................aaeeeeeaa.......aaeeeeaa.......................',
      '.................aaaeeeeaa........aaaaaa........................',
      '...................aaaaaa..........aaaa.........................',
      '....................aaaa........................................',
    ],
  },

  /** 눈 감기(깜빡임/잠)용 좌표 */
  eyes: { left: { x: 18, y: 27, w: 6, h: 5 }, right: { x: 36, y: 27, w: 6, h: 5 }, fill: 'i', line: 'a' },

  /** 눈높이에서 잰 얼굴 가로 중심(도트). 좌우 반전 보정에 쓴다 */
  faceCx: 29.5,

  /** 원본 도트가 바라보는 방향 (1=오른쪽). 꼬리처럼 방향이 있는 부위 때문에 필요하다 */
  artFacing: -1,

  lines: ["냐세요~","짐이로다","웅냥ㄴㅇ냥","오 예 쑨대~!"],
};
