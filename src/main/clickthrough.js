'use strict';

/**
 * 클릭 통과(click-through) 토글 전담 모듈.
 *
 * 이 앱의 핵심 트릭:
 *   - 평소에는 win.setIgnoreMouseEvents(true, { forward: true }) 상태.
 *     → 마우스 이벤트가 아래 창으로 그대로 통과하고, 동시에 mousemove 만
 *       렌더러로 "forward" 되어 히트 테스트를 계속할 수 있다.
 *   - 커서가 캐릭터 히트박스 안으로 들어오면 렌더러가 IPC로 알려주고
 *     setIgnoreMouseEvents(false) 로 바꿔 클릭/드래그를 받는다.
 *   - 히트박스를 벗어나면 다시 통과 모드로 되돌린다.
 *
 * 상태 전환이 잦기 때문에 현재 상태를 캐시해서 동일 상태 재설정은 건너뛴다.
 * (macOS에서 setIgnoreMouseEvents 를 매 프레임 호출하면 커서 깜빡임이 생김)
 */

const FORWARD_OPTS = { forward: true };
const DEBUG = process.env.PET_DEBUG === '1';

function createClickThrough(win) {
  /** @type {boolean|null} null = 아직 한 번도 적용 안 함 */
  let interactive = null;
  let lastChangeAt = 0;

  function apply(next) {
    if (!win || win.isDestroyed()) return;
    if (interactive === next) return;
    interactive = next;
    lastChangeAt = Date.now();
    if (DEBUG) {
      console.log(`[clickthrough] interactive=${next}`);
    }
    if (next) {
      // 캐릭터 위 — 클릭/드래그를 이 창이 받는다.
      win.setIgnoreMouseEvents(false);
    } else {
      // 빈 공간 — 아래 창으로 통과. forward 로 mousemove 는 계속 수신.
      win.setIgnoreMouseEvents(true, FORWARD_OPTS);
    }
  }

  // 초기 상태는 반드시 통과 모드.
  apply(false);

  return {
    setInteractive(next) {
      apply(Boolean(next));
    },
    isInteractive() {
      return interactive === true;
    },
    /** 창을 다시 만들었거나 포커스 이슈로 상태가 꼬였을 때 강제 재적용 */
    reset() {
      interactive = null;
      apply(false);
    },
    debugInfo() {
      return { interactive, lastChangeAt };
    },
  };
}

module.exports = { createClickThrough };
