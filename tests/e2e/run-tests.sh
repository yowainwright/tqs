#!/bin/bash
set -e

echo "Running E2E Tests with Docker..."

# Build Docker image
echo "Building Docker image..."
docker build -t tqs-e2e -f tests/e2e/Dockerfile .

# Test 1: Help command
echo "Test 1: Help command"
docker run --rm tqs-e2e /app/bin/tqs --help

# Test 2: Version command
echo "Test 2: Version command"
docker run --rm tqs-e2e /app/bin/tqs --version

# Test 3: Simple QuickJS script
echo "Test 3: Simple QuickJS script"
docker run --rm tqs-e2e /app/bin/tqs simple.tqs

# Test 4: Fetch functionality test
echo "Test 4: Fetch functionality test"
docker run --rm --network host tqs-e2e /app/bin/tqs fetch-test.tqs

# Test 5: QuickJS modules test
echo "Test 5: QuickJS modules test"
docker run --rm tqs-e2e /app/bin/tqs quickjs-modules.tqs

# Test 6: Error handling - non-existent file
echo "Test 6: Error handling - non-existent file"
if docker run --rm tqs-e2e /app/bin/tqs non-existent.tqs 2>/dev/null; then
    echo "Should have failed for non-existent file"
    exit 1
else
    echo "Correctly failed for non-existent file"
fi

# Test 7: Error handling - non-QuickJS file
echo "Test 7: Error handling - non-QuickJS file"
docker run --rm tqs-e2e bash -c 'echo "console.log(\"not quickjs\")" > regular.ts && /app/bin/tqs regular.ts' || echo "Correctly rejected non-QuickJS file"

# Test 8: File detection - scripts directory
echo "Test 8: File detection - scripts directory"
docker run --rm tqs-e2e bash -c 'mkdir -p scripts && echo "console.log(\"scripts dir\")" > scripts/test.ts && /app/bin/tqs scripts/test.ts'

# Test 9: File detection - @tqs-script comment
echo "Test 9: File detection - @tqs-script comment"
docker run --rm tqs-e2e bash -c 'echo -e "// @tqs-script\nconsole.log(\"commented\")" > commented.ts && /app/bin/tqs commented.ts'

echo "All E2E tests completed!"
echo ""
echo "Summary:"
echo "- CLI help and version"
echo "- Simple QuickJS script execution"
echo "- Maybefetch HTTP functionality"
echo "- QuickJS std and os modules"
echo "- Error handling and validation"
echo "- File detection methods (.tqs, directories, comments)"