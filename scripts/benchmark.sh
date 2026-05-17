#!/usr/bin/env bash
set -euo pipefail

root_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

human_bytes() {
  awk -v bytes="$1" '
    BEGIN {
      split("B KB MB GB", units, " ");
      value = bytes;
      unit = 1;
      while (value >= 1024 && unit < 4) {
        value = value / 1024;
        unit++;
      }
      if (unit == 1) {
        printf "%d %s", value, units[unit];
      } else {
        printf "%.2f %s", value, units[unit];
      }
    }
  '
}

measure_rss() {
  local label="${1:?label is required}"
  shift

  local output=""
  local rss=""

  if output="$(/usr/bin/time -l "$@" 2>&1 >/dev/null)"; then
    rss="$(printf '%s\n' "$output" | awk '/maximum resident set size/ { print $1; exit }')"
    if [ -n "$rss" ]; then
      printf '  %s: %s max RSS\n' "$label" "$(human_bytes "$rss")"
      return
    fi
  fi

  if output="$(/usr/bin/time -v "$@" 2>&1 >/dev/null)"; then
    rss="$(printf '%s\n' "$output" | awk -F: '/Maximum resident set size/ { gsub(/^[[:space:]]+/, "", $2); print $2; exit }')"
    if [ -n "$rss" ]; then
      printf '  %s: %s max RSS\n' "$label" "$(human_bytes "$((rss * 1024))")"
      return
    fi
  fi

  printf '  %s: skipped; /usr/bin/time RSS output is unavailable\n' "$label"
}

ROOT_DIR="${1:-$(root_dir)}"
RUNS="${BENCH_RUNS:-50}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tqs-bench.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

cd "$ROOT_DIR"

if [ ! -x "$ROOT_DIR/dist/cli/index.js" ]; then
  echo "Building tqs compiler..."
  bun run build:ts >/dev/null
fi

if [ ! -d "$ROOT_DIR/deps/quickjs-ng" ] && [ ! -d "$ROOT_DIR/quickjs-ng" ]; then
  echo "Staging QuickJS sources..."
  bun run stage:quickjs >/dev/null
fi

cat > "$TMP_DIR/hello.ts" <<'EOF'
// @tqs-script
import * as std from "qjs:std";

std.out.puts("hello\n");
EOF

cat > "$TMP_DIR/node-hello.js" <<'EOF'
console.log("hello");
EOF

cat > "$TMP_DIR/bench-runner.js" <<'EOF'
const { spawnSync } = require("node:child_process");

const [label, command, ...args] = process.argv.slice(2);
const runs = Number(process.env.BENCH_RUNS ?? "50");
let total = 0n;

for (let index = 0; index < runs; index++) {
  const start = process.hrtime.bigint();
  const result = spawnSync(command, args, { stdio: "ignore" });
  const end = process.hrtime.bigint();

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  total += end - start;
}

const averageMs = Number(total) / runs / 1_000_000;
console.log(`  ${label}: ${averageMs.toFixed(3)} ms avg (${runs} runs)`);
EOF

echo "Compiling hello benchmark..."
TQS_CACHE_DIR="${TQS_CACHE_DIR:-$TMP_DIR/cache}" "$ROOT_DIR/dist/cli/index.js" "$TMP_DIR/hello.ts" -o "$TMP_DIR/hello" >/dev/null

artifact_size="$(wc -c < "$TMP_DIR/hello" | tr -d '[:space:]')"
artifact_type="$(file -b "$TMP_DIR/hello" 2>/dev/null || printf 'native executable')"

printf '\nArtifact\n'
printf '  size: %s (%s bytes)\n' "$(human_bytes "$artifact_size")" "$artifact_size"
printf '  type: %s\n' "$artifact_type"

printf '\nStartup\n'
BENCH_RUNS="$RUNS" bun "$TMP_DIR/bench-runner.js" "tqs hello" "$TMP_DIR/hello"

if command -v node >/dev/null 2>&1; then
  BENCH_RUNS="$RUNS" bun "$TMP_DIR/bench-runner.js" "node hello" "$(command -v node)" "$TMP_DIR/node-hello.js"
else
  printf '  node hello: skipped; node is unavailable\n'
fi

printf '\nMemory\n'
measure_rss "tqs hello" "$TMP_DIR/hello"

if command -v node >/dev/null 2>&1; then
  measure_rss "node hello" "$(command -v node)" "$TMP_DIR/node-hello.js"
else
  printf '  node hello: skipped; node is unavailable\n'
fi
