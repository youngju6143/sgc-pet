import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { SOURCES, buildCharacter, OVERRIDE_DIR, overrideFile } from './extract-characters.mjs';

/**
 * 도트 직접 수정용 에디터.
 *   npm run dots
 *
 * 추출 결과를 직접 고치면 `node tools/extract-characters.mjs` 를 돌릴 때마다
 * 날아간다. 그래서 여기서 찍은 건 캐릭터 파일이 아니라 **바뀐 칸 목록**
 * (tools/overrides/<id>.json) 으로 저장하고, 추출 파이프라인이 마지막에 그걸
 * 얹는다. 원본 PNG 를 다시 뽑아도 손수정이 살아남는다.
 *
 * 기준(base)은 저장된 캐릭터 파일이 아니라 **수정본을 빼고 새로 뽑은 결과**다.
 * 그래야 저장할 때마다 차이가 누적되지 않는다.
 */

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT) || 4322;

/** 수정본을 빼고 뽑은 원본 상태 — 차이를 계산하는 기준 */
function pristine(src) {
  const file = overrideFile(src.id);
  const saved = fs.existsSync(file) ? fs.readFileSync(file) : null;
  try {
    if (saved) fs.rmSync(file);
    return buildCharacter(src);
  } finally {
    if (saved) fs.writeFileSync(file, saved);
  }
}

function loadCharacter(src) {
  const r = pristine(src);
  let cells = [];
  try {
    const data = JSON.parse(fs.readFileSync(overrideFile(src.id), 'utf8'));
    // 크기가 달라졌으면 좌표가 의미를 잃는다 — 비우고 시작한다
    if (data.width === r.gw && data.height === r.gh) cells = data.cells || [];
  } catch {
    /* 수정본 없음 */
  }
  return {
    id: src.id,
    name: src.name,
    width: r.gw,
    height: r.gh,
    palette: r.palette,
    base: r.rows,
    legTop: r.legs?.top ?? r.gh,
    cells,
  };
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 4e6) reject(new Error('too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/characters') {
    return send(res, 200, SOURCES.map(loadCharacter));
  }

  if (url.pathname === '/api/save' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const src = SOURCES.find((s) => s.id === body.id);
      if (!src) return send(res, 404, { error: 'unknown character' });

      fs.mkdirSync(OVERRIDE_DIR, { recursive: true });
      if (!body.cells?.length) {
        fs.rmSync(overrideFile(src.id), { force: true });
      } else {
        const payload = { width: body.width, height: body.height, cells: body.cells };
        fs.writeFileSync(overrideFile(src.id), `${JSON.stringify(payload, null, 1)}\n`);
      }
      console.log(`저장: ${src.id} — ${body.cells?.length || 0}칸`);
      return send(res, 200, { ok: true, cells: body.cells?.length || 0 });
    } catch (err) {
      return send(res, 400, { error: err.message });
    }
  }

  // 정적 파일
  const rel = url.pathname === '/' ? '/tools/pixel-editor.html' : decodeURIComponent(url.pathname);
  const file = path.join(root, rel);
  if (!file.startsWith(root)) return send(res, 403, 'forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, `not found: ${rel}`, 'text/plain');
    const type =
      { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }[
        path.extname(file)
      ] || 'application/octet-stream';
    send(res, 200, data, type);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log(`도트 에디터: ${url}`);
  console.log('저장하면 tools/overrides/<id>.json 에 들어가고,');
  console.log('`node tools/extract-characters.mjs` 를 돌리면 캐릭터에 반영된다.');
  console.log('(Ctrl+C 로 종료)');
  if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
});
