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

typecheck_lib() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  bunx tsc --project "$root_dir/tsconfig.json" --emitDeclarationOnly --declarationMap false --outDir "$root_dir/dist"
}

typecheck_cli() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  bunx tsc --project "$root_dir/tsconfig.cli.json" --noEmit
}

main() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local src_dir="$root_dir/src"
  local dist_dir="$root_dir/dist"
  local version
  version="$(get_version "$root_dir")"

  rm -rf "$dist_dir"
  build_library "$src_dir" "$dist_dir" "$version"
  build_cli "$src_dir/cli/index.ts" "$dist_dir/cli/index.js" "$version"
  typecheck_lib "$root_dir"
  typecheck_cli "$root_dir"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
