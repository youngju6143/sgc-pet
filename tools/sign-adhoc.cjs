'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * 애드혹(자체) 서명.
 *
 * electron-builder 가 Electron 을 다시 포장하면서 Info.plist·실행파일 이름을
 * 갈아끼우면 Electron 이 달고 나온 서명이 깨진다. Apple Silicon 은 서명이 깨진
 * 바이너리를 실행시키지 않으므로 다시 서명해야 하는데, 개발자 인증서가 없으면
 * 애드혹(`-`)으로도 된다.
 *
 * 두 가지를 반드시 지켜야 앱이 켜진다:
 *  1. **JIT 권한**(assets/entitlements.mac.plist) — 안 주면 V8 이 실행 가능한
 *     메모리를 못 얻어 켜지자마자 트랩(EXC_BREAKPOINT)을 건다.
 *  2. **안쪽부터 바깥 순서** — 프레임워크·헬퍼를 먼저 서명하고 마지막에 .app.
 *     (`--deep` 은 중첩 번들에 권한을 제대로 못 물려서 쓰지 않는다)
 *
 * 정식 배포 서명/공증은 아니다 — 받는 쪽은 격리 속성을 풀어야 한다(README 참고).
 */
module.exports = async function signAdhoc(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appDir = context.appOutDir;
  const app = path.join(appDir, `${context.packager.appInfo.productFilename}.app`);
  const entitlements = path.join(context.packager.projectDir, 'assets', 'entitlements.mac.plist');

  const sign = (target) => {
    execFileSync(
      'codesign',
      [
        '--force',
        '--timestamp=none',
        '--options', 'runtime',
        '--entitlements', entitlements,
        '--sign', '-',
        target,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  };

  const frameworks = path.join(app, 'Contents', 'Frameworks');
  const nested = fs.existsSync(frameworks) ? fs.readdirSync(frameworks) : [];

  // 프레임워크 안의 dylib → 헬퍼 앱 → 프레임워크 → 본체 순
  for (const name of nested) {
    const dir = path.join(frameworks, name, 'Versions', 'A', 'Libraries');
    if (!fs.existsSync(dir)) continue;
    for (const lib of fs.readdirSync(dir)) sign(path.join(dir, lib));
  }
  for (const name of nested.filter((n) => n.endsWith('.app'))) sign(path.join(frameworks, name));
  for (const name of nested.filter((n) => n.endsWith('.framework'))) sign(path.join(frameworks, name));
  sign(app);

  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  console.log(`  • ad-hoc signed + verified  ${path.basename(app)}`);
};
