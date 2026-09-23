'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/** 설정 창 전용 브리지. 설정 읽기/쓰기와 창 닫기만 열어 둔다. */
contextBridge.exposeInMainWorld('settingsAPI', {
  get() {
    return ipcRenderer.invoke('settings:get');
  },
  /** 바뀐 값만 넘기면 된다. @returns 합쳐진 설정 */
  set(patch) {
    return ipcRenderer.invoke('settings:set', patch);
  },
  /** 지금 붙어 있는 모니터 목록 (오버레이를 띄울 화면 고르기) */
  displays() {
    return ipcRenderer.invoke('settings:displays');
  },
  /** 다른 창(트레이 메뉴 등)에서 바꿨을 때 따라가기 위한 구독 */
  onChanged(handler) {
    const listener = (_event, settings) => handler(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  close() {
    ipcRenderer.send('settings:close');
  },
});
