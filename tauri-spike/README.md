# Tauri 이식 스파이크

Electron 판(80MB dmg / 메모리 200MB)을 Tauri 로 옮길 수 있는지 **위험한 것부터**
찍어 보려고 만든 실험. 이식이 아니라 검증이 목적이라 트레이·설정창·클릭통과·
Mission Control 은 일부러 안 붙였다.

```bash
cd src-tauri
npx @tauri-apps/cli@latest build --bundles dmg   # 첫 빌드 약 1분
```

`frontendDist` 가 `../../src/renderer` 를 가리킨다 — **렌더러는 한 줄도 안 고쳤다.**
`app.js` 가 `window.petAPI?.…` 로 전부 옵셔널 체이닝이라 브리지 없이도 기본 설정으로 돈다.

## 확인한 것

| | 결과 |
|---|---|
| dmg 번들에서 투명 유지 ([tauri#13415](https://github.com/tauri-apps/tauri/issues/13415)) | **통과** — 번들 실행에서도 투명. 재현 안 됨 |
| 렌더러 그대로 구동 | **통과** — 펫 5마리 정상 렌더 |
| 앱 용량 | **7.1MB** (Electron 193MB) |
| dmg 용량 | **1.5MB** (Electron 81MB) |
| 빌드 산출물 | `Contents/MacOS/sgc-pet-spike` + `icon.icns` + `Info.plist` — 3개가 전부. 렌더러는 바이너리에 임베드됨 |

## 아직 안 붙인 것 (이식하려면 해야 할 일)

1. **클릭 통과** — 제일 큰 구조 차이. Electron 의
   `setIgnoreMouseEvents(true, { forward: true })` 에 대응물이 없다.
   tao 의 `set_ignore_cursor_events(bool)` 는 forward 가 없어서, 무시 모드에 들어가면
   웹뷰가 마우스 이벤트를 아예 못 받는다 → 커서가 펫 위로 돌아온 걸 알 방법이 없음.
   → Rust 에서 `cursor_position()` 을 60Hz 폴링하고, 렌더러가 펫 바운딩박스를
     넘겨주는 2단 구조(거친 사각형은 Rust, 도트 단위는 JS)로 다시 짜야 한다.
2. **트레이 메뉴** — `TrayIconBuilder` + `icon_as_template(true)`. 기존 템플릿 PNG 그대로.
3. **설정 창 + 저장** — 두 번째 WebviewWindow + JSON 파일.
4. **Mission Control 회피** — `native/` 네이티브 모듈이 **필요 없어진다**.
   `Window::ns_window()` 로 `NSWindow*` 를 받아서 tauri 가 이미 쓰는 `objc2` 로
   `collectionBehavior` 를 직접 설정하면 된다 (지금 `stationary.mm` 20줄과 같은 내용).
5. **메뉴바 위로 띄우기** — Electron 의 `setAlwaysOnTop(true, 'screen-saver')` 대신
   `ns_window` 로 `NSWindow.level` 을 직접 올린다.

## 주의

- 투명 창은 `macOSPrivateApi: true` 가 **필수**다 (WKWebView 투명 배경이 비공개 API).
  → **App Store 배포는 불가능해진다.** dmg 직접 배포만 가능.
- [tauri#15471](https://github.com/tauri-apps/tauri/issues/15471) — `transparent:true` 면
  내용이 정지해 있어도 WindowServer 가 매 프레임 창 전체를 다시 합성한다는 보고.
  메인테이너도 WKWebView 레벨 문제라 못 고친다고 함. 측정 결과는 아래.

## 측정 (2026-09-23, M-시리즈 맥북, 내장 레티나 2880×1864)

같은 조건에서 하나씩만 띄우고 잰 값. WindowServer CPU 는 `top -l 5 -s 2` 4회 평균.

| | WindowServer CPU | 메모리 |
|---|---|---|
| 아무것도 없음 | 45.4% | (WebKit 9MB) |
| **Tauri 스파이크만** | 47.1% | 앱 73MB + WebKit 72MB = **약 145MB** |
| **Electron 판만** | 43.5% | **290MB** (4프로세스 합) |

- **메모리는 약 절반.** WKWebView 도 XPC 프로세스로 70MB 쯤 쓰기 때문에, "10분의 1"
  까지는 안 간다.
- **WindowServer CPU 차이는 측정 노이즈 안이다.** Electron 쪽이 아무것도 없을 때보다
  낮게(43.5% < 45.4%) 나온 걸 보면 이 방법의 오차가 ±2%p 는 된다.
  [tauri#15471](https://github.com/tauri-apps/tauri/issues/15471) 의 영향은 이 해상도로는
  판단 못 한다 — 제대로 보려면 `sudo powermetrics --samplers gpu_power` 가 필요하다.
