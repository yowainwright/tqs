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
