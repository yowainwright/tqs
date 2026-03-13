# tqs

A convenient TypeScript wrapper around QuickJS-NG (Bellard's QuickJS) with HTTP fetching.

## Install

```bash
npm install -g tqs
```

## Usage

Create QuickJS-compatible TypeScript files:

```typescript
// script.tqs
import * as std from 'std';

const data = maybefetch('https://httpbin.org/json', 3, 1000, 30000, 2.0, 10000);
std.printf("Response: %s\n", data);
std.exit(0);
```

Run:
```bash
tqs script.tqs
```

## File Detection

Scripts are detected as QuickJS-compatible via:
- `.tqs` extension
- `// @tqs-script` comment
- `scripts/`, `quickjs/`, `tqs/` directories

## API

### Global Function
```typescript
maybefetch(
  url: string,
  maxRetries: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffFactor: number,
  timeoutMs: number
): string | null
```

### QuickJS Modules
```typescript
import * as std from 'std';  // printf, exit, gc
import * as os from 'os';    // getcwd, readdir, exec
```

### Node.js APIs
Not available. Use QuickJS equivalents:
- `fs` → `os` module
- `http`/`https` → `maybefetch()`
- `process` → `std` module
