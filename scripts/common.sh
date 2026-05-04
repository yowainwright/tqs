#!/bin/bash

repo_root() {
  local script_path="${1:?script_path is required}"
  cd "$(dirname "$script_path")/.." && pwd
}

path_in_dir() {
  local parent_dir="${1:?parent_dir is required}"
  local child_name="${2:?child_name is required}"
  printf '%s\n' "$parent_dir/$child_name"
}

make_temp_dir() {
  local name="${1:-tmp.XXXXXX}"
  mktemp -d "${TMPDIR:-/tmp}/$name"
}

cleanup_dir() {
  local dir_path="${1:-}"
  if [ -n "$dir_path" ] && [ -d "$dir_path" ]; then
    rm -rf "$dir_path"
  fi
}

remove_file_if_present() {
  local file_path="${1:-}"
  if [ -n "$file_path" ] && [ -f "$file_path" ]; then
    rm -f "$file_path"
  fi
}

ensure_dir() {
  local dir_path="${1:?dir_path is required}"
  mkdir -p "$dir_path"
}

ensure_parent_dir() {
  local file_path="${1:?file_path is required}"
  mkdir -p "$(dirname "$file_path")"
}

remove_dir_if_present() {
  local dir_path="${1:-}"
  cleanup_dir "$dir_path"
}

remove_dir_if_empty() {
  local dir_path="${1:-}"
  if [ -n "$dir_path" ] && [ -d "$dir_path" ] && [ -z "$(ls -A "$dir_path")" ]; then
    rmdir "$dir_path"
  fi
}

install_exit_trap() {
  local trap_command="${1:?trap_command is required}"
  trap "$trap_command" EXIT
}

_pass=0
_fail=0

ok()   { printf 'ok  %s\n' "$1"; _pass=$((_pass+1)); }
fail() { printf 'FAIL %s\n' "$1"; _fail=$((_fail+1)); }

assert_eq() {
  local got="$1" want="$2" label="$3"
  if [ "$got" = "$want" ]; then ok "$label"
  else printf 'FAIL %s\n  got:  %s\n  want: %s\n' "$label" "$got" "$want"; _fail=$((_fail+1)); fi
}

assert_contains() {
  local haystack="$1" needle="$2" label="$3"
  if printf '%s' "$haystack" | grep -qF "$needle"; then ok "$label"
  else printf 'FAIL %s — missing: %s\n' "$label" "$needle"; _fail=$((_fail+1)); fi
}

assert_exists() {
  local path="$1" label="$2"
  if [ -e "$path" ]; then ok "$label"
  else printf 'FAIL %s — missing: %s\n' "$label" "$path"; _fail=$((_fail+1)); fi
}

assert_missing() {
  local path="$1" label="$2"
  if [ ! -e "$path" ]; then ok "$label"
  else printf 'FAIL %s — exists: %s\n' "$label" "$path"; _fail=$((_fail+1)); fi
}

assert_fails() {
  if ! "$@" 2>/dev/null; then ok "fails: $*"
  else printf 'FAIL expected failure: %s\n' "$*"; _fail=$((_fail+1)); fi
}

done_testing() {
  printf '\n%d passed, %d failed\n' "$_pass" "$_fail"
  [ "$_fail" -eq 0 ]
}
