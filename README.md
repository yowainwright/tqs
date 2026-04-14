# tqs

[![CI](https://github.com/yowainwright/tqs/actions/workflows/ci.yml/badge.svg)](https://github.com/yowainwright/tqs/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tqs-cli.svg)](https://www.npmjs.com/package/tqs-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Compile TypeScript to very fast and very small standalone native binaries via QuickJS.

```bash
tqs my-script.ts   # outputs ./my-script — a standalone native binary
```

Write TypeScript. Get a tiny self-contained binary with [QuickJS-NG](https://github.com/quickjs-ng/quickjs) embedded and `maybefetch()` for HTTP. No Node.js, no V8, no runtime dependencies.

## Why tqs?

Great for typed, tested scripts that start fast and run fast — think LLM hooks.

- **Native binaries**: `tqs my-script.ts` compiles to a standalone executable — ship it anywhere
- **Built-in HTTP**: `maybefetch()` provides fetch with retry, backoff, and timeout — zero dependencies; synchronous but fast
- **Small by default**: ~1MB binary with no build flags or tuning — smaller than a stripped Go or Rust binary with HTTP
- **Fast startup**: <1ms cold start vs ~40ms for Node.js
- **Type-safe**: Full TypeScript support with types for `qjs:std`, `qjs:os`, and `maybefetch`

## Installation

**macOS**
```bash
brew install yowainwright/tap/tqs
```

**Linux (CLI)**
```bash
apt install libcurl4
npm install -g tqs-cli
```

**Linux (library)**
```bash
npm install tqs@npm:tqs-cli
```

Requires `libcurl` (`apt install libcurl4` on Linux, pre-installed on macOS).

## Quick Start

```typescript
// @tqs-script
import * as std from 'qjs:std';
import * as os from 'qjs:os';
import { maybeFetch } from 'tqs';

const cwd = os.getcwd();
std.out.puts(`Running from: ${cwd}\n`);

const data = maybeFetch('https://httpbin.org/json');
if (data) {
  std.out.puts(`Response: ${data}\n`);
}

std.exit(0);
```

Compile and run:

```bash
tqs my-script.ts   # creates ./my-script
./my-script
```

## How it works

```
my-script.ts
  → bun build (bundles TypeScript to self-contained JS)
  → qjsc (compiles JS + QuickJS runtime + maybefetch into a native binary)
  → ./my-script
```

The output binary embeds the QuickJS runtime and all JavaScript source inline — no external files needed at runtime.

## CLI

```bash
tqs <script>        # Compile TypeScript or JavaScript to a native binary
tqs --help          # Show help
tqs --version       # Show version
```

Supported inputs: `.tqs`, `.js`. For `.ts` files, add `// @tqs-script` at the top to mark them as QuickJS scripts:

```typescript
// @tqs-script
import * as std from 'qjs:std';
// ...
```

## TypeScript Types

Add this import to get types for `qjs:std`, `qjs:os`, `maybefetch`, and QuickJS globals in your scripts:

```typescript
// @tqs-script
import 'tqs/quickjs';
import * as std from 'qjs:std';
import * as os from 'qjs:os';
```

## CLI Arguments

Scripts receive arguments via `scriptArgs`. The first element is the script path:

```typescript
// @tqs-script
import 'tqs/quickjs';

const [, , url] = scriptArgs;
```

```bash
tqs my-script.ts https://example.com/api
```

## QuickJS Modules

Use `qjs:std` and `qjs:os` in your scripts. These are available at runtime inside the compiled binary.

### `qjs:std`

| Method | Signature | Description |
|--------|-----------|-------------|
| `exit` | `(code: number) => void` | Exit with status code |
| `getenv` | `(name: string) => string \| null` | Read environment variable |
| `evalScript` | `(source: string) => unknown` | Evaluate JavaScript |
| `loadScript` | `(filename: string) => unknown` | Load and evaluate file |
| `printf` | `(format: string, ...args) => void` | Formatted print to stdout |
| `sprintf` | `(format: string, ...args) => string` | Formatted string |
| `in.getline` | `() => string \| null` | Read line from stdin |
| `out.puts` | `(str: string) => void` | Write to stdout |
| `err.puts` | `(str: string) => void` | Write to stderr |

### `qjs:os`

| Method | Signature | Description |
|--------|-----------|-------------|
| `getcwd` | `() => string` | Current working directory |
| `chdir` | `(path: string) => number` | Change directory |
| `mkdir` | `(path: string, mode?) => number` | Create directory |
| `readdir` | `(path: string) => string[]` | List directory contents |
| `realpath` | `(path: string) => string` | Resolve path |
| `stat` | `(path: string) => StatResult` | File information |
| `exec` | `(args: string[], options?) => number` | Execute command |
| `unlink` | `(path: string) => number` | Delete file |
| `rename` | `(old: string, new: string) => number` | Rename file |
| `open` | `(filename: string, flags: string, mode?) => number` | Open file descriptor |
| `read` | `(fd, buffer, offset, length) => number` | Read from fd |
| `write` | `(fd, buffer, offset, length) => number` | Write to fd |
| `close` | `(fd: number) => number` | Close file descriptor |
| `sleep` | `(ms: number) => void` | Sleep milliseconds |
| `platform` | `string` | Current platform |

## maybefetch

Synchronous HTTP GET with exponential backoff retry. Available as a global in all compiled scripts — not async, blocks until complete or all retries are exhausted.

```typescript
import { maybeFetch } from 'tqs';

const body = maybeFetch('https://example.com/api');

if (body) {
  std.out.puts(body);
}
```

Override specific defaults with `defaultConfig`:

```typescript
import { maybeFetch, defaultConfig } from 'tqs';

const body = maybeFetch('https://example.com/api', { ...defaultConfig, maxRetries: 5 });
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | URL to fetch |
| `maxRetries` | `number` | Maximum retry attempts |
| `initialDelayMs` | `number` | Delay before first retry (ms) |
| `maxDelayMs` | `number` | Maximum delay between retries (ms) |
| `backoffFactor` | `number` | Multiplier applied to delay each retry |
| `timeoutMs` | `number` | Request timeout (ms) |

Returns `string` on success (2xx response body), `null` on failure after all retries.

## TypeScript API

`tqs` exports typed wrappers around the `maybefetch` global for use in compiled scripts:

```typescript
import { maybeFetch, defaultConfig } from 'tqs';
import type { FetchConfig } from 'tqs';
```

### `defaultConfig`

| Property | Value |
|----------|-------|
| `maxRetries` | `3` |
| `initialDelayMs` | `1000` |
| `maxDelayMs` | `30000` |
| `backoffFactor` | `2.0` |
| `timeoutMs` | `10000` |

### `maybeFetch(url, config?): string | null`

Typed wrapper around the `maybefetch` global. Only available in compiled QuickJS binaries.

## Resource Usage

| Metric | tqs | Node.js 25 |
|--------|-----|------------|
| Startup | <1ms | ~40ms |
| Memory (hello world) | ~2MB | ~15MB |
| Memory (HTTP fetch) | ~4.5MB | ~27.5MB |
| Binary size | ~1MB | ~60MB |

*Measured on Apple M4, macOS 15.*

## Development

```bash
bun install
bun run build:quickjs   # Build QuickJS-NG + maybefetch + tqs binary
bun run build:ts        # Build TypeScript
bun run lint            # Lint
bun run typecheck       # Type check
bun test                # Run tests
```

## Comparison

### vs JS/TS runtimes

| Tool | Binary Size | Startup | Approach |
|---|---|---|---|
| **tqs** | ~1 MB | <1ms | QuickJS native bytecode |
| Bun compile | ~21–36 MB | ~5–10ms | JSC runtime embedded |
| Deno compile | ~60–100 MB | ~30–60ms | V8 runtime embedded |
| Node.js SEA | ~60 MB | ~40ms | V8 (Node) embedded |

### vs compiled languages

| Tool | Binary Size | Startup | Language |
|---|---|---|---|
| **tqs** | ~1 MB | <1ms | TypeScript |
| Rust (stripped, with HTTP) | ~2–3 MB | <1ms | Rust |
| Go (stripped, with HTTP) | ~5–7 MB | <1ms | Go |

tqs is competitive on binary size and startup with native compiled languages — the tradeoff is no async, no npm ecosystem, and a subset of JS APIs.

### Honest tradeoffs

**tqs is the right tool when:**
- Binary size and cold-start matter (LLM hooks, git hooks, CI steps, edge deployments)
- Your script is a synchronous pipeline: read input, call an API, write output
- You want fast compile times and a small distributable without tuning a Go or Rust build
- You want to write TypeScript, not Go or Rust

**tqs is not the right tool when:**
- You need multi-threading or concurrency
- You need the npm ecosystem or async I/O
- Your script uses Node.js built-ins (`fs`, `path`, `http`, etc.)
- You need error handling beyond synchronous retries

---

## License

MIT — See [LICENSE](LICENSE)
