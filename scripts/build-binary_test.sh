#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/build-binary.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

assert_eq "$(quickjs_dir "$TMP")"           "$TMP/quickjs-ng"          "quickjs_dir"
assert_eq "$(build_dir "$TMP/quickjs-ng")"  "$TMP/quickjs-ng/build"    "build_dir"
assert_eq "$(native_include_dir "$TMP")"    "$TMP/native/include"      "native_include_dir"
assert_eq "$(bin_dir "$TMP")"               "$TMP/bin"                 "bin_dir"
assert_eq "$(quickjs_commit_file "$TMP")"   "$TMP/scripts/quickjs-ng.commit" "quickjs_commit_file"

printf 'abc123\n' > "$TMP/commit"
assert_eq "$(quickjs_commit "$TMP/commit")" "abc123" "quickjs_commit trims newline"

touch "$TMP/exists.h"
require_native_file "$TMP/exists.h" && ok "require_native_file passes for present file" || fail "require_native_file passes for present file"
assert_fails require_native_file "$TMP/missing.h"

printf '#include "../include/maybefetch.h"\nint x;\n' > "$TMP/src.c"
rewrite_include "$TMP/src.c" "$TMP/out.c"
assert_contains "$(cat "$TMP/out.c")" '"maybefetch.h"' "rewrite_include rewrites path"

write_tqs_main "$TMP"
assert_exists "$TMP/tqs_main.c"                                      "write_tqs_main creates file"
assert_contains "$(cat "$TMP/tqs_main.c")" "eval_file"               "write_tqs_main contains eval_file"
assert_contains "$(cat "$TMP/tqs_main.c")" "js_std_add_maybefetch"   "write_tqs_main contains maybefetch hook"

printf 'cmake_minimum_required(VERSION 3.14)\n' > "$TMP/CMakeLists.txt"
patch_cmakelists "$TMP/CMakeLists.txt"
assert_contains "$(cat "$TMP/CMakeLists.txt")" "tqs_exe" "patch_cmakelists adds tqs_exe target"

count_before="$(grep -c "tqs_exe" "$TMP/CMakeLists.txt")"
patch_cmakelists "$TMP/CMakeLists.txt"
count_after="$(grep -c "tqs_exe" "$TMP/CMakeLists.txt")"
assert_eq "$count_before" "$count_after" "patch_cmakelists is idempotent"

done_testing
