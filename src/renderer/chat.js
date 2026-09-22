'use strict';

/**
 * 말풍선. 캔버스가 아니라 DOM 으로 그린다 —
 * 한글 입력(IME 조합)은 진짜 <input> 이 있어야 제대로 동작한다.
 *
 * 창은 항상 focusable 이지만 클릭 통과 때문에 평소엔 포커스를 안 가져간다.
 * 입력창을 열 때만 앱 활성화를 요청한다 (Dock 숨긴 앱은 그래야 키가 온다).
 */

const SAY_MS = 4200;
const FADE_MS = 400;

export function createChat({ layer, requestFocus }) {
  /** @type {{pet: object, el: HTMLElement, until: number}[]} */
  const said = [];
  /** @type {{pet: object, el: HTMLElement, input: HTMLInputElement}|null} */
  let editing = null;
  let onSubmit = () => {};

  function makeBubble(pet, extraClass) {
    const el = document.createElement('div');
    // 캐릭터별 말풍선 디자인은 index.html 의 .bubble--<id> 에 있다
    el.className = `bubble bubble--${pet.character.id} ${extraClass}`;
    layer.appendChild(el);
    return el;
  }

  function place(el, pet) {
    const anchor = pet.headAnchor();
    el.style.left = `${Math.round(anchor.x)}px`;
    el.style.top = `${Math.round(anchor.y)}px`;
  }

  function closeEditor(commit) {
    if (!editing) return;
    const { pet, el, input } = editing;
    const text = input.value.trim();
    editing = null;
    el.remove();
    if (commit && text) say(pet, text);
    onSubmit(pet, commit ? text : null);
  }

  function say(pet, text) {
    // 한 마리당 말풍선 하나만
    for (let i = said.length - 1; i >= 0; i--) {
      if (said[i].pet === pet) {
        said[i].el.remove();
        said.splice(i, 1);
      }
    }
    const el = makeBubble(pet, 'bubble--say');
    el.textContent = text;
    place(el, pet);
    said.push({ pet, el, until: performance.now() + SAY_MS });
  }

  return {
    get isOpen() {
      return editing !== null;
    },
    get target() {
      return editing ? editing.pet : null;
    },
    set onSubmit(fn) {
      onSubmit = fn;
    },

    /** 클릭한 펫 머리 위에 입력창을 연다 */
    open(pet) {
      if (editing && editing.pet === pet) return;
      closeEditor(false);

      const el = makeBubble(pet, 'bubble--edit');
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 60;
      input.placeholder = pickLine(pet) || '말 걸어보기…';
      el.appendChild(input);
      editing = { pet, el, input };
      place(el, pet);

      requestFocus();
      // 앱 활성화가 실제로 넘어온 다음에 잡아야 캐럿이 들어온다
      requestAnimationFrame(() => requestAnimationFrame(() => input.focus()));

      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.isComposing) closeEditor(true);
        else if (e.key === 'Escape') closeEditor(false);
      });
      input.addEventListener('blur', () => {
        // 다른 앱으로 포커스가 나가면 조용히 닫는다
        if (editing && editing.input === input) closeEditor(true);
      });
    },

    close(commit = false) {
      closeEditor(commit);
    },

    say,

    /** 매 프레임 호출 — 말풍선이 펫을 따라다니고 수명이 끝나면 사라진다 */
    update(now) {
      let alive = false;
      if (editing) {
        place(editing.el, editing.pet);
        alive = true;
      }
      for (let i = said.length - 1; i >= 0; i--) {
        const s = said[i];
        place(s.el, s.pet);
        const left = s.until - now;
        if (left <= 0) {
          s.el.remove();
          said.splice(i, 1);
          continue;
        }
        if (left < FADE_MS) s.el.style.opacity = String(left / FADE_MS);
        alive = true;
      }
      return alive;
    },

    /** 펫이 화면에서 빠졌을 때 그 말풍선을 치운다 */
    forget(pet) {
      for (let i = said.length - 1; i >= 0; i--) {
        if (said[i].pet !== pet) continue;
        said[i].el.remove();
        said.splice(i, 1);
      }
    },

    /** 커서가 입력창 위에 있는지 — 클릭 통과를 여기서만 끄기 위해 */
    hitTest(x, y) {
      if (!editing) return false;
      const r = editing.el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    },

    /** 입력창이 열려 있거나 말풍선이 떠 있으면 true */
    get busy() {
      return editing !== null || said.length > 0;
    },
  };
}

function pickLine(pet) {
  const lines = pet.character.lines;
  if (!lines || !lines.length) return null;
  return lines[Math.floor(Math.random() * lines.length)];
}
