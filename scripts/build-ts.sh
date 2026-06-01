#!/bin/bash
set -e

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

get_version() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  bun -e "console.log(require('$root_dir/package.json').version)"
}

build_library() {
  local src_dir="${1:?src_dir is required}"
  local out_dir="${2:?out_dir is required}"
  local version="${3:?version is required}"
  bun build "$src_dir/index.ts" "$src_dir/quickjs.ts" \
    --outdir "$out_dir" \
    --target browser \
    --minify \
    --external qjs:std \
    --external qjs:os \
    --define "__VERSION__=\"$version\""
}

build_cli() {
  local entry="${1:?entry is required}"
  local out_file="${2:?out_file is required}"
  local version="${3:?version is required}"
  bun build "$entry" \
    --outfile "$out_file" \
    --target node \
    --minify \
    --define "__VERSION__=\"$version\""
}

add_cli_shebang() {
  local out_file="${1:?out_file is required}"
  local tmp_file="$out_file.tmp"
  printf '#!/usr/bin/env bun\n' > "$tmp_file"
  cat "$out_file" >> "$tmp_file"
  mv "$tmp_file" "$out_file"
  chmod +x "$out_file"
}

typecheck_lib() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  bunx --bun tsc --project "$root_dir/tsconfig.json" --emitDeclarationOnly --declarationMap false --outDir "$root_dir/dist"
}

typecheck_cli() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  bunx --bun tsc --project "$root_dir/tsconfig.cli.json" --noEmit
}

copy_quickjs_types() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local dist_dir="$root_dir/dist"
  cp "$root_dir/src/qjs.d.ts" "$dist_dir/qjs.d.ts"
  cp "$root_dir/src/global.d.ts" "$dist_dir/global.d.ts"
}

add_quickjs_type_refs() {
  local quickjs_types="${1:?quickjs_types is required}"
  local tmp_file="$quickjs_types.tmp"
  printf '/// <reference path="./qjs.d.ts" />\n' > "$tmp_file"
  printf '/// <reference path="./global.d.ts" />\n' >> "$tmp_file"
  cat "$quickjs_types" >> "$tmp_file"
  mv "$tmp_file" "$quickjs_types"
}

main() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local src_dir="$root_dir/src"
  local dist_dir="$root_dir/dist"
  local cli_out="$dist_dir/cli/index.js"
  local version
  version="$(get_version "$root_dir")"

  rm -rf "$dist_dir"
  build_library "$src_dir" "$dist_dir" "$version"
  build_cli "$src_dir/cli/index.ts" "$cli_out" "$version"
  typecheck_lib "$root_dir"
  typecheck_cli "$root_dir"
  add_cli_shebang "$cli_out"
  copy_quickjs_types "$root_dir"
  add_quickjs_type_refs "$dist_dir/quickjs.d.ts"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
