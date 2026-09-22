'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * contextIsolation: true 환경. 필요한 채널만 노출한다.
 */
const debug = process.argv.includes('--pet-debug');

contextBridge.exposeInMainWorld('petAPI', {
  /** PET_DEBUG=1 로 실행했는지. 혼잣말 간격 등을 짧게 쓰는 데 쓴다. */
  debug,
  /** 커서가 캐릭터 위에 있는지 메인에 알린다 (클릭 통과 토글) */
  setInteractive(value) {
    ipcRenderer.send('pet:set-interactive', value === true);
  },
  /** 말풍선 입력창을 열 때 앱을 활성화해 키 입력을 받는다 */
  requestFocus() {
    ipcRenderer.send('pet:request-focus');
  },
  /** 현재 오버레이 창의 스크린 좌표 기준 bounds */
  getBounds() {
    return ipcRenderer.invoke('pet:get-bounds');
  },
  /** 저장된 설정 (캐릭터 구성·크기·속도 등) */
  getSettings() {
    return ipcRenderer.invoke('settings:get');
  },
  /** 설정이 바뀌면 통지 — 오버레이는 다시 그리기만 하면 된다 */
  onSettingsChanged(handler) {
    const listener = (_event, settings) => handler(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  /** 메인이 창 크기를 다시 맞췄을 때 통지 */
  onOverlayResized(handler) {
    const listener = (_event, bounds) => handler(bounds);
    ipcRenderer.on('pet:overlay-resized', listener);
    return () => ipcRenderer.removeListener('pet:overlay-resized', listener);
  },
});
