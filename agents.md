# Agents Guide

Reference for AI agents working on the tqs codebase. Read this first.

## What tqs does

`tqs` compiles TypeScript to standalone native binaries via [QuickJS-NG](https://github.com/quickjs-ng/quickjs). It bundles TypeScript with `bun build`, compiles the result with `qjsc`, and links in `maybefetch` — a curl-backed HTTP client with retry/backoff — as a C extension.

```
my-script.ts
  → bun build (bundle to self-contained JS, browser target)
  → qjsc (QuickJS compiler → native binary with embedded runtime)
  → ./my-script
```

The output binary has no runtime dependencies: QuickJS, maybefetch, and all JS source are statically embedded.

## Source map

| File | Responsibility |
|---|---|
| `src/cli/index.ts` | Entry point — reads `scriptArgs`, routes to help/version/compile |
| `src/cli/args.ts` | Argument parsing — returns `ParsedArgs` |
| `src/cli/help.ts` | Renders help output |
| `src/cli/version.ts` | Renders version string (uses `__VERSION__` define injected by tsup) |
| `src/compiler.ts` | Compilation pipeline: TypeScript → JS (`bun build`) → binary (`qjsc`) |
| `src/maybefetch.ts` | TypeScript wrapper for maybefetch — supports QuickJS global or Node.js NativeBinding |
| `src/logger.ts` | Colored terminal output — respects `NO_COLOR` env var |
| `src/constants.ts` | CLI name, exit codes, ANSI color codes, character constants |
| `src/types.ts` | All TypeScript interfaces: `ParsedArgs`, `FetchConfig`, `NativeBinding`, `Logger`, QuickJS types |
| `src/global.d.ts` | Module declarations for `qjs:std`, `qjs:os`; blocks Node.js APIs with helpful errors; declares `maybefetch` global |
| `src/quickjs.ts` | Re-exports all types for use as `import 'tqs/quickjs'` |
| `src/index.ts` | Public package exports (`fetch`, `fetchAsync`, `defaultConfig`) |

## Native code

| File | Responsibility |
|---|---|
| `native/include/maybefetch.h` | C header for maybefetch |
| `native/src/maybefetch.c` | HTTP client using libcurl with exponential backoff retry |
| `native/src/quickjs_maybefetch.c` | QuickJS C binding — registers `maybefetch` as a JS global |
| `native/src/binding.cc` | Node.js addon (node-addon-api) for use in Bun/Node contexts |

## Build system

Two independent builds:

**TypeScript build** (`bun run build:ts` via tsup):
- Library entry: `src/index.ts` + `src/quickjs.ts` → `dist/` (ESM + `.d.ts`)
- CLI entry: `src/cli/index.ts` → `dist/cli/index.js` (no dts, minified)
- `qjs:std` and `qjs:os` are marked external (provided by the QuickJS runtime)
- `__VERSION__` is injected from `package.json` at build time

**QuickJS binary build** (`bash scripts/build-binary.sh`):
- Clones QuickJS-NG, copies maybefetch C sources
- Appends `tqs_exe` CMake target to QuickJS's `CMakeLists.txt`
- Compiles with cmake → `bin/tqs` (self-contained native binary)

## CLI flow

```
scriptArgs → slice(1) → parseArgs() → route:
  options.version  → showVersion() → exit 0
  options.help || args.length === 0 → showHelp() → exit 0
  options.scriptFile → compileAndRun(file)
```

`compileAndRun` in `src/compiler.ts`:
1. If `.ts` or `.tqs`: `bun build --target browser --outfile <file>.js <file>`
2. `qjsc -o <output> <file>.js`
3. Clean up intermediate `.js` file

## maybefetch

Two execution modes:

| Mode | When | How |
|---|---|---|
| **QuickJS global** | Running inside compiled binary | Calls `globalThis.maybefetch(url, ...params)` |
| **NativeBinding** | Running in Bun/Node.js | Calls C addon via `binding.maybeFetch(url, config)` |

If neither is available, `fetch()` throws `'maybefetch is not available'`.

`fetchAsync` is a `Promise.resolve` wrapper over the sync `fetch` — it is not truly async.

## Testing

| Location | What | Runner |
|---|---|---|
| `tests/unit/cli/args.test.ts` | `parseArgs` edge cases | `bun test` |
| `tests/unit/src/maybefetch.test.ts` | fetch/fetchAsync with mock binding | `bun test` |
| `tests/integration/cli.test.ts` | CLI binary — help, version, error cases | `bun test` (skips if `bin/tqs` absent) |
| `tests/e2e/` | Full Docker-based end-to-end | `bash tests/e2e/runner.sh` |

Run: `bun test`

Integration tests auto-skip when `bin/tqs` has not been built. Build it first with `bash scripts/build-binary.sh` to enable them.

## QuickJS constraints

All CLI source (`src/cli/`, `src/compiler.ts`, `src/logger.ts`) runs inside QuickJS. These files must be **sync and QJS-safe**:

- No `async/await`, `Promise`, dynamic `import()`
- No Node.js APIs — `fs`, `path`, `process`, `child_process` are blocked by `src/global.d.ts`
- Use `qjs:std` and `qjs:os` instead (declared in `src/global.d.ts`)
- No `fetch`, `URL`, `TextEncoder`, `Intl`, `structuredClone`
- No regex lookbehind (`(?<=...)`)

`src/maybefetch.ts` and `src/index.ts` are library code — they may run in Bun/Node too, so they must not import from `qjs:std` or `qjs:os`.

## Code style

- `const` everywhere, no mutation
- Array methods over loops (`map`, `filter`, `reduce`)
- Single-purpose functions under ~20 lines
- No code comments — code should be self-documenting
- No `console.log` — use `logger` (CLI) or nothing (library)
- Types in `src/types.ts`, constants in `src/constants.ts`

## Release

- Version is in `package.json` — tsup injects it as `__VERSION__` in the CLI build
- `bun run release` runs release-it: bumps version, creates GitHub release + tag
- GitHub Actions `release.yml` triggers on `v*` tags and builds `bin/tqs-darwin-arm64`, `bin/tqs-darwin-x64`, `bin/tqs-linux-x64`
- Pre-release checks (configured in `package.json`): `bun run lint`, `bun run build:ts`, `bun run test`

## Commands

```bash
bun install
bun run lint              # oxlint src/
bun run typecheck         # tsc --noEmit
bun run build:ts          # tsup (library + CLI)
bun run build:quickjs     # QuickJS native binary → bin/tqs
bun test                  # unit + integration tests
bun run release           # release-it (bump version + GitHub release)
```

## Links

- [QuickJS-NG](https://github.com/quickjs-ng/quickjs)
- [QuickJS-NG Docs](https://quickjs-ng.github.io/quickjs/)
- [Bun Test](https://bun.sh/docs/cli/test)
- [tsup](https://tsup.egoist.dev/)
