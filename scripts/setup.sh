#!/usr/bin/env sh
set -e

passed=0
failed=0
warned=0

ok() {
  printf "ok  %s\n" "$1"
  passed=$((passed + 1))
}

fail() {
  printf "FAIL %s\n  %s\n" "$1" "$2"
  failed=$((failed + 1))
}

warn() {
  printf "warn %s\n  %s\n" "$1" "$2"
  warned=$((warned + 1))
}

cmd_exists() {
  command -v "$1" >/dev/null 2>&1 || return 1
}

repo_root() {
  root="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
  [ -n "$root" ] || return 1
  printf "%s\n" "$root"
}

git_dir() {
  root="${1:-$(repo_root)}"
  printf "%s\n" "$root/.git"
}

hook_dir() {
  root="${1:-$(repo_root)}"
  printf "%s\n" "$(git_dir "$root")/hooks"
}

pre_commit_hook_path() {
  root="${1:-$(repo_root)}"
  printf "%s\n" "$(hook_dir "$root")/pre-commit"
}

post_merge_hook_path() {
  root="${1:-$(repo_root)}"
  printf "%s\n" "$(hook_dir "$root")/post-merge"
}

legacy_hook_dir() {
  root="${1:-$(repo_root)}"
  printf "%s\n" "$root/.githooks"
}

hook_installed() {
  [ -f "$1" ]
}

ensure_repo() {
  root="${1:-$(repo_root)}"
  git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "Expected a git repository at '$root'." >&2
    return 1
  }
}

write_pre_commit_hook() {
  hook="${1:?hook is required}"
  cat > "$hook" <<'HOOK'
#!/usr/bin/env sh
set -e

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [ ! -d node_modules ]; then
  echo "Dependencies are not installed. Run 'bun install' first."
  exit 1
fi

npm run lint
npm run typecheck
bun test tests/unit
HOOK
  chmod +x "$hook"
}

write_post_merge_hook() {
  hook="${1:?hook is required}"
  cat > "$hook" <<'HOOK'
#!/usr/bin/env sh
set -e

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bash scripts/setup.sh
HOOK
  chmod +x "$hook"
}

clear_legacy_hooks_path() {
  root="${1:-$(repo_root)}"
  if git -C "$root" config --local --get core.hooksPath >/dev/null 2>&1; then
    git -C "$root" config --local --unset core.hooksPath
  fi
}

remove_legacy_hook_dir() {
  root="${1:-$(repo_root)}"
  legacy_dir="$(legacy_hook_dir "$root")"
  if [ -d "$legacy_dir" ]; then
    rm -rf "$legacy_dir"
  fi
}

check_deps() {
  echo "--- deps"
  cmd_exists git && ok "git" || fail "git" "not found"
  cmd_exists bash && ok "bash" || fail "bash" "not found"
  cmd_exists node && ok "node" || warn "node" "not found — required for pre-commit checks"
  cmd_exists npm && ok "npm" || warn "npm" "not found — required for pre-commit checks"
  cmd_exists bun && ok "bun" || warn "bun" "not found — required for pre-commit checks"
}

check_repo() {
  root="${1:-$(repo_root)}"
  echo "--- repo"
  ensure_repo "$root" && ok "git repository" || fail "git repository" "run this script from inside the repo"
}

install_hooks() {
  root="${1:-$(repo_root)}"
  hooks="$(hook_dir "$root")"
  pre_commit="$(pre_commit_hook_path "$root")"
  post_merge="$(post_merge_hook_path "$root")"

  echo "--- git hooks"
  mkdir -p "$hooks"
  write_pre_commit_hook "$pre_commit" && ok "pre-commit hook installed" || fail "pre-commit hook" "could not write $pre_commit"
  write_post_merge_hook "$post_merge" && ok "post-merge hook installed" || fail "post-merge hook" "could not write $post_merge"
  clear_legacy_hooks_path "$root" && ok "core.hooksPath reset" || fail "core.hooksPath reset" "could not clear core.hooksPath"
  remove_legacy_hook_dir "$root" && ok "legacy .githooks removed" || fail "legacy .githooks removed" "could not remove legacy .githooks"
}

main() {
  root="${1:-$(repo_root)}"

  check_deps
  echo ""
  check_repo "$root"
  echo ""
  install_hooks "$root"
  echo ""
  printf "%d ok  %d warned  %d failed\n" "$passed" "$warned" "$failed"
  [ "$failed" -eq 0 ]
}

if [ "${_TQS_SETUP_SOURCED:-0}" != "1" ]; then
  main "$@"
fi
