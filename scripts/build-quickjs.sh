#!/bin/bash
set -euo pipefail

# shellcheck source=./lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

default_deps_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/deps/quickjs-ng"
}

default_output_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/bin"
}

default_output_path() {
  local output_dir="${1:-$(default_output_dir)}"
  printf '%s\n' "$output_dir/qjsc"
}

default_cc_bin() {
  printf '%s\n' "${1:-${CC:-cc}}"
}

default_version() {
  printf '%s\n' "${1:-tqs}"
}

ensure_staged_sources() {
  local deps_dir="${1:-$(default_deps_dir)}"
  [ -f "$deps_dir/quickjs.c" ] || {
    echo "Staged QuickJS sources not found at $deps_dir. Run 'npm run stage:quickjs' first." >&2
    return 1
  }
}

ensure_output_dir() {
  local output_dir="${1:-$(default_output_dir)}"
  ensure_dir "$output_dir"
}

qjsc_source_args() {
  printf '%s\n' qjsc.c quickjs.c quickjs-libc.c libregexp.c libunicode.c dtoa.c
}

qjsc_link_args() {
  printf '%s\n' -lm -ldl -lpthread
}

compile_qjsc_sources() {
  local output_path="${1:?output_path is required}"
  local cc_bin="${2:-$(default_cc_bin)}"
  local version="${3:-$(default_version)}"

  "$cc_bin" -D_GNU_SOURCE "-DCONFIG_VERSION=\"$version\"" -I. $(qjsc_source_args) $(qjsc_link_args) -o "$output_path"
}

build_qjsc() {
  local deps_dir="${1:?deps_dir is required}"
  local output_path="${2:?output_path is required}"
  local cc_bin="${3:-$(default_cc_bin)}"
  local version="${4:-$(default_version)}"

  (
    cd "$deps_dir"
    compile_qjsc_sources "$output_path" "$cc_bin" "$version"
  )
}

announce_build_start() {
  echo "Building QuickJS compiler from staged sources..."
}

announce_build_complete() {
  local output_path="${1:?output_path is required}"
  echo "Built $output_path"
}

main() {
  local root_dir="${1:-${ROOT_DIR:-$(repo_root "${BASH_SOURCE[0]}")}}"
  local deps_dir="${2:-${DEPS_DIR:-$(default_deps_dir "$root_dir")}}"
  local output_dir="${3:-${OUTPUT_DIR:-$(default_output_dir "$root_dir")}}"
  local output_path="${4:-${OUTPUT_PATH:-$(default_output_path "$output_dir")}}"
  local cc_bin="${5:-${CC_BIN:-$(default_cc_bin)}}"
  local version="${6:-${VERSION:-$(default_version)}}"

  ensure_staged_sources "$deps_dir"
  ensure_output_dir "$output_dir"
  announce_build_start
  build_qjsc "$deps_dir" "$output_path" "$cc_bin" "$version"
  announce_build_complete "$output_path"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
