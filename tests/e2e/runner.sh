#!/bin/bash
set -e

COMPOSE="docker-compose -f tests/e2e/docker-compose.yml"

echo "Running E2E Tests..."

echo "Building Docker image..."
docker build -t tqs-e2e -f tests/e2e/Dockerfile .

run() {
  docker run --rm tqs-e2e bash -c "cd /test-scripts && $1"
}

run_networked() {
  $COMPOSE run --rm tqs-test bash -c "cd /test-scripts && $1"
}

compile_and_run() {
  local script="$1"
  local name="${script%.*}"
  echo "/app/bin/tqs $script && ./$name"
}

echo "Test 1: Help command"
docker run --rm tqs-e2e /app/bin/tqs --help

echo "Test 2: Version command"
docker run --rm tqs-e2e /app/bin/tqs --version

echo "Test 3: Simple QuickJS script"
run "$(compile_and_run simple.tqs)"

echo "Test 4: QuickJS modules"
run "$(compile_and_run quickjs-modules.tqs)"

echo "Test 5: maybefetch — success and null on failure"
$COMPOSE up -d httpbin
run_networked "$(compile_and_run fetch-test.tqs)"
$COMPOSE down

echo "Test 6: Error handling - non-existent file"
if docker run --rm tqs-e2e /app/bin/tqs non-existent.tqs 2>/dev/null; then
  echo "FAIL: should have failed for non-existent file"
  exit 1
fi
echo "PASS: correctly failed for non-existent file"

echo "Test 7: .ts file without @tqs-script marker is rejected"
if docker run --rm tqs-e2e /app/bin/tqs /app/tests/fixtures/unmarked.ts 2>/dev/null; then
  echo "FAIL: should have rejected unmarked .ts file"
  exit 1
fi
echo "PASS: correctly rejected unmarked .ts file"

echo "Test 8: .ts file with @tqs-script marker is accepted"
run "$(compile_and_run /app/tests/fixtures/tqs-comment.ts)"

echo "All E2E tests passed."
