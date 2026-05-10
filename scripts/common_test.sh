#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/common.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

assert_eq "$(path_in_dir /foo bar)" "/foo/bar" "path_in_dir joins correctly"

td="$(make_temp_dir common-test.XXXXXX)"
assert_exists "$td" "make_temp_dir creates dir"
rm -rf "$td"

mkdir "$TMP/d"
cleanup_dir "$TMP/d"
assert_missing "$TMP/d" "cleanup_dir removes dir"

touch "$TMP/f"
remove_file_if_present "$TMP/f"
assert_missing "$TMP/f" "remove_file_if_present removes file"
remove_file_if_present "$TMP/nope"

mkdir "$TMP/empty" "$TMP/full"
touch "$TMP/full/x"
remove_dir_if_empty "$TMP/empty"
remove_dir_if_empty "$TMP/full"
assert_missing "$TMP/empty" "remove_dir_if_empty removes empty dir"
assert_exists  "$TMP/full"  "remove_dir_if_empty keeps non-empty dir"

ensure_dir "$TMP/new/nested"
assert_exists "$TMP/new/nested" "ensure_dir creates nested dir"

ensure_parent_dir "$TMP/parents/child/file.txt"
assert_exists "$TMP/parents/child" "ensure_parent_dir creates parent dirs"

done_testing
