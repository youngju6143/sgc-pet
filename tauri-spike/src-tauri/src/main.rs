// SGC Pet — Tauri 이식 가능성 검증용 스파이크.
//
// 여기서 확인하려는 것은 딱 두 가지다.
//   1) dmg 로 묶은 뒤에도 투명 창이 살아 있는가 (tauri#13415)
//   2) 유휴 상태에서 GPU 전력이 Electron 판보다 나쁘지 않은가 (tauri#15471)
//
// 그래서 트레이·설정·클릭통과·Mission Control 은 일부러 안 붙였다.
// 화면 전체를 덮는 투명 창 하나에 기존 렌더러(src/renderer)를 그대로 올린다.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{ActivationPolicy, WebviewUrl, WebviewWindowBuilder};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      // Dock 에 안 뜨게 — Electron 의 LSUIElement 대응
      app.set_activation_policy(ActivationPolicy::Accessory);

      let monitor = app.primary_monitor()?.expect("주 모니터를 못 찾았다");
      let scale = monitor.scale_factor();
      let area = monitor.work_area();
      let pos = area.position.to_logical::<f64>(scale);
      let size = area.size.to_logical::<f64>(scale);

      println!(
        "[spike] work_area {}x{} @{}x -> {},{}",
        size.width, size.height, scale, pos.x, pos.y
      );

      let win = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("index.html".into()))
        .transparent(true)
        .decorations(false)
        .shadow(false)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .resizable(false)
        .focused(false)
        .inner_size(size.width, size.height)
        .position(pos.x, pos.y)
        .build()?;

      // 스파이크에는 상호작용을 안 붙인다 — 마우스는 전부 아래 창으로 통과시킨다.
      // (Electron 의 forward:true 대응물이 없다는 게 이번 조사의 결론이고,
      //  그 대안인 Rust 폴링은 투명 검증이 통과한 뒤에 붙인다.)
      win.set_ignore_cursor_events(true)?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("스파이크 실행 실패");
}
