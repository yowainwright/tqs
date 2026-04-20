#!/bin/bash
set -euo pipefail

# shellcheck source=./lib/common.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib/common.sh"

default_commit_file() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/scripts/quickjs-ng.commit"
}

default_file_list() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/scripts/quickjs-ng.files"
}

default_deps_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/deps/quickjs-ng"
}

default_local_repo_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/quickjs-ng"
}

default_archive_url_base() {
  printf '%s\n' "${1:-https://codeload.github.com/quickjs-ng/quickjs/tar.gz}"
}

read_pinned_commit() {
  local commit_file="${1:-$(default_commit_file)}"
  tr -d '\n' < "$commit_file"
}

cleanup_command() {
  local tmp_dir="${1:?tmp_dir is required}"
  printf 'cleanup_dir %q' "$tmp_dir"
}

using_local_checkout() {
  local local_repo_dir="${1:-$(default_local_repo_dir)}"
  local commit="${2:?commit is required}"
  [ -d "$local_repo_dir/.git" ] && git -C "$local_repo_dir" cat-file -e "${commit}^{commit}" 2>/dev/null
}

announce_local_stage() {
  local commit="${1:?commit is required}"
  echo "Staging QuickJS from local checkout at commit $commit..."
}

announce_remote_stage() {
  local commit="${1:?commit is required}"
  echo "Fetching QuickJS from pinned archive $commit..."
}

export_local_snapshot() {
  local local_repo_dir="${1:?local_repo_dir is required}"
  local commit="${2:?commit is required}"
  local snapshot_path="${3:?snapshot_path is required}"
  git -C "$local_repo_dir" archive --format=tar "$commit" | tar -xf - -C "$snapshot_path"
}

download_archive() {
  local archive_url_base="${1:-$(default_archive_url_base)}"
  local commit="${2:?commit is required}"
  local archive_file="${3:?archive_file is required}"
  curl -fsSL "$archive_url_base/$commit" -o "$archive_file"
}

extract_archive() {
  local archive_file="${1:?archive_file is required}"
  local extract_path="${2:?extract_path is required}"
  tar -xzf "$archive_file" -C "$extract_path"
}

find_snapshot_root() {
  local extract_path="${1:?extract_path is required}"
  local snapshot_root=""

  snapshot_root="$(find "$extract_path" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [ -n "$snapshot_root" ] || {
    echo "Unable to locate extracted QuickJS archive contents." >&2
    return 1
  }

  printf '%s\n' "$snapshot_root"
}

copy_snapshot_tree() {
  local source_dir="${1:?source_dir is required}"
  local snapshot_path="${2:?snapshot_path is required}"
  cp -R "$source_dir"/. "$snapshot_path"/
}

copy_extracted_snapshot() {
  local extract_path="${1:?extract_path is required}"
  local snapshot_path="${2:?snapshot_path is required}"
  local source_dir=""

  source_dir="$(find_snapshot_root "$extract_path")"
  copy_snapshot_tree "$source_dir" "$snapshot_path"
}

stage_local_snapshot() {
  local local_repo_dir="${1:?local_repo_dir is required}"
  local commit="${2:?commit is required}"
  local snapshot_path="${3:?snapshot_path is required}"
  announce_local_stage "$commit"
  export_local_snapshot "$local_repo_dir" "$commit" "$snapshot_path"
}

fetch_remote_snapshot() {
  local archive_url_base="${1:-$(default_archive_url_base)}"
  local commit="${2:?commit is required}"
  local archive_file="${3:?archive_file is required}"
  local extract_path="${4:?extract_path is required}"
  announce_remote_stage "$commit"
  download_archive "$archive_url_base" "$commit" "$archive_file"
  extract_archive "$archive_file" "$extract_path"
}

stage_remote_snapshot() {
  local archive_url_base="${1:-$(default_archive_url_base)}"
  local commit="${2:?commit is required}"
  local archive_file="${3:?archive_file is required}"
  local extract_path="${4:?extract_path is required}"
  local snapshot_path="${5:?snapshot_path is required}"
  fetch_remote_snapshot "$archive_url_base" "$commit" "$archive_file" "$extract_path"
  copy_extracted_snapshot "$extract_path" "$snapshot_path"
}

stage_snapshot() {
  local local_repo_dir="${1:?local_repo_dir is required}"
  local commit="${2:?commit is required}"
  local archive_url_base="${3:-$(default_archive_url_base)}"
  local archive_file="${4:?archive_file is required}"
  local extract_path="${5:?extract_path is required}"
  local snapshot_path="${6:?snapshot_path is required}"

  if using_local_checkout "$local_repo_dir" "$commit"; then
    stage_local_snapshot "$local_repo_dir" "$commit" "$snapshot_path"
    return
  fi

  stage_remote_snapshot "$archive_url_base" "$commit" "$archive_file" "$extract_path" "$snapshot_path"
}

reset_deps_dir() {
  local deps_dir="${1:-$(default_deps_dir)}"
  rm -rf "$deps_dir"
  mkdir -p "$deps_dir"
}

require_snapshot_file() {
  local snapshot_path="${1:?snapshot_path is required}"
  local relative_path="${2:?relative_path is required}"
  [ -f "$snapshot_path/$relative_path" ] || {
    echo "Missing required QuickJS file '$relative_path' in staged snapshot." >&2
    return 1
  }
}

target_path() {
  local deps_dir="${1:?deps_dir is required}"
  local relative_path="${2:?relative_path is required}"
  printf '%s\n' "$deps_dir/$relative_path"
}

copy_snapshot_file() {
  local snapshot_path="${1:?snapshot_path is required}"
  local relative_path="${2:?relative_path is required}"
  local target_file="${3:?target_file is required}"
  cp "$snapshot_path/$relative_path" "$target_file"
}

copy_required_file() {
  local snapshot_path="${1:?snapshot_path is required}"
  local deps_dir="${2:?deps_dir is required}"
  local relative_path="${3:?relative_path is required}"
  local target_file=""

  target_file="$(target_path "$deps_dir" "$relative_path")"
  require_snapshot_file "$snapshot_path" "$relative_path"
  ensure_parent_dir "$target_file"
  copy_snapshot_file "$snapshot_path" "$relative_path" "$target_file"
}

stage_listed_files() {
  local snapshot_path="${1:?snapshot_path is required}"
  local file_list="${2:-$(default_file_list)}"
  local deps_dir="${3:-$(default_deps_dir)}"
  local relative_path=""

  while IFS= read -r relative_path; do
    [ -n "$relative_path" ] || continue
    copy_required_file "$snapshot_path" "$deps_dir" "$relative_path"
  done < "$file_list"
}

record_upstream_commit() {
  local commit="${1:?commit is required}"
  local deps_dir="${2:-$(default_deps_dir)}"
  printf '%s\n' "$commit" > "$deps_dir/UPSTREAM_COMMIT"
}

announce_staged_dir() {
  local deps_dir="${1:?deps_dir is required}"
  echo "QuickJS staged at $deps_dir"
}

publish_snapshot() {
  local snapshot_path="${1:?snapshot_path is required}"
  local file_list="${2:?file_list is required}"
  local deps_dir="${3:?deps_dir is required}"
  local commit="${4:?commit is required}"
  reset_deps_dir "$deps_dir"
  stage_listed_files "$snapshot_path" "$file_list" "$deps_dir"
  record_upstream_commit "$commit" "$deps_dir"
}

main() {
  local root_dir="${1:-${ROOT_DIR:-$(repo_root "${BASH_SOURCE[0]}")}}"
  local commit_file="${2:-${COMMIT_FILE:-$(default_commit_file "$root_dir")}}"
  local file_list="${3:-${FILE_LIST:-$(default_file_list "$root_dir")}}"
  local deps_dir="${4:-${DEPS_DIR:-$(default_deps_dir "$root_dir")}}"
  local local_repo_dir="${5:-${LOCAL_REPO_DIR:-$(default_local_repo_dir "$root_dir")}}"
  local archive_url_base="${6:-${ARCHIVE_URL_BASE:-$(default_archive_url_base)}}"
  local commit="${COMMIT:-$(read_pinned_commit "$commit_file")}"
  local tmp_dir="${TMP_DIR:-$(make_temp_dir quickjs-stage.XXXXXX)}"
  local snapshot_path="$(path_in_dir "$tmp_dir" snapshot)"
  local extract_path="$(path_in_dir "$tmp_dir" extract)"
  local archive_file="$(path_in_dir "$tmp_dir" quickjs-ng.tar.gz)"

  install_exit_trap "$(cleanup_command "$tmp_dir")"
  ensure_dir "$snapshot_path"
  ensure_dir "$extract_path"
  stage_snapshot "$local_repo_dir" "$commit" "$archive_url_base" "$archive_file" "$extract_path" "$snapshot_path"
  publish_snapshot "$snapshot_path" "$file_list" "$deps_dir" "$commit"
  announce_staged_dir "$deps_dir"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
