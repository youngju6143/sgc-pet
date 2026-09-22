'use strict';

const { app, ipcMain } = require('electron');

/**
 * preload 에서 화이트리스트한 채널만 여기서 처리한다.
 * ctx = { clickThrough, getWindow }
 */
function registerIpc(ctx) {
  ipcMain.on('pet:set-interactive', (event, value) => {
    ctx.clickThrough.setInteractive(value === true);
  });

  /**
   * 말풍선 입력창을 열 때 앱을 활성화한다.
   * Dock 을 숨긴 앱(accessory)은 창을 클릭해도 키 입력이 안 오는 경우가 있어
   * 명시적으로 활성화해 준다. setFocusable 을 건드리지 않으므로 깜빡임이 없다.
   */
  ipcMain.on('pet:request-focus', () => {
    const win = ctx.getWindow();
    if (!win || win.isDestroyed()) return;
    app.focus({ steal: true });
    win.focus();
  });

  ipcMain.handle('pet:get-bounds', () => {
    const win = ctx.getWindow();
    if (!win || win.isDestroyed()) return null;
    return win.getBounds();
  });
}

/**
 * 설정 채널은 창이 아니라 앱에 매인다 — 오버레이/설정 창이 열리고 닫혀도
 * 한 번만 등록한다. (handle 을 두 번 등록하면 예외가 난다)
 */
function registerSettingsIpc({ settings, closeSettingsWindow }) {
  ipcMain.handle('settings:get', () => settings.get());
  ipcMain.handle('settings:set', (_event, patch) => settings.merge(patch));
  ipcMain.on('settings:close', () => closeSettingsWindow());
}

function unregisterIpc() {
  ipcMain.removeAllListeners('pet:set-interactive');
  ipcMain.removeAllListeners('pet:request-focus');
  ipcMain.removeHandler('pet:get-bounds');
}

module.exports = { registerIpc, registerSettingsIpc, unregisterIpc };
