'use strict';

/**
 * 캐릭터 레지스트리.
 * 캐릭터 파일은 tools/extract-characters.mjs 가 원본 PNG 에서 생성한다.
 */

import chodang from './chodang.js';
import rave from './rave.js';
import mangnani from './mangnani.js';
import mongsuk from './mongsuk.js';
import ponzoo from './ponzoo.js';

export const CHARACTERS = [chodang, rave, mangnani, mongsuk, ponzoo];

export const CHARACTERS_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id) {
  return CHARACTERS_BY_ID[id] || CHARACTERS[0];
}
