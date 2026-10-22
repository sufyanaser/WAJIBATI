use std::fs;
use std::path::PathBuf;

#[repr(C)]
struct DataBlob {
    cb_data: u32,
    pb_data: *mut u8,
}

#[link(name = "crypt32")]
unsafe extern "system" {
    fn CryptProtectData(
        p_data_in: *const DataBlob,
        sz_data_descr: *const u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut std::ffi::c_void,
        p_prompt_struct: *mut std::ffi::c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;

    fn CryptUnprotectData(
        p_data_in: *const DataBlob,
        ppsz_data_descr: *mut *mut u16,
        p_optional_entropy: *const DataBlob,
        pv_reserved: *mut std::ffi::c_void,
        p_prompt_struct: *mut std::ffi::c_void,
        dw_flags: u32,
        p_data_out: *mut DataBlob,
    ) -> i32;
}

#[link(name = "kernel32")]
unsafe extern "system" {
    fn LocalFree(h_mem: *mut std::ffi::c_void) -> *mut std::ffi::c_void;
}

const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

fn get_storage_dir() -> PathBuf {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
    let mut dir = PathBuf::from(app_data);
    dir.push("wajibati-admin");
    dir.push("secure_store");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir
}

fn sanitize_key(key: &str) -> String {
    let clean: String = key
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_' || *c == '-')
        .collect();
    if clean.is_empty() {
        "default_store".to_string()
    } else {
        clean
    }
}

pub fn protect(data: &[u8]) -> Result<Vec<u8>, String> {
    unsafe {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: std::ptr::null_mut(),
        };

        let success = CryptProtectData(
            &in_blob,
            std::ptr::null(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out_blob,
        );

        if success == 0 {
            return Err("CryptProtectData failed".to_string());
        }

        let slice = std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize);
        let result = slice.to_vec();
        LocalFree(out_blob.pb_data as *mut std::ffi::c_void);
        Ok(result)
    }
}

pub fn unprotect(data: &[u8]) -> Result<Vec<u8>, String> {
    unsafe {
        let in_blob = DataBlob {
            cb_data: data.len() as u32,
            pb_data: data.as_ptr() as *mut u8,
        };
        let mut out_blob = DataBlob {
            cb_data: 0,
            pb_data: std::ptr::null_mut(),
        };

        let success = CryptUnprotectData(
            &in_blob,
            std::ptr::null_mut(),
            std::ptr::null(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out_blob,
        );

        if success == 0 {
            return Err("CryptUnprotectData failed (invalid ciphertext or different user)".to_string());
        }

        let slice = std::slice::from_raw_parts(out_blob.pb_data, out_blob.cb_data as usize);
        let result = slice.to_vec();
        LocalFree(out_blob.pb_data as *mut std::ffi::c_void);
        Ok(result)
    }
}

#[tauri::command]
pub fn dpapi_write(key: String, value: String) -> Result<(), String> {
    let encrypted = protect(value.as_bytes())?;
    let mut file_path = get_storage_dir();
    file_path.push(format!("{}.dpapi", sanitize_key(&key)));
    fs::write(&file_path, encrypted).map_err(|e| format!("Failed to write secure file: {}", e))
}

#[tauri::command]
pub fn dpapi_read(key: String) -> Result<Option<String>, String> {
    let mut file_path = get_storage_dir();
    file_path.push(format!("{}.dpapi", sanitize_key(&key)));
    if !file_path.exists() {
        return Ok(None);
    }
    let encrypted = fs::read(&file_path).map_err(|e| format!("Failed to read secure file: {}", e))?;
    let decrypted = unprotect(&encrypted)?;
    let string_val = String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode error: {}", e))?;
    Ok(Some(string_val))
}

#[tauri::command]
pub fn dpapi_delete(key: String) -> Result<(), String> {
    let mut file_path = get_storage_dir();
    file_path.push(format!("{}.dpapi", sanitize_key(&key)));
    if file_path.exists() {
        let _ = fs::remove_file(&file_path);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dpapi_roundtrip() {
        let plaintext = "secret_session_token_12345";
        let encrypted = protect(plaintext.as_bytes()).expect("protect failed");
        assert_ne!(plaintext.as_bytes(), encrypted.as_slice());

        let decrypted = unprotect(&encrypted).expect("unprotect failed");
        assert_eq!(plaintext.as_bytes(), decrypted.as_slice());
    }
}
