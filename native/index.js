'use strict';

/**
 * Mission Control(F3)·Exposé 가 창을 건드리지 않게 한다.
 *
 * Electron 은 NSWindow 의 collectionBehavior 를 열어주지 않는다. 그래서 딱 그
 * 한 줄만 건드리는 모듈을 따로 둔다. macOS 전용이고, 빌드가 없거나 다른 OS 면
 * 조용히 아무것도 안 한 것으로 친다 — 펫은 그대로 돌아가고 F3 때만 사라진다.
 */

let native = null;
if (process.platform === 'darwin') {
  try {
    native = require('./build/Release/stationary.node');
  } catch (err) {
    console.warn('[stationary] 네이티브 모듈을 못 불러왔다 —', err.message);
  }
}

/**
 * @param {import('electron').BrowserWindow} win
 * @param {boolean} on
 * @returns {boolean} 실제로 적용됐는지
 */
function setStationary(win, on = true) {
  if (!native || !win || win.isDestroyed()) return false;
  try {
    return native.setStationary(win.getNativeWindowHandle(), on) === true;
  } catch (err) {
    console.warn('[stationary] 적용 실패 —', err.message);
    return false;
  }
}

module.exports = { setStationary, available: Boolean(native) };
