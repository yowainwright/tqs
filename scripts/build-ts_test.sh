#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/build-ts.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

printf '{"name":"tqs","version":"1.2.3"}\n' > "$TMP/package.json"
assert_eq "$(get_version "$TMP")" "1.2.3" "get_version reads version from package.json"

done_testing
