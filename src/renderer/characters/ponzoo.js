'use strict';

/**
 * 장폰주 — 장폰주.png 에서 자동 추출.
 * 직접 고치지 말 것: `node tools/extract-characters.mjs` 로 다시 생성된다.
 */

export default {
  id: 'ponzoo',
  name: '장폰주',

  width: 72,
  height: 81,

  // 원본에서 뽑은 팔레트 (a = 외곽선/눈)
  palette: {
    a: '#38200a',
    b: '#f8d6b9',
    c: '#b48e54',
    d: '#fdf7e3',
    e: '#e8d09d',
    f: '#624424',
    g: '#eaad5a',
    h: '#f5e1af',
    i: '#dcdcdc',
  },

  /** 서 있는 기본 프레임 (다리 포함) */
  torso: [
    '...........................aaffffffffffffaa.............................',
    '..........................aaaffffffffffffaa.............................',
    '.......................aaaahhhhhhhhhhhhhhhhaaaa.........................',
    '.......................aaaahhhhhhhhhhhhhhhhaaaa.........................',
    '....................aaaaahhhhhhhhhhhhhhhhhhhhhaaaa......................',
    '....................aaahdddhhhhhhhhhhhhhhhhhhhaaaa......................',
    '..................aahhhdddddhhhhhhhhhhhhhhhhhhhhgaaaaaaaaa..............',
    '.............aaaaaaahhhdddddhhhhhhhhhhhhhhhhhhhhgaaaaaaaaa..............',
    '.............aaaaaaahhhdddddhhhhhhhhhhhhhhhhhhhhhhffhhhhhaa.............',
    '...........aahhhhhhhhhhddddhhhhhhhhhhhhhhhhhhhhhhhcchhhhhaaaa...........',
    '...........aahhhhhhhhhhdddhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaa...........',
    '.........aaahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaa..........',
    '........aaahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaaa........',
    '........aahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaaa........',
    '........aahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaa........',
    '.....aaaaaaghhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhgfaaaa......',
    '.....aaaaaffhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhcfaaaa......',
    '....aaeeeeeefffhhhheehhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhfffffgeeeeeaa....',
    '....aaeeeeeefffhhhheehhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhfffffgeeeeeaa....',
    '..aaeeeeeeffeegffeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhhhhhffgeeeeffeeeeeeaa..',
    '..aageeeeeffeeeffeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhhhhhffggeeeffgeeeegaa..',
    '..aageeecfeegggggffeeeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhffgggggeeffeeggaa..',
    '..aaggegcfeegggggffeeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhhffgggggeeffeeggaa..',
    '..aaaggfcegggggggffehhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhffgggggeeeffgaaaa..',
    '....aagfcggggggggffhhhhhhhhhhhhhhhhhheeehhhhhhhhhhhhhffcccgggegffgaa....',
    '....aagfcggggcfffehhhhhaaaaaaahhhhheeffeeeaaaaaaahhhhhhfffgggggffgaa....',
    '....aaffcggggcfffehhhhagggggggahhhheeffeeagggggggahhhggfffgggggfgcaa....',
    '....aahhcfgggggffhhhhaggggggggggaheffddfggggggggggahhffggggggggfhhaa....',
    '..aahhhhcfgggggffhhhhagggggggggghechhddeggggggggggahhhhffggggccchhhhaa..',
    '..aahhhhhhfffffeehhhhhaggggggggaeefdddddaggggggggahhhhhffggggffhhhhhaa..',
    '..aahhhhhhfffffeeeeeeeeaaaaaaaaefcdddddddaafaaaaaeehhhheeffffhhhhhhhaa..',
    'aaaahhhhhhhhhffeeeeeeeeeeeeeeeeefgddddddddffeeeeeeehhhhheffffhhhhhhhaaaa',
    'aahhhhhhhhhhhheffeeeeeffffffffffddddddddddddffffffeeeeeffhhhhhhhhhhhhhaa',
    'ffhhhhhhhhhhhheffeeeeeffffffffffddddddddddddffffffeeeeeafhhhhhhhhhhhhhff',
    'ffhhhhhhhhhhhhheefffffddddddddddddddddddddddddddddfffffhhhhhhhhhhhhhhhff',
    'ffhhhhhhhhhhhhheeccfccddddddddddddddddddddddddddddddffehhhhhhhhhhhhhhhff',
    'ffhhhhhhhhhhhhhhheefddddddddddddddddddddddddddddddddfgehhhhhhhhhhhhhhhaa',
    'aahhhhhhhhhhhhhhhhhhfhdddddddddddddddddddddddddddddfhhhhhhhhhhhhhhhhhhaa',
    'aaaahhhhhhhhhhhhhhhhfhdaaaaaaaaddddddddddaaaaaaaadhfhhhhhhhhhhhhhhhhaa..',
    '..aahhhhhhhhhhhhhhhhfhdaaaaaiiaddddddddddaaaaaiiaddfhhhhhhhhhhhhhhhhaa..',
    '..aahhhhhhhhehhhhhhhfedaaaaaiiaddddddddddaaaaaiiaddfhhhhhhhhheehhhhhaa..',
    '..aahhhhhhhhehhhhhhhfedaaaaaaaaddddcgddddaaaaaaaaddfhhhhhhhhheehhhhhaa..',
    '....aahhheeehhhhhhhhfebbaaiafadddddffdddddaaiafabbbfhhhhhhhhhheeehaa....',
    '....aahhheeehhhhhhhhfbbbbaaaadddddfddfdddddaaaabbbbfhhhhhhhhhheeehaa....',
    '.....aaaahhhhhhhhhffbbbbbbbdddddddfddfdddddddddbbbbbfchhhhhhhhhhaa......',
    '.......aahhhhhhhhffbbbbbbbbdddddddddddddddddddbbbbbbbffhhhhhhhhhaa......',
    '.......aahhhhhhhhffbbbbbbbddddddddddddddddddddbbbbbbbffhhhhhhhhhaa......',
    '.......aahhhhhhhhhffbbbbbddddddddddddddddddddddbbbbbfghhhhhhhhhhaa......',
    '.......aahhhhhhhhhecffddddddddddddddddddddddddddddffchhhhhhhhhhhaa......',
    '.......aahhhhhhhhhhhffddddddddddddddddddddddddddddffhhhhhhhhhhhhaa......',
    '.......aaahhhhhhhhhhhhffddddddddddddddddddddddddffhhhhhhhhhhhhaaa.......',
    '.........aahhhhhhhhhhhffddddddddddddddddddddddddffhhhhhhhhhhhhaa........',
    '.........aaahhhhhhhhhhffddddddddddddddddddddddddffhhhhhhhhhhaa..........',
    '..........aahhhhhhhhhhffffffddddddddddddddddffffffhhhhhhhhhhaa..........',
    '............aaaahhhhffcggggggggggggggggggggghhhhhhfchhhhhaaa............',
    '............aaaahhhhffhhhhhhffffffffffffffffhhhhhhffhhhhhaaa............',
    '...............aaaffhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhfffaa...............',
    '...............aaaffhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhfffaa...............',
    '................aahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaa...............',
    '..............aahhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhaa..............',
    '..............aahhhhhhheehhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhea..............',
    '............aaddeehhheeeehhhhhhhhhhhhhhhhhhhhhhhhhhhhhggddaa............',
    '............aaddddgeheeeehhhhhhhhhhhhhhhhhhhhhhhhhhhheedddaa............',
    '............aaddddcgeeeeeehhhhhhhhhhhhhhhhhhhhhhehhhhggdddaa............',
    '............aadddddffgeeeehhhhhhhhhhhhhhhhhhhhhhhegffeddddaa............',
    '............aadddddffgeeeehhhhhhhhhhhhhhhhhhhhhhheeffcddddaa............',
    '..............aaaaaaeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhaaaaaa..............',
    '..............aaaaaaeeeeeeeehhhhhhhhhhhhhhhhhhhhhhhhaaaaaa..............',
    '...................aeeeeeeeeeehhheeehhhhhhhhhhhhhhhhaa..................',
    '...................aaeeeeeeeeehhheeehhhhhhhhhhhhhhaaa...................',
    '....................aaeeeeeeeeeeeeeehhhhhhhhhhhhhhaa....................',
    '....................aaeeeeeeeeeeeeeeeehhhhhhhhhhheaa....................',
    '....................aaeeeeeeeeeeeeeeeehhhhhhhhhhheaa....................',
    '....................aaaeeeeeeeeeeeeeeeeeeehhhhhheeaa....................',
    '......................aaeeeeeeeeeeaaaaeeeeeeeeeeea......................',
    '......................aaaeeeeeeeeeaaaaaaeeeeeeeaaa......................',
    '.......................aaeeegggeaa....aaeeeeeeeaa.......................',
    '.........................aaddddaa.......adddddaa........................',
    '.........................aaddddaa.......aaddddaa........................',
    '..........................aafaa..........aafaa..........................',
    '..........................aafaa..........aafaa..........................',
  ],

  /** 실루엣이 갈라지는 지점부터가 다리. 걷기는 이 아래 행만 갈아끼운다. */
  legTop: 76,
  legFrames: {
    stand: [
      '.......................aaeeegggeaa....aaeeeeeeeaa.......................',
      '.........................aaddddaa.......adddddaa........................',
      '.........................aaddddaa.......aaddddaa........................',
      '..........................aafaa..........aafaa..........................',
      '..........................aafaa..........aafaa..........................',
    ],
    stepLeft: [
      '..........................aaddddaa....aaeeeeeeeaa.......................',
      '..........................aaddddaa......adddddaa........................',
      '...........................aafaa........aaddddaa........................',
      '...........................aafaa.........aafaa..........................',
      '.........................................aafaa..........................',
    ],
    stepRight: [
      '.......................aaeeegggeaa.....adddddaa.........................',
      '.........................aaddddaa......aaddddaa.........................',
      '.........................aaddddaa.......aafaa...........................',
      '..........................aafaa.........aafaa...........................',
      '..........................aafaa.........................................',
    ],
  },

  /** 눈 감기(깜빡임/잠)용 좌표 */
  eyes: { left: { x: 23, y: 38, w: 8, h: 6 }, right: { x: 41, y: 38, w: 8, h: 6 }, fill: 'd', line: 'a' },

  /** 눈높이에서 잰 얼굴 가로 중심(도트). 좌우 반전 보정에 쓴다 */
  faceCx: 35.5,

  /** 원본 도트가 바라보는 방향 (1=오른쪽). 꼬리처럼 방향이 있는 부위 때문에 필요하다 */
  artFacing: 1,

  lines: ["잠깐만 이판만 하고","한 판만 더","…졌다","이거 좀 어려운데"],
};
