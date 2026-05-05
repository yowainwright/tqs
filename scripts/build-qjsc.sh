#!/bin/bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

quickjs_ng_url() {
  printf '%s\n' "https://github.com/quickjs-ng/quickjs.git"
}

clone_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/quickjs-ng"
}

build_dir() {
  local qjs_dir="${1:-$(clone_dir)}"
  printf '%s\n' "$qjs_dir/build"
}

bin_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/bin"
}


ensure_repo() {
  local qjs_dir="${1:-$(clone_dir)}"
  local url="${2:-$(quickjs_ng_url)}"
  if [ ! -d "$qjs_dir" ]; then
    git clone --depth=1 "$url" "$qjs_dir"
  fi
}

cmake_configure() {
  local bd="${1:-$(build_dir)}"
  mkdir -p "$bd"
  cmake "$(dirname "$bd")" -B "$bd" -DCMAKE_BUILD_TYPE=Release
}

cmake_build_qjsc() {
  local bd="${1:-$(build_dir)}"
  local jobs="${2:-$(nproc 2>/dev/null || sysctl -n hw.ncpu)}"
  cmake --build "$bd" --target qjsc -j"$jobs"
}

copy_qjsc() {
  local bd="${1:-$(build_dir)}"
  local out_dir="${2:-$(bin_dir)}"
  mkdir -p "$out_dir"
  cp "$bd/qjsc" "$out_dir/"
}

main() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local qjs_dir bd

  qjs_dir="$(clone_dir "$root_dir")"
  bd="$(build_dir "$qjs_dir")"

  echo "Building qjsc from quickjs-ng (latest)..."
  ensure_repo "$qjs_dir"
  cmake_configure "$bd"
  cmake_build_qjsc "$bd"
  copy_qjsc "$bd" "$(bin_dir "$root_dir")"
  echo "qjsc built: $(bin_dir "$root_dir")/qjsc"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
