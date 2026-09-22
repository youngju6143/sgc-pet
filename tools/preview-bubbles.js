'use strict';

/**
 * 말풍선 디자인 확인용. index.html 의 스타일을 그대로 가져와 5종을 나란히 그리고
 * PNG 로 캡처한다. 투명 오버레이는 스크린샷이 안 되니 이걸로 본다.
 *   npm run bubbles
 */

const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(__dirname);
const html = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));

const CHARS = [
  { id: 'chodang', name: '강초당', line: '이거 내 핫도그야' },
  { id: 'rave', name: '구라베', line: '라떼는 말이야' },
  { id: 'mangnani', name: '망난이', line: '왜!' },
  { id: 'mongsuk', name: '송몽숙', line: '…5분만' },
  { id: 'ponzoo', name: '장폰주', line: '잠깐만 이판만 하고' },
];

const cell = (c, editing) => `
  <div class="cell">
    <div class="bubble bubble--${c.id} ${editing ? 'bubble--edit' : 'bubble--say'}">${
      editing ? `<input value="타이핑 중…" />` : c.line
    }</div>
    <b>${c.name}</b>
  </div>`;

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
body { margin: 0; background: #2a2a33; font-family: ui-sans-serif, "Apple SD Gothic Neo", sans-serif; }
.band { padding: 74px 20px 26px; }
.band--light { background: #e8e8ee; }
.band > h2 { position: absolute; margin: -58px 0 0; font-size: 12px; color: #8b8b99; font-weight: 600; }
.row { display: flex; gap: 26px; align-items: flex-end; }
.cell { position: relative; width: 250px; height: 96px; }
.cell .bubble { left: 50%; top: 100%; }
.cell b { position: absolute; left: 50%; top: 100%; transform: translateX(-50%);
  font-size: 11px; font-weight: 500; color: #8b8b99; }
</style></head><body>
  <div class="band"><h2>혼잣말 (어두운 배경)</h2><div class="row">${CHARS.map((c) => cell(c, false)).join('')}</div></div>
  <div class="band band--light"><h2 style="color:#6b6b77">혼잣말 (밝은 배경)</h2><div class="row">${CHARS.map((c) => cell(c, false)).join('')}</div></div>
  <div class="band"><h2>긴 문장 — 폭은 그대로, 높이만 늘어나야 한다</h2><div class="row">${CHARS.map((c) => cell({ ...c, line: '아 그래서 내가 저번에 말했잖아 그거 진짜 아니라니까 정말로' }, false)).join('')}</div></div>
  <div class="band"><h2>입력창</h2><div class="row">${CHARS.map((c) => cell(c, true)).join('')}</div></div>
</body></html>`;

app.whenReady().then(async () => {
  app.dock?.hide();
  const win = new BrowserWindow({ width: 1420, height: 760, show: false, webPreferences: { offscreen: false } });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page));
  await new Promise((r) => setTimeout(r, 400));
  const image = await win.webContents.capturePage();
  const out = path.join(root, 'tools', 'bubbles.png');
  fs.writeFileSync(out, image.toPNG());
  console.log('wrote', out);
  app.quit();
});
