#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/stage-quickjs.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

printf 'abc123\n' > "$TMP/quickjs-ng.commit"
assert_eq "$(read_pinned_commit "$TMP/quickjs-ng.commit")" "abc123" "read_pinned_commit strips newline"

mkdir -p "$TMP/deps"
record_upstream_commit "abc123" "$TMP/deps"
assert_eq "$(cat "$TMP/deps/UPSTREAM_COMMIT")" "abc123" "record_upstream_commit writes commit"

mkdir -p "$TMP/snapshot" "$TMP/deps2"
printf 'hello\n' > "$TMP/snapshot/file.c"
printf 'file.c\n' > "$TMP/files.list"
stage_listed_files "$TMP/snapshot" "$TMP/files.list" "$TMP/deps2"
assert_exists "$TMP/deps2/file.c" "stage_listed_files copies file"

printf 'file.c\nmissing.h\n' > "$TMP/bad.list"
assert_fails stage_listed_files "$TMP/snapshot" "$TMP/bad.list" "$TMP/deps2"

done_testing
