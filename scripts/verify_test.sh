#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/verify.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

assert_eq "$(npm_cache_dir)"           "/tmp/npm-cache" "npm_cache_dir returns default"
assert_eq "$(npm_cache_dir /custom)"   "/custom"        "npm_cache_dir uses arg"

printf '{"name":"tqs","version":"1.2.3"}' > "$TMP/package.json"
assert_eq "$(pack_tarball_name "$TMP")" "tqs-1.2.3.tgz" "pack_tarball_name builds filename"

printf '{"name":"@yowainwright/tqs","version":"1.2.3"}' > "$TMP/package.json"
assert_eq "$(pack_tarball_name "$TMP")" "yowainwright-tqs-1.2.3.tgz" "pack_tarball_name supports scoped packages"

assert_eq "$(cli_entry "$TMP/pkg")" "$TMP/pkg/package/dist/cli/index.js" "cli_entry returns correct path"

write_smoke_script "$TMP/smoke.ts"
assert_exists  "$TMP/smoke.ts"                                        "write_smoke_script creates file"
assert_contains "$(cat "$TMP/smoke.ts")" "@tqs-script"                "write_smoke_script has marker"
assert_contains "$(cat "$TMP/smoke.ts")" "maybefetch"                 "write_smoke_script checks maybefetch"
assert_contains "$(cat "$TMP/smoke.ts")" "packed artifact works"      "write_smoke_script has expected output"

touch "$TMP/tarball.tgz"
mkdir -p "$TMP/workdir"
cleanup "$TMP/tarball.tgz" "$TMP/workdir"
assert_missing "$TMP/tarball.tgz" "cleanup removes tarball"
assert_missing "$TMP/workdir"     "cleanup removes workdir"

done_testing
