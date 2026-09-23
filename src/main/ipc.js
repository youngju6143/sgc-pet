'use strict';

const { app, ipcMain, screen } = require('electron');

/**
 * preload 에서 화이트리스트한 채널만 여기서 처리한다.
 * ctx = { clickThrough, getWindow, setTall }
 */
function registerIpc(ctx) {
  ipcMain.on('pet:set-interactive', (event, value) => {
    ctx.clickThrough.setInteractive(value === true);
  });

  /**
   * 펫을 집거나 던지는 동안만 창을 작업영역 전체 높이로 늘린다.
   * 평소에는 바닥 띠만 덮어서 투명 창이 잡는 GPU 표면을 줄인다.
   */
  ipcMain.on('pet:set-tall', (_event, value) => {
    ctx.setTall?.(value === true);
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

  /**
   * 붙어 있는 모니터 목록. 설정 창에서 어디에 띄울지 고르는 데 쓴다.
   * label 은 macOS 가 주는 모니터 이름("V32UE" 등)인데, 빈 문자열로 올 때가
   * 있어서 그때는 번호로 대신한다.
   */
  ipcMain.handle('settings:displays', () => {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays().map((display, index) => ({
      id: display.id,
      label: display.label || `디스플레이 ${index + 1}`,
      primary: display.id === primaryId,
      width: display.size.width,
      height: display.size.height,
    }));
  });
  ipcMain.handle('settings:set', (_event, patch) => settings.merge(patch));
  ipcMain.on('settings:close', () => closeSettingsWindow());
}

function unregisterIpc() {
  ipcMain.removeHandler('settings:displays');
  ipcMain.removeAllListeners('pet:set-interactive');
  ipcMain.removeAllListeners('pet:set-tall');
  ipcMain.removeAllListeners('pet:request-focus');
  ipcMain.removeHandler('pet:get-bounds');
}

module.exports = { registerIpc, registerSettingsIpc, unregisterIpc };
