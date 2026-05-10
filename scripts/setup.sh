#!/bin/bash
set -e

is_ci() {
  local ci="${1:-${CI:-}}"
  [ "$ci" = "true" ] || [ "$ci" = "1" ]
}

is_git_repo() {
  local dir="${1:-.}"
  [ -d "$dir/.git" ]
}

hook_exists() {
  local hooks_dir="${1:-.git/hooks}"
  local hook_name="${2:-pre-commit}"
  [ -f "$hooks_dir/$hook_name" ]
}

write_hook() {
  local hook_path="${1}"
  local content="${2}"
  printf '%s\n' "$content" > "$hook_path"
  chmod 755 "$hook_path"
}

pre_commit_hook() {
  cat << 'EOF'
#!/bin/bash
set -e
bun run lint
bun run build:ts
bun run test
EOF
}

commit_msg_hook() {
  cat << 'EOF'
#!/bin/bash
commit_msg=$(cat "$1")
pattern='^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?: .{1,}'
if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo "x invalid commit message: expected <type>(<scope>): <message>"
  echo "  types: feat fix docs style refactor perf test build ci chore revert"
  exit 1
fi
EOF
}

post_merge_hook() {
  cat << 'EOF'
#!/bin/bash
changed=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD 2>/dev/null || true)
if echo "$changed" | grep -qE "(bun\.lock|package\.json)"; then
  bun install
fi
EOF
}

install_hook() {
  local hook_name="${1:-pre-commit}"
  local content="${2:-}"
  local hooks_dir="${3:-.git/hooks}"
  local hook_path="$hooks_dir/$hook_name"

  if hook_exists "$hooks_dir" "$hook_name"; then
    echo "> $hook_name exists, skipping (delete $hooks_dir/$hook_name to reinstall)"
    return 0
  fi

  mkdir -p "$hooks_dir"
  write_hook "$hook_path" "$content"
  echo "> installed $hook_name"
}

install_all_hooks() {
  local hooks_dir="${1:-.git/hooks}"
  install_hook "pre-commit" "$(pre_commit_hook)" "$hooks_dir"
  install_hook "commit-msg" "$(commit_msg_hook)" "$hooks_dir"
  install_hook "post-merge" "$(post_merge_hook)" "$hooks_dir"
}

main() {
  local ci="${1:-${CI:-}}"
  local repo_dir="${2:-.}"

  if is_ci "$ci"; then
    return 0
  fi

  if ! is_git_repo "$repo_dir"; then
    return 0
  fi

  install_all_hooks "$repo_dir/.git/hooks"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
