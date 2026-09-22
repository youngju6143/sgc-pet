'use strict';

const { BrowserWindow, app } = require('electron');
const path = require('node:path');

/** @type {BrowserWindow|null} */
let win = null;

/**
 * 설정 창. 한 장만 띄우고, 닫아도 앱은 메뉴바에 남는다.
 * Dock 을 숨긴 앱(accessory)은 창을 띄워도 키 입력이 안 오는 경우가 있어
 * 열 때 명시적으로 앱을 활성화한다.
 */
function openSettingsWindow() {
  if (win && !win.isDestroyed()) {
    app.focus({ steal: true });
    win.show();
    win.focus();
    return win;
  }

  win = new BrowserWindow({
    width: 520,
    height: 660,
    minWidth: 440,
    minHeight: 420,
    title: '야물딱 펫 설정',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1b1d23',
    show: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'settings-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'index.html'));

  win.once('ready-to-show', () => {
    app.focus({ steal: true });
    win.show();
  });

  win.on('closed', () => {
    win = null;
  });

  return win;
}

function closeSettingsWindow() {
  if (win && !win.isDestroyed()) win.close();
  win = null;
}

module.exports = { openSettingsWindow, closeSettingsWindow };
