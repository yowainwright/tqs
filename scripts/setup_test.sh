#!/bin/bash
set -e
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPTS_DIR/common.sh"
source "$SCRIPTS_DIR/setup.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

is_ci "true"  && ok "is_ci true"  || fail "is_ci true"
is_ci "1"     && ok "is_ci 1"     || fail "is_ci 1"
! is_ci ""    && ok "is_ci empty is false"  || fail "is_ci empty"
! is_ci "false" && ok "is_ci false is false" || fail "is_ci false"

mkdir -p "$TMP/repo/.git"
is_git_repo "$TMP/repo"    && ok "is_git_repo detects .git"       || fail "is_git_repo detects .git"
! is_git_repo "$TMP/plain" && ok "is_git_repo rejects non-repo"   || fail "is_git_repo rejects non-repo"

mkdir -p "$TMP/hooks"
touch "$TMP/hooks/pre-commit"
hook_exists "$TMP/hooks" "pre-commit" && ok "hook_exists detects hook"   || fail "hook_exists detects hook"
! hook_exists "$TMP/hooks" "missing"  && ok "hook_exists rejects missing" || fail "hook_exists rejects missing"

install_hook "pre-commit" "$(pre_commit_hook)" "$TMP/hooks2" >/dev/null
assert_exists "$TMP/hooks2/pre-commit" "install_hook creates hook"

mode="$(stat -c '%a' "$TMP/hooks2/pre-commit" 2>/dev/null || stat -f '%OLp' "$TMP/hooks2/pre-commit")"
assert_eq "$mode" "755" "install_hook sets executable bit"

done_testing
