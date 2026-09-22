'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('node:path');

/**
 * 메뉴바 아이콘 + 메뉴.
 *
 * Dock 을 숨긴 앱이라 여기가 유일한 진입점이다 — 오버레이를 숨겨도 앱은
 * 살아 있고, 다시 띄우는 것도 종료도 여기서 한다.
 */

/** @type {Tray|null} */
let tray = null;

function icon() {
  const file = path.join(__dirname, '..', '..', 'assets', 'trayTemplate.png');
  const img = nativeImage.createFromPath(file);
  // 템플릿 이미지 = 다크/라이트 메뉴바에 맞춰 macOS 가 알아서 반전해 준다.
  img.setTemplateImage(true);
  return img;
}

/**
 * @param {object} ctx
 * @param {() => boolean} ctx.isOverlayVisible
 * @param {(v: boolean) => void} ctx.setOverlayVisible
 * @param {() => void} ctx.openSettings
 * @param {() => object} ctx.getSettings
 * @param {(patch: object) => void} ctx.setSettings
 */
function createTray(ctx) {
  tray = new Tray(icon());
  tray.setToolTip('야물딱 펫 — 클릭해서 설정');
  // 아이콘만 두면 메뉴바가 꽉 찬 노치 맥북에서 통째로 숨겨져 "아무것도 없는" 것처럼
  // 보인다. 짧은 텍스트를 같이 달아서 찾기 쉽게 한다.
  tray.setTitle(' 야물딱');
  console.log('[tray] 메뉴바 아이콘 생성됨');
  refreshTray(ctx);
  // 아이콘을 좌클릭해도 메뉴가 뜬다 (macOS 기본은 좌클릭도 메뉴)
  return {
    refresh: () => refreshTray(ctx),
    destroy() {
      tray?.destroy();
      tray = null;
    },
  };
}

function refreshTray(ctx) {
  if (!tray) return;
  const visible = ctx.isOverlayVisible();
  const settings = ctx.getSettings();

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: visible ? '오버레이 숨기기' : '오버레이 보이기',
        click: () => ctx.setOverlayVisible(!visible),
      },
      { type: 'separator' },
      { label: '설정…', accelerator: 'Command+,', click: () => ctx.openSettings() },
      {
        label: '돌아다닐 범위',
        submenu: [
          ...[
            { value: 1, label: '전체 너비' },
            { value: 0.5, label: '절반 (1/2)' },
            { value: 1 / 3, label: '좁게 (1/3)' },
          ].map((w) => ({
            label: w.label,
            type: 'radio',
            checked: Math.abs((settings.width ?? 1) - w.value) < 1e-6,
            click: () => ctx.setSettings({ width: w.value }),
          })),
          { type: 'separator' },
          ...[
            { value: 'left', label: '왼쪽' },
            { value: 'center', label: '가운데' },
            { value: 'right', label: '오른쪽' },
          ].map((a) => ({
            label: a.label,
            type: 'radio',
            checked: (settings.align ?? 'center') === a.value,
            click: () => ctx.setSettings({ align: a.value }),
          })),
        ],
      },
      {
        label: '이름표 보이기',
        type: 'checkbox',
        checked: settings.nameTags,
        click: (item) => ctx.setSettings({ nameTags: item.checked }),
      },
      {
        label: '펫 클릭 막기',
        type: 'checkbox',
        checked: Boolean(settings.noClick),
        click: (item) => ctx.setSettings({ noClick: item.checked }),
      },
      {
        label: '혼잣말 하기',
        type: 'checkbox',
        checked: settings.chatter,
        click: (item) => ctx.setSettings({ chatter: item.checked }),
      },
      {
        label: '로그인 시 자동 실행',
        type: 'checkbox',
        checked: settings.launchAtLogin,
        click: (item) => ctx.setSettings({ launchAtLogin: item.checked }),
      },
      { type: 'separator' },
      { label: '야물딱 펫 종료', accelerator: 'Command+Q', click: () => app.quit() },
    ]),
  );
}

module.exports = { createTray };
