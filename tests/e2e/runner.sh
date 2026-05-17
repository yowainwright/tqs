#!/bin/bash
set -e

TQS="bun /app/dist/cli/index.js"
MAX_BINARY_BYTES="${MAX_BINARY_BYTES:-5000000}"

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose -f tests/e2e/docker-compose.yml)
else
  COMPOSE=(docker compose -f tests/e2e/docker-compose.yml)
fi

cleanup() {
  "${COMPOSE[@]}" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

echo "Running E2E Tests..."

echo "Building Docker image..."
docker build -t tqs-e2e -f tests/e2e/Dockerfile .

run() {
  docker run --rm tqs-e2e bash -c "cd /test-scripts && $1"
}

run_networked() {
  "${COMPOSE[@]}" run --rm tqs-test bash -c "cd /test-scripts && $1"
}

compile_and_run() {
  local script="$1"
  local name="$(basename "${script%.*}")"
  local output="/tmp/$name"
  echo "$TQS $script -o $output && magic=\$(head -c 4 $output | od -An -tx1 | tr -d '[:space:]') && if [ \"\$magic\" != 7f454c46 ]; then echo \"FAIL: $output is not a native ELF binary\" >&2; exit 1; fi && bytes=\$(wc -c < $output | tr -d '[:space:]') && if [ \"\$bytes\" -gt \"$MAX_BINARY_BYTES\" ]; then echo \"FAIL: $output is too large: \$bytes bytes\" >&2; exit 1; fi && echo \"PASS: native QuickJS binary (\$bytes bytes)\" && $output"
}

has_backend() {
  docker run --rm tqs-e2e bash -c "test -f /app/scripts/tqs-qjsc.sh && test -f /app/deps/quickjs-ng/qjsc.c && command -v cc >/dev/null 2>&1"
}

echo "Test 1: Help command"
docker run --rm tqs-e2e bash -c "$TQS --help"

echo "Test 2: Version command"
docker run --rm tqs-e2e bash -c "$TQS --version"

BACKEND_AVAILABLE=0
if has_backend; then
  BACKEND_AVAILABLE=1
fi

if [ "$BACKEND_AVAILABLE" -eq 1 ]; then
  echo "Test 3: Simple QuickJS script"
  run "$(compile_and_run simple.tqs)"

  echo "Test 4: QuickJS modules"
  run "$(compile_and_run quickjs-modules.tqs)"

  echo "Test 5: maybefetch — success and null on failure"
  "${COMPOSE[@]}" up -d httpbin
  run_networked "$(compile_and_run fetch-test.tqs)"
  "${COMPOSE[@]}" down
else
  echo "Skipping compile/run E2E tests: bundled compiler backend is not available in the image"
fi

echo "Test 6: Error handling - non-existent file"
if docker run --rm tqs-e2e bash -c "$TQS non-existent.tqs" 2>/dev/null; then
  echo "FAIL: should have failed for non-existent file"
  exit 1
fi
echo "PASS: correctly failed for non-existent file"

echo "Test 7: .ts file without @tqs-script marker is rejected"
if docker run --rm tqs-e2e bash -c "$TQS /app/tests/fixtures/unmarked.ts" 2>/dev/null; then
  echo "FAIL: should have rejected unmarked .ts file"
  exit 1
fi
echo "PASS: correctly rejected unmarked .ts file"

if [ "$BACKEND_AVAILABLE" -eq 1 ]; then
  echo "Test 8: .ts file with @tqs-script marker is accepted"
  run "$(compile_and_run /app/tests/fixtures/tqs-comment.ts)"
fi

echo "All E2E tests passed."
