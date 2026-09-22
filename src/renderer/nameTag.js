'use strict';

/**
 * 이름표. 어두운 반투명 캡슐 + 왼쪽 상태 점.
 * 레퍼런스처럼 점은 캡슐 **바깥** 왼쪽에 붙고, 색은 Apple 시스템 컬러를 쓴다.
 *
 * 말풍선과 마찬가지로 DOM 이다 — 텍스트·라운드 캡슐은 캔버스로 그리면
 * 폰트 힌팅이 흐려지고 이름 길이에 맞춰 캡슐을 재는 일도 번거롭다.
 */

/** 위쪽 여유가 이보다 적으면 머리 아래로 뒤집어 표시한다 */
const FLIP_MARGIN = 6;
/** 머리 꼭대기와 이름표 사이 간격 */
const GAP = 4;
/** 이름표 대략 높이 — 말풍선을 그 위로 띄우는 데 쓴다 */
export const TAG_HEIGHT = 20;

export function createNameTags({ layer }) {
  /** @type {Map<object, {el: HTMLElement, dot: HTMLElement, label: HTMLElement, activity: string, text: string}>} */
  const tags = new Map();
  /** characterId → 사용자가 바꾼 이름 (Phase 5 에서 저장/복원) */
  const custom = new Map();
  let visible = true;

  function nameOf(pet) {
    return custom.get(pet.character.id) || pet.character.name;
  }

  function ensure(pet) {
    let tag = tags.get(pet);
    if (tag) return tag;
    const el = document.createElement('div');
    el.className = `nametag nametag--${pet.character.id}`;
    const dot = document.createElement('i');
    dot.className = 'nametag__dot';
    const label = document.createElement('span');
    label.className = 'nametag__label';
    el.append(dot, label);
    layer.appendChild(el);
    tag = { el, dot, label, activity: '', text: '' };
    tags.set(pet, tag);
    return tag;
  }

  return {
    get visible() {
      return visible;
    },
    setVisible(next) {
      visible = Boolean(next);
      layer.style.display = visible ? '' : 'none';
    },
    /** 설정에서 이름을 바꿀 때 */
    setName(characterId, name) {
      const trimmed = (name || '').trim();
      if (trimmed) custom.set(characterId, trimmed);
      else custom.delete(characterId);
    },
    names() {
      return Object.fromEntries(custom);
    },
    nameOf,

    /** 펫이 사라졌으면 이름표도 치운다 */
    prune(pets) {
      for (const [pet, tag] of tags) {
        if (!pets.includes(pet)) {
          tag.el.remove();
          tags.delete(pet);
        }
      }
    },

    update(pets) {
      if (!visible) return;
      for (const pet of pets) {
        const tag = ensure(pet);
        const text = nameOf(pet);
        if (tag.text !== text) {
          tag.label.textContent = text;
          tag.text = text;
        }
        const activity = pet.activity();
        if (tag.activity !== activity) {
          tag.dot.dataset.state = activity;
          tag.activity = activity;
        }

        const anchor = pet.headAnchor();
        // 화면 위쪽에 붙으면 머리 아래로 뒤집는다
        const below = anchor.y - TAG_HEIGHT - GAP < FLIP_MARGIN;
        tag.el.classList.toggle('nametag--below', below);
        tag.el.style.left = `${Math.round(anchor.x)}px`;
        tag.el.style.top = `${Math.round(anchor.y + (below ? GAP : -GAP))}px`;
      }
    },
  };
}
