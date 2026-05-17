# Agents Guide

Reference for AI agents working on the tqs codebase. Read this first.

## What tqs does

`tqs` compiles TypeScript to standalone native binaries via [QuickJS-NG](https://github.com/quickjs-ng/quickjs). It bundles TypeScript with `bun build`, then uses the bundled compiler backend to generate a QuickJS executable with `maybefetch` — a curl-backed HTTP client with retry/backoff — linked in as a C extension.

```
my-script.ts
  → bun build (bundle to self-contained JS, browser target)
  → scripts/tqs-qjsc.sh (QuickJS compiler backend → native binary)
  → ./my-script
```

The output binary embeds QuickJS, maybefetch, and all JS source. Native system libraries such as libcurl may still be dynamically linked by the platform toolchain.

## Source map

| File | Responsibility |
|---|---|
| `src/cli/index.ts` | Entry point — reads `process.argv`, routes to help/version/compile |
| `src/cli/args.ts` | Argument parsing — returns `ParsedArgs` |
| `src/cli/help.ts` | Renders help output |
| `src/cli/version.ts` | Renders version string (uses `__VERSION__` define injected by Bun build) |
| `src/compiler.ts` | Compilation pipeline: TypeScript → JS (`bun build`) → binary (`scripts/tqs-qjsc.sh` by default, `TQS_QJSC` override) |
| `src/maybefetch.ts` | TypeScript wrapper for maybefetch — supports QuickJS global or Node.js NativeBinding |
| `src/logger.ts` | Colored terminal output — respects `NO_COLOR` env var |
| `src/constants.ts` | CLI name, exit codes, ANSI color codes, character constants |
| `src/types.ts` | All TypeScript interfaces: `ParsedArgs`, `FetchConfig`, `Logger`, QuickJS types |
| `src/qjs.d.ts` | Module declarations for `qjs:std`, `qjs:os`; blocks Node.js module imports in QuickJS scripts |
| `src/global.d.ts` | QuickJS globals exposed to compiled scripts |
| `src/quickjs.ts` | Re-exports all types for use as `import 'tqs/quickjs'` |
| `src/index.ts` | Public package exports (`maybeFetch`, `defaultConfig`) |

## Native code

| File | Responsibility |
|---|---|
| `native/include/maybefetch.h` | C header for maybefetch |
| `native/src/maybefetch.c` | HTTP client using libcurl with exponential backoff retry |
| `native/src/quickjs_maybefetch.c` | QuickJS C binding — registers `maybefetch` as a JS global |
| `native/src/binding.cc` | Node.js addon (node-addon-api) for use in Bun/Node contexts |

## Build system

Two independent builds:

**TypeScript build** (`bun run build:ts`):
- Library entry: `src/index.ts` + `src/quickjs.ts` → `dist/` (ESM + `.d.ts`)
- CLI entry: `src/cli/index.ts` → `dist/cli/index.js` (executable Node.js script)
- `qjs:std` and `qjs:os` are marked external for script bundles (provided by the QuickJS runtime)
- `__VERSION__` is injected from `package.json` at build time

**QuickJS runtime build** (`bash scripts/build-binary.sh`):
- Clones QuickJS-NG, copies maybefetch C sources
- Appends `tqs_runtime` CMake target to QuickJS's `CMakeLists.txt`
- Compiles with cmake → `bin/tqs-runtime` (internal runtime, not the public `tqs` compiler CLI)

**Bundled compiler backend** (`scripts/tqs-qjsc.sh`):
- Uses staged QuickJS-NG sources from `deps/quickjs-ng` in npm packages, or `quickjs-ng` in a local checkout
- Builds and caches a small qjsc helper from source
- Runs qjsc with `-e` to generate C, injects `js_std_add_maybefetch(ctx)`, then compiles the final executable with libcurl

## CLI flow

```
process.argv → slice(2) → parseArgs() → route:
  options.version  → showVersion() → exit 0
  options.help || args.length === 0 → showHelp() → exit 0
  options.scriptFile → compile(file, outputFile?)
```

`compile` in `src/compiler.ts`:
1. If `.ts` or `.tqs`: `bun build --target browser --outfile <tmp>/<file>.js <file>`
2. `${TQS_QJSC:-scripts/tqs-qjsc.sh} -o <output> <tmp>/<file>.js`
3. Clean up the temporary directory

## maybefetch

Two execution modes:

| Mode | When | How |
|---|---|---|
| **QuickJS global** | Running inside compiled binary | Calls `globalThis.maybefetch(url, ...params)` |
| **NativeBinding** | Running in Bun/Node.js | Calls C addon via `binding.maybeFetch(url, config)` |

If the QuickJS global is missing, `maybeFetch()` throws `'maybefetch is not available'`.

## Testing

| Location | What | Runner |
|---|---|---|
| `tests/unit/cli/args.test.ts` | `parseArgs` edge cases | `bun test` |
| `tests/unit/src/maybefetch.test.ts` | fetch/fetchAsync with mock binding | `bun test` |
| `tests/integration/cli.test.ts` | Built package CLI — help, version, error cases | `bun test` (skips if `dist/cli/index.js` absent) |
| `tests/e2e/` | Full Docker-based end-to-end | `bash tests/e2e/runner.sh` |

Run: `bun test`

Integration tests auto-skip when `dist/cli/index.js` has not been built. Build it first with `bun run build:ts` to enable them.

## QuickJS constraints

User scripts run inside QuickJS. The package CLI (`src/cli/`, `src/compiler.ts`, `src/logger.ts`) runs under Node.js/Bun and shells out to Bun and the compiler backend.

QuickJS script-facing code and types must remain **sync and QJS-safe**:

- No `async/await`, `Promise`, dynamic `import()`
- No Node.js APIs — `fs`, `path`, `process`, `child_process` are blocked by `src/qjs.d.ts`
- Use `qjs:std` and `qjs:os` instead
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

- Version is in `package.json` — Bun build injects it as `__VERSION__` in the CLI build
- `bun run release` runs release-it: bumps version, creates GitHub release + tag
- GitHub Actions `release.yml` triggers on `v*` tags and builds `bin/tqs-runtime-darwin-arm64`, `bin/tqs-runtime-linux-x64`
- Pre-release checks (configured in `package.json`): `bun run lint`, `bun run build:ts`, `bun run test`

## Commands

```bash
bun install
bun run lint              # oxlint src/
bun run typecheck         # tsc --noEmit
bun run stage:quickjs     # stage pinned QuickJS-NG sources into deps/
bun run build:ts          # Bun build + declarations
bun run build:runtime     # QuickJS runtime → bin/tqs-runtime
bun test                  # unit + integration tests
bun run release           # release-it (bump version + GitHub release)
```

## Links

- [QuickJS-NG](https://github.com/quickjs-ng/quickjs)
- [QuickJS-NG Docs](https://quickjs-ng.github.io/quickjs/)
- [Bun Test](https://bun.sh/docs/cli/test)
- [tsup](https://tsup.egoist.dev/)
