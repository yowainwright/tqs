#!/bin/bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

npm_cache_dir() {
  printf '%s\n' "${1:-/tmp/npm-cache}"
}

run_npm_pack() {
  local root_dir="${1:?root_dir is required}"
  local cache_dir="${2:-$(npm_cache_dir)}"
  (
    cd "$root_dir"
    npm_config_cache="$cache_dir" npm pack --ignore-scripts --silent
  )
}

extract_tarball() {
  local tarball="${1:?tarball is required}"
  local out_dir="${2:?out_dir is required}"
  mkdir -p "$out_dir"
  tar -xzf "$tarball" -C "$out_dir"
}

cli_entry() {
  local packed_dir="${1:?packed_dir is required}"
  printf '%s\n' "$packed_dir/package/dist/cli/index.js"
}

verify_help() {
  local entry="${1:?entry is required}"
  local output
  output="$(node "$entry" --help)"
  printf '%s\n' "$output" | grep -q "Usage" || {
    echo "CLI did not print help output." >&2
    return 1
  }
}

write_smoke_script() {
  local path="${1:?path is required}"
  cat > "$path" << 'EOF'
// @tqs-script
import * as std from "qjs:std";
std.printf("packed artifact works\n");
EOF
}

verify_smoke_binary() {
  local entry="${1:?entry is required}"
  local script="${2:?script is required}"
  local output_path="${script%.ts}"
  node "$entry" "$script"
  "$output_path" | grep -q "packed artifact works" || {
    echo "Compiled binary did not produce expected output." >&2
    return 1
  }
}

stage_and_build() {
  local root_dir="${1:?root_dir is required}"
  bash "$root_dir/scripts/stage-quickjs.sh" "$root_dir"
  (cd "$root_dir" && bash "$root_dir/scripts/build-ts.sh" "$root_dir")
}

cleanup() {
  local tarball="${1:-}"
  local tmp_dir="${2:-}"
  remove_file_if_present "$tarball"
  cleanup_dir "$tmp_dir"
}

main() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local tmp_dir
  tmp_dir="$(make_temp_dir tqs-smoke.XXXXXX)"
  local tarball_name tarball packed_dir script

  stage_and_build "$root_dir"

  tarball_name="$(run_npm_pack "$root_dir")"
  tarball="$root_dir/$tarball_name"
  packed_dir="$tmp_dir/pkg"
  script="$tmp_dir/smoke.ts"

  trap "cleanup '$tarball' '$tmp_dir'" EXIT

  extract_tarball "$tarball" "$packed_dir"
  verify_help "$(cli_entry "$packed_dir")"
  write_smoke_script "$script"
  verify_smoke_binary "$(cli_entry "$packed_dir")" "$script"

  echo "Packed artifact smoke test passed."
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
