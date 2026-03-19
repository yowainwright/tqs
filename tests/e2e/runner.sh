#!/bin/bash
set -e

echo "Running E2E Tests with Docker..."

echo "Building Docker image..."
docker build -t tqs-e2e -f tests/e2e/Dockerfile .

echo "Test 1: Help command"
docker run --rm tqs-e2e /app/bin/tqs --help

echo "Test 2: Version command"
docker run --rm tqs-e2e /app/bin/tqs --version

echo "Test 3: Simple QuickJS script"
docker run --rm tqs-e2e /app/bin/tqs simple.tqs

echo "Test 4: Fetch functionality test"
docker run --rm --network host tqs-e2e /app/bin/tqs fetch-test.tqs

echo "Test 5: QuickJS modules test"
docker run --rm tqs-e2e /app/bin/tqs quickjs-modules.tqs

echo "Test 6: Error handling - non-existent file"
if docker run --rm tqs-e2e /app/bin/tqs non-existent.tqs 2>/dev/null; then
    echo "Should have failed for non-existent file"
    exit 1
else
    echo "Correctly failed for non-existent file"
fi

echo "Test 7: Error handling - non-QuickJS file"
docker run --rm tqs-e2e bash -c 'echo "console.log(\"not quickjs\")" > unmarked.ts && /app/bin/tqs unmarked.ts' || echo "Correctly rejected non-QuickJS file"

echo "Test 8: File detection - scripts directory"
docker run --rm tqs-e2e bash -c 'mkdir -p scripts && echo "console.log(\"detect by dir\")" > scripts/detect-by-dir.ts && /app/bin/tqs scripts/detect-by-dir.ts'

echo "Test 9: File detection - @tqs-script comment"
docker run --rm tqs-e2e bash -c 'cp /app/tests/fixtures/tqs-comment.ts . && /app/bin/tqs tqs-comment.ts'

echo "All E2E tests passed."
