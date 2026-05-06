#!/bin/bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

quickjs_ng_url() {
  printf '%s\n' "https://github.com/quickjs-ng/quickjs.git"
}

clone_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  if [ -n "${QJSC_CLONE_DIR:-}" ]; then
    printf '%s\n' "$QJSC_CLONE_DIR"
    return 0
  fi
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

quickjs_commit_file() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/scripts/quickjs-ng.commit"
}

quickjs_commit() {
  local commit_file="${1:-$(quickjs_commit_file)}"
  tr -d '\n' < "$commit_file"
}

current_commit() {
  local qjs_dir="${1:?qjs_dir is required}"
  git -C "$qjs_dir" rev-parse HEAD 2>/dev/null || true
}

checkout_commit() {
  local qjs_dir="${1:?qjs_dir is required}"
  local commit="${2:?commit is required}"
  [ "$(current_commit "$qjs_dir")" = "$commit" ] && return 0
  if ! git -C "$qjs_dir" diff --quiet || ! git -C "$qjs_dir" diff --cached --quiet; then
    echo "QuickJS checkout has local changes; remove $qjs_dir to switch to $commit" >&2
    return 1
  fi
  git -C "$qjs_dir" fetch --depth=1 origin "$commit"
  git -C "$qjs_dir" checkout --detach "$commit"
}

clone_repo() {
  local url="${1:?url is required}"
  local qjs_dir="${2:?qjs_dir is required}"
  local template_dir
  template_dir="$(make_temp_dir git-template.XXXXXX)"

  if ! git clone --template="$template_dir" --depth=1 "$url" "$qjs_dir"; then
    cleanup_dir "$template_dir"
    return 1
  fi

  cleanup_dir "$template_dir"
}

ensure_repo() {
  local qjs_dir="${1:-$(clone_dir)}"
  local url="${2:-$(quickjs_ng_url)}"
  local commit="${3:-$(quickjs_commit)}"
  if [ ! -d "$qjs_dir/.git" ]; then
    clone_repo "$url" "$qjs_dir"
  fi
  checkout_commit "$qjs_dir" "$commit"
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
  local qjs_dir bd commit

  qjs_dir="$(clone_dir "$root_dir")"
  bd="$(build_dir "$qjs_dir")"
  commit="$(quickjs_commit "$(quickjs_commit_file "$root_dir")")"

  echo "Building qjsc from quickjs-ng $commit..."
  ensure_repo "$qjs_dir" "$(quickjs_ng_url)" "$commit"
  cmake_configure "$bd"
  cmake_build_qjsc "$bd"
  copy_qjsc "$bd" "$(bin_dir "$root_dir")"
  echo "qjsc built: $(bin_dir "$root_dir")/qjsc"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
