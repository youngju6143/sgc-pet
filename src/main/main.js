'use strict';

const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('node:path');
const { createClickThrough } = require('./clickthrough');
const { registerIpc, registerSettingsIpc } = require('./ipc');
const settings = require('./settings');
const { createTray } = require('./tray');
const { openSettingsWindow, closeSettingsWindow } = require('./settingsWindow');

/** @type {BrowserWindow|null} */
let win = null;
/** @type {ReturnType<typeof createClickThrough>|null} */
let clickThrough = null;
/** @type {ReturnType<typeof createTray>|null} */
let tray = null;
let resizeTimer = null;

const isDev = !app.isPackaged;

/** 현재 오버레이가 덮어야 할 영역 (주 디스플레이 작업영역) */
/**
 * 오버레이는 작업영역 전체가 아니라 **설정한 너비의 띠**만 덮는다.
 * 화면 전체에 펼쳐지면 펫끼리 너무 멀어져서 옹기종기 모여 있질 못한다.
 * 띠를 좁히면 클릭 통과를 신경 쓸 면적도 같이 줄어든다.
 */
function overlayBounds() {
  const area = screen.getPrimaryDisplay().workArea;
  const { width: ratio = 1, align = 'center' } = settings.get();
  const width = Math.max(240, Math.round(area.width * ratio));
  const offset =
    align === 'left' ? 0 : align === 'right' ? area.width - width : Math.round((area.width - width) / 2);
  const bounds = { x: area.x + offset, y: area.y, width, height: area.height };
  if (isDev) {
    console.log(`[overlay] area=${area.x},${area.y} ${area.width}x${area.height}` +
      ` ratio=${ratio.toFixed(3)} align=${align} -> ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}`);
  }
  return bounds;
}

function createOverlayWindow() {
  const bounds = overlayBounds();

  win = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    // focusable 은 true 로 고정한다. macOS 는 이 값을 바꿀 때 창 스타일 마스크를
    // 갈아서 투명 창이 한 프레임 사라졌다 나타난다(더블클릭 때 특히 티가 난다).
    // 클릭 통과 덕분에 실제로 포커스를 가져가는 건 펫을 직접 눌렀을 때뿐이다.
    focusable: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    // 투명 창이 처음 한 프레임 깜빡이는 걸 막는다.
    show: false,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      // 렌더러에 디버그 여부를 알린다 (혼잣말 간격을 짧게 쓰기 위해)
      additionalArguments: process.env.PET_DEBUG === '1' ? ['--pet-debug'] : [],
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Mission Control(F3)·Exposé 에서 이 창을 빼 둔다.
  // 안 하면 펫이 "창 하나"로 잡혀서, 전체 보기를 누르는 순간 다른 창들과 같이
  // 축소되어 따로 떠 버린다 — 바탕화면에 붙어 있어야 할 물건이라 어색하다.
  win.setHiddenInMissionControl?.(true);

  clickThrough = createClickThrough(win);
  registerIpc({
    clickThrough,
    getWindow: () => win,
  });

  if (isDev) {
    // 렌더러 콘솔/에러를 터미널로 끌어온다 (devtools 없이 디버깅)
    win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      const tag = ['DEBUG', 'LOG', 'WARN', 'ERROR'][level] || 'LOG';
      console.log(`[renderer ${tag}] ${message} (${sourceId}:${line})`);
    });
    win.webContents.on('preload-error', (_e, preloadPath, error) => {
      console.error('[preload error]', preloadPath, error);
    });
  }

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.showInactive(); // 포커스를 뺏지 않고 표시
    tray?.refresh();
  });

  win.on('closed', () => {
    win = null;
    clickThrough = null;
  });

  if (isDev && process.env.PET_DEVTOOLS === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

/** 모니터 연결/해제·해상도 변경 시 창 크기를 다시 맞춘다. */
function syncOverlayBounds() {
  if (!win || win.isDestroyed()) return;
  const next = overlayBounds();
  const current = win.getBounds();
  if (
    current.x === next.x &&
    current.y === next.y &&
    current.width === next.width &&
    current.height === next.height
  ) {
    return;
  }
  win.setBounds(next);
  // 창을 다시 잡으면 always-on-top 레벨이 풀리는 경우가 있어 재적용.
  win.setAlwaysOnTop(true, 'screen-saver');
  clickThrough?.reset();
  win.webContents.send('pet:overlay-resized', next);
}

function scheduleBoundsSync() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(syncOverlayBounds, 250);
}

function watchDisplays() {
  screen.on('display-added', scheduleBoundsSync);
  screen.on('display-removed', scheduleBoundsSync);
  screen.on('display-metrics-changed', scheduleBoundsSync);
}

/** 오버레이를 숨겨도 앱은 메뉴바에 남는다 */
function setOverlayVisible(visible) {
  if (!win || win.isDestroyed()) {
    if (visible) createOverlayWindow();
    return;
  }
  if (visible) {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  } else {
    win.hide();
  }
  tray?.refresh();
}

function isOverlayVisible() {
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

app.whenReady().then(() => {
  // Dock 아이콘 숨김 (메뉴바 전용 앱)
  app.dock?.hide();

  settings.load();
  registerSettingsIpc({ settings, closeSettingsWindow });

  createOverlayWindow();
  watchDisplays();

  tray = createTray({
    isOverlayVisible,
    setOverlayVisible,
    openSettings: () => openSettingsWindow(),
    getSettings: () => settings.get(),
    setSettings: (patch) => settings.merge(patch),
  });

  // 개발 편의: 트레이를 안 거치고 설정 창을 바로 띄운다
  if (isDev && process.env.PET_SETTINGS === '1') openSettingsWindow();

  // 어디서 바꿨든 모든 창에 같은 값을 흘려 준다 (트레이 메뉴 ↔ 설정 창 ↔ 오버레이)
  settings.onChange((next) => {
    for (const browserWindow of BrowserWindow.getAllWindows()) {
      if (!browserWindow.isDestroyed()) browserWindow.webContents.send('settings:changed', next);
    }
    // 띠 너비·정렬이 바뀌면 오버레이 창 자체를 다시 잡는다
    syncOverlayBounds();
    tray?.refresh();
  });

  // 전역 단축키. 트레이가 메뉴바에서 안 보일 때(노치 맥북에서 흔함) 유일한 탈출구다.
  globalShortcut.register('CommandOrControl+Alt+P', () => openSettingsWindow());
  globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createOverlayWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
  tray = null;
});

// 메뉴바 앱이라 창이 다 닫혀도 살아 있는다 — 종료는 트레이 메뉴에서.
app.on('window-all-closed', () => {});
