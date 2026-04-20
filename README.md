# tqs

[![CI](https://github.com/yowainwright/tqs/actions/workflows/ci.yml/badge.svg)](https://github.com/yowainwright/tqs/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tqs.svg)](https://www.npmjs.com/package/tqs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Build TypeScript-flavored QuickJS scripts into standalone executables with built-in HTTP fetching.

```bash
tqs my-script.tqs -o my-script
./my-script
```

Write TypeScript. Bundle it with Bun, embed it in [QuickJS-NG](https://github.com/nicehash/nicehash-quickjs-ng), and produce a standalone executable with `maybefetch()` for HTTP requests.

## Why tqs?

- **TypeScript on QuickJS**: Write `.tqs` or `.tsq` files with full type safety, then build native executables
- **Built-in HTTP**: `maybefetch()` provides fetch with retry, backoff, and timeout -- no dependencies
- **Controlled builds**: A pinned QuickJS snapshot is staged into `deps/quickjs-ng/` during packaging, so publish output is deterministic without tracking upstream source in git
- **Lightweight**: QuickJS + libcurl. No V8, no Node.js
- **Type-safe**: Global types for QuickJS `std`/`os` modules and `maybefetch`. Node.js modules are blocked with helpful errors

## Installation

```bash
bun add -g tqs
```

Requires libcurl installed on your system.
Building a standalone executable also requires a working C toolchain on your machine.

## Quick Start

Create a `.tqs` file:

```typescript
import * as std from 'std';
import * as os from 'os';

const cwd = os.getcwd();
std.printf("Running from: %s\n", cwd);

const data = maybefetch("https://httpbin.org/json", 3, 1000, 30000, 2.0, 10000);
if (data) {
  std.printf("Response: %s\n", data);
}

std.exit(0);
```

Build it:

```bash
tqs my-script.tqs -o my-script
./my-script
```

## File Detection

tqs recognizes QuickJS scripts three ways:

| Method | Example |
|--------|---------|
| `.tqs` or `.tsq` extension | `script.tqs` |
| `// @tqs-script` comment | First 5 lines of any `.ts` file |
| Directory convention | Files in `scripts/`, `quickjs/`, or `tqs/` directories |

## CLI

```bash
tqs <script>             # Build and run a script
tqs <script> -o <name>   # Build a standalone executable
tqs --help               # Show help
tqs --version            # Show version
```

## API

### `maybefetch(url, maxRetries, initialDelayMs, maxDelayMs, backoffFactor, timeoutMs): string | null`

HTTP GET with exponential backoff retry. Returns the response body as a string, or `null` on failure.

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | URL to fetch |
| `maxRetries` | `number` | Maximum retry attempts |
| `initialDelayMs` | `number` | Delay before first retry (ms) |
| `maxDelayMs` | `number` | Maximum delay between retries (ms) |
| `backoffFactor` | `number` | Multiplier applied to delay each retry |
| `timeoutMs` | `number` | Request timeout (ms) |

**Returns:** `string | null` -- response body on 2xx, `null` on failure after all retries.

```typescript
const body = maybefetch("https://api.example.com/data", 3, 1000, 30000, 2.0, 10000);
```

### Node.js Binding

tqs also exposes a native Node.js binding via N-API:

```typescript
import { fetch, fetchAsync, defaultConfig } from 'tqs';
import type { FetchConfig, NativeBinding } from 'tqs';
```

#### `defaultConfig`

| Property | Value | Description |
|----------|-------|-------------|
| `maxRetries` | `3` | Retry attempts |
| `initialDelayMs` | `1000` | Initial retry delay |
| `maxDelayMs` | `30000` | Max retry delay |
| `backoffFactor` | `2.0` | Exponential backoff multiplier |
| `timeoutMs` | `10000` | Request timeout |

#### `fetch(url, config?, binding?): string | null`

Synchronous fetch with retry logic.

```typescript
import { fetch, defaultConfig } from 'tqs';

const result = fetch("https://api.example.com/data", defaultConfig);
```

#### `fetchAsync(url, config?, binding?): Promise<string | null>`

Async wrapper around `fetch`.

```typescript
import { fetchAsync } from 'tqs';

const result = await fetchAsync("https://api.example.com/data");
```

### QuickJS Modules

Available via `import` in `.tqs` files:

#### `std` module

| Method | Signature | Description |
|--------|-----------|-------------|
| `exit` | `(code: number) => void` | Exit with status code |
| `gc` | `() => void` | Force garbage collection |
| `evalScript` | `(source: string) => unknown` | Evaluate JavaScript |
| `loadScript` | `(filename: string) => unknown` | Load and evaluate file |
| `printf` | `(format: string, ...args) => void` | Formatted print to stdout |
| `sprintf` | `(format: string, ...args) => string` | Formatted string |
| `in.getline` | `() => string \| null` | Read line from stdin |
| `out.puts` | `(str: string) => void` | Write to stdout |
| `err.puts` | `(str: string) => void` | Write to stderr |

#### `os` module

| Method | Signature | Description |
|--------|-----------|-------------|
| `getcwd` | `() => string` | Current working directory |
| `chdir` | `(path: string) => number` | Change directory |
| `mkdir` | `(path: string, mode?) => number` | Create directory |
| `readdir` | `(path: string) => string[]` | List directory contents |
| `realpath` | `(path: string) => string` | Resolve path |
| `stat` | `(path: string) => StatResult` | File information |
| `exec` | `(args: string[], env?) => number` | Execute command |
| `open` | `(filename, flags, mode?) => number` | Open file descriptor |
| `read` | `(fd, buffer, offset, length) => number` | Read from fd |
| `write` | `(fd, buffer, offset, length) => number` | Write to fd |
| `close` | `(fd: number) => number` | Close file descriptor |
| `unlink` | `(path: string) => number` | Delete file |
| `rename` | `(old, new) => number` | Rename file |
| `kill` | `(pid, signal) => number` | Send signal to process |
| `sleep` | `(ms: number) => void` | Sleep for milliseconds |
| `platform` | `string` | Current platform |

### Blocked Node.js Modules

Importing Node.js modules in `.tqs` files produces compile-time errors with suggestions:

| Module | Suggestion |
|--------|------------|
| `fs` | Use `os` module |
| `path` | Use `os` module |
| `http`, `https` | Use `maybefetch()` |
| `process` | Use `std` module |
| `child_process` | Use `os.exec()` |
| `crypto`, `url`, `querystring`, `util` | Not available |

## Resource Usage

| Metric | tqs | Node.js 25 |
|--------|-----|------------|
| Startup | <1ms | ~40ms |
| Memory (hello world) | ~2MB | ~15MB |
| Memory (HTTP fetch) | ~4.5MB | ~27.5MB |
| Binary | ~1MB | ~60MB |

*Measured on Apple M4, macOS 15.*

## Development

```bash
bun install
bun run stage:quickjs    # stage the pinned QuickJS snapshot into deps/quickjs-ng/
bun run build:ts        # Build TypeScript
bun run lint             # Lint
bun run typecheck        # Type check
bun test                 # Run tests
```

## License

MIT -- See [LICENSE](LICENSE)
