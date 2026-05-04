#!/bin/bash
set -euo pipefail

# shellcheck source=./common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

default_deps_root() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/deps"
}

default_quickjs_deps_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/deps/quickjs-ng"
}

default_bin_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/bin"
}

default_qjsc_path() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/bin/qjsc"
}

default_dist_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/dist"
}

remove_quickjs_deps() {
  local quickjs_deps_dir="${1:-$(default_quickjs_deps_dir)}"
  remove_dir_if_present "$quickjs_deps_dir"
}

remove_deps_root_if_empty() {
  local deps_root="${1:-$(default_deps_root)}"
  remove_dir_if_empty "$deps_root"
}

remove_qjsc() {
  local qjsc_path="${1:-$(default_qjsc_path)}"
  remove_file_if_present "$qjsc_path"
}

remove_bin_dir_if_empty() {
  local bin_dir="${1:-$(default_bin_dir)}"
  remove_dir_if_empty "$bin_dir"
}

remove_dist() {
  local dist_dir="${1:-$(default_dist_dir)}"
  remove_dir_if_present "$dist_dir"
}

clean_quickjs() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  remove_quickjs_deps "$(default_quickjs_deps_dir "$root_dir")"
  remove_deps_root_if_empty "$(default_deps_root "$root_dir")"
}

clean_qjsc() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  remove_qjsc "$(default_qjsc_path "$root_dir")"
  remove_bin_dir_if_empty "$(default_bin_dir "$root_dir")"
}

clean_dist() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  remove_dist "$(default_dist_dir "$root_dir")"
}

clean_all() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  clean_quickjs "$root_dir"
  clean_qjsc "$root_dir"
  clean_dist "$root_dir"
}

main() {
  local root_dir="${1:-${ROOT_DIR:-$(repo_root "${BASH_SOURCE[0]}")}}"
  local target="${2:-${CLEAN_TARGET:-all}}"

  case "$target" in
    all)
      clean_all "$root_dir"
      ;;
    quickjs)
      clean_quickjs "$root_dir"
      ;;
    qjsc)
      clean_qjsc "$root_dir"
      ;;
    dist)
      clean_dist "$root_dir"
      ;;
    *)
      echo "Unknown clean target '$target'. Expected one of: all, quickjs, qjsc, dist." >&2
      return 1
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
