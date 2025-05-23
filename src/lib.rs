#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::mpsc::channel;
use std::thread;
use std::time::Duration;

struct NotifyError(notify::Error);

impl From<notify::Error> for NotifyError {
  fn from(error: notify::Error) -> Self {
    NotifyError(error)
  }
}

impl From<NotifyError> for Error {
  fn from(error: NotifyError) -> Self {
    Error::from_reason(error.0.to_string())
  }
}

#[napi(object)]
pub struct WatchOptions {
  pub script: String,
  pub ext: Option<String>,
  pub ignore: Option<Vec<String>>,
  pub exec: Option<String>,
  pub delay: Option<f64>,
}

struct NodemonInstance {
  child: Option<Child>,
  options: WatchOptions,
  last_restart: std::time::Instant,
}

impl NodemonInstance {
  fn new(options: WatchOptions) -> Self {
    Self {
      child: None,
      options,
      last_restart: std::time::Instant::now(),
    }
  }

  fn restart(&mut self) {
    if let Some(mut child) = self.child.take() {
      let _ = child.kill();
      let _ = child.wait();
    }

    let exec = self.options.exec.as_deref().unwrap_or("node");
    let script = &self.options.script;

    match Command::new(exec)
      .arg(script)
      .stdout(Stdio::piped())
      .stderr(Stdio::piped())
      .spawn()
    {
      Ok(mut child) => {
        if let Some(stdout) = child.stdout.take() {
          thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
              if let Ok(line) = line {
                println!("{}", line);
              }
            }
          });
        }

        if let Some(stderr) = child.stderr.take() {
          thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
              if let Ok(line) = line {
                eprintln!("{}", line);
              }
            }
          });
        }

        self.child = Some(child);
        self.last_restart = std::time::Instant::now();
      }
      Err(e) => {
        eprintln!("Failed to start process: {}", e);
      }
    }
  }

  fn should_restart(&self, event: &notify::Event) -> bool {
    if self.last_restart.elapsed() < Duration::from_millis(100) {
      return false;
    }

    let script_path = Path::new(&self.options.script);
    if event.paths.iter().any(|p| p == script_path) {
      return true;
    }

    match event.kind {
      notify::EventKind::Create(_)
      | notify::EventKind::Modify(_)
      | notify::EventKind::Remove(_) => {
        if let Some(ext) = &self.options.ext {
          event.paths.iter().any(|path| {
            if let Some(file_ext) = path.extension() {
              ext
                .split(',')
                .any(|e| e.trim() == file_ext.to_str().unwrap_or(""))
            } else {
              false
            }
          })
        } else {
          true
        }
      }
      _ => false,
    }
  }
}

#[napi]
pub fn watch(options: WatchOptions) -> Result<()> {
  let (tx, rx) = channel();

  let mut watcher: RecommendedWatcher = Watcher::new(
    tx,
    Config::default().with_poll_interval(Duration::from_millis(100)),
  )
  .map_err(NotifyError::from)?;

  let path = Path::new(".");
  watcher
    .watch(path, RecursiveMode::Recursive)
    .map_err(NotifyError::from)?;

  let mut nodemon = NodemonInstance::new(options);
  nodemon.restart();

  // let delay = Duration::from_millis((nodemon.options.delay.unwrap_or(0.2) * 1000.0) as u64);

  loop {
    match rx.recv() {
      Ok(Ok(event)) => {
        if nodemon.should_restart(&event) {
          // thread::sleep(delay);
          println!("\n[nodemon-rs] restarting due to changes...");
          nodemon.restart();
        }
      }
      Ok(Err(e)) => {
        eprintln!("Watch error: {:?}", e);
      }
      Err(e) => {
        eprintln!("Channel error: {:?}", e);
        break;
      }
    }
  }

  Ok(())
}
