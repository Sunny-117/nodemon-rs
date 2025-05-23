#![deny(clippy::all)]

#[macro_use]
extern crate napi_derive;

use napi::bindgen_prelude::*;
use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::process::{Child, Command};
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
}

impl NodemonInstance {
  fn new(options: WatchOptions) -> Self {
    Self {
      child: None,
      options,
    }
  }

  fn restart(&mut self) -> Option<Child> {
    if let Some(mut child) = self.child.take() {
      let _ = child.kill();
      let _ = child.wait();
    }

    let exec = self.options.exec.as_deref().unwrap_or("node");
    let script = &self.options.script;

    match Command::new(exec).arg(script).spawn() {
      Ok(child) => {
        self.child = Some(child);
        self.child.take()
      }
      Err(e) => {
        eprintln!("Failed to start process: {}", e);
        None
      }
    }
  }
}

#[napi]
pub fn watch(options: WatchOptions) -> Result<External<Child>> {
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
  let child = nodemon
    .restart()
    .ok_or_else(|| Error::from_reason("Failed to start process"))?;

  let delay = Duration::from_millis((nodemon.options.delay.unwrap_or(1.0) * 1000.0) as u64);

  thread::spawn(move || {
    let mut last_restart = std::time::Instant::now();

    for res in rx {
      match res {
        Ok(event) => {
          let should_restart = match &event.kind {
            notify::EventKind::Create(_)
            | notify::EventKind::Modify(_)
            | notify::EventKind::Remove(_) => {
              if let Some(ext) = &nodemon.options.ext {
                if let Some(file_ext) = event.paths[0].extension() {
                  ext
                    .split(',')
                    .any(|e| e.trim() == file_ext.to_str().unwrap_or(""))
                } else {
                  false
                }
              } else {
                true
              }
            }
            _ => false,
          };

          if should_restart && last_restart.elapsed() >= delay {
            println!("Restarting due to changes...");
            nodemon.restart();
            last_restart = std::time::Instant::now();
          }
        }
        Err(e) => eprintln!("Watch error: {:?}", e),
      }
    }
  });

  Ok(External::new(child))
}
