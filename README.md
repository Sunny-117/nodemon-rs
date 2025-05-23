# nodemon-rs

A fast implementation of nodemon in Rust. This tool automatically restarts your Node.js application when file changes are detected.

## Features

- Fast file watching using Rust's native file system events
- Support for file extension filtering
- Configurable delay between restarts
- Custom execution command support
- Written in Rust for better performance

## Installation

```bash
npm install -g nodemon-rs
```

## Usage

Basic usage:
```bash
nodemon-rs app.js
```

With options:
```bash
nodemon-rs --ext=js,mjs,json --ignore=node_modules,dist --exec=node --delay=1.0 app.js
```

### Options

- `--ext`: File extensions to watch (comma-separated), default: "js,mjs,json"
- `--ignore`: Patterns to ignore (comma-separated), default: []
- `--exec`: Command to execute (default: "node")
- `--delay`: Delay in seconds before restarting (default: 1.0)

## Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Build the Rust code:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

5. Local development:
```bash
# Link the package globally
npm link

# Now you can use nodemon-rs from anywhere
nodemon-rs your-app.js
```

## License

MIT