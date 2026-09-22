'use strict';

/**
 * 히트 상태가 "바뀔 때만" 콜백을 부른다.
 * mousemove 는 초당 수십~수백 번 들어오므로 매번 IPC 를 보내면 안 된다.
 */
export function createHitTracker({ onChange }) {
  let interactive = false;
  let initialized = false;

  return {
    update(next) {
      const value = Boolean(next);
      if (initialized && value === interactive) return;
      initialized = true;
      interactive = value;
      onChange(value);
    },
    isInteractive() {
      return interactive;
    },
  };
}
