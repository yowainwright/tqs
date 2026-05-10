#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/clean.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_root() {
  local root="$TMP/$1"
  mkdir -p "$root/deps/quickjs-ng" "$root/bin" "$root/dist"
  touch "$root/deps/quickjs-ng/quickjs.c" "$root/bin/qjsc" "$root/dist/index.js"
  printf '%s\n' "$root"
}

root="$(make_root all)"
clean_all "$root"
assert_missing "$root/deps"    "clean_all removes deps"
assert_missing "$root/dist"    "clean_all removes dist"
assert_missing "$root/bin/qjsc" "clean_all removes qjsc"

root="$(make_root quickjs)"
clean_quickjs "$root"
assert_missing "$root/deps"           "clean_quickjs removes deps"
assert_exists  "$root/dist/index.js"  "clean_quickjs keeps dist"
assert_exists  "$root/bin/qjsc"       "clean_quickjs keeps bin"

root="$(make_root dist)"
clean_dist "$root"
assert_missing "$root/dist"              "clean_dist removes dist"
assert_exists  "$root/deps/quickjs-ng"   "clean_dist keeps deps"

done_testing
