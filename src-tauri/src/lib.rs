pub mod dpapi;

use dpapi::{dpapi_delete, dpapi_read, dpapi_write};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
    )
    .invoke_handler(tauri::generate_handler![
      dpapi_write,
      dpapi_read,
      dpapi_delete
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
