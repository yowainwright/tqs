#!/bin/bash
set -euo pipefail

# shellcheck source=./lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

default_npm_cache() {
  printf '%s\n' "${1:-/tmp/npm-cache}"
}

node_bin() {
  printf '%s\n' "${1:-$(command -v node)}"
}

npm_cli_path() {
  local node_path="${1:-$(node_bin)}"
  local node_dir=""

  node_dir="$(cd "$(dirname "$node_path")/.." && pwd)"
  printf '%s\n' "$node_dir/lib/node_modules/npm/bin/npm-cli.js"
}

set_npm_cache() {
  local cache_dir="${1:-$(default_npm_cache)}"
  export npm_config_cache="$cache_dir"
}

run_clean_npm() {
  local cache_dir="${npm_config_cache:-$(default_npm_cache)}"
  local node_path="${NODE_BIN:-$(node_bin)}"
  local npm_cli="${NPM_CLI_PATH:-$(npm_cli_path "$node_path")}"

  env -i \
    HOME="${HOME:-}" \
    PATH="$PATH" \
    TMPDIR="${TMPDIR:-/tmp}" \
    LANG="${LANG:-en_US.UTF-8}" \
    LC_ALL="${LC_ALL:-}" \
    npm_config_cache="$cache_dir" \
    "$node_path" "$npm_cli" "$@"
}

stage_script_path() {
  local root_dir="${1:?root_dir is required}"
  printf '%s\n' "$root_dir/scripts/stage-quickjs.sh"
}

tsup_path() {
  local root_dir="${1:?root_dir is required}"
  printf '%s\n' "$root_dir/node_modules/.bin/tsup"
}

stage_quickjs_sources() {
  local root_dir="${1:?root_dir is required}"
  bash "$(stage_script_path "$root_dir")"
}

build_typescript_bundle() {
  local root_dir="${1:?root_dir is required}"
  (
    cd "$root_dir"
    "$(tsup_path "$root_dir")"
  )
}

prepare_pack_inputs() {
  local root_dir="${1:?root_dir is required}"
  stage_quickjs_sources "$root_dir"
  build_typescript_bundle "$root_dir"
}

pack_repo_to_log() {
  local root_dir="${1:?root_dir is required}"
  local pack_log="${2:?pack_log is required}"
  (
    cd "$root_dir"
    run_clean_npm pack --ignore-scripts --silent > "$pack_log" 2>&1
  )
}

print_pack_log() {
  local pack_log="${1:?pack_log is required}"
  cat "$pack_log" >&2
}

read_packed_tarball() {
  local pack_log="${1:?pack_log is required}"
  tail -n 1 "$pack_log"
}

pack_repo() {
  local root_dir="${1:?root_dir is required}"
  local pack_log="${2:?pack_log is required}"
  pack_repo_to_log "$root_dir" "$pack_log" || {
    print_pack_log "$pack_log"
    return 1
  }
  read_packed_tarball "$pack_log"
}

absolute_tarball_path() {
  local root_dir="${1:?root_dir is required}"
  local tarball_name="${2:?tarball_name is required}"
  printf '%s\n' "$root_dir/$tarball_name"
}

extract_tarball() {
  local tarball_path="${1:?tarball_path is required}"
  local output_dir="${2:?output_dir is required}"
  mkdir -p "$output_dir"
  tar -xzf "$tarball_path" -C "$output_dir"
}

cli_path() {
  local packed_dir="${1:?packed_dir is required}"
  printf '%s\n' "$packed_dir/package/dist/cli/index.js"
}

run_help() {
  local entrypoint="${1:?entrypoint is required}"
  node "$entrypoint" --help
}

help_message() {
  printf '%s\n' "Packed CLI did not print help output."
}

smoke_binary_message() {
  printf '%s\n' "Packed CLI did not build a working executable."
}

assert_contains() {
  local output="${1:?output is required}"
  local expected="${2:?expected is required}"
  local message="${3:?message is required}"

  case "$output" in
    *"$expected"*) ;;
    *)
      echo "$message" >&2
      return 1
      ;;
  esac
}

write_smoke_script() {
  local script_path="${1:?script_path is required}"
  cat > "$script_path" <<'EOF'
import * as std from "std";

std.printf("packed artifact works\n");
EOF
}

build_smoke_binary() {
  local entrypoint="${1:?entrypoint is required}"
  local script_path="${2:?script_path is required}"
  local output_path="${3:?output_path is required}"
  node "$entrypoint" "$script_path" -o "$output_path"
}

run_smoke_binary() {
  local output_path="${1:?output_path is required}"
  "$output_path"
}

cleanup_command() {
  local tarball_path="${1:-}"
  local tmp_dir="${2:?tmp_dir is required}"
  printf 'remove_file_if_present %q; cleanup_dir %q' "$tarball_path" "$tmp_dir"
}

marker_path() {
  local tmp_dir="${1:?tmp_dir is required}"
  local marker_name="${2:?marker_name is required}"
  printf '%s\n' "$tmp_dir/$marker_name"
}

record_absent_path() {
  local target_path="${1:?target_path is required}"
  local marker_file="${2:?marker_file is required}"

  if [ ! -e "$target_path" ]; then
    printf '%s\n' "$target_path" > "$marker_file"
  fi
}

cleanup_marked_path() {
  local marker_file="${1:?marker_file is required}"
  local target_path=""

  if [ ! -f "$marker_file" ]; then
    return
  fi

  target_path="$(cat "$marker_file")"
  remove_file_if_present "$target_path"
  remove_dir_if_present "$target_path"
}

tracked_dist_path() {
  local root_dir="${1:?root_dir is required}"
  printf '%s\n' "$root_dir/dist"
}

tracked_quickjs_path() {
  local root_dir="${1:?root_dir is required}"
  printf '%s\n' "$root_dir/deps/quickjs-ng"
}

track_repo_outputs() {
  local root_dir="${1:?root_dir is required}"
  local tmp_dir="${2:?tmp_dir is required}"
  record_absent_path "$(tracked_dist_path "$root_dir")" "$(marker_path "$tmp_dir" dist.marker)"
  record_absent_path "$(tracked_quickjs_path "$root_dir")" "$(marker_path "$tmp_dir" quickjs.marker)"
}

repo_cleanup_command() {
  local root_dir="${1:?root_dir is required}"
  local tmp_dir="${2:?tmp_dir is required}"
  printf 'cleanup_marked_path %q; cleanup_marked_path %q; remove_dir_if_empty %q' \
    "$(marker_path "$tmp_dir" dist.marker)" \
    "$(marker_path "$tmp_dir" quickjs.marker)" \
    "$root_dir/deps"
}

smoke_cleanup_command() {
  local root_dir="${1:?root_dir is required}"
  local tarball_path="${2:-}"
  local tmp_dir="${3:?tmp_dir is required}"
  printf '%s; %s' \
    "$(repo_cleanup_command "$root_dir" "$tmp_dir")" \
    "$(cleanup_command "$tarball_path" "$tmp_dir")"
}

verify_help_output() {
  local entrypoint="${1:?entrypoint is required}"
  local help_output=""

  help_output="$(run_help "$entrypoint")"
  assert_contains "$help_output" "Usage:" "$(help_message)"
}

verify_smoke_binary() {
  local entrypoint="${1:?entrypoint is required}"
  local script_path="${2:?script_path is required}"
  local output_path="${3:?output_path is required}"
  local run_output=""

  build_smoke_binary "$entrypoint" "$script_path" "$output_path"
  run_output="$(run_smoke_binary "$output_path")"
  assert_contains "$run_output" "packed artifact works" "$(smoke_binary_message)"
}

announce_smoke_success() {
  echo "Packed artifact smoke test passed."
}

main() {
  local root_dir="${1:-${ROOT_DIR:-$(repo_root "${BASH_SOURCE[0]}")}}"
  local tmp_dir="${TMP_DIR:-$(make_temp_dir quickjs-smoke.XXXXXX)}"
  local packed_dir="$(path_in_dir "$tmp_dir" package)"
  local script_path="$(path_in_dir "$tmp_dir" script.tqs)"
  local output_path="$(path_in_dir "$tmp_dir" out)"
  local pack_log="$(path_in_dir "$tmp_dir" npm-pack.log)"
  local tarball_name=""
  local tarball_path=""
  local entrypoint=""

  install_exit_trap "$(smoke_cleanup_command "$root_dir" "" "$tmp_dir")"
  set_npm_cache "${NPM_CACHE_DIR:-$(default_npm_cache)}"
  track_repo_outputs "$root_dir" "$tmp_dir"
  prepare_pack_inputs "$root_dir"
  tarball_name="$(pack_repo "$root_dir" "$pack_log")"
  tarball_path="$(absolute_tarball_path "$root_dir" "$tarball_name")"
  install_exit_trap "$(smoke_cleanup_command "$root_dir" "$tarball_path" "$tmp_dir")"
  extract_tarball "$tarball_path" "$packed_dir"
  entrypoint="$(cli_path "$packed_dir")"
  verify_help_output "$entrypoint"
  write_smoke_script "$script_path"
  verify_smoke_binary "$entrypoint" "$script_path" "$output_path"
  announce_smoke_success
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
