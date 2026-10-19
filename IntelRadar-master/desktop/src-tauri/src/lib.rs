use std::{
    fs,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};

use rand::{distributions::Alphanumeric, Rng};
use tauri::{Manager, RunEvent, Url, WebviewUrl, WebviewWindowBuilder};

#[cfg(unix)]
use std::os::unix::process::CommandExt;

/// Keeps the Python engine alive for the lifetime of the app.
struct EngineProcess(Mutex<Option<Child>>);

fn pick_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .and_then(|listener| listener.local_addr())
        .map(|address| address.port())
        .unwrap_or(8765)
}

fn random_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(40)
        .map(char::from)
        .collect()
}

/// Where the engine lives: explicit override → dev virtualenv → bundled binary.
fn engine_paths(app: &tauri::AppHandle) -> Option<(PathBuf, Vec<String>, Option<PathBuf>)> {
    if let Ok(binary) = std::env::var("INTELRADAR_ENGINE_BIN") {
        let path = PathBuf::from(binary);
        if path.exists() {
            return Some((path, Vec::new(), None));
        }
    }

    if cfg!(debug_assertions) {
        let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let repo = manifest.parent()?.parent()?.to_path_buf();
        let python = if cfg!(windows) {
            repo.join("backend/.venv/Scripts/python.exe")
        } else {
            repo.join("backend/.venv/bin/python")
        };
        if python.exists() {
            return Some((
                python,
                vec![
                    "-m".into(),
                    "uvicorn".into(),
                    "app.main:app".into(),
                ],
                Some(repo.join("backend")),
            ));
        }
    }

    let name = if cfg!(windows) {
        "intelradar-engine.exe"
    } else {
        "intelradar-engine"
    };
    let bundled = app.path().resource_dir().ok()?.join("engine").join(name);
    if bundled.exists() {
        return Some((bundled, Vec::new(), None));
    }

    None
}

fn engine_healthy(port: u16) -> bool {
    let address = format!("127.0.0.1:{port}");
    let Ok(parsed) = address.parse() else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect_timeout(&parsed, Duration::from_millis(800)) else {
        return false;
    };

    let _ = stream.set_read_timeout(Some(Duration::from_secs(3)));
    let request = b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    if stream.write_all(request).is_err() {
        return false;
    }

    let mut response = String::new();
    stream.read_to_string(&mut response).is_ok() && response.contains("200 OK")
}

fn spawn_engine(
    app: &tauri::AppHandle,
    port: u16,
    token: &str,
    data_dir: &Path,
) -> Result<Child, String> {
    let (program, mut args, working_dir) =
        engine_paths(app).ok_or_else(|| "IntelRadar engine binary was not found.".to_string())?;

    // The dev path runs uvicorn, which needs host/port arguments. The packaged
    // PyInstaller binary reads the PORT environment variable itself.
    if args.iter().any(|arg| arg == "uvicorn") {
        args.extend([
            "--host".to_string(),
            "127.0.0.1".to_string(),
            "--port".to_string(),
            port.to_string(),
        ]);
    }

    let log_path = data_dir.join("engine.log");
    let log = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|error| format!("Could not open engine log: {error}"))?;
    let log_err = log
        .try_clone()
        .map_err(|error| format!("Could not open engine log: {error}"))?;

    let mut command = Command::new(program);
    command
        .args(args)
        .env("API_TOKEN", token)
        // The API is loopback-only and token-guarded, so the webview origin
        // (tauri://localhost, http://tauri.localhost, …) can be allowed.
        .env("CORS_ORIGINS", "*")
        .env("INTELRADAR_DATA_DIR", data_dir)
        .env("PORT", port.to_string())
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(log_err));

    if let Some(directory) = working_dir {
        command.current_dir(directory);
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let browsers = resource_dir.join("playwright");
        if browsers.exists() {
            command.env("PLAYWRIGHT_BROWSERS_PATH", browsers);
        }
    }

    // PyInstaller one-file builds fork a child process. Put the engine in its
    // own process group so stopping the app can stop both processes.
    #[cfg(unix)]
    command.process_group(0);

    command
        .spawn()
        .map_err(|error| format!("Could not start the engine: {error}"))
}

fn terminate_engine(child: &mut Child) {
    #[cfg(unix)]
    {
        let pid = child.id() as i32;
        unsafe {
            // Negative pid = the whole process group (bootloader + Python).
            libc::kill(-pid, libc::SIGTERM);
        }
        std::thread::sleep(Duration::from_millis(400));
        unsafe {
            libc::kill(-pid, libc::SIGKILL);
        }
    }

    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(["/PID", &child.id().to_string(), "/T", "/F"])
            .status();
    }

    let _ = child.kill();
    let _ = child.wait();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let port = pick_port();
            let token = random_token();
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;

            match spawn_engine(app.handle(), port, &token, &data_dir) {
                Ok(child) => {
                    app.manage(EngineProcess(Mutex::new(Some(child))));
                }
                Err(error) => {
                    log::error!("{error}");
                    let _ = fs::write(data_dir.join("engine-error.log"), &error);
                }
            }

            // The Python engine imports a large ML stack; allow up to 90s on a
            // cold first launch. The window still opens if it fails, and the
            // dashboard's health indicator will report the engine as offline.
            let deadline = Instant::now() + Duration::from_secs(90);
            while Instant::now() < deadline {
                if engine_healthy(port) {
                    break;
                }
                std::thread::sleep(Duration::from_millis(500));
            }

            let config = format!(
                "window.__INTELRADAR__ = {{ apiBase: 'http://127.0.0.1:{port}', token: '{token}' }};"
            );

            let url = if cfg!(debug_assertions) {
                WebviewUrl::External(Url::parse("http://localhost:3000")?)
            } else {
                WebviewUrl::App("index.html".into())
            };

            WebviewWindowBuilder::new(app, "main", url)
                .title("IntelRadar")
                .inner_size(1440.0, 960.0)
                .min_inner_size(380.0, 640.0)
                .initialization_script(&config)
                .build()?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building IntelRadar");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<EngineProcess>() {
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(mut child) = guard.take() {
                        terminate_engine(&mut child);
                    }
                }
            }
        }
    });
}
